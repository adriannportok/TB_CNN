# ✅ Checklist de Verificación - LUNGNET

Usa este checklist para asegurarte de que todo funciona correctamente después de la restauración.

## 📦 Instalación

### Backend
- [ ] Entorno virtual creado (`.venv`)
- [ ] Dependencias instaladas (`pip install -r requirements.txt`)
- [ ] PostgreSQL instalado y ejecutándose
- [ ] Base de datos `bd_tbcia` creada
- [ ] Credenciales configuradas en `config.py`

### Frontend
- [ ] Node.js instalado (v18+)
- [ ] Dependencias instaladas (`npm install`)
- [ ] Build de producción exitoso (`npm run build`)

---

## 🚀 Ejecución

### Backend
- [ ] Entorno virtual activado
- [ ] Servidor Flask ejecutándose en `http://localhost:5000`
- [ ] Endpoint `/test-db` responde correctamente
- [ ] No hay errores en la consola

### Frontend
- [ ] Servidor de desarrollo ejecutándose en `http://localhost:5173`
- [ ] Página carga sin errores 404
- [ ] No hay errores en la consola del navegador

---

## 🔐 Autenticación

- [ ] Página de login accesible
- [ ] Login funciona con credenciales válidas
- [ ] Token almacenado en localStorage
- [ ] Redirección al dashboard después del login
- [ ] Logout funciona correctamente

---

## 📊 Dashboard - Métricas

Verifica que el dashboard muestre:

### Tarjetas superiores (4)
- [ ] **Pacientes registrados** - Número total
- [ ] **Tasa de positividad** - Porcentaje con subtexto (X de Y)
- [ ] **Nivel de riesgo promedio** - Porcentaje
- [ ] **Sin seguimiento** - Número con subtexto "últimos 30 días"

### Selector de período
- [ ] Desplegable visible y funcional
- [ ] Opciones: Todo el tiempo, 30, 90, 180 días
- [ ] Cambiar período actualiza todas las métricas
- [ ] No hay errores al cambiar filtro

---

## 📈 Dashboard - Gráfico de Barras

