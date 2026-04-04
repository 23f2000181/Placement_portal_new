"""Celery worker entry point.

Run with:
    celery -A celery_worker.celery worker --loglevel=info --pool=solo

For beat (scheduled tasks):
    celery -A celery_worker.celery beat --loglevel=info
"""
import os
from app import create_app
from app.tasks.celery_config import make_celery

flask_app = create_app(os.environ.get('FLASK_ENV', 'development'))
celery = make_celery(flask_app)
