"""Student routes: /api/student/*"""
import os
import csv
import io
from datetime import datetime, timezone
from flask import Blueprint, request, jsonify, send_file, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from werkzeug.utils import secure_filename

from ..extensions import db, cache
from ..models.user import User
from ..models.student import StudentProfile
from ..models.drive import PlacementDrive
from ..models.application import Application
from ..utils.decorators import student_required, get_current_user

student_bp = Blueprint('student', __name__)

ALLOWED_EXTENSIONS = {'pdf', 'doc', 'docx'}


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def _get_student_profile():
    user = get_current_user()
    if not user or not user.student_profile:
        return None, jsonify({'error': 'Student profile not found'}), 404
    return user.student_profile, None, None


# ── Profile ────────────────────────────────────────────────────────────────────

@student_bp.route('/profile', methods=['GET'])
@jwt_required()
@student_required
def get_profile():
    student, err, code = _get_student_profile()
    if err:
        return err, code
    return jsonify(student.to_dict(include_user=True)), 200


@student_bp.route('/profile', methods=['PUT'])
@jwt_required()
@student_required
def update_profile():
    student, err, code = _get_student_profile()
    if err:
        return err, code

    data = request.get_json() or {}
    editable = ('full_name', 'phone', 'address', 'linkedin', 'github', 'skills')
    for field in editable:
        if field in data:
            setattr(student, field, data[field])

    if 'cgpa' in data:
        try:
            cgpa = float(data['cgpa'])
            if not 0.0 <= cgpa <= 10.0:
                return jsonify({'error': 'CGPA must be 0.0–10.0'}), 400
            student.cgpa = cgpa
        except ValueError:
            return jsonify({'error': 'CGPA must be a number'}), 400

    student.updated_at = datetime.now(timezone.utc)
    db.session.commit()
    cache.delete(f'student:{student.id}:profile')
    return jsonify({'message': 'Profile updated', 'student': student.to_dict(include_user=True)}), 200


@student_bp.route('/profile/resume', methods=['POST'])
@jwt_required()
@student_required
def upload_resume():
    student, err, code = _get_student_profile()
    if err:
        return err, code

    if 'resume' not in request.files:
        return jsonify({'error': 'No file part named "resume"'}), 400

    file = request.files['resume']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400

    if not allowed_file(file.filename):
        return jsonify({'error': 'Only PDF, DOC, DOCX allowed'}), 400

    filename = secure_filename(f'student_{student.id}_{file.filename}')
    upload_dir = current_app.config['UPLOAD_FOLDER']
    filepath = os.path.join(upload_dir, filename)
    file.save(filepath)

    student.resume_path = filepath
    student.resume_filename = file.filename
    db.session.commit()
    return jsonify({'message': 'Resume uploaded', 'filename': file.filename}), 200


@student_bp.route('/profile/resume', methods=['GET'])
@jwt_required()
@student_required
def download_resume():
    student, err, code = _get_student_profile()
    if err:
        return err, code
    if not student.resume_path or not os.path.exists(student.resume_path):
        return jsonify({'error': 'No resume on file'}), 404
    return send_file(student.resume_path, as_attachment=True, download_name=student.resume_filename)


# ── Drives ─────────────────────────────────────────────────────────────────────

