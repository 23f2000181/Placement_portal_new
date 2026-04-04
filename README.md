# Placement Portal Application (PPA)

## Tech Stack
- **Backend**: Flask, Flask-JWT-Extended, Flask-SQLAlchemy, Flask-Mail, Flask-Caching, Flask-CORS
- **Frontend**: VueJS 3 (CDN), Vue Router 4 (CDN), Axios (CDN), Bootstrap 5 (CDN), Chart.js (CDN)
- **Database**: SQLite (auto-created via SQLAlchemy)
- **Cache**: Redis (Flask-Caching)
- **Jobs**: Celery + Redis (daily reminders, monthly reports, CSV export)

## Quick Start

### 1. Prerequisites
- Python 3.10+
- Redis server running on `localhost:6379`

> **Windows**: Install Redis via WSL (`sudo apt install redis-server && redis-server`)
> or Docker: `docker run -p 6379:6379 redis`

---

### 2. Install Python dependencies
```bash
cd backend
pip install -r requirements.txt
```

### 3. Configure environment
```bash
# Already pre-configured with defaults. Edit .env to add email credentials.
# Default admin: admin@placement.com / Admin@123
```

### 4. Run the Flask server
```bash
cd backend
python run.py
```

The DB is **auto-created** on first run. Admin user is **seeded automatically**.

Open: **http://localhost:5000**

---

### 5. Run Celery Worker (optional — for async jobs)
```bash
cd backend
celery -A celery_worker.celery worker --loglevel=info --pool=solo
```

### 6. Run Celery Beat (optional — for scheduled jobs)
```bash
cd backend
celery -A celery_worker.celery beat --loglevel=info
```

---

## Default Credentials

| Role    | Email                     | Password   |
|---------|---------------------------|------------|
| Admin   | `admin@placement.com`     | `Admin@123` |

Students and Companies register via the web interface.

---

## Features

### Admin
- Dashboard with stats (students, companies, drives, placements)
- Monthly/yearly charts (Chart.js)
- Approve/reject company registrations
- Approve/reject placement drives
- View all applications
- Blacklist/unblacklist students and companies
- Search across students, companies, drives

### Company
- Register and await admin approval
- Create placement drives (pending admin approval)
- View applicants per drive
- Shortlist/select/reject applicants
- Schedule interview dates

### Student
- Register with detailed profile (USN, branch, CGPA, year)
- Browse approved placement drives with eligibility indicators
- Apply for drives (with deadline + eligibility validation)
- Upload resume (PDF/DOC/DOCX)
- View application status and placement history
- Export applications as CSV (async Celery job)

### Background Jobs (Celery)
| Job | Schedule | Description |
|-----|----------|-------------|
| Daily Reminders | 8:00 AM daily | Emails students about upcoming deadlines |
| Monthly Report | 1st of month, 9 AM | HTML report emailed to admin |
| CSV Export | User-triggered | Async export of student's application history |

### Caching (Redis)
- Admin dashboard stats: 5 min
- Approved drives list: 10 min
- Invalidated on data changes

---

## Project Structure

```
placement_portal/
├── backend/
│   ├── app/
│   │   ├── __init__.py        # App factory + admin seed
│   │   ├── config.py          # Config classes
│   │   ├── extensions.py      # db, jwt, mail, cache, cors
│   │   ├── models/            # SQLAlchemy models
│   │   ├── routes/            # Flask blueprints
│   │   ├── tasks/             # Celery tasks
│   │   └── utils/             # Decorators, helpers
│   ├── run.py                 # Flask entry point
│   ├── celery_worker.py       # Celery entry point
│   ├── requirements.txt
│   └── .env
└── frontend/
    ├── index.html             # Jinja2 entry (served by Flask)
    └── src/
        ├── app.js             # Vue app mount
        ├── router.js          # Vue Router
        ├── store.js           # Auth store
        ├── api.js             # Axios helpers
        ├── style.css          # Global dark-theme styles
        ├── components/        # Navbar, Sidebar
        └── views/             # Page components (admin/company/student)
```

---

## Email Setup (for jobs)

Edit `.env`:
```
MAIL_USERNAME=your-gmail@gmail.com
MAIL_PASSWORD=your-app-password   # Gmail App Password (not your account password)
MAIL_DEFAULT_SENDER=your-gmail@gmail.com
```

> For Gmail: Go to Google Account → Security → App Passwords → Generate one.
