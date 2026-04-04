"""Daily deadline reminder task."""
from datetime import datetime, timezone, timedelta
from celery import shared_task
from flask_mail import Message


@shared_task(name='app.tasks.reminders.send_deadline_reminders')
def send_deadline_reminders():
    """Send email reminders to students for drives with deadlines in the next 3 days."""
    from app import create_app
    from app.extensions import mail, db
    from app.models.drive import PlacementDrive
    from app.models.application import Application
    from app.models.student import StudentProfile
    from app.models.user import User

    app = create_app()
    with app.app_context():
        now = datetime.now(timezone.utc)
        three_days_later = now + timedelta(days=3)

        # Get approved drives with deadlines in the next 3 days
        upcoming_drives = PlacementDrive.query.filter(
            PlacementDrive.status == 'approved',
            PlacementDrive.application_deadline >= now,
            PlacementDrive.application_deadline <= three_days_later
        ).all()

        sent_count = 0
        for drive in upcoming_drives:
            # Get students who haven't applied yet
            applied_student_ids = {
                a.student_id for a in Application.query.filter_by(drive_id=drive.id).all()
            }
            students = StudentProfile.query.all()

            for student in students:
                if student.id in applied_student_ids:
                    continue

                # Check eligibility
                eligible = True
                if drive.min_cgpa and student.cgpa < drive.min_cgpa:
                    eligible = False
                if drive.eligible_branches and drive.eligible_branches != 'ALL':
                    allowed = [b.strip() for b in drive.eligible_branches.split(',')]
                    if student.branch not in allowed:
                        eligible = False

                if not eligible:
                    continue

                user = User.query.get(student.user_id)
                if not user or user.is_blacklisted or not user.is_active:
                    continue

                deadline_str = drive.application_deadline.strftime('%d %B %Y')
                try:
                    msg = Message(
                        subject=f'[Placement Portal] Reminder: {drive.job_title} deadline on {deadline_str}',
                        recipients=[user.email],
                        html=f"""
                        <h2>Application Deadline Reminder</h2>
                        <p>Hi {student.full_name},</p>
                        <p>This is a reminder that the application deadline for <strong>{drive.job_title}</strong>
                        at <strong>{drive.company.company_name}</strong> is on <strong>{deadline_str}</strong>.</p>
                        <p>You have not yet applied. Log in to the Placement Portal to apply now!</p>
                        <p>Package: {drive.package_lpa} LPA | Location: {drive.location}</p>
                        <br><p>Best regards,<br>Placement Cell</p>
                        """
                    )
                    mail.send(msg)
                    sent_count += 1
                except Exception as e:
                    print(f'[Reminder] Failed to send to {user.email}: {e}')

        print(f'[Reminder] Sent {sent_count} deadline reminders')
        return {'sent': sent_count}
