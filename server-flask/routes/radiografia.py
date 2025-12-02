from flask import Blueprint, request, jsonify
from config import get_db_connection
from datetime import datetime
import os
from werkzeug.utils import secure_filename

from flask import Blueprint, request, jsonify
from config import get_db_connection
from datetime import datetime
import os


radiografia_bp = Blueprint('radiografia', __name__)


@radiografia_bp.route('/analisis', methods=['GET'])
def listar_analisis():
    """Devuelve dos listas: pendientes (porcentaje IS NULL) y realizados (porcentaje IS NOT NULL)
    filtradas por el usuario médico (query param 'usuario')."""
    try:
        usuario = request.args.get('usuario')
        if not usuario:
            return jsonify({"error": "Parámetro 'usuario' es requerido"}), 400

        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("SELECT id_usuario FROM usuario WHERE usuario = %s AND rol = 'medico'", (usuario,))
        res = cur.fetchone()
        if not res:
            return jsonify({"error": "Médico no encontrado"}), 404
        medico_id = res[0]

        cur.execute(
            """
            SELECT p.id_pred, p.ruta_imagen, p.fecha_pred, pac.id_paciente, pac.nombres, pac.apellidos, pac.dni, pac.fecha_registro
            FROM prediccion p
            JOIN paciente pac ON p.id_paciente = pac.id_paciente
            WHERE pac.id_usuario = %s AND p.porcentaje IS NULL
            ORDER BY (p.fecha_pred IS NULL) ASC, p.id_pred DESC
            """,
            (medico_id,)
        )
        pendientes_rows = cur.fetchall()

        pendientes = [
            {
                "id_pred": row[0],
                "ruta_imagen": row[1],
                "fecha_pred": row[2].strftime('%Y-%m-%d %H:%M:%S') if row[2] else None,
                "id_paciente": row[3],
                "nombres": row[4],
                "apellidos": row[5],
                "dni": row[6] if len(row) > 6 else None,
                "fecha_registro": row[7].strftime('%Y-%m-%d %H:%M:%S') if len(row) > 7 and row[7] else None,
                "nombre_paciente": f"{row[4]} {row[5]}"
            }
            for row in pendientes_rows
        ]

        cur.execute(
            """
            SELECT p.id_pred, p.ruta_imagen, p.fecha_pred, p.porcentaje, pac.id_paciente, pac.nombres, pac.apellidos, pac.dni, pac.fecha_registro
            FROM prediccion p
            JOIN paciente pac ON p.id_paciente = pac.id_paciente
            WHERE pac.id_usuario = %s AND p.porcentaje IS NOT NULL
            ORDER BY p.fecha_pred DESC
            LIMIT 50
            """,
            (medico_id,)
        )
        hechos_rows = cur.fetchall()

        realizados = [
            {
                "id_pred": row[0],
                "ruta_imagen": row[1],
                "fecha_pred": row[2].strftime('%Y-%m-%d %H:%M:%S') if row[2] else None,
                "porcentaje": float(row[3]) if row[3] is not None else None,
                "id_paciente": row[4],
                "nombres": row[5],
                "apellidos": row[6],
                "dni": row[7] if len(row) > 7 else None,
                "fecha_registro": row[8].strftime('%Y-%m-%d %H:%M:%S') if len(row) > 8 and row[8] else None,
                "nombre_paciente": f"{row[5]} {row[6]}"
            }
            for row in hechos_rows
        ]

        cur.close()
        conn.close()

        return jsonify({"pendientes": pendientes, "realizados": realizados})

    except Exception as e:
        print('Error listar_analisis:', e)
        return jsonify({'error': 'Error interno del servidor'}), 500


@radiografia_bp.route('/analisis/pacientes', methods=['GET'])
def listar_pacientes_analizados():
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute(
            """
            SELECT pac.id_paciente, pac.nombres, pac.apellidos, pac.dni, pac.fecha_registro,
                   pr.porcentaje, pr.ruta_imagen
            FROM paciente pac
            LEFT JOIN LATERAL (
                SELECT porcentaje, ruta_imagen FROM prediccion WHERE id_paciente = pac.id_paciente ORDER BY fecha_pred DESC LIMIT 1
            ) pr ON true
            ORDER BY pac.id_paciente DESC
            """
        )
        rows = cur.fetchall()
        resultado = [
            {
                'id_paciente': r[0],
                'nombres': r[1],
                'apellidos': r[2],
                'dni': r[3],
                'fecha_registro': r[4].strftime('%Y-%m-%d %H:%M:%S') if r[4] else None,
                'porcentaje': float(r[5]) if r[5] is not None else None,
                'ruta_imagen': r[6] if len(r) > 6 and r[6] else None,
            }
            for r in rows
        ]
        cur.close()
        conn.close()
        return jsonify(resultado)
    except Exception as e:
        print('Error listar_pacientes_analizados:', e)
        return jsonify({'error': 'Error interno del servidor'}), 500