@student_bp.route('/drives', methods=['GET'])
@jwt_required()
@student_required
def list_drives():
    student, err, code = _get_student_profile()
    if err:
        return err, code

    search = request.args.get('q', '').strip()
    branch_filter = request.args.get('branch', '').strip()
    min_pkg = request.args.get('min_package')
    eligible_only = request.args.get('eligible_only', 'false').lower() == 'true'
    page = int(request.args.get('page', 1))
    per_page = int(request.args.get('per_page', 20))

    cached = cache.get('drives:approved')
    if not cached or search or branch_filter or min_pkg or eligible_only:
        query = PlacementDrive.query.filter_by(status='approved')

        if search:
            query = query.filter(
                (PlacementDrive.job_title.ilike(f'%{search}%')) |
                (PlacementDrive.location.ilike(f'%{search}%'))
            )
        if min_pkg:
            try:
                query = query.filter(PlacementDrive.package_lpa >= float(min_pkg))
            except ValueError:
                pass

        drives = query.order_by(PlacementDrive.application_deadline.asc()).all()

        if not search and not branch_filter and not min_pkg:
            cache.set('drives:approved', [d.id for d in drives], timeout=600)
    else:
        drive_ids = cached
        drives = PlacementDrive.query.filter(PlacementDrive.id.in_(drive_ids)).all()

    # Annotate eligibility
    result = []
    applied_ids = {a.drive_id for a in student.applications.all()}
    for d in drives:
        dd = d.to_dict(include_company=True)
        dd['already_applied'] = d.id in applied_ids

        # Eligibility check
        eligible = True
        reasons = []
        if d.min_cgpa and student.cgpa < d.min_cgpa:
            eligible = False
            reasons.append(f'CGPA {student.cgpa} < required {d.min_cgpa}')
        if d.eligible_branches and d.eligible_branches != 'ALL':
            allowed = [b.strip() for b in d.eligible_branches.split(',')]
            if student.branch not in allowed:
                eligible = False
                reasons.append(f'Branch {student.branch} not in allowed: {", ".join(allowed)}')
        if d.eligible_years and d.eligible_years != 'ALL':
            allowed_years = [int(y.strip()) for y in d.eligible_years.split(',') if y.strip().isdigit()]
            if student.year not in allowed_years:
                eligible = False
                reasons.append(f'Year {student.year} not eligible')

        dd['is_eligible'] = eligible
        dd['eligibility_reasons'] = reasons

        if eligible_only and not eligible:
            continue

        if branch_filter and student.branch.lower() != branch_filter.lower():
            continue

        result.append(dd)

    # Paginate in-memory
    total = len(result)
    start = (page - 1) * per_page
    end = start + per_page

    return jsonify({
        'drives': result[start:end],
        'total': total,
        'pages': (total + per_page - 1) // per_page,
        'current_page': page
    }), 200


@student_bp.route('/drives/<int:drive_id>', methods=['GET'])
@jwt_required()
@student_required
def get_drive(drive_id):
    student, err, code = _get_student_profile()
    if err:
        return err, code
    drive = PlacementDrive.query.filter_by(id=drive_id, status='approved').first_or_404()
    dd = drive.to_dict(include_company=True)
    existing = Application.query.filter_by(student_id=student.id, drive_id=drive_id).first()
    dd['already_applied'] = bool(existing)
    dd['application'] = existing.to_dict() if existing else None
    return jsonify(dd), 200


# ── Applications ───────────────────────────────────────────────────────────────

@student_bp.route('/drives/<int:drive_id>/apply', methods=['POST'])
@jwt_required()
@student_required
def apply(drive_id):
    student, err, code = _get_student_profile()
    if err:
        return err, code

    if student.user.is_blacklisted:
        return jsonify({'error': 'Your account is blacklisted'}), 403

    drive = PlacementDrive.query.filter_by(id=drive_id, status='approved').first_or_404()

    # Deadline check
    now = datetime.now(timezone.utc)
    deadline = drive.application_deadline
    if deadline.tzinfo is None:
        deadline = deadline.replace(tzinfo=timezone.utc)
    if now > deadline:
        return jsonify({'error': 'Application deadline has passed'}), 400

    # Duplicate check
    if Application.query.filter_by(student_id=student.id, drive_id=drive_id).first():
        return jsonify({'error': 'You have already applied to this drive'}), 409

    # Eligibility check
    if drive.min_cgpa and student.cgpa < drive.min_cgpa:
        return jsonify({'error': f'CGPA {student.cgpa} is below the required {drive.min_cgpa}'}), 400

    if drive.eligible_branches and drive.eligible_branches != 'ALL':
        allowed = [b.strip() for b in drive.eligible_branches.split(',')]
        if student.branch not in allowed:
            return jsonify({'error': f'Your branch ({student.branch}) is not eligible for this drive'}), 400

    if drive.eligible_years and drive.eligible_years != 'ALL':
        allowed_years = [int(y.strip()) for y in drive.eligible_years.split(',') if y.strip().isdigit()]
        if student.year not in allowed_years:
            return jsonify({'error': f'Your year ({student.year}) is not eligible for this drive'}), 400

    data = request.get_json() or {}
    app = Application(
        student_id=student.id,
        drive_id=drive_id,
        student_notes=data.get('notes', '')
    )
    db.session.add(app)
    db.session.commit()
    cache.delete('admin:dashboard:stats')
    return jsonify({'message': 'Application submitted successfully', 'application': app.to_dict(include_drive=True)}), 201


