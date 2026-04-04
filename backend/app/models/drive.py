from datetime import datetime, timezone
from ..extensions import db


class PlacementDrive(db.Model):
    __tablename__ = 'placement_drives'

    id = db.Column(db.Integer, primary_key=True)
    company_id = db.Column(db.Integer, db.ForeignKey('company_profiles.id'), nullable=False)
    job_title = db.Column(db.String(200), nullable=False)
    job_description = db.Column(db.Text, nullable=False)
    job_type = db.Column(db.String(50), default='Full Time')
    location = db.Column(db.String(200))
    package_lpa = db.Column(db.Float)
    min_cgpa = db.Column(db.Float, default=0.0)
    eligible_branches = db.Column(db.Text, default='ALL')
    eligible_years = db.Column(db.Text, default='ALL')
    application_deadline = db.Column(db.DateTime, nullable=False)
    drive_date = db.Column(db.DateTime)
    interview_mode = db.Column(db.String(50), default='Online')
    rounds = db.Column(db.Text)
    status = db.Column(db.String(20), default='pending')  # pending/approved/closed/rejected
    rejection_reason = db.Column(db.Text)
    approved_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc),
                           onupdate=lambda: datetime.now(timezone.utc))

    applications = db.relationship('Application', backref='drive', lazy='dynamic', cascade='all, delete-orphan')

    def to_dict(self, include_company=False):
        data = {
            'id': self.id,
            'company_id': self.company_id,
            'job_title': self.job_title,
            'job_description': self.job_description,
            'job_type': self.job_type,
            'location': self.location,
            'package_lpa': self.package_lpa,
            'min_cgpa': self.min_cgpa,
            'eligible_branches': self.eligible_branches,
            'eligible_years': self.eligible_years,
            'application_deadline': self.application_deadline.isoformat() if self.application_deadline else None,
            'drive_date': self.drive_date.isoformat() if self.drive_date else None,
            'interview_mode': self.interview_mode,
            'rounds': self.rounds,
            'status': self.status,
            'rejection_reason': self.rejection_reason,
            'approved_at': self.approved_at.isoformat() if self.approved_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'applicant_count': self.applications.count()
        }
        if include_company and self.company:
            data['company_name'] = self.company.company_name
            data['company_website'] = self.company.website
            data['company_industry'] = self.company.industry
        return data