- [ ] Título: "Análisis de los últimos 6 meses"
- [ ] Descripción visible debajo del título
- [ ] Gráfico muestra hasta 6 meses
- [ ] Eje X: Meses en formato YYYY-MM
- [ ] Eje Y: Porcentaje (%) con etiqueta
- [ ] Leyenda:
  - [ ] "Mayor al 50%" en rojo (#ef4444)
  - [ ] "Menor o igual al 50%" en verde (#22c55e)

### Tooltip del gráfico de barras
Al pasar el mouse sobre una barra:
- [ ] Muestra mes
- [ ] Muestra conteo (no solo porcentaje)
- [ ] Muestra porcentaje con 1 decimal
- [ ] Muestra total de análisis del mes
- [ ] Colores coinciden con las barras

---

## 🥧 Dashboard - Gráfico de Pastel

- [ ] Título: "Distribución de niveles de riesgo por paciente"
- [ ] Descripción visible debajo del título
- [ ] Gráfico muestra 3 categorías:
  - [ ] **Alto** - Rojo (#ef4444)
  - [ ] **Medio** - Amarillo (#f59e0b)
  - [ ] **Bajo** - Verde (#22c55e)
- [ ] Etiquetas muestran: "Nivel: Cantidad"
- [ ] Leyenda visible

### Tooltip del gráfico de pastel
Al pasar el mouse sobre un segmento:
- [ ] Muestra nombre del nivel (Alto/Medio/Bajo)
- [ ] Muestra cantidad de pacientes
- [ ] Muestra porcentaje calculado
- [ ] Color coincide con el segmento

### Estado vacío
- [ ] Si no hay datos, muestra mensaje: "No hay datos disponibles para el período seleccionado"

---

## 📋 Dashboard - Tabla de Últimos Análisis

- [ ] Título: "Últimos análisis realizados"
- [ ] Columnas: Paciente, Resultado, Fecha, Imagen
- [ ] Muestra hasta 5 predicciones
- [ ] Ordenadas por fecha descendente (más reciente primero)

### Contenido de la tabla
- [ ] Nombre completo del paciente
- [ ] Resultado con color:
  - [ ] Verde si ≤ 50%
  - [ ] Rojo si > 50%
- [ ] Porcentaje con 1 decimal
- [ ] Fecha en formato local
- [ ] Link "Ver imagen" funcional

### Estado vacío
- [ ] Si no hay análisis, muestra: "No hay análisis realizados"

---

## 🔍 API Backend - Verificación

### Endpoint: GET /api/dashboard/stats

Prueba con Postman o navegador:
```
http://localhost:5000/api/dashboard/stats?username=TU_USUARIO&rango=todo
```

Verifica que la respuesta incluya:
- [ ] `total_pacientes` (número)
- [ ] `total_pacientes_periodo` (número)
- [ ] `predicciones_positivas` (número)
- [ ] `total_analisis_periodo` (número)
- [ ] `tasa_positividad` (número decimal)
- [ ] `precision_promedio` (número decimal)
- [ ] `pacientes_sin_seguimiento` (número)
- [ ] `riesgo_distribucion` (objeto con alto, medio, bajo)
- [ ] `stats_mensuales` (array de objetos)
- [ ] `ultimas_predicciones` (array de objetos)

### Prueba con diferentes rangos
- [ ] `rango=todo` - Funciona
- [ ] `rango=30` - Filtra últimos 30 días
- [ ] `rango=90` - Filtra últimos 90 días
- [ ] `rango=180` - Filtra últimos 6 meses

---

## 🎨 Estilos y Responsividad

### Desktop (1920x1080)
- [ ] Tarjetas en fila de 4
- [ ] Gráficos ocupan ancho completo
- [ ] Tabla legible sin scroll horizontal

### Tablet (768px)
- [ ] Tarjetas en 2 columnas
- [ ] Gráficos responsivos
- [ ] Selector de período alineado correctamente

### Mobile (375px)
- [ ] Tarjetas en 1 columna
- [ ] Gráficos mantienen proporciones
- [ ] Tabla con scroll horizontal si es necesario

---

## 🧪 Navegación

- [ ] Sidebar visible
- [ ] Links activos:
  - [ ] Dashboard
  - [ ] Pacientes
  - [ ] Registro de Paciente
  - [ ] Análisis de Radiografía
- [ ] Logout funciona

---

## 📁 Gestión de Pacientes (opcional)

Si esta página está implementada:
- [ ] Lista de pacientes carga
- [ ] Filtros funcionan
- [ ] Exportar PDF funciona
- [ ] Modal de detalles se abre

---

## 🏥 Análisis de Radiografía (opcional)

Si esta página está implementada:
- [ ] Selección de paciente funciona
- [ ] Carga de imagen funciona
- [ ] Predicción se ejecuta
- [ ] Resultado se muestra correctamente

---

## 🐛 Consola del Navegador

- [ ] Sin errores 404
- [ ] Sin errores de CORS
- [ ] Sin errores de componentes React
- [ ] Sin warnings críticos

---

## 📊 Consola del Backend

- [ ] Sin errores de SQL
- [ ] Sin errores de conexión a BD
- [ ] Logs de peticiones visibles
- [ ] Sin errores de importación

---

## 🎯 Funcionalidades Específicas Restauradas

### Cambios de nomenclatura
- [ ] "Nivel de riesgo promedio" (no "Precisión del modelo")
- [ ] "Mayor al 50%" / "Menor o igual al 50%" (no Positivo/Negativo)

### Cálculos correctos
- [ ] Tasa de positividad = (positivos / total) * 100
- [ ] Nivel de riesgo = promedio de todos los análisis
- [ ] Distribución de riesgo = por paciente (promedio individual)
- [ ] Tooltip de barras muestra conteo real

### Nuevas métricas
- [ ] Pacientes sin seguimiento (30 días)
- [ ] Distinción entre pacientes totales y del período

---

## ✅ Resultado Final

**Fecha de verificación:** ___________

**Estado general:**
- [ ] ✅ Todo funciona correctamente
- [ ] ⚠️ Funciona con pequeños ajustes
- [ ] ❌ Requiere correcciones importantes

**Notas:**
```
_____________________________________
_____________________________________
_____________________________________
```

---

**Proyecto:** LUNGNET - Sistema de Detección de Tuberculosis  
**USAT 2025**
