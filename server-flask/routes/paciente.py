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
        # permitir filtrar por id_usuario o por nombre de usuario (usuario)
        id_usuario = request.args.get('id_usuario')
        usuario = request.args.get('usuario')

        base_query = """
        SELECT 
            p.id_paciente,
            p.nombres,
            p.apellidos,
            p.dni,
            p.sexo,
            p.edad,
            p.fecha_nac,
            p.fecha_registro,
            CASE
                WHEN EXISTS (SELECT 1 FROM prediccion p2 WHERE p2.id_paciente = p.id_paciente AND p2.porcentaje IS NULL) THEN NULL
                ELSE pr_last.porcentaje
            END AS porcentaje,
            CASE
                WHEN EXISTS (SELECT 1 FROM prediccion p2 WHERE p2.id_paciente = p.id_paciente AND p2.porcentaje IS NULL) THEN 'Pendiente'
                WHEN pr_last.porcentaje IS NOT NULL THEN 'Analizado'
                ELSE 'Pendiente'
            END AS estado_analisis
        FROM paciente p
        LEFT JOIN LATERAL (
            SELECT porcentaje
            FROM prediccion
            WHERE prediccion.id_paciente = p.id_paciente AND porcentaje IS NOT NULL
            ORDER BY fecha_pred DESC NULLS LAST
            LIMIT 1
        ) pr_last ON true
        """

        params = []
        if id_usuario:
            base_query += " WHERE p.id_usuario = %s"
            params.append(id_usuario)
        elif usuario:
            # resolver usuario -> id_usuario
            cur.execute("SELECT id_usuario FROM usuario WHERE usuario = %s", (usuario,))
            r = cur.fetchone()
            if r:
                base_query += " WHERE p.id_usuario = %s"
                params.append(r[0])

        base_query += " ORDER BY p.id_paciente DESC"

        cur.execute(base_query, tuple(params) if params else None)
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


@paciente_bp.route('/pacientes/<int:id_paciente>', methods=['PATCH', 'PUT'])
def actualizar_paciente(id_paciente):
    try:
        nombre = request.form.get('nombre')
        apellido = request.form.get('apellido')
        dni = request.form.get('dni')
        genero = request.form.get('genero')
        fecha_nacimiento = request.form.get('fechaNacimiento')
        usuario = request.form.get('usuario')
        imagen = request.files.get('imagen')

        # simple validation: require usuario (medico) to be provided
        if not usuario:
            return jsonify({"error": "Usuario (médico) requerido para editar."}), 400

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

        # ensure paciente exists
        cur.execute("SELECT id_paciente FROM paciente WHERE id_paciente = %s", (id_paciente,))
        if not cur.fetchone():
            return jsonify({"error": "Paciente no encontrado"}), 404

        updates = []
        params = []
        if nombre:
            name_regex = r"^[A-Za-zÀ-ÖØ-öø-ÿ\s'\-]+$"
            if not re.fullmatch(name_regex, nombre):
                return jsonify({"error": "El campo 'nombre' solo debe contener letras, espacios, '-' o \"'\""}), 400
            updates.append("nombres = %s")
            params.append(nombre.strip())
        if apellido:
            name_regex = r"^[A-Za-zÀ-ÖØ-öø-ÿ\s'\-]+$"
            if not re.fullmatch(name_regex, apellido):
                return jsonify({"error": "El campo 'apellido' solo debe contener letras, espacios, '-' o \"'\""}), 400
            updates.append("apellidos = %s")
            params.append(apellido.strip())
        if dni:
            if not dni.isdigit() or len(dni) > 8 or len(dni) < 1:
                return jsonify({"error": "El DNI debe contener solo números y como máximo 8 dígitos"}), 400
            # check uniqueness (except this paciente)
            cur.execute("SELECT COUNT(*) FROM paciente WHERE dni = %s AND id_paciente <> %s", (dni, id_paciente))
            if cur.fetchone()[0] > 0:
                return jsonify({"error": "Ya existe otro paciente con ese DNI"}), 400
            updates.append("dni = %s")
            params.append(dni)
        if genero:
            updates.append("sexo = %s")
            params.append(True if genero.upper() == 'M' else False)
        if fecha_nacimiento:
            try:
                fecha_nac = datetime.strptime(fecha_nacimiento, '%Y-%m-%d')
            except Exception:
                return jsonify({"error": "Formato de fecha inválido"}), 400
            hoy = datetime.now()
            edad = hoy.year - fecha_nac.year - ((hoy.month, hoy.day) < (fecha_nac.month, fecha_nac.day))
            updates.append("fecha_nac = %s")
            params.append(fecha_nac)
            updates.append("edad = %s")
            params.append(edad)

        if updates:
            params.append(id_paciente)
            sql = f"UPDATE paciente SET {', '.join(updates)} WHERE id_paciente = %s"
            cur.execute(sql, tuple(params))

        # If an image is provided, save it and REPLACE the last prediccion's image (do not create a new prediccion)
        if imagen:
            filename = secure_filename(f"{dni or 'pac'}_{datetime.now().strftime('%Y%m%d%H%M%S')}.png")
            upload_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'uploads', filename)
            imagen.save(upload_path)
            ruta_imagen = f'uploads/{filename}'

            # find the most recent prediccion for this paciente
            cur.execute("SELECT id_pred, ruta_imagen FROM prediccion WHERE id_paciente = %s ORDER BY fecha_pred DESC LIMIT 1", (id_paciente,))
            last = cur.fetchone()
            if last:
                last_id_pred = last[0]
                old_ruta = last[1]
                # try to remove old image file if present and is inside uploads
                try:
                    if old_ruta:
                        base_dir = os.path.dirname(os.path.dirname(__file__))
                        old_path = os.path.abspath(os.path.join(base_dir, old_ruta))
                        # only remove files inside the uploads folder for safety
                        uploads_dir = os.path.abspath(os.path.join(base_dir, 'uploads'))
                        if os.path.commonpath([old_path, uploads_dir]) == uploads_dir and os.path.exists(old_path):
                            os.remove(old_path)
                except Exception:
                    pass

                # update the existing prediccion to point to the new image and mark as pending
                cur.execute("UPDATE prediccion SET ruta_imagen = %s, porcentaje = NULL, fecha_pred = NULL WHERE id_pred = %s", (ruta_imagen, last_id_pred))
            else:
                # no existing prediccion -> insert new row
                cur.execute("INSERT INTO prediccion (ruta_imagen, id_paciente) VALUES (%s, %s)", (ruta_imagen, id_paciente))

        conn.commit()
        cur.close()
        conn.close()

        return jsonify({"mensaje": "Paciente actualizado"}), 200

    except Exception as e:
        if 'conn' in locals():
            conn.rollback()
            cur.close()
            conn.close()
        return jsonify({"error": str(e)}), 500
