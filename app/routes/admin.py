"""Admin routes: /api/admin/*"""
from datetime import datetime, timezone
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from sqlalchemy import func

from ..extensions import db, cache
from ..models.user import User
from ..models.company import CompanyProfile
from ..models.student import StudentProfile
from ..models.drive import PlacementDrive
from ..models.application import Application
from ..utils.decorators import admin_required

admin_bp = Blueprint('admin', __name__)


@admin_bp.route('/dashboard', methods=['GET'])
@jwt_required()
@admin_required
def dashboard():
    cached = cache.get('admin:dashboard:stats')
    if cached:
        return jsonify(cached), 200

    total_students = StudentProfile.query.count()
    total_companies = CompanyProfile.query.filter_by(approval_status='approved').count()
    pending_companies = CompanyProfile.query.filter_by(approval_status='pending').count()
    total_drives = PlacementDrive.query.filter_by(status='approved').count()
    pending_drives = PlacementDrive.query.filter_by(status='pending').count()
    total_applications = Application.query.count()
    selected_students = Application.query.filter_by(status='selected').count()

    # Recent activity
    recent_applications = (
        Application.query
        .order_by(Application.applied_at.desc())
        .limit(5)
        .all()
    )

    stats = {
        'total_students': total_students,
        'total_companies': total_companies,
        'pending_companies': pending_companies,
        'total_drives': total_drives,
        'pending_drives': pending_drives,
        'total_applications': total_applications,
        'selected_students': selected_students,
        'recent_applications': [a.to_dict(include_student=True, include_drive=True) for a in recent_applications]
    }
    cache.set('admin:dashboard:stats', stats, timeout=300)
    return jsonify(stats), 200


# ── Company management ─────────────────────────────────────────────────────────

@admin_bp.route('/companies', methods=['GET'])
@jwt_required()
@admin_required
def list_companies():
    status = request.args.get('status')
    search = request.args.get('q', '').strip()
    page = int(request.args.get('page', 1))
    per_page = int(request.args.get('per_page', 20))

    query = CompanyProfile.query
    if status:
        query = query.filter_by(approval_status=status)
    if search:
        query = query.filter(CompanyProfile.company_name.ilike(f'%{search}%'))

    pagination = query.order_by(CompanyProfile.created_at.desc()).paginate(page=page, per_page=per_page, error_out=False)
    companies = [c.to_dict(include_user=True) for c in pagination.items]

    return jsonify({
        'companies': companies,
        'total': pagination.total,
        'pages': pagination.pages,
        'current_page': page
    }), 200


@admin_bp.route('/companies/<int:company_id>', methods=['GET'])
@jwt_required()
@admin_required
def get_company(company_id):
    company = CompanyProfile.query.get_or_404(company_id)
    data = company.to_dict(include_user=True)
    data['drives'] = [d.to_dict() for d in company.drives.all()]
    return jsonify(data), 200


@admin_bp.route('/companies/<int:company_id>/approve', methods=['PUT'])
@jwt_required()
@admin_required
def approve_company(company_id):
    company = CompanyProfile.query.get_or_404(company_id)
    company.approval_status = 'approved'
    company.approved_at = datetime.now(timezone.utc)
    company.rejection_reason = None
    db.session.commit()
    cache.delete('admin:dashboard:stats')
    return jsonify({'message': 'Company approved', 'company': company.to_dict(include_user=True)}), 200


@admin_bp.route('/companies/<int:company_id>/reject', methods=['PUT'])
@jwt_required()
@admin_required
def reject_company(company_id):
    company = CompanyProfile.query.get_or_404(company_id)
    data = request.get_json() or {}
    company.approval_status = 'rejected'
    company.rejection_reason = data.get('reason', '')
    db.session.commit()
    cache.delete('admin:dashboard:stats')
    return jsonify({'message': 'Company rejected', 'company': company.to_dict(include_user=True)}), 200


