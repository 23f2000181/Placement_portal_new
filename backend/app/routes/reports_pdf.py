"""PDF report and offer-letter routes: /api/reports/*, /api/company/*"""
import io
from datetime import datetime, timezone
from flask import Blueprint, request, jsonify, send_file, current_app
from sqlalchemy import extract, func

from ..extensions import db
from ..models.drive import PlacementDrive
from ..models.application import Application
from ..models.company import CompanyProfile
from ..models.student import StudentProfile
from ..utils.decorators import admin_required, company_required, get_current_user

reports_pdf_bp = Blueprint('reports_pdf', __name__)


def _render_pdf(html_string: str) -> bytes:
    """Convert an HTML string to PDF bytes using xhtml2pdf."""
    from xhtml2pdf import pisa
    buf = io.BytesIO()
    pisa_status = pisa.CreatePDF(html_string, dest=buf)
    if pisa_status.err:
        raise RuntimeError("PDF generation failed")
    buf.seek(0)
    return buf.read()


# ── Admin: Download monthly report as PDF ──────────────────────────────────────

@reports_pdf_bp.route('/admin/reports/pdf', methods=['GET'])
@admin_required
def download_report_pdf():
    """Generate and return the monthly/yearly placement report as a PDF."""
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
        period_label = datetime(year, month, 1).strftime('%B %Y')
    else:
        query = query.filter(extract('year', Application.applied_at) == year)
        drive_query = drive_query.filter(extract('year', PlacementDrive.created_at) == year)
        period_label = str(year)

    total_apps = query.count()
    selected = query.filter_by(status='selected').count()
    shortlisted = query.filter_by(status='shortlisted').count()
    rejected = query.filter_by(status='rejected').count()
    pending = total_apps - shortlisted - selected - rejected
    drives_count = drive_query.filter_by(status='approved').count()

    top_companies = (
        db.session.query(CompanyProfile.company_name, func.count(Application.id).label('count'))
        .join(PlacementDrive, PlacementDrive.company_id == CompanyProfile.id)
        .join(Application, Application.drive_id == PlacementDrive.id)
        .group_by(CompanyProfile.id)
        .order_by(func.count(Application.id).desc())
        .limit(10)
        .all()
    )

    drives_this_period = drive_query.all()

    top_rows = ''.join(
        f'<tr><td>{i+1}</td><td>{c[0]}</td>'
        f'<td style="text-align:center;font-weight:bold;color:#4f46e5;">{c[1]}</td></tr>'
        for i, c in enumerate(top_companies)
    ) or '<tr><td colspan="3" style="text-align:center;color:#9ca3af;">No data available</td></tr>'

    drive_rows = ''.join(
        f'<tr><td>{d.job_title}</td>'
        f'<td>{d.company.company_name if d.company else "—"}</td>'
        f'<td style="text-align:center;">{d.status.capitalize()}</td>'
        f'<td style="text-align:center;">{d.applications.count()}</td></tr>'
        for d in drives_this_period
    ) or '<tr><td colspan="4" style="text-align:center;color:#9ca3af;">No drives</td></tr>'

    sel_pct = round((selected / total_apps * 100) if total_apps else 0, 1)

    html = f"""<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  * {{ margin:0; padding:0; box-sizing:border-box; }}
  body {{ font-family: Arial, sans-serif; color: #1f2937; font-size: 12px; padding: 30px; }}
  .header {{ background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
             color: white; padding: 30px; border-radius: 12px; margin-bottom: 24px; }}
  .header h1 {{ font-size: 22px; font-weight: bold; margin-bottom: 4px; }}
  .header p {{ font-size: 11px; opacity: 0.85; }}
  .stats-grid {{ display: table; width: 100%; margin-bottom: 24px; border-collapse: separate; border-spacing: 8px; }}
  .stat-cell {{ display: table-cell; width: 20%; text-align: center;
                background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 14px 8px; }}
  .stat-value {{ font-size: 28px; font-weight: bold; color: #4f46e5; }}
  .stat-label {{ font-size: 10px; color: #6b7280; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.5px; }}
  .section-title {{ font-size: 14px; font-weight: bold; color: #1f2937; margin-bottom: 10px;
                    padding-bottom: 6px; border-bottom: 2px solid #e5e7eb; }}
  table {{ width: 100%; border-collapse: collapse; margin-bottom: 24px; }}
  thead th {{ background: #4f46e5; color: white; padding: 9px 10px; font-size: 11px; font-weight: 600; text-align: left; }}
  tbody td {{ padding: 8px 10px; border-bottom: 1px solid #f3f4f6; }}
  tbody tr:nth-child(even) {{ background: #f9fafb; }}
  .badge {{ display:inline-block; padding: 2px 8px; border-radius: 9999px; font-size:10px; font-weight:600; }}
  .badge-approved {{ background: #dcfce7; color: #166534; }}
  .badge-pending  {{ background: #fef9c3; color: #854d0e; }}
  .badge-closed   {{ background: #e5e7eb; color: #374151; }}
  .footer {{ text-align:center; font-size:10px; color:#9ca3af; margin-top:30px;
             border-top:1px solid #e5e7eb; padding-top:14px; }}
  .highlight {{ color: #10b981; font-weight: bold; }}
</style>
</head>
<body>

<div class="header">
  <h1>&#127894; Placement Activity Report — {period_label}</h1>
  <p>Generated on {datetime.now(timezone.utc).strftime('%d %B %Y at %H:%M UTC')} &nbsp;|&nbsp; PlaceConnect Campus Portal</p>
</div>

<div class="stats-grid">
  <div class="stat-cell">
    <div class="stat-value">{drives_count}</div>
    <div class="stat-label">Drives Conducted</div>
  </div>
  <div class="stat-cell">
    <div class="stat-value">{total_apps}</div>
    <div class="stat-label">Total Applications</div>
  </div>
  <div class="stat-cell">
    <div class="stat-value" style="color:#8b5cf6;">{shortlisted}</div>
    <div class="stat-label">Shortlisted</div>
  </div>
  <div class="stat-cell">
    <div class="stat-value" style="color:#10b981;">{selected}</div>
    <div class="stat-label">Selected</div>
  </div>
  <div class="stat-cell">
    <div class="stat-value" style="color:#10b981;">{sel_pct}%</div>
    <div class="stat-label">Selection Rate</div>
  </div>
</div>

<div class="section-title">Top Companies by Applications</div>
<table>
  <thead><tr><th>#</th><th>Company</th><th style="text-align:center;">Applications</th></tr></thead>
  <tbody>{top_rows}</tbody>
</table>

<div class="section-title">Drives This Period</div>
<table>
  <thead><tr><th>Job Title</th><th>Company</th><th style="text-align:center;">Status</th><th style="text-align:center;">Applicants</th></tr></thead>
  <tbody>{drive_rows}</tbody>
</table>

<div class="footer">
  This is an automated report generated by PlaceConnect. &nbsp;|&nbsp; Confidential — For Internal Use Only.
</div>
</body>
</html>"""

    try:
        pdf_bytes = _render_pdf(html)
        filename = f'placement_report_{period_label.replace(" ", "_")}.pdf'
        return send_file(
            io.BytesIO(pdf_bytes),
            mimetype='application/pdf',
            as_attachment=True,
            download_name=filename
        )
    except Exception as e:
        return jsonify({'error': f'PDF generation failed: {str(e)}'}), 500