@student_bp.route('/applications', methods=['GET'])
@jwt_required()
@student_required
def my_applications():
    student, err, code = _get_student_profile()
    if err:
        return err, code
    apps = student.applications.order_by(Application.applied_at.desc()).all()
    return jsonify({'applications': [a.to_dict(include_drive=True) for a in apps]}), 200


# ── CSV Export (async via Celery) ──────────────────────────────────────────────

@student_bp.route('/applications/export', methods=['POST'])
@jwt_required()
@student_required
def trigger_export():
    student, err, code = _get_student_profile()
    if err:
        return err, code

    try:
        from ..tasks.exports import export_applications_csv
        task = export_applications_csv.delay(student.id)
        return jsonify({
            'message': 'Export started',
            'task_id': task.id
        }), 202
    except Exception as e:
        # Fallback: synchronous export if Celery is not available
        return _sync_export(student)


def _sync_export(student):
    apps = student.applications.order_by(Application.applied_at.desc()).all()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(['Application ID', 'Student ID', 'USN', 'Company Name', 'Drive Title',
                     'Job Type', 'Package (LPA)', 'Location', 'Application Status',
                     'Applied Date', 'Interview Date'])
    for a in apps:
        writer.writerow([
            a.id, student.id, student.usn,
            a.drive.company.company_name if a.drive and a.drive.company else '',
            a.drive.job_title if a.drive else '',
            a.drive.job_type if a.drive else '',
            a.drive.package_lpa if a.drive else '',
            a.drive.location if a.drive else '',
            a.status,
            a.applied_at.strftime('%Y-%m-%d') if a.applied_at else '',
            a.interview_date.strftime('%Y-%m-%d') if a.interview_date else ''
        ])
    output.seek(0)
    return send_file(
        io.BytesIO(output.getvalue().encode()),
        mimetype='text/csv',
        as_attachment=True,
        download_name=f'applications_{student.usn}.csv'
    )


@student_bp.route('/export/status/<task_id>', methods=['GET'])
@jwt_required()
@student_required
def export_status(task_id):
    try:
        from ..tasks.exports import export_applications_csv
        from celery.result import AsyncResult
        result = AsyncResult(task_id, app=export_applications_csv.app)
        return jsonify({
            'task_id': task_id,
            'status': result.state,
            'ready': result.ready(),
            'result': result.result if result.ready() and not result.failed() else None
        }), 200
    except Exception:
        return jsonify({'status': 'UNKNOWN', 'ready': False}), 200


@student_bp.route('/export/download/<task_id>', methods=['GET'])
@jwt_required()
@student_required
def download_export(task_id):
    student, err, code = _get_student_profile()
    if err:
        return err, code

    export_path = os.path.join(current_app.config['EXPORT_FOLDER'], f'export_{task_id}_{student.id}.csv')
    if not os.path.exists(export_path):
        return jsonify({'error': 'Export file not found or not ready'}), 404
    return send_file(export_path, as_attachment=True, download_name=f'applications_{student.usn}.csv')


# ── Placement history ──────────────────────────────────────────────────────────

@student_bp.route('/history', methods=['GET'])
@jwt_required()
@student_required
def placement_history():
    student, err, code = _get_student_profile()
    if err:
        return err, code
    selected = student.applications.filter_by(status='selected').all()
    return jsonify({
        'total_applied': student.applications.count(),
        'total_selected': len(selected),
        'placements': [a.to_dict(include_drive=True) for a in selected]
    }), 200