@admin_bp.route('/companies/<int:company_id>/blacklist', methods=['PUT'])
@jwt_required()
@admin_required
def blacklist_company(company_id):
    company = CompanyProfile.query.get_or_404(company_id)
    user = User.query.get(company.user_id)
    data = request.get_json() or {}
    action = data.get('action', 'blacklist')  # blacklist or unblacklist
    user.is_blacklisted = (action == 'blacklist')
    db.session.commit()
    cache.delete('admin:dashboard:stats')
    msg = 'Company blacklisted' if user.is_blacklisted else 'Company un-blacklisted'
    return jsonify({'message': msg}), 200


# ── Student management ─────────────────────────────────────────────────────────

@admin_bp.route('/students', methods=['GET'])
@jwt_required()
@admin_required
def list_students():
    search = request.args.get('q', '').strip()
    branch = request.args.get('branch')
    year = request.args.get('year')
    page = int(request.args.get('page', 1))
    per_page = int(request.args.get('per_page', 20))

    query = StudentProfile.query
    if search:
        query = query.filter(
            (StudentProfile.full_name.ilike(f'%{search}%')) |
            (StudentProfile.usn.ilike(f'%{search}%'))
        )
    if branch:
        query = query.filter(StudentProfile.branch.ilike(f'%{branch}%'))
    if year:
        query = query.filter_by(year=int(year))

    pagination = query.order_by(StudentProfile.full_name).paginate(page=page, per_page=per_page, error_out=False)
    students = [s.to_dict(include_user=True) for s in pagination.items]

    return jsonify({
        'students': students,
        'total': pagination.total,
        'pages': pagination.pages,
        'current_page': page
    }), 200


@admin_bp.route('/students/<int:student_id>', methods=['GET'])
@jwt_required()
@admin_required
def get_student(student_id):
    student = StudentProfile.query.get_or_404(student_id)
    data = student.to_dict(include_user=True)
    data['applications'] = [a.to_dict(include_drive=True) for a in student.applications.all()]
    return jsonify(data), 200


@admin_bp.route('/students/<int:student_id>/blacklist', methods=['PUT'])
@jwt_required()
@admin_required
def blacklist_student(student_id):
    student = StudentProfile.query.get_or_404(student_id)
    user = User.query.get(student.user_id)
    data = request.get_json() or {}
    action = data.get('action', 'blacklist')
    user.is_blacklisted = (action == 'blacklist')
    db.session.commit()
    msg = 'Student blacklisted' if user.is_blacklisted else 'Student un-blacklisted'
    return jsonify({'message': msg}), 200


# ── Drive management ───────────────────────────────────────────────────────────

@admin_bp.route('/drives', methods=['GET'])
@jwt_required()
@admin_required
def list_drives():
    status = request.args.get('status')
    search = request.args.get('q', '').strip()
    page = int(request.args.get('page', 1))
    per_page = int(request.args.get('per_page', 20))

    query = PlacementDrive.query
    if status:
        query = query.filter_by(status=status)
    if search:
        query = query.filter(PlacementDrive.job_title.ilike(f'%{search}%'))

    pagination = query.order_by(PlacementDrive.created_at.desc()).paginate(page=page, per_page=per_page, error_out=False)
    drives = [d.to_dict(include_company=True) for d in pagination.items]

    return jsonify({
        'drives': drives,
        'total': pagination.total,
        'pages': pagination.pages,
        'current_page': page
    }), 200


@admin_bp.route('/drives/<int:drive_id>/approve', methods=['PUT'])
@jwt_required()
@admin_required
def approve_drive(drive_id):
    drive = PlacementDrive.query.get_or_404(drive_id)
    drive.status = 'approved'
    drive.approved_at = datetime.now(timezone.utc)
    drive.rejection_reason = None
    db.session.commit()
    cache.delete('admin:dashboard:stats')
    cache.delete('drives:approved')
    return jsonify({'message': 'Drive approved', 'drive': drive.to_dict(include_company=True)}), 200


@admin_bp.route('/drives/<int:drive_id>/reject', methods=['PUT'])
@jwt_required()
@admin_required
def reject_drive(drive_id):
    drive = PlacementDrive.query.get_or_404(drive_id)
    data = request.get_json() or {}
    drive.status = 'rejected'
    drive.rejection_reason = data.get('reason', '')
    db.session.commit()
    cache.delete('drives:approved')
    return jsonify({'message': 'Drive rejected', 'drive': drive.to_dict(include_company=True)}), 200