# ── Company: Generate dummy offer letter for selected student ───────────────────

@reports_pdf_bp.route('/company/offer-letter/<int:app_id>', methods=['GET'])
@company_required
def generate_offer_letter(app_id):
    """Generate a dummy formatted offer letter PDF for a selected applicant."""
    user = get_current_user()
    if not user or not user.company_profile:
        return jsonify({'error': 'Company profile not found'}), 404

    company = user.company_profile
    app = Application.query.get_or_404(app_id)

    # Verify the application belongs to this company
    drive = PlacementDrive.query.filter_by(id=app.drive_id, company_id=company.id).first()
    if not drive:
        return jsonify({'error': 'Access denied'}), 403

    if app.status != 'selected':
        return jsonify({'error': 'Offer letters can only be generated for selected candidates'}), 400

    student = app.student
    if not student:
        return jsonify({'error': 'Student profile not found'}), 404

    today = datetime.now(timezone.utc)
    joining_date = today.replace(month=today.month % 12 + 1, day=1) if today.month < 12 else today.replace(year=today.year + 1, month=1, day=1)
    joining_str = joining_date.strftime('%d %B %Y')
    today_str = today.strftime('%d %B %Y')
    ref_no = f'PPA/{today.year}/{company.id:04d}/{app.id:06d}'

    html = f"""<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  * {{ margin:0; padding:0; box-sizing:border-box; }}
  body {{ font-family: Arial, sans-serif; color: #1f2937; font-size: 12px; }}
  .page {{ padding: 50px; max-width: 800px; margin: 0 auto; }}
  .letterhead {{ border-bottom: 3px solid #4f46e5; padding-bottom: 20px; margin-bottom: 28px; }}
  .company-name {{ font-size: 26px; font-weight: bold; color: #4f46e5; }}
  .company-meta {{ font-size: 10px; color: #6b7280; margin-top: 4px; }}
  .ref-date {{ display:table; width:100%; margin-bottom: 24px; }}
  .ref-left {{ display:table-cell; }}
  .ref-right {{ display:table-cell; text-align:right; color:#6b7280; font-size:11px; }}
  .offer-title {{ text-align:center; font-size:18px; font-weight:bold; color:#1f2937;
                  border: 2px solid #4f46e5; padding: 10px; border-radius: 6px; margin-bottom: 24px; }}
  .body-text {{ line-height: 1.7; margin-bottom: 14px; }}
  .terms-table {{ width:100%; border-collapse:collapse; margin: 20px 0; }}
  .terms-table th {{ background:#4f46e5; color:white; padding:9px 12px; text-align:left; font-size:11px; }}
  .terms-table td {{ padding: 9px 12px; border-bottom: 1px solid #e5e7eb; }}
  .terms-table tr:nth-child(even) td {{ background:#f9fafb; }}
  .terms-table td:first-child {{ font-weight:600; color:#374151; width:40%; }}
  .signature {{ margin-top: 48px; }}
  .sig-block {{ display:table; width:100%; }}
  .sig-left {{ display:table-cell; width:48%; }}
  .sig-right {{ display:table-cell; width:48%; text-align:right; }}
  .sig-line {{ border-top: 1px solid #374151; padding-top: 6px; margin-top: 40px; font-size:11px; }}
  .watermark-note {{ text-align:center; color:#9ca3af; font-size:10px; margin-top:30px;
                     border-top:1px dashed #e5e7eb; padding-top:12px; font-style:italic; }}
  .highlight {{ color:#4f46e5; font-weight:bold; }}
</style>
</head>
<body>
<div class="page">

  <div class="letterhead">
    <div class="company-name">{company.company_name}</div>
    <div class="company-meta">
      {company.headquarters or 'India'} &nbsp;|&nbsp; 
      {company.website or 'www.company.com'} &nbsp;|&nbsp; 
      {company.hr_contact or 'HR Department'}
    </div>
  </div>

  <div class="ref-date">
    <div class="ref-left">
      <strong>Ref No:</strong> {ref_no}<br>
      <strong>Date:</strong> {today_str}
    </div>
    <div class="ref-right">
      <strong>CONFIDENTIAL</strong>
    </div>
  </div>

  <div>
    <strong>{student.full_name}</strong><br>
    USN: {student.usn}<br>
    Branch: {student.branch}<br>
    {"Email: " + (student.user.email if student.user else "—")}
  </div>
  <br>

  <div class="offer-title">LETTER OF OFFER — {drive.job_title}</div>

  <p class="body-text">
    Dear <strong>{student.full_name}</strong>,
  </p>
  <p class="body-text">
    We are delighted to extend this offer of employment to you for the position of 
    <span class="highlight">{drive.job_title}</span> at 
    <strong>{company.company_name}</strong>.
    After careful consideration of your academic background and the selection process conducted 
    through the Campus Placement Programme, we are pleased to welcome you to our team.
  </p>

  <table class="terms-table">
    <thead><tr><th>Term</th><th>Details</th></tr></thead>
    <tbody>
      <tr><td>Position / Designation</td><td>{drive.job_title}</td></tr>
      <tr><td>Employment Type</td><td>{drive.job_type}</td></tr>
      <tr><td>Department / Location</td><td>{drive.location or company.headquarters or 'As assigned'}</td></tr>
      <tr><td>Annual Compensation (CTC)</td><td>{'INR ' + str(drive.package_lpa) + ' LPA' if drive.package_lpa else 'As per company policy'}</td></tr>
      <tr><td>Date of Joining</td><td>{joining_str}</td></tr>
      <tr><td>Interview Mode Cleared</td><td>{drive.interview_mode}</td></tr>
      <tr><td>Reporting Manager</td><td>Will be communicated upon joining</td></tr>
    </tbody>
  </table>

  <p class="body-text">
    This offer is subject to the following conditions:
  </p>
  <p class="body-text" style="padding-left:16px;">
    1. Satisfactory verification of all academic credentials and marksheets.<br>
    2. Successful completion of your degree programme with the submitted CGPA ({student.cgpa}).<br>
    3. Completion of all applicable pre-employment and background verification checks.<br>
    4. Acceptance of this offer letter by replying in writing within <strong>7 calendar days</strong>.
  </p>

  <p class="body-text">
    Please report to our HR team on or before the joining date indicated above. Further 
    onboarding documentation will be shared via registered email prior to your joining date.
  </p>

  <p class="body-text">
    We look forward to having you as part of the <strong>{company.company_name}</strong> family. 
    Congratulations on your selection!
  </p>

  <div class="signature">
    <div class="sig-block">
      <div class="sig-left">
        <div class="sig-line">
          <strong>{company.hr_contact or 'HR Manager'}</strong><br>
          Human Resources<br>
          {company.company_name}
        </div>
      </div>
      <div class="sig-right">
        <div class="sig-line">
          <strong>Candidate Acceptance</strong><br>
          Name: {student.full_name}<br>
          Date: _______________
        </div>
      </div>
    </div>
  </div>

  <div class="watermark-note">
    *** This is a system-generated dummy offer letter issued through PlaceConnect Campus Portal. 
    Not legally binding. For demonstration purposes only. ***
  </div>
</div>
</body>
</html>"""

    try:
        pdf_bytes = _render_pdf(html)
        safe_name = ''.join(c for c in student.full_name if c.isalnum() or c == ' ').strip().replace(' ', '_')
        filename = f'offer_letter_{safe_name}_{drive.job_title.replace(" ", "_")}.pdf'
        return send_file(
            io.BytesIO(pdf_bytes),
            mimetype='application/pdf',
            as_attachment=True,
            download_name=filename
        )
    except Exception as e:
        return jsonify({'error': f'PDF generation failed: {str(e)}'}), 500
