#!/usr/bin/env python3
"""
check_notification_logs.py — Auditoria de notificações Summi por usuário.

Verifica no banco de dados se todos os assinantes ativos estão recebendo
seus Summis, transcrições e notificações conforme esperado.

Uso:
    SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... python scripts/check_notification_logs.py

    Opções via env:
        CHECK_HOURS_BACK=24      Janela de verificação em horas (padrão: 24)
        OVERDUE_MULTIPLIER=1.5   Fator para considerar summi atrasado (padrão: 1.5x a frequência)
        BUSINESS_HOURS_START=8
        BUSINESS_HOURS_END=18
"""
from __future__ import annotations

import datetime as dt
import os
import sys
from urllib.parse import urlencode

import requests

# ---------------------------------------------------------------------------
# Configuração
# ---------------------------------------------------------------------------

SUPABASE_URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
CHECK_HOURS_BACK = int(os.environ.get("CHECK_HOURS_BACK", "24"))
OVERDUE_MULTIPLIER = float(os.environ.get("OVERDUE_MULTIPLIER", "1.5"))
BUSINESS_HOURS_START = int(os.environ.get("BUSINESS_HOURS_START", "8"))
BUSINESS_HOURS_END = int(os.environ.get("BUSINESS_HOURS_END", "18"))

FREQ_MAP = {"1h": 1, "3h": 3, "6h": 6, "12h": 12, "24h": 24}


# ---------------------------------------------------------------------------
# Helpers Supabase
# ---------------------------------------------------------------------------

def _headers() -> dict:
    return {
        "apikey": SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
        "Content-Type": "application/json",
    }


def sb_select(table: str, select: str = "*", filters: list | None = None,
              order: str | None = None, limit: int = 1000) -> list:
    params: dict = {"select": select, "limit": str(limit)}
    if order:
        params["order"] = order
    if filters:
        for k, v in filters:
            params[k] = v
    url = f"{SUPABASE_URL}/rest/v1/{table}?{urlencode(params, doseq=True)}"
    resp = requests.get(url, headers=_headers(), timeout=30)
    if not resp.ok:
        raise RuntimeError(f"[{table}] {resp.status_code}: {resp.text[:200]}")
    return resp.json()


# ---------------------------------------------------------------------------
# Lógica de diagnóstico
# ---------------------------------------------------------------------------

def _parse_dt(value: str | None) -> dt.datetime | None:
    if not value:
        return None
    try:
        parsed = dt.datetime.fromisoformat(str(value).replace("Z", "+00:00"))
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=dt.timezone.utc)
        return parsed
    except Exception:
        return None


def _freq_hours(profile: dict) -> int:
    return FREQ_MAP.get(str(profile.get("summi_frequencia") or "1h").strip(), 1)


def _is_overdue(profile: dict, now_utc: dt.datetime) -> tuple[bool, float]:
    """Retorna (overdue, horas_desde_ultimo_summi)."""
    ultimo_dt = _parse_dt(profile.get("ultimo_summi_em"))
    if ultimo_dt is None:
        return False, 0.0  # Nunca enviou — tratado separadamente
    elapsed = (now_utc - ultimo_dt).total_seconds() / 3600
    threshold = _freq_hours(profile) * OVERDUE_MULTIPLIER
    return elapsed >= threshold, elapsed


def _within_business_hours(profile: dict, now_local: dt.datetime) -> bool:
    only_biz = profile.get("apenas_horario_comercial")
    if only_biz is True:
        return BUSINESS_HOURS_START <= now_local.hour < BUSINESS_HOURS_END
    return True


def _fmt_dt(d: dt.datetime | None) -> str:
    if d is None:
        return "—"
    return d.strftime("%Y-%m-%d %H:%M UTC")


def _section(title: str) -> None:
    width = 72
    print(f"\n{'=' * width}")
    print(f"  {title}")
    print(f"{'=' * width}")


