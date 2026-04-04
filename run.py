"""Flask application entry point."""
import os
from dotenv import load_dotenv
load_dotenv()  # Load .env before creating app
from app import create_app

app = create_app(os.environ.get('FLASK_ENV', 'development'))

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
