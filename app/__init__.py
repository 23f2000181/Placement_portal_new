import os
from flask import Flask, send_from_directory
from .config import config
from .extensions import db, jwt, mail, cache, cors


def create_app(config_name='default'):
    app = Flask(__name__, static_folder='../frontend', static_url_path='')

    # Load config
    app.config.from_object(config[config_name])

    # Initialize extensions
    db.init_app(app)
    jwt.init_app(app)
    mail.init_app(app)
    cache.init_app(app)
    cors.init_app(app, resources={r'/api/*': {'origins': '*'}})

    # Ensure upload/export dirs exist
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    os.makedirs(app.config['EXPORT_FOLDER'], exist_ok=True)

    # Register blueprints
    from .routes.auth import auth_bp
    from .routes.admin import admin_bp
    from .routes.company import company_bp
    from .routes.student import student_bp

    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(admin_bp, url_prefix='/api/admin')
    app.register_blueprint(company_bp, url_prefix='/api/company')
    app.register_blueprint(student_bp, url_prefix='/api/student')

    # Serve Vue SPA for all non-API routes
    @app.route('/', defaults={'path': ''})
    @app.route('/<path:path>')
    def serve_spa(path):
        if path and os.path.exists(os.path.join(app.static_folder, path)):
            return send_from_directory(app.static_folder, path)
        return send_from_directory(app.static_folder, 'index.html')

    # Create tables and seed admin
    with app.app_context():
        from .models import db as _db  # noqa
        import app.models  # noqa - register all models
        _db.create_all()
        _seed_admin(app)

    return app


def _seed_admin(app):
    from .models.user import User
    from .extensions import db as _db

    admin_email = app.config['ADMIN_EMAIL']
    if not User.query.filter_by(email=admin_email).first():
        admin = User(
            email=admin_email,
            role='admin',
            is_active=True
        )
        admin.set_password(app.config['ADMIN_PASSWORD'])
        _db.session.add(admin)
        _db.session.commit()
        print(f'[PPA] Admin user created: {admin_email}')
    else:
        print(f'[PPA] Admin user already exists: {admin_email}')
