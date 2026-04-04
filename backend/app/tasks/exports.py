"""CSV export async task."""
import csv
import os
from datetime import datetime, timezone
from celery import shared_task


@shared_task(name='app.tasks.exports.export_applications_csv', bind=True)
def export_applications_csv(self, student_id):
    """Async task: export student's applications to CSV."""
    from app import create_app
    from app.models.student import StudentProfile
    from app.models.application import Application

    app = create_app()
    with app.app_context():
        self.update_state(state='PROGRESS', meta={'current': 0, 'total': 100})

        student = StudentProfile.query.get(student_id)
        if not student:
            return {'error': 'Student not found'}

        apps = student.applications.order_by(Application.applied_at.desc()).all()
        total = len(apps)

        export_dir = app.config['EXPORT_FOLDER']
        os.makedirs(export_dir, exist_ok=True)
        filename = f'export_{self.request.id}_{student_id}.csv'
        filepath = os.path.join(export_dir, filename)

        with open(filepath, 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow([
                'Application ID', 'Student ID', 'USN', 'Full Name',
                'Company Name', 'Drive Title', 'Job Type',
                'Package (LPA)', 'Location', 'Status',
                'Applied Date', 'Interview Date', 'Updated Date'
            ])

            for idx, a in enumerate(apps):
                writer.writerow([
                    a.id,
                    student.id,
                    student.usn,
                    student.full_name,
                    a.drive.company.company_name if a.drive and a.drive.company else '',
                    a.drive.job_title if a.drive else '',
                    a.drive.job_type if a.drive else '',
                    a.drive.package_lpa if a.drive else '',
                    a.drive.location if a.drive else '',
                    a.status,
                    a.applied_at.strftime('%Y-%m-%d %H:%M') if a.applied_at else '',
                    a.interview_date.strftime('%Y-%m-%d') if a.interview_date else '',
                    a.updated_at.strftime('%Y-%m-%d %H:%M') if a.updated_at else ''
                ])
                self.update_state(
                    state='PROGRESS',
                    meta={'current': int((idx + 1) / max(total, 1) * 100), 'total': 100}
                )

        return {
            'status': 'done',
            'student_id': student_id,
            'filename': filename,
            'total_records': total,
            'task_id': self.request.id
        }
