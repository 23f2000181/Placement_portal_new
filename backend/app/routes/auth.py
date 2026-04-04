"""Auth routes: /api/auth/*"""
from datetime import timezone, datetime
from flask import Blueprint, request, jsonify
from flask_jwt_extended import (
    create_access_token, jwt_required, get_jwt_identity
)
from ..extensions import db
from ..models.user import User
from ..models.company import CompanyProfile
from ..models.student import StudentProfile

auth_bp = Blueprint('auth', __name__)


@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json() or {}
    role = data.get('role', '').lower()

    if role not in ('student', 'company'):
        return jsonify({'error': 'Role must be student or company'}), 400

    email = data.get('email', '').strip().lower()
    password = data.get('password', '')

    if not email or not password:
        return jsonify({'error': 'Email and password are required'}), 400

    if len(password) < 6:
        return jsonify({'error': 'Password must be at least 6 characters'}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({'error': 'Email already registered'}), 409

    user = User(email=email, role=role)
    user.set_password(password)
    db.session.add(user)
    db.session.flush()  # get user.id

    if role == 'company':
        company_name = data.get('company_name', '').strip()
        if not company_name:
            return jsonify({'error': 'Company name is required'}), 400
        profile = CompanyProfile(
            user_id=user.id,
            company_name=company_name,
            hr_contact=data.get('hr_contact', ''),
            hr_phone=data.get('hr_phone', ''),
            website=data.get('website', ''),
            description=data.get('description', ''),
            industry=data.get('industry', ''),
            headquarters=data.get('headquarters', ''),
            approval_status='pending'
        )
        db.session.add(profile)

    elif role == 'student':
        required = ('full_name', 'usn', 'branch', 'cgpa', 'year')
        for field in required:
            if not data.get(field) and data.get(field) != 0:
                return jsonify({'error': f'Field "{field}" is required for student registration'}), 400

        if StudentProfile.query.filter_by(usn=data['usn']).first():
            return jsonify({'error': 'USN already registered'}), 409

        try:
            cgpa = float(data['cgpa'])
            year = int(data['year'])
        except (ValueError, TypeError):
            return jsonify({'error': 'CGPA must be a number and Year must be an integer'}), 400

        if not (0.0 <= cgpa <= 10.0):
            return jsonify({'error': 'CGPA must be between 0.0 and 10.0'}), 400
        if year not in (1, 2, 3, 4):
            return jsonify({'error': 'Year must be 1, 2, 3, or 4'}), 400

        profile = StudentProfile(
            user_id=user.id,
            full_name=data['full_name'].strip(),
            usn=data['usn'].strip().upper(),
            branch=data['branch'].strip(),
            cgpa=cgpa,
            year=year,
            phone=data.get('phone', ''),
            linkedin=data.get('linkedin', ''),
            skills=data.get('skills', '')
        )
        db.session.add(profile)

    db.session.commit()
    token = create_access_token(identity=user.id)
    return jsonify({
        'message': 'Registration successful',
        'access_token': token,
        'user': user.to_dict()
    }), 201


@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')

    if not email or not password:
        return jsonify({'error': 'Email and password required'}), 400

    user = User.query.filter_by(email=email).first()
    if not user or not user.check_password(password):
        return jsonify({'error': 'Invalid email or password'}), 401

    if user.is_blacklisted:
        return jsonify({'error': 'Your account has been blacklisted. Contact admin.'}), 403

    if not user.is_active:
        return jsonify({'error': 'Your account is deactivated. Contact admin.'}), 403

    token = create_access_token(identity=user.id)
    profile = None
    if user.role == 'company' and user.company_profile:
        profile = user.company_profile.to_dict()
    elif user.role == 'student' and user.student_profile:
        profile = user.student_profile.to_dict()

    return jsonify({
        'access_token': token,
        'user': user.to_dict(),
        'profile': profile
    }), 200


@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def me():
    user_id = get_jwt_identity()
    user = User.query.get_or_404(user_id)
    profile = None
    if user.role == 'company' and user.company_profile:
        profile = user.company_profile.to_dict()
    elif user.role == 'student' and user.student_profile:
        profile = user.student_profile.to_dict()
    return jsonify({'user': user.to_dict(), 'profile': profile}), 200
