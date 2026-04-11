"""Celery application factory."""
from celery import Celery
from celery.schedules import crontab


def make_celery(app):
    celery = Celery(
        app.import_name,
        broker=app.config['CELERY_BROKER_URL'],
        backend=app.config['CELERY_RESULT_BACKEND'],
        include=[
            'app.tasks.reminders',
            'app.tasks.reports',
            'app.tasks.exports'
        ]
    )
    celery.conf.update(
        task_serializer='json',
        accept_content=['json'],
        result_serializer='json',
        timezone='Asia/Kolkata',
        enable_utc=True,
        beat_schedule={
            'daily-deadline-reminders': {
                'task': 'app.tasks.reminders.send_deadline_reminders',
                'schedule': crontab(hour=8, minute=0),  # 8 AM IST
            },
            'daily-interview-reminders': {
                'task': 'app.tasks.reminders.send_interview_reminders',
                'schedule': crontab(hour=7, minute=0),  # 7 AM IST — before interviews
            },
            'monthly-activity-report': {
                'task': 'app.tasks.reports.send_monthly_report',
                'schedule': crontab(hour=9, minute=0, day_of_month=1),  # 1st of month
            },
        }
    )

    class ContextTask(celery.Task):
        def __call__(self, *args, **kwargs):
            with app.app_context():
                return self.run(*args, **kwargs)

    celery.Task = ContextTask
    return celery
