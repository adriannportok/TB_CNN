import { useEffect, useState } from "react";
import Layout from "../components/Layouts";
import { Users, Activity, FileText, AlertTriangle, Target } from "lucide-react";
import axios from "axios";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';

function Dashboard() {
  const [stats, setStats] = useState({
    total_pacientes: 0,
    total_pacientes_periodo: 0,
    predicciones_positivas: 0,
    total_analisis_periodo: 0,
    tasa_positividad: 0,
    precision_promedio: 0,
    pacientes_sin_seguimiento: 0,
    ultimas_predicciones: [],
    stats_mensuales: [],
    riesgo_distribucion: { alto: 0, medio: 0, bajo: 0 }
  });
  const [fetchError, setFetchError] = useState(null);
  const [foundUsername, setFoundUsername] = useState(null);
  const [rangoTemporal, setRangoTemporal] = useState('1m');
  const [chartType, setChartType] = useState('bar');

  useEffect(() => {
    const keysToTry = ["username", "usuario", "user", "userData", "usuario_data"];
    let username = null;

    for (const key of keysToTry) {
      const val = localStorage.getItem(key);
      if (!val) continue;
      try {
        const parsed = JSON.parse(val);
        if (parsed) {
          if (parsed.username) {
            username = parsed.username;
            break;
          }
          if (parsed.usuario) {
            username = parsed.usuario;
            break;
          }
          if (parsed.user) {
            username = parsed.user;
            break;
          }
        }
      } catch (e) {
        username = val;
        break;
      }
    }

    setFoundUsername(username);
    const fetchDashboardData = async () => {
      if (!username) {
        setFetchError('No se encontró usuario en localStorage.');
        return;
      }

      try {
        const res = await axios.get(`http://localhost:5000/api/dashboard/stats`, {
          params: { username, rango: rangoTemporal }
        });

        console.log('dashboard API response:', res.data);

        if (res.data && !res.data.error) {
          setStats(res.data);
          setFetchError(null);
        } else if (res.data && res.data.error) {
          setFetchError(res.data.error);
        }
      } catch (error) {
        setFetchError(error.message || String(error));
      }
    };

    fetchDashboardData();
  }, [rangoTemporal]);

  
  const pieData = [
    { name: 'Alto', value: stats.riesgo_distribucion.alto, color: '#ef4444' },
    { name: 'Medio', value: stats.riesgo_distribucion.medio, color: '#f59e0b' },
    { name: 'Bajo', value: stats.riesgo_distribucion.bajo, color: '#22c55e' }
  ].filter(item => item.value > 0);

  const totalPacientesConRiesgo = stats.riesgo_distribucion.alto + 
                                   stats.riesgo_distribucion.medio + 
                                   stats.riesgo_distribucion.bajo;

  const barData = (stats.stats_mensuales || []).map((d) => {
    const safeNumber = (v) => {
      if (v === null || v === undefined) return 0;
      if (typeof v === 'number') return v;
      let s = String(v).trim();
      if (s === '') return 0;
      s = s.replace('%', '').replace(/\./g, '').replace(',', '.');
      const n = Number(s);
      return Number.isFinite(n) ? n : 0;
    };

    const getField = (obj, keys) => {
      for (const k of keys) {
        if (obj[k] !== undefined && obj[k] !== null) return obj[k];
      }
      return undefined;
    };

    const totalRaw = getField(d, ['total_analisis', 'total', 'totalAnalisis', 'total_analyses']);
    const total = safeNumber(totalRaw || 0);

    const posRaw = getField(d, ['positivos_count', 'positivos', 'positivos_total', 'positivos_count_total', 'mayores_50', 'porcentaje_positivos', 'porcentaje_pos', 'porcentaje', 'porcentaje_positivo', 'pct_positivos']);
    const negRaw = getField(d, ['negativos_count', 'negativos', 'porcentaje_negativos', 'porcentaje_neg']);

    let positivos_count = 0;
    let negativos_count = 0;

    if (posRaw !== undefined && String(posRaw).trim() !== '') {
      const posNum = safeNumber(posRaw);
      if (Number.isFinite(posNum) && (posNum > total || total === 0 || Number.isInteger(posNum))) {
        positivos_count = Math.round(posNum);
      } else {
        const p = posNum;
        if (p <= 1) {
          positivos_count = Math.round(p * total);
        } else {
          positivos_count = Math.round((p / 100) * total);
        }
      }
    }

    if (negRaw !== undefined && String(negRaw).trim() !== '') {
      const negNum = safeNumber(negRaw);
      if (Number.isFinite(negNum) && (negNum > total || total === 0 || Number.isInteger(negNum))) {
        negativos_count = Math.round(negNum);
      } else {
        if (negNum <= 1) {
          negativos_count = Math.round(negNum * total);
        } else {
          negativos_count = Math.round((negNum / 100) * total);
        }
      }
    }

    if ((!positivos_count || positivos_count === 0) && (!negativos_count || negativos_count === 0)) {
      const posPctRaw = getField(d, ['porcentaje_positivos', 'porcentaje_pos', 'porcentaje', 'porcentaje_positivo', 'pct_positivos']);
      const posPct = safeNumber(posPctRaw || 0);
      if (posPct > 0) {
        if (posPct <= 1) positivos_count = Math.round(posPct * total);
        else positivos_count = Math.round((posPct / 100) * total);
      }
      negativos_count = Math.max(0, total - positivos_count);
    } else if (!negativos_count || negativos_count === 0) {
      negativos_count = Math.max(0, total - positivos_count);
    } else if (!positivos_count || positivos_count === 0) {
      positivos_count = Math.max(0, total - negativos_count);
    }

    positivos_count = Number.isFinite(positivos_count) && positivos_count > 0 ? Math.round(positivos_count) : 0;
    negativos_count = Number.isFinite(negativos_count) && negativos_count > 0 ? Math.round(negativos_count) : 0;

    const mes = getField(d, ['mes', 'month', 'label', 'nombre', 'name']) || d.mes || d.month || d.label || '';

    return { ...d, mes, positivos_count, negativos_count, total_analisis: total };
  });

  
  const CustomBarTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const total = data.total_analisis || 0;

      return (
        <div className="bg-white p-3 border border-gray-200 rounded shadow-lg">
          <p className="font-semibold mb-2">{data.mes}</p>
          {payload.map((entry, index) => {
            const count = Number(entry.value) || 0;
            const pct = total > 0 ? ((count / total) * 100).toFixed(1) : '0.0';
            return (
              <p key={index} style={{ color: entry.color }}>
                {entry.name}: {count} ({pct}%)
              </p>
            );
          })}
          <p className="text-sm text-gray-600 mt-1 pt-1 border-t">
            Total: {total} análisis
          </p>
        </div>
      );
    }
    return null;
  };

  
  const CustomPieTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      const percentage = ((data.value / totalPacientesConRiesgo) * 100).toFixed(1);
      
      return (
        <div className="bg-white p-3 border border-gray-200 rounded shadow-lg">
          <p className="font-semibold" style={{ color: data.payload.color }}>
            {data.name}
          </p>
          <p className="text-sm">
            {data.value} pacientes ({percentage}%)
          </p>
        </div>
      );
    }
    return null;
  };

  const formatPercent = (v) => {
    if (v === null || v === undefined) return "0%";
    const num = Number(v);
    if (isNaN(num)) return "0%";
    const s = Number.isInteger(num) ? num.toFixed(0) : num.toFixed(2).replace(/\.0+$/,'').replace(/(\.\d[1-9])0$/,'$1');
    return `${s}%`;
  };

  return (
    <Layout title="Panel Principal">
      <div className="mx-auto max-w-7xl py-6 sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-800">
              Bienvenido al sistema <span className="text-teal-600">LUNGNET</span>
            </h1>
            <div className="mt-4 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600 mr-2">Período:</label>
                {[
                  { label: 'Últimas 24 hrs', value: '24h' },
                  { label: 'Última semana', value: '7d' },
                  { label: 'Último mes', value: '1m' },
                  { label: 'Últimos seis meses', value: '6m' },
                  { label: 'Último año', value: '1y' }
                ].map((b) => (
                  <button
                    key={b.value}
                    onClick={() => setRangoTemporal(b.value)}
                    className={`px-3 py-1 rounded-md text-sm border ${rangoTemporal === b.value ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-gray-700 border-gray-300'} focus:outline-none`}
                  >
                    {b.label}
                  </button>
                ))}
              </div>
              <label className="text-sm text-gray-600 ml-15">Duración del período:</label>
              <div className="text-sm text-gray-600">
                {stats.filtro && stats.filtro.desde && stats.filtro.hasta ? (
                  (() => {
                    const desde = new Date(stats.filtro.desde);
                    const hasta = new Date(stats.filtro.hasta);
                    const fmt = (d) => isNaN(d.getTime()) ? '-' : d.toLocaleString('es-PE', { year: 'numeric', month: 'short', day: '2-digit' });
                    return <span>{`${fmt(desde)}  →  ${fmt(hasta)}`}</span>;
                  })()
                ) : (
                  <span>-</span>
                )}
              </div>
            </div>
          </div>

          {fetchError && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded">
              {fetchError}
            </div>
          )}

          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
            <div className="p-6 bg-gradient-to-br from-white to-slate-50 rounded-3xl shadow-lg flex items-center justify-between border border-gray-100 hover:shadow-xl transition">
              <div>
                <p className="text-gray-500 text-sm">Cantidad de pacientes</p>
                <h2 className="text-2xl font-extrabold text-gray-900">{stats.total_pacientes_periodo ?? 0}</h2>
                <p className="text-xs text-gray-400 mt-1">En el período seleccionado</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center ring-1 ring-gray-200">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>

            <div className="p-6 bg-gradient-to-br from-white to-slate-50 rounded-3xl shadow-lg flex items-center justify-between border border-gray-100 hover:shadow-xl transition">
              <div>
                <p className="text-gray-500 text-sm">Cantidad de pacientes con análisis &gt; 50%</p>
                <h2 className="text-2xl font-extrabold text-gray-900">{stats.pacientes_con_positivo ?? 0}</h2>
                <p className="text-xs text-gray-400 mt-1">En el período seleccionado</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center ring-1 ring-gray-200">
                <Activity className="w-6 h-6 text-red-500" />
              </div>
            </div>

            <div className="p-6 bg-gradient-to-br from-white to-slate-50 rounded-3xl shadow-lg flex items-center justify-between border border-gray-100 hover:shadow-xl transition">
              <div>
                <p className="text-gray-500 text-sm">Tasa de positividad según total de análisis</p>
                <h2 className="text-2xl font-extrabold text-gray-900">{formatPercent(stats.tasa_positividad)}</h2>
                <p className="text-xs text-gray-400 mt-1">{`${stats.predicciones_positivas ?? 0} análisis mayores a 50% / ${stats.total_analisis_periodo ?? 0} análisis totales`}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center ring-1 ring-gray-200">
                <Target className="w-6 h-6 text-teal-600" />
              </div>
            </div>
          </div>

          
          <div className="bg-white rounded-2xl shadow-md p-6 mb-10">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold mb-4">
                {(() => {
                  const map = {
                    '24h': ' las últimas 24 hrs',
                    '7d': ' la última semana',
                    '1m': 'l último mes',
                    '6m': ' los últimos seis meses',
                    '1y': 'l último año',
                  };
                  return `Análisis de${map[rangoTemporal] || 'período seleccionado'}`;
                })()}
              </h3>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">Tipo:</label>
                <button onClick={() => setChartType('bar')} className={`px-3 py-1 text-sm rounded-md border ${chartType === 'bar' ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-gray-700 border-gray-300'}`}>Barras</button>
                <button onClick={() => setChartType('pie')} className={`px-3 py-1 text-sm rounded-md border ${chartType === 'pie' ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-gray-700 border-gray-300'}`}>Circular</button>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Distribución de análisis según nivel de riesgo detectado.
            </p>
            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                {chartType === 'bar' ? (
                  <BarChart
                    data={barData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    barCategoryGap="13%"
                    barGap={3}
                  >
                    <defs>
                      <linearGradient id="gradPos" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f97373" />
                        <stop offset="100%" stopColor="#ef4444" />
                      </linearGradient>
                      <linearGradient id="gradNeg" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#86efac" />
                        <stop offset="100%" stopColor="#22c55e" />
                      </linearGradient>
                      <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
                        <feDropShadow dx="0" dy="6" stdDeviation="10" floodColor="#000" floodOpacity="0.08" />
                      </filter>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e6e9ef" />
                    <XAxis dataKey="mes" />
                    <YAxis label={{ value: 'Cantidad de análisis', angle: -90, position: 'insideLeft' }} />
                    <Tooltip content={<CustomBarTooltip />} />
                    <Legend />
                    <Bar name="Mayor al 50% de peligro" dataKey="positivos_count" fill="url(#gradPos)" radius={[8,8,0,0]} barSize={40} />
                    <Bar name="Menor o igual al 50% de peligro" dataKey="negativos_count" fill="url(#gradNeg)" radius={[8,8,0,0]} barSize={40} />
                  </BarChart>
                ) : (
                  (() => {
                    const totalPos = (barData || []).reduce((s, d) => s + (Number(d.positivos_count) || 0), 0);
                    const totalNeg = (barData || []).reduce((s, d) => s + (Number(d.negativos_count) || 0), 0);
                    const pieDataFromBar = [
                      { name: 'Mayor al 50% de peligro', value: totalPos, color: '#ef4444' },
                      { name: 'Menor o igual al 50% de peligro', value: totalNeg, color: '#22c55e' }
                    ].filter(x => x.value > 0);

                    if (!pieDataFromBar.length) {
                      return (
                        <div className="h-full flex items-center justify-center">
                          <p className="text-gray-500">No hay datos para mostrar en el gráfico circular</p>
                        </div>
                      );
                    }

                    return (
                      <PieChart>
                        <Pie data={pieDataFromBar} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={120} innerRadius={70} label={({ name, value }) => `${name}: ${value}`}>
                          {pieDataFromBar.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomPieTooltip />} />
                        <Legend />
                      </PieChart>
                    );
                  })()
                )}
              </ResponsiveContainer>
            </div>
          </div>

          
          <div className="bg-white rounded-2xl shadow-md p-6 mb-10">
            <h3 className="text-lg font-semibold mb-4">
              Distribución de niveles de riesgo por paciente
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Clasificación basada en el promedio de análisis de cada paciente.
            </p>
            {totalPacientesConRiesgo > 0 ? (
              <div className="h-[400px] w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <defs>
                      <filter id="pieShadow" x="-50%" y="-50%" width="200%" height="200%">
                        <feDropShadow dx="0" dy="6" stdDeviation="8" floodColor="#000" floodOpacity="0.06" />
                      </filter>
                    </defs>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      innerRadius={70}
                      outerRadius={120}
                      paddingAngle={0}
                      fill="#8884d8"
                      dataKey="value"
                      isAnimationActive={true}
                      stroke="none"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} style={{ filter: 'url(#pieShadow)' }} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomPieTooltip />} />
                    <Legend layout="vertical" align="right" verticalAlign="middle" />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[400px] flex items-center justify-center">
                <p className="text-gray-500">No hay datos disponibles para el período seleccionado</p>
              </div>
            )}
          </div>

          
        </div>
      </div>
    </Layout>
  );
}

export default Dashboard;
