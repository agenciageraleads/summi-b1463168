from __future__ import annotations

import time

from apscheduler.schedulers.background import BackgroundScheduler
from dotenv import load_dotenv

from .config import load_settings
from .evolution_client import EvolutionClient
from .openai_client import OpenAIClient
from .redis_queue import RedisQueueClient
from .summi_jobs import run_hourly_job
from .supabase_rest import SupabaseRest


def main() -> None:
    load_dotenv()
    settings = load_settings()

    if not settings.enable_hourly_job:
        print("ENABLE_HOURLY_JOB=false; exiting")
        return

    supabase = SupabaseRest(settings.supabase_url, settings.supabase_service_role_key)
    openai = OpenAIClient(settings.openai_api_key)
    evolution = EvolutionClient(settings.evolution_api_url, settings.evolution_api_key)
    queue = RedisQueueClient.from_url(settings.redis_url) if (settings.enable_summary_queue and settings.redis_url) else None

    scheduler = BackgroundScheduler()

    def _run_or_enqueue_hourly() -> None:
        if settings.enable_summary_queue and queue is not None:
            queue.enqueue(settings.queue_summary_name, {"type": "run_hourly", "trigger": "scheduler"})
            print("Enqueued hourly summary job")
            return
        run_hourly_job(settings, supabase, openai, evolution)

    # Executa a cada 1 hora (na VPS voce pode trocar por systemd timer/cron se preferir).
    scheduler.add_job(
        _run_or_enqueue_hourly,
        "interval",
        hours=1,
        max_instances=1,
        coalesce=True,
        misfire_grace_time=300,
    )

    scheduler.start()
    print("Scheduler started (hourly job enabled)")

    try:
        while True:
            time.sleep(60)
    except KeyboardInterrupt:
        scheduler.shutdown()


if __name__ == "__main__":
    main()
