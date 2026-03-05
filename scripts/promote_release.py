#!/usr/bin/env python3

import argparse
import json
import os
import re
import shlex
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
STACK_PATH = ROOT / "vps" / "portainer" / "stack.summi-complete.yml"

FRONTEND_REPO = "ghcr.io/agenciageraleads/summi-b1463168-frontend"
WORKER_REPO = "ghcr.io/agenciageraleads/summi-b1463168-worker"

FRONTEND_WORKFLOW = "Build & Push Summi Frontend"
WORKER_WORKFLOW = "Build & Push Summi Worker"

FRONTEND_PATHS = (
    "src/",
    "public/",
    "frontend/",
    "package.json",
    "package-lock.json",
    "vite.config.ts",
    "index.html",
    ".github/workflows/frontend-ghcr.yml",
)

WORKER_PATHS = (
    "vps/summi_worker/",
    ".github/workflows/worker-ghcr.yml",
)

SERVICE_IMAGES = {
    "summi-frontend": FRONTEND_REPO,
    "summi-worker-api": WORKER_REPO,
    "summi-worker-scheduler": WORKER_REPO,
    "summi-worker-queue-analysis": WORKER_REPO,
    "summi-worker-queue-summary": WORKER_REPO,
}

DEPLOY_ORDER = [
    "summi_summi-frontend",
    "summi_summi-worker-api",
    "summi_summi-worker-scheduler",
    "summi_summi-worker-queue-analysis",
    "summi_summi-worker-queue-summary",
]

DEPLOY_IMAGE = {
    "summi_summi-frontend": FRONTEND_REPO,
    "summi_summi-worker-api": WORKER_REPO,
    "summi_summi-worker-scheduler": WORKER_REPO,
    "summi_summi-worker-queue-analysis": WORKER_REPO,
    "summi_summi-worker-queue-summary": WORKER_REPO,
}

WORKFLOW_STACK_SERVICES = {
    FRONTEND_WORKFLOW: {"summi-frontend"},
    WORKER_WORKFLOW: {
        "summi-worker-api",
        "summi-worker-scheduler",
        "summi-worker-queue-analysis",
        "summi-worker-queue-summary",
    },
}

WORKFLOW_DEPLOY_SERVICES = {
    FRONTEND_WORKFLOW: ["summi_summi-frontend"],
    WORKER_WORKFLOW: [
        "summi_summi-worker-api",
        "summi_summi-worker-scheduler",
        "summi_summi-worker-queue-analysis",
        "summi_summi-worker-queue-summary",
    ],
}


def run(cmd, *, check=True, capture=True, env=None):
    return subprocess.run(
        cmd,
        check=check,
        text=True,
        capture_output=capture,
        env=env,
    )


def resolve_full_sha(raw_sha: str) -> str:
    sha = raw_sha.strip()
    if not sha:
        raise SystemExit("SHA vazio.")
    result = run(["git", "-C", str(ROOT), "rev-parse", sha])
    full_sha = result.stdout.strip()
    if not re.fullmatch(r"[0-9a-f]{40}", full_sha):
        raise SystemExit(f"SHA invalido: {raw_sha}")
    return full_sha


def require_gh_auth() -> None:
    run(["gh", "auth", "status"])


def fetch_runs(sha: str) -> list[dict]:
    result = run(
        [
            "gh",
            "run",
            "list",
            "--commit",
            sha,
            "--limit",
            "20",
            "--json",
            "workflowName,status,conclusion,url,headSha",
        ]
    )
    return json.loads(result.stdout)


def list_changed_files(sha: str) -> list[str]:
    result = run(["git", "-C", str(ROOT), "diff-tree", "--no-commit-id", "--name-only", "-r", sha])
    return [line.strip() for line in result.stdout.splitlines() if line.strip()]


def matches_any_path(path: str, patterns: tuple[str, ...]) -> bool:
    for pattern in patterns:
        if pattern.endswith("/"):
            if path.startswith(pattern):
                return True
            continue
        if path == pattern:
            return True
    return False


def detect_release_workflows(sha: str) -> list[str]:
    changed_files = list_changed_files(sha)
    workflows = []
    if any(matches_any_path(path, FRONTEND_PATHS) for path in changed_files):
        workflows.append(FRONTEND_WORKFLOW)
    if any(matches_any_path(path, WORKER_PATHS) for path in changed_files):
        workflows.append(WORKER_WORKFLOW)
    if not workflows:
        raise SystemExit(
            f"O SHA {sha[:7]} nao altera frontend nem worker; nada para promover na stack."
        )
    return workflows


