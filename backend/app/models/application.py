from datetime import datetime, timezone
from ..extensions import db


class Application(db.Model):
    __tablename__ = 'applications'

    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('student_profiles.id'), nullable=False)
    drive_id = db.Column(db.Integer, db.ForeignKey('placement_drives.id'), nullable=False)
    applied_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    status = db.Column(db.String(20), default='applied')  # applied/shortlisted/selected/rejected
    interview_date = db.Column(db.DateTime)
    company_notes = db.Column(db.Text)
    student_notes = db.Column(db.Text)
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc),
                           onupdate=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        db.UniqueConstraint('student_id', 'drive_id', name='uq_student_drive'),
    )

    def to_dict(self, include_student=False, include_drive=False):
        data = {
            'id': self.id,
            'student_id': self.student_id,
            'drive_id': self.drive_id,
            'applied_at': self.applied_at.isoformat() if self.applied_at else None,
            'status': self.status,
            'interview_date': self.interview_date.isoformat() if self.interview_date else None,
            'company_notes': self.company_notes,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
        if include_student and self.student:
            data['student'] = {
                'id': self.student.id,
                'full_name': self.student.full_name,
                'usn': self.student.usn,
                'branch': self.student.branch,
                'cgpa': self.student.cgpa,
                'year': self.student.year,
                'email': self.student.user.email if self.student.user else None,
                'phone': self.student.phone,
                'resume_filename': self.student.resume_filename,
                'has_resume': bool(self.student.resume_path),
                'linkedin': self.student.linkedin
            }
        if include_drive and self.drive:
            data['drive'] = {
                'id': self.drive.id,
                'job_title': self.drive.job_title,
                'company_id': self.drive.company_id,
                'company_name': self.drive.company.company_name if self.drive.company else None,
                'drive_date': self.drive.drive_date.isoformat() if self.drive.drive_date else None,
                'application_deadline': self.drive.application_deadline.isoformat() if self.drive.application_deadline else None,
                'package_lpa': self.drive.package_lpa,
                'location': self.drive.location,
                'job_type': self.drive.job_type
            }
        return data
