"""Company routes: /api/company/*"""
from datetime import datetime, timezone
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from ..extensions import db, cache
from ..models.user import User
from ..models.company import CompanyProfile
from ..models.drive import PlacementDrive
from ..models.application import Application
from ..utils.decorators import company_required, get_current_user

company_bp = Blueprint('company', __name__)


def _get_company_profile():
    user = get_current_user()
    if not user or not user.company_profile:
        return None, jsonify({'error': 'Company profile not found'}), 404
    return user.company_profile, None, None


# ── Profile ────────────────────────────────────────────────────────────────────

@company_bp.route('/profile', methods=['GET'])
@jwt_required()
@company_required
def get_profile():
    company, err, code = _get_company_profile()
    if err:
        return err, code
    return jsonify(company.to_dict(include_user=True)), 200


@company_bp.route('/profile', methods=['PUT'])
@jwt_required()
@company_required
def update_profile():
    company, err, code = _get_company_profile()
    if err:
        return err, code

    data = request.get_json() or {}
    editable = ('company_name', 'hr_contact', 'hr_phone', 'website', 'description', 'industry', 'headquarters')
    for field in editable:
        if field in data:
            setattr(company, field, data[field])

    db.session.commit()
    cache.delete(f'company:{company.id}:profile')
    return jsonify({'message': 'Profile updated', 'company': company.to_dict(include_user=True)}), 200


# ── Dashboard ──────────────────────────────────────────────────────────────────

@company_bp.route('/dashboard', methods=['GET'])
@jwt_required()
@company_required
def dashboard():
    company, err, code = _get_company_profile()
    if err:
        return err, code

    drives = company.drives.all()
    drive_data = []
    for d in drives:
        dd = d.to_dict()
        dd['status_counts'] = {
            'applied': d.applications.filter_by(status='applied').count(),
            'shortlisted': d.applications.filter_by(status='shortlisted').count(),
            'selected': d.applications.filter_by(status='selected').count(),
            'rejected': d.applications.filter_by(status='rejected').count()
        }
        drive_data.append(dd)

    return jsonify({
        'company': company.to_dict(include_user=True),
        'drives': drive_data,
        'total_drives': len(drives),
        'total_applicants': sum(d['applicant_count'] for d in drive_data)
    }), 200


# ── Drives ─────────────────────────────────────────────────────────────────────

@company_bp.route('/drives', methods=['GET'])
@jwt_required()
@company_required
def list_drives():
    company, err, code = _get_company_profile()
    if err:
        return err, code

    drives = company.drives.order_by(PlacementDrive.created_at.desc()).all()
    return jsonify({'drives': [d.to_dict() for d in drives]}), 200


@company_bp.route('/drives', methods=['POST'])
@jwt_required()
@company_required
def create_drive():
    company, err, code = _get_company_profile()
    if err:
        return err, code

    if company.approval_status != 'approved':
        return jsonify({'error': 'Your company must be approved by admin before creating drives'}), 403

    data = request.get_json() or {}
    required = ('job_title', 'job_description', 'application_deadline')
    for f in required:
        if not data.get(f):
            return jsonify({'error': f'Field "{f}" is required'}), 400

    try:
        deadline = datetime.fromisoformat(data['application_deadline'])
    except (ValueError, TypeError):
        return jsonify({'error': 'Invalid application_deadline format (use ISO 8601)'}), 400

    drive_date = None
    if data.get('drive_date'):
        try:
            drive_date = datetime.fromisoformat(data['drive_date'])
        except ValueError:
            return jsonify({'error': 'Invalid drive_date format'}), 400

    try:
        min_cgpa = float(data.get('min_cgpa', 0.0))
        package = float(data['package_lpa']) if data.get('package_lpa') else None
    except (ValueError, TypeError):
        return jsonify({'error': 'CGPA and package must be numbers'}), 400

    drive = PlacementDrive(
        company_id=company.id,
        job_title=data['job_title'].strip(),
        job_description=data['job_description'].strip(),
        job_type=data.get('job_type', 'Full Time'),
        location=data.get('location', ''),
        package_lpa=package,
        min_cgpa=min_cgpa,
        eligible_branches=data.get('eligible_branches', 'ALL'),
        eligible_years=data.get('eligible_years', 'ALL'),
        application_deadline=deadline,
        drive_date=drive_date,
        interview_mode=data.get('interview_mode', 'Online'),
        rounds=data.get('rounds', ''),
        status='pending'
    )
    db.session.add(drive)
    db.session.commit()
    cache.delete('drives:approved')
    return jsonify({'message': 'Drive created and pending admin approval', 'drive': drive.to_dict()}), 201


