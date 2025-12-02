from flask import Blueprint, request, jsonify
from config import get_db_connection
from werkzeug.security import check_password_hash
import jwt
import datetime
import bcrypt
import hashlib
import base64


auth_bp = Blueprint('auth', __name__)
SECRET_KEY = "tu_clave_secreta"


def validar_credenciales(usuario, clave):
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("SELECT id_usuario, clave, rol, nombres, apellidos, estado FROM usuario WHERE usuario = %s", (usuario,))
        result = cur.fetchone()
        print(f"[auth] validar_credenciales: buscando usuario='{usuario}' resultado={bool(result)}")
        cur.close()
        conn.close()

        if not result:
            return False, "Usuario no encontrado", None, None, None, None

        id_usuario, clave_hash, rol, nombres, apellidos, estado = result
        print(f"[auth] validar_credenciales: encontrado id={id_usuario} rol={rol} nombres={nombres} apellidos={apellidos} estado={estado}")

        if estado is not None and (estado is False or str(estado).lower() in ['false', '0', 'f']):
            print(f"[auth] validar_credenciales: usuario inactivo id={id_usuario}")
            return False, "Usuario inactivo", None, None, None, None

        try:
            if check_password_hash(clave_hash, clave):
                print(f"[auth] validar_credenciales: password ok para usuario='{usuario}' id={id_usuario}")
                return True, "Login exitoso", id_usuario, rol, nombres, apellidos
            else:
                print(f"[auth] validar_credenciales: clave incorrecta para usuario='{usuario}'")
                return False, "Clave incorrecta", None, None, None, None
        except Exception as e:
            print(f"[auth] validar_credenciales: excepción check_password_hash para usuario='{usuario}': {e}")

            try:
                if isinstance(clave_hash, str) and clave_hash.startswith('$2'):
                    try:
                        ok = bcrypt.checkpw(clave.encode('utf-8'), clave_hash.encode('utf-8'))
                        if ok:
                            print(f"[auth] validar_credenciales: bcrypt ok para usuario='{usuario}' id={id_usuario}")
                            return True, "Login exitoso", id_usuario, rol, nombres, apellidos
                        else:
                            print(f"[auth] validar_credenciales: bcrypt fallo para usuario='{usuario}'")
                            return False, "Clave incorrecta", None, None, None, None
                    except Exception as e2:
                        print(f"[auth] validar_credenciales: error bcrypt fallback para usuario='{usuario}': {e2}")
            except Exception:
                pass

            try:
                if isinstance(clave_hash, str) and clave_hash.startswith('scrypt:'):
                    parts = clave_hash.split('$')
                    if len(parts) >= 3:
                        params = parts[0].split(':')
                        if len(params) >= 4:
                            n = int(params[1])
                            r = int(params[2])
                            p = int(params[3])
                            salt_b64 = parts[1]
                            hash_hex = parts[2]
                            try:
                                salt = base64.b64decode(salt_b64 + '==')
                            except Exception:
                                salt = base64.b64decode(salt_b64)
                            stored = bytes.fromhex(hash_hex)
                            derived = hashlib.scrypt(clave.encode('utf-8'), salt=salt, n=n, r=r, p=p, dklen=len(stored))
                            if derived == stored:
                                print(f"[auth] validar_credenciales: scrypt ok para usuario='{usuario}' id={id_usuario}")
                                return True, "Login exitoso", id_usuario, rol, nombres, apellidos
                            else:
                                print(f"[auth] validar_credenciales: scrypt fallo para usuario='{usuario}'")
                                return False, "Clave incorrecta", None, None, None, None
            except Exception as e3:
                print(f"[auth] validar_credenciales: error scrypt fallback para usuario='{usuario}': {e3}")

            return None, "Error interno del servidor", None, None, None, None

    except Exception as e:
        print(f"[auth] validar_credenciales: excepción general: {e}")
        return None, "Error interno del servidor", None, None, None, None


@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    usuario = data.get('usuario')
    clave = data.get('clave')

    resultado, mensaje, id_usuario, rol, nombres, apellidos = validar_credenciales(usuario, clave)

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
            "id_usuario": id_usuario,
            "rol": rol,
            "nombres": nombres,
            "apellidos": apellidos,
        }), 200
    else:
        status_code = 404 if mensaje == "Usuario no encontrado" else 401
        return jsonify({"success": False, "message": mensaje}), status_code