def verify_required_workflows(sha: str, required: list[str]) -> None:
    runs = fetch_runs(sha)
    status_by_workflow = {name: False for name in required}
    for run_info in runs:
        name = run_info.get("workflowName")
        if name not in status_by_workflow:
            continue
        if run_info.get("headSha") != sha:
            continue
        if run_info.get("status") == "completed" and run_info.get("conclusion") == "success":
            status_by_workflow[name] = True
    missing = [name for name, ok in status_by_workflow.items() if not ok]
    if missing:
        raise SystemExit(
            "Workflows obrigatorios ainda nao concluiram com sucesso para "
            f"{sha[:7]}: {', '.join(missing)}"
        )


def rewrite_stack(sha: str, workflows: list[str]) -> bool:
    lines = STACK_PATH.read_text().splitlines()
    services_to_update = {
        service
        for workflow in workflows
        for service in WORKFLOW_STACK_SERVICES[workflow]
    }
    current_service = None
    changed = False
    for index, line in enumerate(lines):
        stripped = line.strip()
        if stripped in {f"{name}:" for name in SERVICE_IMAGES}:
            current_service = stripped[:-1]
            continue
        if stripped == "networks:":
            current_service = None
        if current_service and stripped.startswith("image:"):
            if current_service not in services_to_update:
                current_service = None
                continue
            target = f"    image: {SERVICE_IMAGES[current_service]}:{sha}"
            if line != target:
                lines[index] = target
                changed = True
            current_service = None
    if not changed:
        return False
    STACK_PATH.write_text("\n".join(lines) + "\n")
    return True


def get_gh_token() -> str:
    token = os.environ.get("GH_TOKEN") or os.environ.get("GITHUB_TOKEN")
    if token:
        return token.strip()
    result = run(["gh", "auth", "token"])
    token = result.stdout.strip()
    if not token:
        raise SystemExit("Nao consegui obter token do GitHub para login no GHCR.")
    return token


def build_ssh_prefix() -> list[str]:
    host = os.environ.get("SUMMI_VPS_HOST", "5.161.247.240")
    user = os.environ.get("SUMMI_VPS_USER", "root")
    password = os.environ.get("SUMMI_VPS_PASSWORD")
    base = ["ssh", "-o", "StrictHostKeyChecking=no", f"{user}@{host}"]
    if password:
        return ["sshpass", "-p", password, *base]
    return base


def deploy_sha(sha: str, workflows: list[str]) -> None:
    token = get_gh_token()
    services = []
    for workflow in workflows:
        services.extend(WORKFLOW_DEPLOY_SERVICES[workflow])
    remote_lines = [
        f"printf %s {shlex.quote(token)} | docker login ghcr.io -u agenciageraleads --password-stdin >/dev/null",
    ]
    for service in DEPLOY_ORDER:
        if service not in services:
            continue
        image = f"{DEPLOY_IMAGE[service]}:{sha}"
        if service in {"summi_summi-frontend", "summi_summi-worker-api", "summi_summi-worker-scheduler"}:
            remote_lines.append(
                f"docker service update --with-registry-auth --image {shlex.quote(image)} --detach=false {service}"
            )
        else:
            remote_lines.append(
                f"docker service update --with-registry-auth --image {shlex.quote(image)} {service}"
            )
    remote_lines.extend(
        [
            "docker service inspect summi_summi-frontend --format '{{.Spec.TaskTemplate.ContainerSpec.Image}}'",
            "docker service inspect summi_summi-worker-api --format '{{.Spec.TaskTemplate.ContainerSpec.Image}}'",
            "docker service inspect summi_summi-worker-scheduler --format '{{.Spec.TaskTemplate.ContainerSpec.Image}}'",
        ]
    )
    remote_cmd = "set -e\n" + "\n".join(remote_lines)
    ssh_cmd = [*build_ssh_prefix(), remote_cmd]
    result = run(ssh_cmd)
    sys.stdout.write(result.stdout)
    sys.stderr.write(result.stderr)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Promove um release validado por SHA para a stack do Summi e, opcionalmente, para a VPS."
    )
    parser.add_argument("--sha", required=True, help="Commit SHA a promover.")
    parser.add_argument(
        "--skip-workflow-check",
        action="store_true",
        help="Pula a verificacao dos workflows Build & Push no GitHub Actions.",
    )
    parser.add_argument(
        "--deploy",
        action="store_true",
        help="Aplica a promocao na VPS via docker service update.",
    )
    args = parser.parse_args()

    sha = resolve_full_sha(args.sha)
    workflows = detect_release_workflows(sha)
    if not args.skip_workflow_check:
        require_gh_auth()
        verify_required_workflows(sha, workflows)

    changed = rewrite_stack(sha, workflows)
    print(
        "Stack atualizada para "
        f"{sha}. workflows={','.join(workflows)} changed={str(changed).lower()}"
    )

    if args.deploy:
        deploy_sha(sha, workflows)

    print(
        "Proximo passo: revisar o diff, rodar smoke test e commitar/pushar a stack se este SHA virar a referencia oficial."
    )


if __name__ == "__main__":
    main()
