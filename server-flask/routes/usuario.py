from flask import Blueprint, jsonify, request
from werkzeug.security import generate_password_hash
from config import get_db_connection

usuario_bp = Blueprint('usuario', __name__)


@usuario_bp.route('/usuarios', methods=['GET'])
def get_usuarios():
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        # selecciono los campos que existen según tu script de creación
        cur.execute("""
            SELECT id_usuario, usuario, clave, nombres, apellidos, rol, estado, fecha_creacion
            FROM usuario
            ORDER BY id_usuario DESC
        """)
        rows = cur.fetchall()

        usuarios = []
        for row in rows:
            id_usuario, usuario_login, clave_hash, nombres, apellidos, rol, estado, fecha_creacion = row
            usuarios.append({
                "id_usuario": id_usuario,
                "usuario": usuario_login,
                "clave": clave_hash,
                "nombres": nombres,
                "apellidos": apellidos,
                # no hay columna `dni` en la tabla usuario según el script; dejamos null/None
                "dni": None,
                "rol": rol,
                "estado": estado,
                "fecha_registro": fecha_creacion.strftime("%Y-%m-%d %H:%M:%S") if fecha_creacion else None
            })

        cur.close()
        conn.close()
        return jsonify(usuarios)
    except Exception as e:
        print(f"Error GET /api/usuarios: {e}")
        return jsonify({"error": str(e)}), 500



@usuario_bp.route('/usuarios', methods=['POST'])
def create_usuario():
    try:
        data = request.get_json() or {}
        usuario = data.get('usuario')
        clave = data.get('clave')
        nombres = data.get('nombres')
        apellidos = data.get('apellidos')
        rol = data.get('rol', 'medico')
        estado = data.get('estado', True)

        # Validaciones básicas
        if not usuario or not clave or not nombres or not apellidos:
            return jsonify({"error": "Faltan campos requeridos."}), 400

        if len(clave) < 6:
            return jsonify({"error": "La clave debe tener al menos 6 caracteres."}), 400

        # Hashear la contraseña
        hashed = generate_password_hash(clave)

        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute(
            """
            INSERT INTO usuario (usuario, clave, nombres, apellidos, rol, estado, fecha_creacion)
            VALUES (%s, %s, %s, %s, %s, %s, NOW())
            RETURNING id_usuario
            """,
            (usuario, hashed, nombres, apellidos, rol, estado)
        )
        new_id = cur.fetchone()[0]
        conn.commit()
        cur.close()
        conn.close()

        return jsonify({"id_usuario": new_id, "usuario": usuario}), 201
    except Exception as e:
        print(f"Error POST /api/usuarios: {e}")
        return jsonify({"error": str(e)}), 500
