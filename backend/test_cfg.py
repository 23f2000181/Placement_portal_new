from app.config import config
print("Dir DevelopmentConfig:", dir(config['development']))
from flask import Flask
app = Flask(__name__)
app.config.from_object(config['development'])
print("Keys in app.config:", 'ADMIN_EMAIL' in app.config)
