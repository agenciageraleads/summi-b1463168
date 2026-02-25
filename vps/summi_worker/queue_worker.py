from __future__ import annotations

import logging
import sys
import time

from dotenv import load_dotenv

from .config import load_settings
from .evolution_client import EvolutionClient
from .openai_client import OpenAIClient
from .redis_queue import RedisQueueClient
from .summi_jobs import analyze_user_chats, run_hourly_job
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
                user_id = str(job.get("user_id") or "")
                if not user_id:
                    logger.warning("queue_worker.job_invalid missing_user_id")
                    continue
                result = analyze_user_chats(settings, supabase, openai, user_id=user_id)
                logger.info("queue_worker.analysis_done user_id=%s result=%s", user_id, result)
                continue

            if queue_kind == "summary" and job_type == "run_hourly":
                result = run_hourly_job(settings, supabase, openai, evolution)
                logger.info("queue_worker.summary_done result=%s", result)
                continue

            logger.warning("queue_worker.unsupported_job kind=%s type=%s payload=%s", queue_kind, job_type, job)
        except KeyboardInterrupt:
            break
        except Exception:
            logger.exception("queue_worker.loop_error kind=%s", queue_kind)
            time.sleep(2)


if __name__ == "__main__":
    main()
