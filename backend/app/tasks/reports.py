"""Monthly activity report task."""
from datetime import datetime, timezone
from calendar import monthrange
from celery import shared_task
from flask_mail import Message


@shared_task(name='app.tasks.reports.send_monthly_report')
def send_monthly_report():
    """Generate and email monthly placement activity report to admin."""
    from app import create_app
    from app.extensions import mail, db
    from app.models.drive import PlacementDrive
    from app.models.application import Application
    from app.models.company import CompanyProfile
    from sqlalchemy import extract, func

    app = create_app()
    with app.app_context():
        now = datetime.now(timezone.utc)
        # Report for previous month
        if now.month == 1:
            month = 12
            year = now.year - 1
        else:
            month = now.month - 1
            year = now.year

        month_name = datetime(year, month, 1).strftime('%B %Y')

        drives = PlacementDrive.query.filter(
            extract('year', PlacementDrive.created_at) == year,
            extract('month', PlacementDrive.created_at) == month
        ).all()

        apps = Application.query.filter(
            extract('year', Application.applied_at) == year,
            extract('month', Application.applied_at) == month
        ).all()

        total_drives = len(drives)
        total_apps = len(apps)
        selected = sum(1 for a in apps if a.status == 'selected')
        shortlisted = sum(1 for a in apps if a.status == 'shortlisted')

        # Top companies
        top_companies = (
            db.session.query(CompanyProfile.company_name, func.count(Application.id).label('count'))
            .join(PlacementDrive, PlacementDrive.company_id == CompanyProfile.id)
            .join(Application, Application.drive_id == PlacementDrive.id)
            .filter(
                extract('year', Application.applied_at) == year,
                extract('month', Application.applied_at) == month
            )
            .group_by(CompanyProfile.id)
            .order_by(func.count(Application.id).desc())
            .limit(5)
            .all()
        )

        top_companies_html = ''.join(
            f'<tr><td>{c[0]}</td><td>{c[1]}</td></tr>'
            for c in top_companies
        )

        html_report = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; margin: 40px; color: #333; }}
                h1 {{ color: #2c3e50; }}
                .stat-card {{ display: inline-block; background: #f0f4f8; padding: 20px;
                             margin: 10px; border-radius: 8px; min-width: 150px; text-align: center; }}
                .stat-card .value {{ font-size: 2em; font-weight: bold; color: #3498db; }}
                table {{ border-collapse: collapse; width: 100%; margin: 20px 0; }}
                th, td {{ border: 1px solid #ddd; padding: 10px; text-align: left; }}
                th {{ background: #3498db; color: white; }}
                tr:nth-child(even) {{ background: #f2f2f2; }}
            </style>
        </head>
        <body>
            <h1>🎓 Placement Activity Report — {month_name}</h1>
            <p>Generated on {datetime.now(timezone.utc).strftime('%d %B %Y')}</p>

            <h2>Summary</h2>
            <div>
                <div class="stat-card">
                    <div class="value">{total_drives}</div>
                    <div>Drives Conducted</div>
                </div>
                <div class="stat-card">
                    <div class="value">{total_apps}</div>
                    <div>Applications</div>
                </div>
                <div class="stat-card">
                    <div class="value">{shortlisted}</div>
                    <div>Shortlisted</div>
                </div>
                <div class="stat-card">
                    <div class="value">{selected}</div>
                    <div>Selected</div>
                </div>
            </div>

            <h2>Top Companies by Applications</h2>
            <table>
                <tr><th>Company</th><th>Applications</th></tr>
                {top_companies_html if top_companies_html else '<tr><td colspan="2">No data</td></tr>'}
            </table>

            <h2>Drives Created This Month</h2>
            <table>
                <tr><th>Company</th><th>Job Title</th><th>Status</th><th>Applicants</th></tr>
                {''.join(f"<tr><td>{d.company.company_name}</td><td>{d.job_title}</td><td>{d.status}</td><td>{d.applications.count()}</td></tr>" for d in drives) or '<tr><td colspan="4">No drives</td></tr>'}
            </table>

            <br><p>This is an automated report from the Placement Portal.</p>
        </body>
        </html>
        """

        try:
            admin_email = app.config['ADMIN_EMAIL']
            msg = Message(
                subject=f'[Placement Portal] Monthly Report — {month_name}',
                recipients=[admin_email],
                html=html_report
            )
            mail.send(msg)
            print(f'[Report] Monthly report sent for {month_name}')
        except Exception as e:
            print(f'[Report] Failed to send report: {e}')

        return {
            'month': month_name,
            'total_drives': total_drives,
            'total_applications': total_apps,
            'selected': selected
        }