# ── Applications (Admin view) ──────────────────────────────────────────────────

@admin_bp.route('/applications', methods=['GET'])
@jwt_required()
@admin_required
def list_applications():
    page = int(request.args.get('page', 1))
    per_page = int(request.args.get('per_page', 30))
    status = request.args.get('status')

    query = Application.query
    if status:
        query = query.filter_by(status=status)

    pagination = query.order_by(Application.applied_at.desc()).paginate(page=page, per_page=per_page, error_out=False)
    apps = [a.to_dict(include_student=True, include_drive=True) for a in pagination.items]

    return jsonify({
        'applications': apps,
        'total': pagination.total,
        'pages': pagination.pages,
        'current_page': page
    }), 200


# ── Search ─────────────────────────────────────────────────────────────────────

@admin_bp.route('/search', methods=['GET'])
@jwt_required()
@admin_required
def search():
    q = request.args.get('q', '').strip()
    entity = request.args.get('type', 'all')  # students / companies / drives / all

    results = {}
    if not q:
        return jsonify(results), 200

    if entity in ('students', 'all'):
        students = StudentProfile.query.filter(
            (StudentProfile.full_name.ilike(f'%{q}%')) |
            (StudentProfile.usn.ilike(f'%{q}%'))
        ).limit(10).all()
        results['students'] = [s.to_dict(include_user=True) for s in students]

    if entity in ('companies', 'all'):
        companies = CompanyProfile.query.filter(
            CompanyProfile.company_name.ilike(f'%{q}%')
        ).limit(10).all()
        results['companies'] = [c.to_dict(include_user=True) for c in companies]

    if entity in ('drives', 'all'):
        drives = PlacementDrive.query.filter(
            PlacementDrive.job_title.ilike(f'%{q}%')
        ).limit(10).all()
        results['drives'] = [d.to_dict(include_company=True) for d in drives]

    return jsonify(results), 200


# ── Reports ────────────────────────────────────────────────────────────────────

@admin_bp.route('/reports', methods=['GET'])
@jwt_required()
@admin_required
def reports():
    from sqlalchemy import extract
    year = int(request.args.get('year', datetime.now(timezone.utc).year))
    month = request.args.get('month')

    query = Application.query
    drive_query = PlacementDrive.query

    if month:
        month = int(month)
        query = query.filter(
            extract('year', Application.applied_at) == year,
            extract('month', Application.applied_at) == month
        )
        drive_query = drive_query.filter(
            extract('year', PlacementDrive.created_at) == year,
            extract('month', PlacementDrive.created_at) == month
        )
    else:
        query = query.filter(extract('year', Application.applied_at) == year)
        drive_query = drive_query.filter(extract('year', PlacementDrive.created_at) == year)

    total_apps = query.count()
    selected = query.filter_by(status='selected').count()
    shortlisted = query.filter_by(status='shortlisted').count()
    rejected = query.filter_by(status='rejected').count()
    drives_count = drive_query.filter_by(status='approved').count()

    # Monthly breakdown for charts
    monthly = []
    for m in range(1, 13):
        m_apps = Application.query.filter(
            extract('year', Application.applied_at) == year,
            extract('month', Application.applied_at) == m
        ).count()
        m_selected = Application.query.filter(
            extract('year', Application.applied_at) == year,
            extract('month', Application.applied_at) == m
        ).filter_by(status='selected').count()
        monthly.append({'month': m, 'applications': m_apps, 'selected': m_selected})

    top_companies = (
        db.session.query(CompanyProfile.company_name, func.count(Application.id).label('count'))
        .join(PlacementDrive, PlacementDrive.company_id == CompanyProfile.id)
        .join(Application, Application.drive_id == PlacementDrive.id)
        .group_by(CompanyProfile.id)
        .order_by(func.count(Application.id).desc())
        .limit(10)
        .all()
    )

    return jsonify({
        'year': year,
        'month': month,
        'total_applications': total_apps,
        'selected': selected,
        'shortlisted': shortlisted,
        'rejected': rejected,
        'drives_conducted': drives_count,
        'monthly_breakdown': monthly,
        'top_companies': [{'company': c[0], 'applications': c[1]} for c in top_companies]
    }), 200
