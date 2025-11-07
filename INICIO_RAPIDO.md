# 🚀 Inicio Rápido - TB-CNN

## Pasos para ejecutar el proyecto

### 1️⃣ Iniciar Backend (Flask)

Abre una terminal PowerShell y ejecuta:

```powershell
# Navegar a la carpeta del backend
cd C:\Users\adria\OneDrive\Documentos\USAT\TESIS\PRY_TBC\server-flask

# Activar entorno virtual
.\.venv\Scripts\activate

# Si es la primera vez, instalar dependencias:
# pip install -r requirements.txt

# Ejecutar el servidor Flask
python main.py
```

✅ **El backend estará corriendo en:** `http://localhost:5000`

---

### 2️⃣ Iniciar Frontend (React)

Abre **otra terminal** PowerShell y ejecuta:

```powershell
# Navegar a la carpeta del frontend
cd C:\Users\adria\OneDrive\Documentos\USAT\TESIS\PRY_TBC\frontend

# Si es la primera vez, instalar dependencias:
# npm install

# Ejecutar el servidor de desarrollo
npm run dev
```

✅ **El frontend estará corriendo en:** `http://localhost:5173`

---

## 🔍 Verificación

1. Abre tu navegador en `http://localhost:5173`
2. Inicia sesión con tus credenciales de médico
3. Verifica que el Dashboard muestre:
   - ✅ 4 tarjetas de métricas (Pacientes, Tasa positividad, Nivel riesgo, Sin seguimiento)
   - ✅ Selector de período temporal
   - ✅ Gráfico de barras de los últimos 6 meses
   - ✅ Gráfico de pastel con distribución de riesgo (Alto/Medio/Bajo)
   - ✅ Tabla de últimos análisis

---

## 🛑 Para detener los servidores

### Backend:
- Presiona `Ctrl + C` en la terminal del backend

### Frontend:
- Presiona `Ctrl + C` en la terminal del frontend

---

## ⚠️ Problemas comunes

### Error: "ModuleNotFoundError"
```powershell
# Asegúrate de tener el entorno virtual activado
.\.venv\Scripts\activate
pip install -r requirements.txt
```

### Error: "Cannot connect to database"
- Verifica que PostgreSQL esté ejecutándose
- Confirma las credenciales en `server-flask/config.py`

### Puerto ocupado
```powershell
# Si el puerto 5000 está ocupado, edita main.py:
# app.run(debug=True, port=5001)
```

---

## 📊 Funcionalidades restauradas

✅ **Backend:**
- Nivel de riesgo promedio
- Tasa de positividad
- Distribución de riesgo por paciente (Alto/Medio/Bajo)
- Pacientes sin seguimiento
- Filtros temporales (30, 90, 180 días, todo)

✅ **Frontend:**
- Gráfico de pastel con distribución de riesgo
- Tooltips personalizados en gráfico de barras (conteo + porcentaje)
- Selector de período temporal
- 4 tarjetas de métricas actualizadas
- Diseño mejorado y responsivo

---

## 📁 Archivos principales modificados

- `server-flask/routes/dashboard.py` - Backend con todas las métricas
- `frontend/src/pages/Dashboard.jsx` - Frontend con gráficos y filtros
- `server-flask/requirements.txt` - Dependencias Python
- `.gitignore` - Configuración Git mejorada
- `README.md` - Documentación completa

---

¡Listo! Tu proyecto está completamente restaurado con todas las funcionalidades desarrolladas. 🎉
