"""Flask application entry point."""
import os
from dotenv import load_dotenv

# Load .env before creating app
load_dotenv()

# Import create_app from the 'app' package
from app import create_app

# Create the Flask application instance
# We use a different name to avoid any conflict with the 'app' package name
my_app = create_app(os.environ.get('FLASK_ENV', 'development'))

if __name__ == '__main__':
    # Use the variable name 'my_app' here
    my_app.run(host='0.0.0.0', port=5000, debug=True)
