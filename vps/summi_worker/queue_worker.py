from __future__ import annotations

import datetime as dt
import logging
import sys
import time

from dotenv import load_dotenv

from .config import load_settings
from .evolution_client import EvolutionClient
from .openai_client import OpenAIClient
from .redis_queue import RedisQueueClient, run_now_result_key
from .summi_jobs import run_hourly_job, run_user_summi_now
from .supabase_rest import SupabaseRest


load_dotenv()

logger = logging.getLogger("summi_queue_worker")
if not logger.handlers:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")


def main() -> None:
    queue_kind = (sys.argv[1] if len(sys.argv) > 1 else "analysis").strip().lower()
    settings = load_settings()
    if not settings.redis_url:
        raise RuntimeError("REDIS_URL is required for queue worker")

    queue = RedisQueueClient.from_url(settings.redis_url)
    supabase = SupabaseRest(settings.supabase_url, settings.supabase_service_role_key)
    openai = OpenAIClient(settings.openai_api_key)
    evolution = EvolutionClient(settings.evolution_api_url, settings.evolution_api_key)

    queue_name = settings.queue_analysis_name if queue_kind == "analysis" else settings.queue_summary_name
    logger.info("queue_worker.started kind=%s queue=%s", queue_kind, queue_name)

    while True:
        try:
            job = queue.dequeue_blocking(queue_name, timeout_seconds=5)
            if not job:
                continue

            job_type = str(job.get("type") or "").strip().lower()
            logger.info("queue_worker.job_received kind=%s type=%s", queue_kind, job_type)

            if queue_kind == "analysis" and job_type == "analyze_user":
                logger.info("queue_worker.analysis_disabled payload=%s", job)
                continue

            if queue_kind == "summary" and job_type == "run_hourly":
                result = run_hourly_job(settings, supabase, openai, evolution)
                logger.info("queue_worker.summary_done result=%s", result)
                continue

            if queue_kind == "summary" and job_type == "run_user_summi_now":
                user_id = str(job.get("user_id") or "")
                job_id = str(job.get("job_id") or "")
                if not user_id or not job_id:
                    logger.warning("queue_worker.job_invalid missing_user_or_job_id payload=%s", job)
                    continue
                result = run_user_summi_now(settings, supabase, openai, evolution, user_id=user_id)
                payload = {
                    **result,
                    "job_id": job_id,
                    "user_id": user_id,
                    "completed_at": dt.datetime.now(dt.timezone.utc).isoformat(),
                }
                queue.set_json(run_now_result_key(job_id), payload, settings.run_now_result_ttl_seconds)
                logger.info("queue_worker.run_now_done user_id=%s job_id=%s result=%s", user_id, job_id, result)
                continue

            logger.warning("queue_worker.unsupported_job kind=%s type=%s payload=%s", queue_kind, job_type, job)
        except KeyboardInterrupt:
            break
        except Exception:
            logger.exception("queue_worker.loop_error kind=%s", queue_kind)
            time.sleep(2)


if __name__ == "__main__":
    main()
