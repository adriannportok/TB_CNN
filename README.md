# LUNGNET - Sistema de Detección de Tuberculosis# Sistema de Detección de Tuberculosis mediante IA



Sistema web para análisis de radiografías de tórax utilizando inteligencia artificial para detectar tuberculosis.Este proyecto implementa un sistema web para la detección de tuberculosis utilizando Inteligencia Artificial a través del análisis de radiografías de tórax.



## 🚀 Características## Descripción



- **Dashboard interactivo** con métricas en tiempo realEl sistema permite a médicos registrar pacientes y analizar sus radiografías de tórax para detectar posibles casos de tuberculosis utilizando un modelo de IA. La aplicación cuenta con roles de usuario (administrador y médico) y proporciona diferentes funcionalidades según el rol.

- **Análisis de radiografías** con modelo CNN

- **Gestión de pacientes** y registro de análisis## Estructura del Proyecto

- **Visualización de datos** con gráficos de barras y pastel

- **Distribución de riesgo** por paciente (Alto/Medio/Bajo)```

- **Filtros temporales** para análisis de períodos específicosPRY_TBC/

├── frontend/                 # Aplicación React

## 📋 Requisitos previos│   ├── src/

│   │   ├── components/      # Componentes reutilizables (Layout, Sidebar)

- Python 3.9 o superior│   │   ├── pages/          # Páginas (Dashboard, Login, Pacientes, etc.)

- Node.js 18 o superior│   │   └── styles/         # Estilos CSS

- PostgreSQL 14 o superior│   └── public/             # Archivos estáticos

- Git│

├── server-flask/            # Backend en Flask

## 🔧 Instalación│   ├── modelo/             # Modelo de IA para análisis

│   ├── routes/            # Endpoints (auth.py, paciente.py, etc.)

### 1. Clonar el repositorio│   ├── models/            # Modelos de datos

│   └── uploads/           # Almacenamiento de radiografías

```bash```

git clone https://github.com/adriannportok/TB_CNN.git

cd TB_CNN## Tecnologías Utilizadas

```

### Frontend

### 2. Configurar el Backend (Flask)- React 18 con Vite

- TailwindCSS para estilos

```powershell- Axios para peticiones HTTP

cd server-flask- React Router para navegación

- Recharts para gráficos estadísticos

# Crear entorno virtual

python -m venv .venv### Backend

- Flask (Python)

# Activar entorno virtual- PostgreSQL como base de datos

.\.venv\Scripts\activate- SQLAlchemy para ORM

- Modelo CNN para análisis de imágenes

# Instalar dependencias

pip install -r requirements.txt## Instalación



# Configurar variables de entorno### Requisitos Previos

# Copiar .env.example a .env y ajustar las credenciales de PostgreSQL- Python 3.8+

cp .env.example .env- Node.js 14+

```- PostgreSQL 12+



**Editar `.env` con tus credenciales:**## Desarrollo

```Para ejecutar el proyecto:

DB_NAME=bd_tbcia

DB_USER=postgres1. Backend (Flask):

DB_PASSWORD=TU_PASSWORD   ```bash

DB_HOST=localhost   cd server-flask

DB_PORT=5432   .\.venv\Scripts\activate

```   python main.py

   ```

### 3. Configurar la Base de Datos   El servidor estará disponible en `http://localhost:5000`



Asegúrate de tener PostgreSQL instalado y ejecutándose, luego crea la base de datos:2. Frontend (React):

   ```bash

```sql   cd frontend

CREATE DATABASE bd_tbcia;   npm run dev

```   ```

   La aplicación estará disponible en `http://localhost:5173`

### 4. Configurar el Frontend (React + Vite)

## Acceso al Sistema

```powershell

cd ../frontend### Credenciales de Prueba

- Médico:

# Instalar dependencias  - Usuario: medico1

npm install  - Contraseña: 123456

```

- Administrador:

## ▶️ Ejecutar el proyecto  - Usuario: admin1

  - Contraseña: 123456

### Backend (Flask)

## Autores

Desde la carpeta `server-flask`:

- Adrian Portocarrero

```powershell- Universidad Católica Santo Toribio de Mogrovejo (USAT)
# Activar entorno virtual (si no está activo)
.\.venv\Scripts\activate

# Ejecutar servidor
python main.py
```

El servidor estará disponible en: `http://localhost:5000`

### Frontend (React)

Desde la carpeta `frontend`:

```powershell
# Modo desarrollo
npm run dev
```

El frontend estará disponible en: `http://localhost:5173`

## 📊 Estructura del proyecto

```
PRY_TBC/
├── server-flask/          # Backend Flask
│   ├── routes/           # Rutas de la API
│   │   ├── auth.py       # Autenticación
│   │   ├── dashboard.py  # Métricas del dashboard
│   │   └── paciente.py   # Gestión de pacientes
│   ├── models/           # Modelos de base de datos
│   ├── uploads/          # Archivos subidos
│   ├── config.py         # Configuración de BD
│   ├── main.py           # Punto de entrada
│   └── requirements.txt  # Dependencias Python
│
└── frontend/             # Frontend React
    ├── src/
    │   ├── components/   # Componentes reutilizables
    │   ├── pages/        # Páginas de la aplicación
    │   │   ├── Dashboard.jsx
    │   │   ├── Pacientes.jsx
    │   │   └── AnalisisRadiografia.jsx
    │   └── styles/       # Estilos CSS
    ├── package.json      # Dependencias Node
    └── vite.config.js    # Configuración de Vite
```

## 🎯 Funcionalidades principales

### Dashboard

- **Métricas clave:**
  - Total de pacientes registrados
  - Tasa de positividad (%)
  - Nivel de riesgo promedio
  - Pacientes sin seguimiento (últimos 30 días)

- **Gráfico de barras:** Análisis de los últimos 6 meses (Mayor/Menor al 50%)
- **Gráfico de pastel:** Distribución de niveles de riesgo por paciente (Alto/Medio/Bajo)
- **Filtros temporales:** Todo el tiempo, 30, 90, 180 días

### Gestión de Pacientes

- Registro de nuevos pacientes
- Visualización de historial de análisis
- Exportación de reportes en PDF

### Análisis de Radiografías

- Carga de imágenes de radiografías
- Predicción con modelo CNN
- Visualización de resultados con porcentaje de confianza

## 🛠️ Tecnologías utilizadas

### Backend
- Flask 3.0
- PostgreSQL
- PyTorch (modelo CNN)
- psycopg2

### Frontend
- React 19
- Vite
- Tailwind CSS
- Recharts (visualización de datos)
- Axios
- Lucide React (iconos)

## 📝 Notas importantes

1. **No commitear archivos grandes**: Los modelos `.pth` y archivos `.dll` deben manejarse con Git LFS
2. **Entorno virtual**: Nunca commitear la carpeta `.venv/` o `venv/`
3. **Variables de entorno**: No commitear archivos `.env` con credenciales reales

## 🐛 Solución de problemas

### Error de conexión a la base de datos
- Verifica que PostgreSQL esté ejecutándose
- Confirma las credenciales en `config.py` o `.env`

### Error al instalar PyTorch
- Considera usar versión CPU: `pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu`

### Puerto 5000 ocupado
- Cambia el puerto en `main.py`: `app.run(debug=True, port=5001)`

## 👥 Autores

Proyecto de tesis - USAT 2025

## 📄 Licencia

Este proyecto es de uso académico.
