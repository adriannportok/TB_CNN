"""Carga y función de inferencia reutilizable para el modelo .pth
Este módulo expone:
- load_model_once() -> (model, preprocess, error)
- infer_image(path) -> dict {porcentaje, nivel_confianza, simulado}

Se mantiene en CPU y usa torchvision transforms compatibles con el entrenamiento.
"""
import os
from datetime import datetime

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
        model.load_state_dict(torch.load(model_path, map_location=device))
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


# -------------------------------
# Validador RCX (autoencoder)
# -------------------------------
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

        # default values
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

        # define a small conv autoencoder fallback (compatible with training script)
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

        # instantiate model
        model = EfficientConvAutoencoder(img_size=IMG_SIZE)

        if not os.path.exists(model_path):
            return None, None, None, None, f'Validador no encontrado en {model_path}'

        device = 'cpu'
        model.load_state_dict(torch.load(model_path, map_location=device))
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

        # load image
        img = Image.open(image_path).convert('RGB')

        # normalization methods (follow training script)
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
