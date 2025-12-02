from flask import Blueprint, request, jsonify
import os
from werkzeug.utils import secure_filename
from datetime import datetime

validacion_bp = Blueprint('validacion', __name__)


@validacion_bp.route('/validacion/rcx', methods=['POST'])
def validar_rcx():
    print("GEMINI_KEY_ENV =", os.environ.get("GEMINI_API_KEY"))
    try:
        if 'imagen' not in request.files:
            return jsonify({'error': 'No se encontró el campo imagen'}), 400

        file = request.files['imagen']
        if file.filename == '':
            return jsonify({'error': 'Nombre de archivo vacío'}), 400

        filename = secure_filename(file.filename)
        ts = datetime.utcnow().strftime('%Y%m%d%H%M%S%f')
        uploads_dir = os.path.join(os.getcwd(), 'uploads')
        os.makedirs(uploads_dir, exist_ok=True)
        save_path = os.path.join(uploads_dir, f'tmp_val_{ts}_{filename}')
        file.save(save_path)

        try:
            # prefer external-first wrapper; si no existe, fallback a validate_rcx_image
            from inference.model import validate_rcx_external_first as _validate_wrapper
        except Exception:
            try:
                from inference.model import validate_rcx_image as _validate_wrapper
            except Exception as e:
                return jsonify({'error': f'Error al cargar módulo de inferencia: {e}'}), 500

        result = _validate_wrapper(save_path)
        # Log the validator pipeline result for debugging (no secrets)
        try:
            import logging as _logging
            _logging.getLogger('inference.model').info('Validator pipeline returned: %s', result)
        except Exception:
            pass
        try:
            if os.path.exists(save_path):
                os.remove(save_path)
        except Exception:
            pass

        if isinstance(result, dict) and 'error' in result:
            return jsonify({'error': 'La imagen no es una radiografía de tórax válida.'}), 400

        diagnostico = result.get('diagnostico')
        mse = float(result.get('mse', 0.0))
        mae = float(result.get('mae', 0.0))
        confianza = float(result.get('confianza', 0.0))
        threshold = result.get('threshold', None)

        valid = diagnostico == 'RCX'
        # Si no es válido, devolver 400 para bloquear la subida desde el cliente
        if not valid:
            return jsonify({
                'error': 'Imagen no válida (no es radiografía de tórax)',
                'diagnostico': diagnostico,
                'confianza': confianza,
                'threshold': threshold,
            }), 400

        return jsonify({
            'valid': True,
            'diagnostico': diagnostico,
            'mse': mse,
            'mae': mae,
            'confianza': confianza,
            'threshold': threshold,
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500
