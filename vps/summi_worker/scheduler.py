from __future__ import annotations

import time

from apscheduler.schedulers.background import BackgroundScheduler
from dotenv import load_dotenv

from .config import load_settings
from .evolution_client import EvolutionClient
from .openai_client import OpenAIClient
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

    scheduler = BackgroundScheduler()

    # Executa a cada 1 hora (na VPS voce pode trocar por systemd timer/cron se preferir).
    scheduler.add_job(
        lambda: run_hourly_job(settings, supabase, openai, evolution),
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

