from flask import Blueprint, jsonify, request
from config import get_db_connection
from datetime import date, datetime, timedelta


def _first_day_of_month(d: date) -> date:
    return d.replace(day=1)


def _add_months(d: date, months: int) -> date:
    
    y = d.year + (d.month - 1 + months) // 12
    m = (d.month - 1 + months) % 12 + 1
    return date(y, m, 1)


def _start_end_range_for_last_n_months(n_months: int):
    
    today = date.today()
    current_month_start = _first_day_of_month(today)
    start = _add_months(current_month_start, -(n_months - 1))
    end = _add_months(current_month_start, 1)
    return datetime.combine(start, datetime.min.time()), datetime.combine(end, datetime.min.time())


def _start_end_from_rango(rango: str):
    
    now = datetime.now()
    if rango == '24h':
        start = now - timedelta(hours=24)
        end = now
        return start, end
    if rango == '7d':
        start = now - timedelta(days=7)
        end = now
        return start, end
    if rango == '1m':
        return _start_end_range_for_last_n_months(1)
    if rango == '6m':
        return _start_end_range_for_last_n_months(6)
    if rango == '1y':
        return _start_end_range_for_last_n_months(12)
    return None


dashboard = Blueprint('dashboard', __name__)


@dashboard.route('/dashboard/stats', methods=['GET'])
def get_dashboard_stats():
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        username = request.args.get('username')

        rango = request.args.get('rango')
        start_date = end_date = None
        if rango:
            se = _start_end_from_rango(rango)
            if se:
                start_date, end_date = se

        if start_date is None or end_date is None:
            try:
                meses = int(request.args.get('meses', 6))
            except ValueError:
                meses = 6
            meses = max(1, min(meses, 36))
            start_date, end_date = _start_end_range_for_last_n_months(meses)
        else:
            meses = None

        if not username:
            return jsonify({"error": "Username es requerido"}), 400

        cur.execute(
            "SELECT id_usuario FROM usuario WHERE usuario = %s AND rol = 'medico'",
            (username,)
        )
        medico = cur.fetchone()
        if not medico:
            return jsonify({"error": "Médico no encontrado"}), 404

        medico_id = medico[0]

        cur.execute(
            "SELECT COUNT(*) FROM paciente WHERE id_usuario = %s",
            (medico_id,)
        )
        total_pacientes = cur.fetchone()[0]

        cur.execute(
            """
            SELECT COUNT(DISTINCT pac.id_paciente)
            FROM prediccion p
            JOIN paciente pac ON p.id_paciente = pac.id_paciente
            WHERE pac.id_usuario = %s AND p.porcentaje IS NOT NULL AND p.fecha_pred >= %s AND p.fecha_pred < %s
            """,
            (medico_id, start_date, end_date),
        )
        total_pacientes_periodo = cur.fetchone()[0]

        cur.execute(
            """
            SELECT COUNT(*)
            FROM prediccion p
            JOIN paciente pac ON p.id_paciente = pac.id_paciente
            WHERE pac.id_usuario = %s AND p.porcentaje IS NOT NULL AND p.porcentaje > 50 AND p.fecha_pred >= %s AND p.fecha_pred < %s
            """,
            (medico_id, start_date, end_date),
        )
        predicciones_positivas = cur.fetchone()[0]

        cur.execute(
            """
            SELECT AVG(p.porcentaje)
            FROM prediccion p
            JOIN paciente pac ON p.id_paciente = pac.id_paciente
            WHERE pac.id_usuario = %s AND p.porcentaje IS NOT NULL AND p.fecha_pred >= %s AND p.fecha_pred < %s
            """,
            (medico_id, start_date, end_date),
        )
        precision_promedio = cur.fetchone()[0]
        precision_promedio = float(precision_promedio) if precision_promedio is not None else 0.0
        nivel_riesgo_promedio = precision_promedio

        cur.execute(
            """
            SELECT pac.nombres, pac.apellidos, p.porcentaje, p.fecha_pred, p.ruta_imagen
            FROM prediccion p
            JOIN paciente pac ON p.id_paciente = pac.id_paciente
            WHERE pac.id_usuario = %s AND p.porcentaje IS NOT NULL AND p.fecha_pred >= %s AND p.fecha_pred < %s
            ORDER BY p.fecha_pred DESC LIMIT 5
            """,
            (medico_id, start_date, end_date),
        )
        rows = cur.fetchall()

        predicciones_lista = []
        for row in rows:
            predicciones_lista.append(
                {
                    "nombre_paciente": f"{row[0]} {row[1]}",
                    "porcentaje": float(row[2]) if row[2] is not None else 0.0,
                    "fecha": row[3].strftime("%Y-%m-%d %H:%M:%S") if row[3] else None,
                    "ruta_imagen": row[4],
                }
            )

        cur.execute(
            """
            WITH proms AS (
                SELECT p.id_paciente, AVG(p.porcentaje) as promedio
                FROM prediccion p
                JOIN paciente pac ON p.id_paciente = pac.id_paciente
                WHERE pac.id_usuario = %s AND p.porcentaje IS NOT NULL AND p.fecha_pred >= %s AND p.fecha_pred < %s
                GROUP BY p.id_paciente
            )
            SELECT COUNT(CASE WHEN promedio > 50 THEN 1 END) as alto,
                   COUNT(CASE WHEN promedio = 50 THEN 1 END) as medio,
                   COUNT(CASE WHEN promedio < 50 THEN 1 END) as bajo
            FROM proms
            """,
            (medico_id, start_date, end_date),
        )
        riesgo_row = cur.fetchone()
        riesgo_distribucion = {
            "alto": riesgo_row[0] if riesgo_row else 0,
            "medio": riesgo_row[1] if riesgo_row else 0,
            "bajo": riesgo_row[2] if riesgo_row else 0,
        }

        gran = 'month'
        fmt = 'YYYY-MM'
        if rango == '24h':
            gran = 'hour'
            fmt = 'YYYY-MM-DD HH24:00'
        elif rango in ('7d', '1m'):
            gran = 'day'
            fmt = 'YYYY-MM-DD'

        sql_stats = f"""
            SELECT TO_CHAR(date_trunc('{gran}', p.fecha_pred), '{fmt}') as mes,
                   COUNT(CASE WHEN p.porcentaje > 50 THEN 1 END)::FLOAT / NULLIF(COUNT(p.porcentaje),0) * 100 as porcentaje_positivos,
                   COUNT(CASE WHEN p.porcentaje <= 50 THEN 1 END)::FLOAT / NULLIF(COUNT(p.porcentaje),0) * 100 as porcentaje_negativos,
                   COUNT(p.porcentaje) as total_analisis
            FROM prediccion p
            JOIN paciente pac ON p.id_paciente = pac.id_paciente
            WHERE pac.id_usuario = %s AND p.porcentaje IS NOT NULL AND p.fecha_pred >= %s AND p.fecha_pred < %s
            GROUP BY 1
            ORDER BY 1 ASC
        """

        cur.execute(sql_stats, (medico_id, start_date, end_date))
        stats_mensuales = [
            {
                "mes": row[0],
                "porcentaje_positivos": float(row[1]) if row[1] is not None else 0.0,
                "porcentaje_negativos": float(row[2]) if row[2] is not None else 0.0,
                "total_analisis": row[3],
            }
            for row in cur.fetchall()
        ]

        cur.close()
        conn.close()

        filtro_meta = {
            "rango": rango if rango else None,
            "meses": meses if meses is not None else None,
            "desde": start_date.strftime('%Y-%m-%dT%H:%M:%S'),
            "hasta": end_date.strftime('%Y-%m-%dT%H:%M:%S') if end_date else None,
        }

        return jsonify(
            {
                "total_pacientes": total_pacientes,
                "total_pacientes_periodo": total_pacientes_periodo,
                "predicciones_positivas": predicciones_positivas,
                "precision_promedio": precision_promedio,
                "nivel_riesgo_promedio": nivel_riesgo_promedio,
                "ultimas_predicciones": predicciones_lista,
                "stats_mensuales": stats_mensuales,
                "riesgo_distribucion": riesgo_distribucion,
                "filtro": filtro_meta,
            }
        )
    except Exception as e:
        print("Error:", str(e))
        import traceback
        traceback.print_exc()
        return jsonify({"error": "Error interno del servidor"}), 500
