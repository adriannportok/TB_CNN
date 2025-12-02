"""Cliente ligero para integrar con Google Generative AI (Gemini).

Comportamiento:
- Lee la variable de entorno `GEMINI_API_KEY`.
- Si está configurada, intenta importar y configurar `google.generativeai` (alias genai).
- Expone `classify_image_with_gemini(image_path, prompt_path=None)` que envía el prompt (con una imagen en base64
    embebida en el texto) al modelo y devuelve un dict con keys esperadas o {'error': msg}.

Notas:
- Este cliente hace un intento razonable de manejar la respuesta y parsear JSON estricto que el prompt pide.
- Si la librería no está disponible o falla, devuelve un error y el flujo debería hacer fallback al validador local.
"""
import os
import base64
import json
import logging
import re
import io
from PIL import Image

logger = logging.getLogger(__name__)
if not logger.handlers:
    handler = logging.StreamHandler()
    formatter = logging.Formatter('%(asctime)s %(levelname)s %(name)s: %(message)s')
    handler.setFormatter(formatter)
    logger.addHandler(handler)
logger.setLevel(logging.INFO)

_GENAI = None
_MODEL_NAME = 'gemini-1.5-pro'
_CONFIGURED = False

try:
    import google.generativeai as genai
    _GENAI = genai
except Exception:
    _GENAI = None


def _configure_from_env(env_var='GEMINI_API_KEY'):
    global _CONFIGURED
    if _CONFIGURED:
        return _GENAI is not None
    if _GENAI is None:
        logger.warning('Gemini client library not available: `google.generativeai` import failed.')
        _CONFIGURED = False
        logger.error(f"[DEBUG] GENAI LIB = {_GENAI}")
        return False
    key = os.environ.get(env_var, '')
    if not key:
        logger.warning('GEMINI_API_KEY not set in environment; Gemini disabled for this process.')
        _CONFIGURED = False
        logger.error(f"[DEBUG] GENAI LIB = {_GENAI}")
        logger.error(f"[DEBUG] API KEY FOUND = {key is not None}")
        return False
    try:
        _GENAI.configure(api_key=key)
        _CONFIGURED = True
        logger.info('✅ Gemini API configurada correctamente')
        return True
    except Exception as e:
        logger.exception('Error configurando Gemini: %s', e)
        _CONFIGURED = False
        return False


def _extract_json_from_text(text):
    """Intenta extraer un objeto JSON del texto (primera llave-cierre encontrada)."""
    if not isinstance(text, str):
        text = str(text)
    m = re.search(r"\{.*\}", text, re.S)
    if m:
        return m.group(0)
    return text.strip()


def _validate_gemini_parsed(parsed):
    """Valida que el objeto parseado cumpla esquema esperado.
    Retorna (True, None) o (False, motivo).
    """
    if not isinstance(parsed, dict):
        return False, 'not_object'
    if 'es_radiografia_torax' not in parsed:
        return False, 'missing_es_radiografia_torax'
    if not isinstance(parsed.get('es_radiografia_torax'), bool):
        return False, 'es_not_bool'
    if 'confianza' not in parsed:
        return False, 'missing_confianza'
    try:
        confianza = float(parsed.get('confianza'))
    except Exception:
        return False, 'confianza_not_numeric'
    if confianza < 0.0 or confianza > 1.0:
        return False, 'confianza_out_of_range'
    if 'justificacion' not in parsed:
        return False, 'missing_justificacion'
    if not isinstance(parsed.get('justificacion'), str):
        return False, 'justificacion_not_str'
    if len(parsed.get('justificacion', '')) > 200:
        return False, 'justificacion_too_long'
    return True, None


