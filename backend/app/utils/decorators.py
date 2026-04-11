from functools import wraps
from flask import jsonify
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request
from ..models.user import User


def roles_required(*roles):
    """Decorator to restrict access to specific roles.
    
    NOTE: Do NOT stack this with @jwt_required(). This decorator
    calls verify_jwt_in_request() internally. Stacking both in
    Flask-JWT-Extended 4.6.0 causes a 422 Unprocessable Entity.
    """
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request()
            user_id = get_jwt_identity()
            user = User.query.get(user_id)
            if not user:
                return jsonify({'error': 'User not found'}), 404
            if user.is_blacklisted:
                return jsonify({'error': 'Your account has been blacklisted'}), 403
            if not user.is_active:
                return jsonify({'error': 'Your account is inactive'}), 403
            if user.role not in roles:
                return jsonify({'error': f'Access denied. Required roles: {", ".join(roles)}'}), 403
            return fn(*args, **kwargs)
        return wrapper
    return decorator


def admin_required(fn):
    return roles_required('admin')(fn)


def company_required(fn):
    return roles_required('company')(fn)


def student_required(fn):
    return roles_required('student')(fn)


def get_current_user():
    user_id = get_jwt_identity()
    return User.query.get(user_id)
