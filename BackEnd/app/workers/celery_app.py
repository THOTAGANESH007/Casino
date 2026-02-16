from celery import Celery
from celery.schedules import crontab
from ..config import settings

# Initialize Celery
celery_app = Celery(
    "fantasy_cricket_workers",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND
)

# Celery configuration
celery_app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
    task_track_started=True,
    task_time_limit=30 * 60,  # 30 minutes
    worker_prefetch_multiplier=1,
    worker_max_tasks_per_child=1000,
)

# Periodic tasks schedule
celery_app.conf.beat_schedule = {
    # Fetch upcoming matches every 6 hours
    'fetch-upcoming-matches': {
        'task': 'app.workers.match_scraper.fetch_upcoming_matches_task',
        'schedule': crontab(minute=0, hour='*/6'),
    },
    # Update live match scores every minute
    'update-live-scores': {
        'task': 'app.workers.score_updater.update_live_scores_task',
        'schedule': 60.0,  # Every 60 seconds
    },
}