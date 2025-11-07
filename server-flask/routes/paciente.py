from flask import Blueprint, request, jsonify
from config import get_db_connection
from datetime import datetime
import os
from werkzeug.utils import secure_filename
import re

paciente_bp = Blueprint('paciente', __name__)

@paciente_bp.route('/pacientes', methods=['GET'])
def get_pacientes():
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        query = """
        SELECT 
            p.id_paciente,
            p.nombres,
            p.apellidos,
            p.dni,
            p.sexo,
            p.edad,
            p.fecha_nac,
            p.fecha_registro,
            COALESCE(pr.porcentaje, 0) AS porcentaje,
            CASE 
                WHEN pr.porcentaje IS NOT NULL THEN 'Analizado'
                ELSE 'Pendiente'
            END AS estado_analisis
        FROM paciente p
        LEFT JOIN LATERAL (
            SELECT porcentaje
            FROM prediccion
            WHERE prediccion.id_paciente = p.id_paciente
            ORDER BY fecha_pred DESC
            LIMIT 1
        ) pr ON true
        ORDER BY p.id_paciente DESC;
        """

        cur.execute(query)
        rows = cur.fetchall()

        pacientes = [
            {
                "id_paciente": row[0],
                "nombres": row[1],
                "apellidos": row[2],
                "dni": row[3],
                "sexo": "M" if row[4] else "F",
                "edad": row[5],
                "fecha_nac": row[6].strftime("%Y-%m-%d") if row[6] else None,
                "fecha_registro": row[7],
                "porcentaje": row[8],
                "estado_analisis": row[9]
            }
            for row in rows
        ]

        cur.close()
        conn.close()
        return jsonify(pacientes)

    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"error": str(e)}), 500


@paciente_bp.route('/pacientes', methods=['POST'])
def crear_paciente():
    try:
        nombre = request.form.get('nombre')
        apellido = request.form.get('apellido')
        dni = request.form.get('dni')
        genero = request.form.get('genero')
        fecha_nacimiento = request.form.get('fechaNacimiento')
        usuario = request.form.get('usuario')
        imagen = request.files.get('imagen')

        if not all([nombre, apellido, dni, genero, fecha_nacimiento, usuario, imagen]):
            return jsonify({"error": "Faltan datos requeridos"}), 400

        
        nombre = nombre.strip()
        apellido = apellido.strip()
        name_regex = r"^[A-Za-zÀ-ÖØ-öø-ÿ\s'\-]+$"
        if not re.fullmatch(name_regex, nombre):
            return jsonify({"error": "El campo 'nombre' solo debe contener letras, espacios, '-' o \"'\""}), 400
        if not re.fullmatch(name_regex, apellido):
            return jsonify({"error": "El campo 'apellido' solo debe contener letras, espacios, '-' o \"'\""}), 400

        if not dni.isdigit() or len(dni) > 8 or len(dni) < 1:
            return jsonify({"error": "El DNI debe contener solo números y como máximo 8 dígitos"}), 400

        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute("""
            SELECT id_usuario FROM usuario 
            WHERE usuario = %s AND rol = 'medico'
        """, (usuario,))
        usuario_result = cur.fetchone()
        if not usuario_result:
            return jsonify({"error": "Usuario no encontrado o no es médico"}), 404
        id_usuario = usuario_result[0]

        cur.execute("SELECT COUNT(*) FROM paciente WHERE dni = %s", (dni,))
        if cur.fetchone()[0] > 0:
            return jsonify({"error": "Ya existe un paciente con ese DNI"}), 400
        
        
        fecha_nac = datetime.strptime(fecha_nacimiento, '%Y-%m-%d')
        hoy = datetime.now()
        edad = hoy.year - fecha_nac.year - ((hoy.month, hoy.day) < (fecha_nac.month, fecha_nac.day))

        filename = secure_filename(f"{dni}_{datetime.now().strftime('%Y%m%d%H%M%S')}.png")
        upload_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'uploads', filename)
        imagen.save(upload_path)
        ruta_imagen = f'uploads/{filename}'
        cur.execute("""
            INSERT INTO paciente (nombres, apellidos, dni, sexo, edad, fecha_nac, fecha_registro, id_usuario)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id_paciente
        """, (
            nombre,
            apellido,
            dni,
            True if genero.upper() == 'M' else False,
            edad,
            fecha_nac,
            datetime.now(),
            id_usuario
        ))

        id_paciente = cur.fetchone()[0]
        
        cur.execute("""
            INSERT INTO prediccion (ruta_imagen, id_paciente)
            VALUES (%s, %s)
        """, (ruta_imagen, id_paciente))

        conn.commit()
        cur.close()
        conn.close()

        return jsonify({
            "mensaje": "Paciente registrado exitosamente",
            "id_paciente": id_paciente
        }), 201

    except Exception as e:
        if 'conn' in locals():
            conn.rollback()
            cur.close()
            conn.close()
        return jsonify({"error": str(e)}), 500
