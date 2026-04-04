from datetime import datetime, timezone
from ..extensions import db


class StudentProfile(db.Model):
    __tablename__ = 'student_profiles'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, unique=True)
    full_name = db.Column(db.String(200), nullable=False)
    usn = db.Column(db.String(50), unique=True, nullable=False)
    branch = db.Column(db.String(100), nullable=False)
    cgpa = db.Column(db.Float, nullable=False)
    year = db.Column(db.Integer, nullable=False)
    phone = db.Column(db.String(20))
    address = db.Column(db.Text)
    linkedin = db.Column(db.String(255))
    github = db.Column(db.String(255))
    skills = db.Column(db.Text)
    resume_path = db.Column(db.String(512))
    resume_filename = db.Column(db.String(256))
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc),
                           onupdate=lambda: datetime.now(timezone.utc))

    applications = db.relationship('Application', backref='student', lazy='dynamic', cascade='all, delete-orphan')

    def to_dict(self, include_user=False):
        data = {
            'id': self.id,
            'user_id': self.user_id,
            'full_name': self.full_name,
            'usn': self.usn,
            'branch': self.branch,
            'cgpa': self.cgpa,
            'year': self.year,
            'phone': self.phone,
            'address': self.address,
            'linkedin': self.linkedin,
            'github': self.github,
            'skills': self.skills,
            'resume_filename': self.resume_filename,
            'has_resume': bool(self.resume_path),
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
        if include_user and self.user:
            data['email'] = self.user.email
            data['is_active'] = self.user.is_active
            data['is_blacklisted'] = self.user.is_blacklisted
        return data