@radiografia_bp.route('/analisis/pacientes/pendientes', methods=['GET'])
def listar_pacientes_pendientes():
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute(
            """
            SELECT p.id_pred, p.ruta_imagen, p.fecha_pred, pac.id_paciente, pac.nombres, pac.apellidos, pac.dni, pac.fecha_registro
            FROM prediccion p
            JOIN paciente pac ON p.id_paciente = pac.id_paciente
            WHERE p.porcentaje IS NULL
            ORDER BY (p.fecha_pred IS NULL) DESC, p.id_pred DESC
            """
        )
        rows = cur.fetchall()
        resultado = [
            {
                'id_pred': r[0],
                'ruta_imagen': r[1],
                'fecha_registro': r[2].strftime('%Y-%m-%d %H:%M:%S') if r[2] else None,
                'id_paciente': r[3],
                'nombres': r[4],
                'apellidos': r[5],
                'dni': r[6],
            }
            for r in rows
        ]
        cur.close()
        conn.close()
        return jsonify(resultado)
    except Exception as e:
        print('Error listar_pacientes_pendientes:', e)
        return jsonify({'error': 'Error interno del servidor'}), 500


@radiografia_bp.route('/analisis/predicciones/<int:id_paciente>', methods=['GET'])
def predicciones_por_paciente(id_paciente):
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute(
            "SELECT id_pred, porcentaje, ruta_imagen, fecha_pred FROM prediccion WHERE id_paciente = %s AND porcentaje IS NOT NULL ORDER BY fecha_pred DESC",
            (id_paciente,)
        )
        rows = cur.fetchall()
        resultado = [
            {
                'id_pred': r[0],
                'porcentaje': float(r[1]) if r[1] is not None else None,
                'ruta_imagen': r[2],
                'fecha_pred': r[3].strftime('%Y-%m-%d %H:%M:%S') if r[3] else None,
            }
            for r in rows
        ]
        cur.close()
        conn.close()
        return jsonify(resultado)
    except Exception as e:
        print('Error predicciones_por_paciente:', e)
        return jsonify({'error': 'Error interno del servidor'}), 500


@radiografia_bp.route('/analisis/predicciones', methods=['GET'])
def todas_predicciones():
    """Devuelve todas las filas de la tabla prediccion con ruta_imagen, porcentaje y fecha"""
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute(
            "SELECT id_pred, id_paciente, porcentaje, ruta_imagen, fecha_pred FROM prediccion ORDER BY fecha_pred DESC"
        )
        rows = cur.fetchall()
        resultado = [
            {
                'id_pred': r[0],
                'id_paciente': r[1],
                'porcentaje': float(r[2]) if r[2] is not None else None,
                'ruta_imagen': r[3],
                'fecha_pred': r[4].strftime('%Y-%m-%d %H:%M:%S') if r[4] else None,
            }
            for r in rows
        ]
        cur.close()
        conn.close()
        return jsonify(resultado)
    except Exception as e:
        print('Error todas_predicciones:', e)
        return jsonify({'error': 'Error interno del servidor'}), 500


@radiografia_bp.route('/analisis/ejecutar/<int:id_pred>', methods=['POST'])
def ejecutar_prediccion_por_id(id_pred):
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute('SELECT ruta_imagen FROM prediccion WHERE id_pred = %s', (id_pred,))
        row = cur.fetchone()
        if not row:
            return jsonify({'error': 'Predicción no encontrada'}), 404
        ruta = row[0]
        base_dir = os.path.dirname(os.path.dirname(__file__))
        imagen_path = os.path.abspath(os.path.join(base_dir, ruta))
        if not os.path.exists(imagen_path):
            return jsonify({'error': f'Archivo no encontrado: {imagen_path}'}), 404

        try:
            from inference.model import infer_image
        except Exception as e:
            print('Error importando módulo de inferencia:', e)
            return jsonify({'error': 'Error interno del servidor (módulo de inferencia)'}), 500

        inf = infer_image(imagen_path)
        if 'error' in inf:
            print('Error en inferencia:', inf['error'])
            return jsonify({'error': f"Error en inferencia: {inf['error']}"}), 500

        porcentaje = inf.get('porcentaje')

        ahora = datetime.now()
        cur.execute(
            'UPDATE prediccion SET porcentaje = %s, fecha_pred = %s WHERE id_pred = %s RETURNING id_pred, ruta_imagen, fecha_pred, porcentaje, id_paciente',
            (porcentaje, ahora, id_pred)
        )
        updated = cur.fetchone()
        conn.commit()
        cur.close()
        conn.close()

        return jsonify({
            'porcentaje': float(updated[3]) if updated and updated[3] is not None else None,
            'nivel_confianza': float(updated[3]) if updated and updated[3] is not None else None,
            'simulado': False
        })

    except Exception as e:
        print('Error ejecutar_prediccion_por_id:', e)
        import traceback
        traceback.print_exc()
        return jsonify({'error': 'Error interno del servidor'}), 500