def _row(label: str, value: str, indent: int = 2) -> None:
    print(f"{'  ' * indent}{label:<38} {value}")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> int:
    if not SUPABASE_URL or not SERVICE_ROLE_KEY:
        print("ERRO: Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.", file=sys.stderr)
        return 1

    now_utc = dt.datetime.now(dt.timezone.utc)
    now_local = dt.datetime.now()
    window_start = (now_utc - dt.timedelta(hours=CHECK_HOURS_BACK)).isoformat()

    print(f"\nSummi — Auditoria de Notificações")
    print(f"Data/Hora UTC : {_fmt_dt(now_utc)}")
    print(f"Janela        : últimas {CHECK_HOURS_BACK}h")
    print(f"Horário local : {now_local.strftime('%H:%M')} (critério comercial: {BUSINESS_HOURS_START}h–{BUSINESS_HOURS_END}h)")

    # ------------------------------------------------------------------
    # 1. Assinantes ativos
    # ------------------------------------------------------------------
    _section("1. ASSINANTES ATIVOS")
    subs = sb_select(
        "subscribers",
        select="user_id,subscription_end,subscription_status,subscribed",
        filters=[
            ("subscribed", "eq.true"),
            ("subscription_end", f"gte.{now_utc.isoformat()}"),
        ],
    )
    # Dedup por user_id
    seen: set[str] = set()
    unique_user_ids: list[str] = []
    for s in subs:
        uid = str(s.get("user_id") or "").strip()
        if uid and uid not in seen:
            seen.add(uid)
            unique_user_ids.append(uid)

    print(f"  Linhas na tabela subscribers : {len(subs)}")
    print(f"  Usuários únicos ativos        : {len(unique_user_ids)}")

    if not unique_user_ids:
        print("\n  ⚠  Nenhum assinante ativo encontrado.")
        return 0

    # ------------------------------------------------------------------
    # 2. Carregar perfis
    # ------------------------------------------------------------------
    profiles_map: dict[str, dict] = {}
    # Carregar em lotes de 50 (PostgREST in filter)
    batch_size = 50
    for i in range(0, len(unique_user_ids), batch_size):
        batch = unique_user_ids[i : i + batch_size]
        in_filter = f"in.({','.join(batch)})"
        rows = sb_select(
            "profiles",
            select="id,nome,numero,summi_frequencia,ultimo_summi_em,ultimo_summi_diario_em,"
                   "onboarding_completed,apenas_horario_comercial,Summi em Audio?,"
                   "total_mensagens_analisadas,total_conversas_priorizadas",
            filters=[("id", in_filter)],
        )
        for r in rows:
            profiles_map[r["id"]] = r

    # ------------------------------------------------------------------
    # 3. Classificar usuários
    # ------------------------------------------------------------------
    _section("2. STATUS POR USUÁRIO")

    never_received: list[dict] = []
    overdue: list[dict] = []
    ok_users: list[dict] = []
    blocked_by_hours: list[dict] = []
    no_profile: list[str] = []

    for uid in unique_user_ids:
        p = profiles_map.get(uid)
        if not p:
            no_profile.append(uid)
            continue

        within_hours = _within_business_hours(p, now_local)
        only_biz = p.get("apenas_horario_comercial") is True

        ultimo_dt = _parse_dt(p.get("ultimo_summi_em"))
        onboarding_done = p.get("onboarding_completed")

        if ultimo_dt is None and not onboarding_done:
            # Nunca recebeu nada
            never_received.append(p)
            continue

        if not within_hours and only_biz:
            blocked_by_hours.append(p)
            continue

        is_over, elapsed_h = _is_overdue(p, now_utc)
        if is_over:
            overdue.append({**p, "_elapsed_h": elapsed_h})
        else:
            ok_users.append({**p, "_elapsed_h": elapsed_h})

    # ------------------------------------------------------------------
    # 4. Exibir resultados
    # ------------------------------------------------------------------

    # OK
    print(f"\n  ✅  OK — Recebendo normalmente ({len(ok_users)} usuários)")
    for p in ok_users:
        nome = (p.get("nome") or "sem nome")[:30]
        freq = p.get("summi_frequencia") or "1h"
        ultimo = _fmt_dt(_parse_dt(p.get("ultimo_summi_em")))
        elapsed = p.get("_elapsed_h", 0.0)
        print(f"       {nome:<32} freq={freq}  último={ultimo}  ({elapsed:.1f}h atrás)")

    # Bloqueados por horário comercial
    if blocked_by_hours:
        print(f"\n  🕐  FORA DO HORÁRIO COMERCIAL ({len(blocked_by_hours)} usuários)")
        print(f"       (não é erro — configuraram 'apenas horário comercial')")
        for p in blocked_by_hours:
            nome = (p.get("nome") or "sem nome")[:30]
            ultimo = _fmt_dt(_parse_dt(p.get("ultimo_summi_em")))
            print(f"       {nome:<32} último={ultimo}")

    # Nunca recebeu onboarding
    if never_received:
        print(f"\n  🆕  NUNCA RECEBEU SUMMI / ONBOARDING PENDENTE ({len(never_received)} usuários)")
        for p in never_received:
            nome = (p.get("nome") or "sem nome")[:30]
            numero = p.get("numero") or "—"
            print(f"       {nome:<32} número={numero}")

    # Atrasados
    if overdue:
        print(f"\n  ⚠️   ATRASADOS (>{OVERDUE_MULTIPLIER}x a frequência configurada) ({len(overdue)} usuários)")
        for p in overdue:
            nome = (p.get("nome") or "sem nome")[:30]
            freq = p.get("summi_frequencia") or "1h"
            elapsed = p.get("_elapsed_h", 0.0)
            ultimo = _fmt_dt(_parse_dt(p.get("ultimo_summi_em")))
            print(f"       {nome:<32} freq={freq}  último={ultimo}  ({elapsed:.1f}h atrás) ⚠️")

    # Sem perfil
    if no_profile:
        print(f"\n  ❌  SEM PERFIL NO BANCO ({len(no_profile)} user_ids)")
        for uid in no_profile:
            print(f"       {uid}")

    # ------------------------------------------------------------------
    # 5. Logs de custo — últimas CHECK_HOURS_BACK horas
    # ------------------------------------------------------------------
    _section(f"3. ATIVIDADE DE IA (últimas {CHECK_HOURS_BACK}h)")
    try:
        cost_logs = sb_select(
            "cost_logs",
            select="user_id,operation,model,cost_usd,created_at",
            filters=[("created_at", f"gte.{window_start}")],
            order="created_at.desc",
            limit=500,
        )
    except Exception as exc:
        print(f"  ⚠  Não foi possível consultar cost_logs: {exc}")
        cost_logs = []

    if cost_logs:
        # Agrupar por operação
        op_counts: dict[str, int] = {}
        op_costs: dict[str, float] = {}
        user_ops: dict[str, set] = {}
        for row in cost_logs:
            op = row.get("operation") or "?"
            uid = row.get("user_id") or "?"
            cost = float(row.get("cost_usd") or 0)
            op_counts[op] = op_counts.get(op, 0) + 1
            op_costs[op] = op_costs.get(op, 0.0) + cost
            if uid not in user_ops:
                user_ops[uid] = set()
            user_ops[uid].add(op)

        print(f"  Total de registros : {len(cost_logs)}")
        print(f"  Usuários com atividade : {len(user_ops)}")
        print()
        print(f"  {'Operação':<15} {'Chamadas':>8}  {'Custo USD':>12}")
        print(f"  {'-'*15} {'-'*8}  {'-'*12}")
        total_cost = 0.0
        for op in sorted(op_counts.keys()):
            count = op_counts[op]
            cost = op_costs[op]
            total_cost += cost
            print(f"  {op:<15} {count:>8}   ${cost:>11.6f}")
        print(f"  {'TOTAL':<15} {sum(op_counts.values()):>8}   ${total_cost:>11.6f}")

        # Usuários ativos sem log de AI nas últimas X horas
        active_with_no_ai = [uid for uid in unique_user_ids if uid not in user_ops]
        if active_with_no_ai:
            print(f"\n  ℹ️  Assinantes ativos sem atividade de IA nas últimas {CHECK_HOURS_BACK}h: {len(active_with_no_ai)}")
            for uid in active_with_no_ai:
                p = profiles_map.get(uid)
                nome = (p.get("nome") or uid[:8]) if p else uid[:8]
                print(f"       {nome}")
    else:
        print(f"  Nenhum registro de custo nas últimas {CHECK_HOURS_BACK}h.")

    # ------------------------------------------------------------------
    # 6. Transcrições recentes
    # ------------------------------------------------------------------
    _section(f"4. TRANSCRIÇÕES (últimas {CHECK_HOURS_BACK}h)")
    transcriptions = [r for r in cost_logs if r.get("operation") == "transcribe"]
    if transcriptions:
        user_transcriptions: dict[str, int] = {}
        for r in transcriptions:
            uid = r.get("user_id") or "?"
            user_transcriptions[uid] = user_transcriptions.get(uid, 0) + 1
        print(f"  Total de transcrições : {len(transcriptions)}")
        print(f"  Usuários com transcrição : {len(user_transcriptions)}")
        for uid, count in sorted(user_transcriptions.items(), key=lambda x: -x[1]):
            p = profiles_map.get(uid)
            nome = (p.get("nome") or uid[:8]) if p else uid[:8]
            print(f"       {nome:<32} {count} transcrição(ões)")
    else:
        print(f"  Nenhuma transcrição de áudio nas últimas {CHECK_HOURS_BACK}h.")

    # ------------------------------------------------------------------
    # 7. Resumo executivo
    # ------------------------------------------------------------------
    _section("5. RESUMO EXECUTIVO")
    total = len(unique_user_ids)
    n_ok = len(ok_users)
    n_overdue = len(overdue)
    n_never = len(never_received)
    n_blocked = len(blocked_by_hours)
    n_no_profile = len(no_profile)

    print(f"  Assinantes ativos         : {total}")
    print(f"  ✅  Recebendo normalmente  : {n_ok}")
    print(f"  🕐  Fora horário comercial : {n_blocked}")
    print(f"  🆕  Nunca recebeu (new)    : {n_never}")
    print(f"  ⚠️   Atrasados             : {n_overdue}")
    print(f"  ❌  Sem perfil             : {n_no_profile}")

    if n_overdue > 0 or n_no_profile > 0:
        print(f"\n  🔴 AÇÃO NECESSÁRIA — verifique usuários atrasados/sem perfil acima.")
        return_code = 2
    elif n_never > 0:
        print(f"\n  🟡 ATENÇÃO — {n_never} usuário(s) novo(s) ainda não receberam onboarding.")
        return_code = 1
    else:
        print(f"\n  🟢 Tudo OK — todos os assinantes estão recebendo seus Summis.")
        return_code = 0

    print()
    return return_code


if __name__ == "__main__":
    sys.exit(main())