@company_bp.route('/drives/<int:drive_id>', methods=['PUT'])
@jwt_required()
@company_required
def update_drive(drive_id):
    company, err, code = _get_company_profile()
    if err:
        return err, code

    drive = PlacementDrive.query.filter_by(id=drive_id, company_id=company.id).first_or_404()
    if drive.status == 'closed':
        return jsonify({'error': 'Cannot edit a closed drive'}), 400

    data = request.get_json() or {}
    editable = ('job_title', 'job_description', 'job_type', 'location', 'min_cgpa',
                 'eligible_branches', 'eligible_years', 'interview_mode', 'rounds', 'package_lpa')
    for field in editable:
        if field in data:
            setattr(drive, field, data[field])

    if data.get('application_deadline'):
        drive.application_deadline = datetime.fromisoformat(data['application_deadline'])
    if data.get('drive_date'):
        drive.drive_date = datetime.fromisoformat(data['drive_date'])

    # If re-submitted edits, reset to pending
    if drive.status == 'rejected':
        drive.status = 'pending'
        drive.rejection_reason = None

    db.session.commit()
    cache.delete('drives:approved')
    return jsonify({'message': 'Drive updated', 'drive': drive.to_dict()}), 200


@company_bp.route('/drives/<int:drive_id>', methods=['DELETE'])
@jwt_required()
@company_required
def delete_drive(drive_id):
    company, err, code = _get_company_profile()
    if err:
        return err, code

    drive = PlacementDrive.query.filter_by(id=drive_id, company_id=company.id).first_or_404()
    db.session.delete(drive)
    db.session.commit()
    cache.delete('drives:approved')
    return jsonify({'message': 'Drive deleted'}), 200


@company_bp.route('/drives/<int:drive_id>/close', methods=['PUT'])
@jwt_required()
@company_required
def close_drive(drive_id):
    company, err, code = _get_company_profile()
    if err:
        return err, code
    drive = PlacementDrive.query.filter_by(id=drive_id, company_id=company.id).first_or_404()
    drive.status = 'closed'
    db.session.commit()
    cache.delete('drives:approved')
    return jsonify({'message': 'Drive closed', 'drive': drive.to_dict()}), 200


# ── Applications ───────────────────────────────────────────────────────────────

@company_bp.route('/drives/<int:drive_id>/applications', methods=['GET'])
@jwt_required()
@company_required
def drive_applications(drive_id):
    company, err, code = _get_company_profile()
    if err:
        return err, code

    drive = PlacementDrive.query.filter_by(id=drive_id, company_id=company.id).first_or_404()
    status_filter = request.args.get('status')
    q = drive.applications
    if status_filter:
        q = q.filter_by(status=status_filter)

    apps = [a.to_dict(include_student=True) for a in q.all()]
    return jsonify({
        'drive': drive.to_dict(),
        'applications': apps,
        'count': len(apps)
    }), 200


@company_bp.route('/applications/<int:app_id>/status', methods=['PUT'])
@jwt_required()
@company_required
def update_application_status(app_id):
    company, err, code = _get_company_profile()
    if err:
        return err, code

    app = Application.query.get_or_404(app_id)
    drive = PlacementDrive.query.filter_by(id=app.drive_id, company_id=company.id).first()
    if not drive:
        return jsonify({'error': 'Access denied to this application'}), 403

    data = request.get_json() or {}
    new_status = data.get('status')
    valid_statuses = ('applied', 'shortlisted', 'selected', 'rejected')
    if new_status not in valid_statuses:
        return jsonify({'error': f'Status must be one of: {", ".join(valid_statuses)}'}), 400

    app.status = new_status
    if data.get('interview_date'):
        app.interview_date = datetime.fromisoformat(data['interview_date'])
    if data.get('notes'):
        app.company_notes = data['notes']

    db.session.commit()
    cache.delete('admin:dashboard:stats')
    return jsonify({'message': 'Application status updated', 'application': app.to_dict(include_student=True)}), 200
