from __future__ import annotations

import time

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from dotenv import load_dotenv

from .config import load_settings
from .evolution_client import EvolutionClient
from .openai_client import OpenAIClient
from .redis_queue import RedisQueueClient
from .blog_writer import run_daily_blog_post
from .summi_jobs import run_daily_summary_job, run_hourly_job
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
        result = run_hourly_job(settings, supabase, openai, evolution)
        print(f"Hourly summary done: {result}")

    # Executa a cada 1 hora (na VPS voce pode trocar por systemd timer/cron se preferir).
    scheduler.add_job(
        _run_or_enqueue_hourly,
        "interval",
        hours=1,
        max_instances=1,
        coalesce=True,
        misfire_grace_time=300,
    )

    if settings.blog_auto_post_enabled:
        def _run_blog_post() -> None:
            run_daily_blog_post(
                supabase=supabase,
                openai_api_key=settings.openai_api_key,
                unsplash_access_key=settings.unsplash_access_key,
            )

        scheduler.add_job(
            _run_blog_post,
            "cron",
            hour=settings.blog_post_hour,
            minute=0,
            max_instances=1,
            coalesce=True,
            misfire_grace_time=3600,
        )
        print(f"Blog auto-post scheduled daily at {settings.blog_post_hour:02d}:00")

    # Job diário: resumo de conversas pendentes + Inbox Zero no horário configurado.
    if settings.enable_daily_job:
        def _run_daily_summary() -> None:
            print(
                "Running daily summary job at "
                f"{settings.daily_summary_hour_utc:02d}:00 ({settings.daily_summary_timezone})"
            )
            try:
                result = run_daily_summary_job(settings, supabase, openai, evolution)
                print(f"Daily summary done: {result}")
            except Exception as exc:
                print(f"Daily summary job failed: {exc}")

        scheduler.add_job(
            _run_daily_summary,
            CronTrigger(
                hour=settings.daily_summary_hour_utc,
                minute=0,
                timezone=settings.daily_summary_timezone,
            ),
            id="daily_summary_job",
            max_instances=1,
            coalesce=True,
            misfire_grace_time=600,
        )
        print(
            "Daily summary job scheduled for "
            f"{settings.daily_summary_hour_utc:02d}:00 ({settings.daily_summary_timezone})"
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