@radiografia_bp.route('/analisis/nuevo/<int:id_paciente>', methods=['POST'])
def crear_nuevo_analisis(id_paciente):
    """Crea un nuevo registro en prediccion (análisis pendiente) para el paciente.
    Requiere JSON body con 'usuario' para verificar que el médico puede operar sobre el paciente.
    Solo se permite si NO existe un análisis pendiente (porcentaje IS NULL) para ese paciente."""
    try:
        usuario = request.form.get('usuario') or request.args.get('usuario')
        if not usuario:
            return jsonify({'error': "Usuario (médico) requerido"}), 400

        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("SELECT id_usuario FROM usuario WHERE usuario = %s AND rol = 'medico'", (usuario,))
        r = cur.fetchone()
        if not r:
            cur.close()
            conn.close()
            return jsonify({'error': 'Usuario no encontrado o no es médico'}), 404
        id_usuario = r[0]

        cur.execute("SELECT id_paciente FROM paciente WHERE id_paciente = %s AND id_usuario = %s", (id_paciente, id_usuario))
        if not cur.fetchone():
            cur.close()
            conn.close()
            return jsonify({'error': 'Paciente no encontrado o no pertenece al médico'}), 404

        cur.execute("SELECT COUNT(*) FROM prediccion WHERE id_paciente = %s AND porcentaje IS NULL", (id_paciente,))
        pendientes = cur.fetchone()[0]
        if pendientes > 0:
            cur.close()
            conn.close()
            return jsonify({'error': 'No se puede crear un nuevo análisis: el paciente figura como pendiente.'}), 400

        imagen = request.files.get('imagen')
        if imagen:
            try:
                filename = secure_filename(f"pac_{id_paciente}_{datetime.now().strftime('%Y%m%d%H%M%S')}.png")
                base_dir = os.path.dirname(os.path.dirname(__file__))
                uploads_dir = os.path.join(base_dir, 'uploads')
                os.makedirs(uploads_dir, exist_ok=True)
                upload_path = os.path.join(uploads_dir, filename)
                imagen.save(upload_path)
                ruta_imagen = f'uploads/{filename}'
                cur.execute("INSERT INTO prediccion (ruta_imagen, id_paciente) VALUES (%s, %s) RETURNING id_pred", (ruta_imagen, id_paciente))
                new_id = cur.fetchone()[0]
            except Exception as e:
                cur.close()
                conn.close()
                print('Error guardando imagen nuevo análisis:', e)
                return jsonify({'error': 'Error guardando la imagen del análisis.'}), 500
        else:
            cur.execute("SELECT ruta_imagen FROM prediccion WHERE id_paciente = %s ORDER BY fecha_pred DESC LIMIT 1", (id_paciente,))
            last = cur.fetchone()
            if not last or not last[0]:
                cur.close()
                conn.close()
                return jsonify({'error': 'No hay imagen disponible para crear un nuevo análisis.'}), 400
            ruta = last[0]
            cur.execute("INSERT INTO prediccion (ruta_imagen, id_paciente) VALUES (%s, %s) RETURNING id_pred", (ruta, id_paciente))
            new_id = cur.fetchone()[0]
        conn.commit()
        cur.close()
        conn.close()
        return jsonify({'mensaje': 'Nuevo análisis creado', 'id_pred': new_id}), 201
    except Exception as e:
        import traceback
        if 'conn' in locals():
            conn.rollback()
            try:
                cur.close()
            except Exception:
                pass
            try:
                conn.close()
            except Exception:
                pass
        tb = traceback.format_exc()
        print('Error crear_nuevo_analisis:', e)
        print(tb)
        return jsonify({'error': str(e), 'trace': tb}), 500
    
