from flask import Blueprint, request, jsonify
from config import get_db_connection
import bcrypt
import jwt
import datetime

auth_bp = Blueprint('auth', __name__)
SECRET_KEY = "tu_clave_secreta"  

def validar_credenciales(usuario, clave):
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("SELECT id_usuario, clave, rol, nombres, apellidos FROM usuario WHERE usuario = %s", (usuario,))
        result = cur.fetchone()
        cur.close()
        conn.close()

        if not result:
            return False, "Usuario no encontrado", None

        id_usuario, clave_hash, rol, nombres, apellidos = result
        if bcrypt.checkpw(clave.encode('utf-8'), clave_hash.encode('utf-8')):
            return True, "Login exitoso",id_usuario, rol, nombres, apellidos
        else:
            return False, "Clave incorrecta", None, None, None, None

    except Exception as e:
        return None, "Error interno del servidor", None, None, None, None

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    usuario = data.get('usuario')
    clave = data.get('clave')

    resultado, mensaje, id_usuario,  rol, nombres, apellidos = validar_credenciales(usuario, clave)

    if resultado:
        token = jwt.encode({
            "usuario": usuario,
            "id_usuario": id_usuario,
            "rol": rol,
            "nombres": nombres,
            "apellidos": apellidos,
            "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=2)
        }, SECRET_KEY, algorithm="HS256")

        if isinstance(token, bytes):
            token = token.decode("utf-8")

        return jsonify({
            "success": True,
            "message": mensaje,
            "token": token,
            "usuario": usuario,
            "id_usuario": id_usuario,
            "rol": rol,
            "nombres": nombres,
            "apellidos": apellidos,
        }), 200
    else:
        status_code = 404 if mensaje == "Usuario no encontrado" else 401
        return jsonify({"success": False, "message": mensaje}), status_code