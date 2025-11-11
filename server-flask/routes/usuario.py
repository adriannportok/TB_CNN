from flask import Blueprint, jsonify
from config import get_db_connection

usuario_bp = Blueprint('usuario', __name__)


@usuario_bp.route('/usuarios', methods=['GET'])
def get_usuarios():
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        # selecciono los campos que existen según tu script de creación
        cur.execute("""
            SELECT id_usuario, usuario, clave, nombres, apellidos, rol, fecha_creacion
            FROM usuario
            ORDER BY id_usuario DESC
        """)
        rows = cur.fetchall()

        usuarios = []
        for row in rows:
            id_usuario, usuario_login, clave_hash, nombres, apellidos, rol, fecha_creacion = row
            usuarios.append({
                "id_usuario": id_usuario,
                "usuario": usuario_login,
                "clave": clave_hash,
                "nombres": nombres,
                "apellidos": apellidos,
                # no hay columna `dni` en la tabla usuario según el script; dejamos null/None
                "dni": None,
                "rol": rol,
                "fecha_registro": fecha_creacion.strftime("%Y-%m-%d %H:%M:%S") if fecha_creacion else None
            })

        cur.close()
        conn.close()
        return jsonify(usuarios)
    except Exception as e:
        print(f"Error GET /api/usuarios: {e}")
        return jsonify({"error": str(e)}), 500