def classify_image_with_gemini(image_path, prompt_path=None, env_var='GEMINI_API_KEY'):
    """Devuelve dict: {'es_radiografia_torax': bool, 'confianza': float, 'justificacion': str}
    o {'error': mensaje}.
    """
    logger.info('classify_image_with_gemini called for %s', image_path)
    if not _configure_from_env(env_var=env_var):
        genai_available = _GENAI is not None
        key_present = bool(os.environ.get(env_var, ''))
        logger.info('Gemini not configured for this process (skipping external classify). genai_available=%s key_present=%s', genai_available, key_present)
        return {'error': 'gemini_not_configured'}

    try:
        base_dir = os.path.dirname(__file__)
        if prompt_path is None:
            prompt_path = os.path.join(base_dir, 'gemini_prompt.txt')
        try:
            with open(prompt_path, 'r', encoding='utf-8') as f:
                prompt_template = f.read()
        except Exception:
            prompt_template = (
                'Responde solo con un JSON válido con keys: es_radiografia_torax (true/false), '
                'confianza (numero 0.0-1.0), justificacion (texto). El campo image_base64 contiene la imagen en base64: {image_base64}'
            )
        logger.info('Loaded prompt template from %s (len=%d)', prompt_path, len(prompt_template))

        try:
            img = Image.open(image_path).convert('RGB')
            try:
                info_size = os.path.getsize(image_path)
                logger.info('Image file exists. path=%s size=%d bytes', image_path, info_size)
            except Exception:
                logger.info('Could not stat image file: %s', image_path)
            max_dim = 512
            w, h = img.size
            if max(w, h) > max_dim:
                scale = max_dim / float(max(w, h))
                new_size = (max(1, int(w * scale)), max(1, int(h * scale)))
                img = img.resize(new_size, Image.LANCZOS)
            buf = io.BytesIO()
            img.save(buf, format='JPEG', quality=75, optimize=True)
            buf.seek(0)
            b64 = base64.b64encode(buf.read()).decode('utf-8')
            logger.info('Image preprocessed and encoded to base64 (len=%d chars)', len(b64))
        except Exception:
            try:
                with open(image_path, 'rb') as f:
                    b64 = base64.b64encode(f.read()).decode('utf-8')
                    logger.info('Fallback raw file read and base64 encoded (len=%d chars)', len(b64))
            except Exception as e:
                logger.exception('Could not read image for base64 encoding: %s', e)
                return {'error': f'could_not_read_image: {e}'}

        if '{image_base64}' in prompt_template:
            prompt = prompt_template.replace('{image_base64}', b64)
        else:
            prompt = prompt_template + '\n\nImagen(base64):\n' + b64

        resp = None
        call_errors = []
        try_methods = []
        try:
            logger.info('Calling Gemini SDK. Model=%s prompt_length=%d', _MODEL_NAME, len(prompt))

            try_methods.append('generate(input)')
            if hasattr(_GENAI, 'generate'):
                try:
                    resp = _GENAI.generate(model=_MODEL_NAME, input=prompt)
                    logger.info('Called _GENAI.generate(...)')
                except Exception as e:
                    call_errors.append(('generate', str(e)))

            if resp is None and hasattr(_GENAI, 'generate'):
                try_methods.append('generate(prompt)')
                try:
                    resp = _GENAI.generate(model=_MODEL_NAME, prompt=prompt)
                    logger.info('Called _GENAI.generate(..., prompt=...)')
                except Exception as e:
                    call_errors.append(('generate_prompt', str(e)))

            if resp is None and hasattr(_GENAI, 'text') and hasattr(_GENAI.text, 'generate'):
                try_methods.append('text.generate')
                try:
                    resp = _GENAI.text.generate(model=_MODEL_NAME, input=prompt)
                    logger.info('Called _GENAI.text.generate(...)')
                except Exception as e:
                    call_errors.append(('text.generate', str(e)))

            if resp is None and hasattr(_GENAI, 'chat'):
                try_methods.append('chat.completions.create')
                try:
                    messages = [{'role': 'user', 'content': prompt}]
                    if hasattr(_GENAI.chat, 'completions') and hasattr(_GENAI.chat.completions, 'create'):
                        resp = _GENAI.chat.completions.create(model=_MODEL_NAME, messages=messages)
                        logger.info('Called _GENAI.chat.completions.create(...)')
                    elif hasattr(_GENAI.chat, 'create'):
                        resp = _GENAI.chat.create(model=_MODEL_NAME, messages=messages)
                        logger.info('Called _GENAI.chat.create(...)')
                except Exception as e:
                    call_errors.append(('chat.create', str(e)))

            if resp is None and hasattr(_GENAI, 'generate_text'):
                try_methods.append('generate_text')
                try:
                    resp = _GENAI.generate_text(model=_MODEL_NAME, input=prompt)
                    logger.info('Called _GENAI.generate_text(...)')
                except Exception as e:
                    call_errors.append(('generate_text', str(e)))

            if resp is None:
                available = dir(_GENAI)
                logger.error('No SDK call pattern succeeded. tried=%s errors=%s available_attrs_sample=%s', try_methods, call_errors, available[:20])
                try:
                    import requests as _requests
                    api_key = os.environ.get(env_var, '')
                    if not api_key:
                        logger.error('No API key in env for REST fallback (env_var=%s)', env_var)
                        return {'error': 'no_callable_method_on_genai', 'tried': try_methods, 'errors': call_errors}
                    endpoint = f'https://generativelanguage.googleapis.com/v1/models/{_MODEL_NAME}:generate?key={api_key}'
                    payload = {
                        'prompt': {'text': prompt},
                        'temperature': 0.0,
                        'maxOutputTokens': 800,
                    }
                    logger.info('Attempting REST fallback to Generative Language endpoint (masked_key_len=%d) endpoint=%s', len(api_key), endpoint)
                    r = _requests.post(endpoint, json=payload, timeout=30)
                    logger.info('REST fallback response status=%s', r.status_code)
                    try:
                        rj = r.json()
                    except Exception:
                        rj = {'text': r.text}
                    logger.info('REST RAW RESP: %s', rj)
                    text = None
                    try:
                        if isinstance(rj, dict):
                            if 'candidates' in rj and isinstance(rj['candidates'], (list, tuple)) and len(rj['candidates'])>0:
                                first = rj['candidates'][0]
                                if isinstance(first, dict) and 'output' in first:
                                    text = first.get('output')
                                elif isinstance(first, dict) and 'content' in first:
                                    text = first.get('content')
                            if not text and 'output' in rj and isinstance(rj['output'], str):
                                text = rj['output']
                            if not text and 'text' in rj:
                                text = rj['text']
                    except Exception:
                        pass
                    if not text:
                        text = str(rj)
                    resp = text
                except Exception as e:
                    logger.exception('REST fallback to Generative Language failed: %s', e)
                    return {'error': 'no_callable_method_on_genai', 'tried': try_methods, 'errors': call_errors, 'rest_error': str(e)}

            logger.info('RAW RESP: %s', resp)

        except Exception as e:
            logger.exception('Unexpected error while calling Gemini SDK: %s', e)
            return {'error': f'Unexpected error calling Gemini: {e}'}

        text = None
        try:
            if hasattr(resp, 'output'):
                out = getattr(resp, 'output')
                if isinstance(out, (list, tuple)) and len(out) > 0:
                    first = out[0]
                    if isinstance(first, dict) and 'content' in first:
                        cont = first['content']
                        if isinstance(cont, (list, tuple)) and len(cont) > 0 and isinstance(cont[0], dict):
                            text = cont[0].get('text')
                    elif isinstance(first, str):
                        text = first
            if text is None and hasattr(resp, 'output_text'):
                text = getattr(resp, 'output_text')
        except Exception:
            pass

        if not text:
            text = str(resp)

        logger.info('RAW TEXT: %s', text)

        jtext = _extract_json_from_text(text)
        try:
            parsed = json.loads(jtext)
        except Exception as e:
            logger.warning('Gemini returned non-JSON or unparsable content: %s', e)
            logger.info('Raw response included in log for inspection.')
            return {'error': f'No se pudo parsear JSON desde respuesta de Gemini: {e}', 'raw': text}

        logger.info('Parsed JSON from Gemini (pre-validation): %s', parsed)
        logger.info('PARSED: %s', parsed)

        ok, reason = _validate_gemini_parsed(parsed)
        if not ok:
            logger.warning('Respuesta Gemini inválida: %s', reason)
            logger.info('Parsed JSON rejected by schema validation: %s', parsed)
            return {'error': 'invalid_response', 'reason': reason, 'raw': parsed}

        es = parsed.get('es_radiografia_torax')
        confianza = float(parsed.get('confianza', 0.0))
        just = parsed.get('justificacion', '')

        logger.info('Gemini validated response: es=%s confianza=%s', es, confianza)

        return {
            'es_radiografia_torax': bool(es),
            'confianza': confianza,
            'justificacion': just,
            'raw_parsed': parsed,
        }

    except Exception as e:
        logger.exception('Error clasificando con Gemini: %s', e)
        return {'error': str(e)}
