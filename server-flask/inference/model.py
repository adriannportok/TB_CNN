"""Carga y función de inferencia reutilizable para el modelo .pth
Este módulo expone:
- load_model_once() -> (model, preprocess, error)
- infer_image(path) -> dict {porcentaje, nivel_confianza, simulado}

Se mantiene en CPU y usa torchvision transforms compatibles con el entrenamiento.
"""
import os
from datetime import datetime
import logging

logger = logging.getLogger(__name__)
if not logger.handlers:
    handler = logging.StreamHandler()
    formatter = logging.Formatter('%(asctime)s %(levelname)s %(name)s: %(message)s')
    handler.setFormatter(formatter)
    logger.addHandler(handler)
logger.setLevel(logging.INFO)

_MODEL = None
_PREPROCESS = None
_MODEL_ERROR = None


def load_model_once():
    """Carga y cachea el modelo en memoria. Retorna (model, preprocess, error_msg).
    error_msg será None si todo fue OK."""
    global _MODEL, _PREPROCESS, _MODEL_ERROR
    if _MODEL is not None or _MODEL_ERROR is not None:
        return _MODEL, _PREPROCESS, _MODEL_ERROR
    try:
        import torch
        import torch.nn as nn
        from torchvision import transforms

        IMG_SIZE = 224
        mean = [0.485, 0.456, 0.406]
        std = [0.229, 0.224, 0.225]

        def build_model():
            try:
                from torchvision.models import efficientnet_v2_s, EfficientNet_V2_S_Weights
                weights = EfficientNet_V2_S_Weights.IMAGENET1K_V1
                backbone = efficientnet_v2_s(weights=weights)
                in_features = backbone.classifier[1].in_features if hasattr(backbone, 'classifier') else 1280
                backbone.classifier = nn.Identity()
                model = nn.Sequential(
                    backbone,
                    nn.Linear(in_features, 120),
                    nn.ReLU(),
                    nn.Linear(120, 120),
                    nn.ReLU(),
                    nn.Linear(120, 1)
                )
                return model
            except Exception:
                class SmallCNN(nn.Module):
                    def __init__(self, num_classes=1):
                        super().__init__()
                        self.features = nn.Sequential(
                            nn.Conv2d(3, 32, 3, stride=1, padding=1),
                            nn.ReLU(),
                            nn.MaxPool2d(2),
                            nn.Conv2d(32, 64, 3, padding=1),
                            nn.ReLU(),
                            nn.MaxPool2d(2),
                        )
                        self.classifier = nn.Sequential(
                            nn.Flatten(),
                            nn.Linear(64 * (IMG_SIZE//4) * (IMG_SIZE//4), 256),
                            nn.ReLU(),
                            nn.Linear(256, num_classes)
                        )

                    def forward(self, x):
                        x = self.features(x)
                        x = self.classifier(x)
                        return x

                return SmallCNN(num_classes=1)

        model = build_model()

        model_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'models', 'modelo_tuberculosis.pth')
        if not os.path.exists(model_path):
            _MODEL_ERROR = f'Modelo no encontrado en {model_path}'
            return None, None, _MODEL_ERROR

        device = 'cpu'
        try:
            state = torch.load(model_path, map_location=device, weights_only=True)
        except TypeError:
            state = torch.load(model_path, map_location=device)
        model.load_state_dict(state)
        model.eval()

        preprocess = transforms.Compose([
            transforms.Resize((IMG_SIZE, IMG_SIZE)),
            transforms.ToTensor(),
            transforms.Normalize(mean=mean, std=std),
        ])

        _MODEL = model
        _PREPROCESS = preprocess
        return _MODEL, _PREPROCESS, None

    except Exception as e:
        _MODEL_ERROR = str(e)
        return None, None, _MODEL_ERROR


def infer_image(imagen_path):
    """Realiza la inferencia sobre la imagen indicada y devuelve un dict:
    { porcentaje: float, nivel_confianza: float, simulado: bool }
    """
    model, preprocess, err = load_model_once()
    if err:
        return {'error': err}
    if model is None:
        return {'error': 'Modelo no disponible'}

    try:
        from PIL import Image
        import torch
        img = Image.open(imagen_path).convert('RGB')
        inp = preprocess(img).unsqueeze(0)
        with torch.no_grad():
            out = model(inp)
            probs = torch.sigmoid(out).cpu().numpy().ravel()
            prob = float(probs[0]) if len(probs) > 0 else 0.0
            porcentaje = round(prob * 100.0, 2)
        return {'porcentaje': porcentaje, 'nivel_confianza': porcentaje, 'simulado': False}
    except Exception as e:
        return {'error': str(e)}


def _call_google_vision_label_detection(image_path, api_key_env='GOOGLE_API_KEY'):
    """Intenta consultar la Google Vision API (label detection) para detectar si la imagen
    es una radiografía de tórax. Retorna dict con keys: 'diagnostico', 'confianza', 'justificacion'
    o {'error': msg} en caso de fallo.
    """
    try:
        import base64
        import json
        import os
        import requests

        api_key = os.environ.get(api_key_env)
        if not api_key:
            return {'error': f'API key no encontrada en la variable de entorno {api_key_env}'}

        with open(image_path, 'rb') as f:
            img_b64 = base64.b64encode(f.read()).decode('utf-8')

        url = f'https://vision.googleapis.com/v1/images:annotate?key={api_key}'
        payload = {
            'requests': [
                {
                    'image': {'content': img_b64},
                    'features': [
                        {'type': 'LABEL_DETECTION', 'maxResults': 10},
                    ],
                }
            ]
        }

        resp = requests.post(url, json=payload, timeout=10)
        if resp.status_code != 200:
            return {'error': f'Google Vision API returned {resp.status_code}: {resp.text}'}

        data = resp.json()
        labels = []
        try:
            annotations = data['responses'][0].get('labelAnnotations', [])
            for a in annotations:
                labels.append({'description': a.get('description', ''), 'score': float(a.get('score', 0.0))})
        except Exception:
            pass

        keywords = ['x-ray', 'xray', 'x ray', 'radiograph', 'radiography', 'chest x-ray', 'chest', 'thorax', 'medical imaging']
        matched = []
        for l in labels:
            desc = l['description'].lower()
            for kw in keywords:
                if kw in desc:
                    matched.append(l)
                    break

        if matched:
            best = max(matched, key=lambda x: x['score'])
            confianza = float(best['score'])
            justificacion = f"Etiqueta detectada: {best['description']} (score={confianza})"
            return {'diagnostico': 'RCX', 'confianza': confianza, 'justificacion': justificacion}

        best_global_score = max([l['score'] for l in labels], default=0.0)
        return {'diagnostico': 'NO RCX', 'confianza': float(best_global_score), 'justificacion': 'No se encontraron etiquetas compatibles con radiografía de tórax.'}

    except Exception as e:
        return {'error': str(e)}


def validate_rcx_external_first(image_path, api_key_env='GOOGLE_API_KEY'):
    """Wrapper que intenta validar la imagen con un servicio externo (Google Vision) primero
    y si falla o no está disponible, usa el validador local `validate_rcx_image`.
    Retorna un dict compatible con el validador local: si viene del externo, mse/mae/threshold serán None.
    """
    EXTERNAL_ACCEPT_THRESHOLD = 0.8
    EXTERNAL_FALLBACK_THRESHOLD = 0.4

    try:
        try:
            from inference.gemini_client import classify_image_with_gemini
        except Exception:
            from .gemini_client import classify_image_with_gemini

        gemini_res = classify_image_with_gemini(image_path)
        logger.info('Gemini raw response (from classify_image_with_gemini): %s', gemini_res)
        if isinstance(gemini_res, dict) and 'error' not in gemini_res:
            es = gemini_res.get('es_radiografia_torax')
            confianza = float(gemini_res.get('confianza', 0.0))
            diagnostico = 'RCX' if bool(es) else 'NO RCX'
            logger.info('Gemini returned: es=%s confianza=%s justificacion=%s', es, confianza, gemini_res.get('justificacion'))

            if confianza >= EXTERNAL_ACCEPT_THRESHOLD:
                logger.info('Gemini confidence >= %s: accepting external result', EXTERNAL_ACCEPT_THRESHOLD)
                return {
                    'diagnostico': diagnostico,
                    'mse': None,
                    'mae': None,
                    'threshold': None,
                    'confianza': confianza,
                    'source': 'gemini',
                    'justificacion': gemini_res.get('justificacion', None)
                }

            if confianza >= EXTERNAL_FALLBACK_THRESHOLD:
                logger.info('Gemini confidence in medium range (%s-%s): running local validator as fallback', EXTERNAL_FALLBACK_THRESHOLD, EXTERNAL_ACCEPT_THRESHOLD)
                try:
                    local = validate_rcx_image(image_path)
                    logger.info('Local validator result after Gemini: %s', local)
                    if isinstance(local, dict) and 'diagnostico' in local:
                        out = dict(local)
                        out.update({'source': 'local_after_gemini', 'gemini': {'es': es, 'confianza': confianza, 'justificacion': gemini_res.get('justificacion')}})
                        return out
                except Exception:
                    logger.exception('Error running local validator as fallback')

            logger.info('Gemini confidence too low (%s); trying next external or local validator', confianza)
        else:
            logger.info('Gemini did not provide a usable result; gemini_res: %s', gemini_res)
            
    except Exception:
        pass

    try:
        external = _call_google_vision_label_detection(image_path, api_key_env=api_key_env)
        logger.info('Google Vision raw response: %s', external)
        if isinstance(external, dict) and 'error' not in external:
            diag = external.get('diagnostico')
            confianza = float(external.get('confianza', 0.0))
            return {
                'diagnostico': diag,
                'mse': None,
                'mae': None,
                'threshold': None,
                'confianza': confianza,
                'source': 'google_vision',
                'justificacion': external.get('justificacion', None)
            }
    except Exception:
        pass

    try:
        local_res = validate_rcx_image(image_path)
        logger.info('Local validator raw result: %s', local_res)
        try:
            env_thresh = os.environ.get('GEMINI_LOCAL_MIN_CONFIDENCE')
            if env_thresh is not None and env_thresh != '':
                try:
                    LOCAL_MIN_CONFIDENCE = float(env_thresh)
                except Exception:
                    LOCAL_MIN_CONFIDENCE = 0.75
            else:
                LOCAL_MIN_CONFIDENCE = 0.75

            if isinstance(local_res, dict) and 'diagnostico' in local_res:
                conf = float(local_res.get('confianza', 0.0))
                logger.info('Applying local confidence threshold: threshold=%s local_conf=%s', LOCAL_MIN_CONFIDENCE, conf)
                if local_res.get('diagnostico') == 'RCX' and conf < LOCAL_MIN_CONFIDENCE:
                    logger.warning('Local validator reported RCX but confianza (%s) < %s: forcing NO RCX', conf, LOCAL_MIN_CONFIDENCE)
                    local_res['diagnostico'] = 'NO RCX'
                    local_res['note'] = f'forced_no_rcx_low_confidence_{conf}'
                local_res['local_confidence'] = conf
                local_res['local_threshold_used'] = LOCAL_MIN_CONFIDENCE
        except Exception:
            logger.exception('Error applying local confidence mitigation')
        return local_res
    except Exception as e:
        return {'error': str(e)}


_VAL_MODEL = None
_VAL_IMG_SIZE = None
_VAL_THRESHOLD = None
_VAL_DEVICE = None


def load_validator_once(model_filename='modelo_validador_rcx_autoenc.pth', meta_filename='modelo_validador_rcx_autoenc.json'):
    """Carga y cachea el autoencoder validador (reconstrucción). Devuelve (model, img_size, threshold, device, error)
    """
    global _VAL_MODEL, _VAL_IMG_SIZE, _VAL_THRESHOLD, _VAL_DEVICE
    if _VAL_MODEL is not None:
        return _VAL_MODEL, _VAL_IMG_SIZE, _VAL_THRESHOLD, _VAL_DEVICE, None
    try:
        import json
        import pathlib
        import torch
        import torch.nn as nn
        from torchvision import transforms
        from PIL import Image

        IMG_SIZE = 224
        THRESHOLD = 0.0005621

        base = os.path.dirname(os.path.dirname(__file__))
        model_path = os.path.join(base, 'models', model_filename)
        meta_path = os.path.join(base, 'models', meta_filename)

        if os.path.exists(meta_path):
            try:
                meta = json.loads(pathlib.Path(meta_path).read_text(encoding='utf-8'))
                IMG_SIZE = int(meta.get('img_size', IMG_SIZE))
                THRESHOLD = float(meta.get('threshold', THRESHOLD))
            except Exception:
                pass

        class EfficientConvAutoencoder(nn.Module):
            def __init__(self, img_size=IMG_SIZE):
                super().__init__()
                self.encoder = nn.Sequential(
                    nn.Conv2d(3, 48, kernel_size=3, stride=2, padding=1),
                    nn.BatchNorm2d(48),
                    nn.ReLU(inplace=True),
                    nn.Conv2d(48, 96, kernel_size=3, stride=2, padding=1),
                    nn.BatchNorm2d(96),
                    nn.ReLU(inplace=True),
                    nn.Conv2d(96, 192, kernel_size=3, stride=2, padding=1),
                    nn.ReLU(inplace=True),
                )
                self.decoder = nn.Sequential(
                    nn.ConvTranspose2d(192, 96, kernel_size=4, stride=2, padding=1),
                    nn.BatchNorm2d(96),
                    nn.ReLU(inplace=True),
                    nn.ConvTranspose2d(96, 48, kernel_size=4, stride=2, padding=1),
                    nn.BatchNorm2d(48),
                    nn.ReLU(inplace=True),
                    nn.ConvTranspose2d(48, 3, kernel_size=4, stride=2, padding=1),
                    nn.Sigmoid(),
                )

            def forward(self, x):
                z = self.encoder(x)
                out = self.decoder(z)
                return out

        model = EfficientConvAutoencoder(img_size=IMG_SIZE)

        if not os.path.exists(model_path):
            return None, None, None, None, f'Validador no encontrado en {model_path}'

        device = 'cpu'
        try:
            state = torch.load(model_path, map_location=device, weights_only=True)
        except TypeError:
            state = torch.load(model_path, map_location=device)
        model.load_state_dict(state)
        model.to(device)
        model.eval()

        _VAL_MODEL = model
        _VAL_IMG_SIZE = IMG_SIZE
        _VAL_THRESHOLD = THRESHOLD
        _VAL_DEVICE = device
        return _VAL_MODEL, _VAL_IMG_SIZE, _VAL_THRESHOLD, _VAL_DEVICE, None

    except Exception as e:
        return None, None, None, None, str(e)


def validate_rcx_image(image_path, normalize_method='grayscale'):
    """Valida una imagen con el validador autoencoder.
    Retorna dict: { diagnostico, mse, mae, confianza }
    """
    try:
        import torch
        from PIL import Image, ImageOps
        import numpy as np

        model, img_size, threshold, device, err = load_validator_once()
        if err:
            return {'error': err}
        if model is None:
            return {'error': 'Modelo validador no disponible'}

        img = Image.open(image_path).convert('RGB')

        def normalizar_tonos_pil(img_local):
            gray = ImageOps.grayscale(img_local)
            eq = ImageOps.equalize(gray)
            return Image.merge('RGB', (eq, eq, eq))

        if normalize_method and normalize_method != 'none':
            img = normalizar_tonos_pil(img)

        transform = transforms = __import__('torchvision').transforms.Compose([
            __import__('torchvision').transforms.Resize((img_size, img_size)),
            __import__('torchvision').transforms.ToTensor(),
        ])

        tensor_img = transform(img).unsqueeze(0).to(device)

        with torch.no_grad():
            recon = model(tensor_img)
            mse = float(torch.mean((recon - tensor_img) ** 2).item())
            mae = float(torch.mean(torch.abs(recon - tensor_img)).item())

        diagnostico = 'RCX' if mse <= threshold else 'NO RCX'
        confianza = 1 - min(mse / (threshold * 2), 1.0)

        return {
            'diagnostico': diagnostico,
            'mse': mse,
            'mae': mae,
            'threshold': threshold,
            'confianza': confianza,
        }

    except Exception as e:
        return {'error': str(e)}
