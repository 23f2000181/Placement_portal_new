from datetime import datetime, timezone
from ..extensions import db


class CompanyProfile(db.Model):
    __tablename__ = 'company_profiles'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, unique=True)
    company_name = db.Column(db.String(200), nullable=False)
    hr_contact = db.Column(db.String(150))
    hr_phone = db.Column(db.String(20))
    website = db.Column(db.String(255))
    description = db.Column(db.Text)
    industry = db.Column(db.String(100))
    headquarters = db.Column(db.String(200))
    approval_status = db.Column(db.String(20), default='pending')  # pending/approved/rejected
    rejection_reason = db.Column(db.Text)
    approved_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    drives = db.relationship('PlacementDrive', backref='company', lazy='dynamic', cascade='all, delete-orphan')

    def to_dict(self, include_user=False):
        data = {
            'id': self.id,
            'user_id': self.user_id,
            'company_name': self.company_name,
            'hr_contact': self.hr_contact,
            'hr_phone': self.hr_phone,
            'website': self.website,
            'description': self.description,
            'industry': self.industry,
            'headquarters': self.headquarters,
            'approval_status': self.approval_status,
            'rejection_reason': self.rejection_reason,
            'approved_at': self.approved_at.isoformat() if self.approved_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'total_drives': self.drives.count()
        }
        if include_user and self.user:
            data['email'] = self.user.email
            data['is_active'] = self.user.is_active
            data['is_blacklisted'] = self.user.is_blacklisted
        return data
