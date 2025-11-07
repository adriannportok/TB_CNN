from flask import Flask
from flask_cors import CORS
from routes.auth import auth_bp
from config import get_db_connection
from flask import jsonify
from flask import Flask, send_from_directory
from routes.paciente import paciente_bp
from routes.dashboard import dashboard

app = Flask(__name__)
CORS(app)

app.register_blueprint(auth_bp, url_prefix='/auth')
app.register_blueprint(paciente_bp, url_prefix='/api')
app.register_blueprint(dashboard, url_prefix='/api')

@app.route('/')
def hello_world():
    return 'Hello, World!'

@app.route('/test-db')
def test_db():
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("SELECT COUNT(*) FROM usuario")
        count = cur.fetchone()[0]
        cur.close()
        conn.close()
        return jsonify({"success": True, "usuarios_registrados": count})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/uploads/<path:filename>')
def serve_upload(filename):
    return send_from_directory('uploads', filename)


if __name__ == '__main__':
    app.run(debug=True)
