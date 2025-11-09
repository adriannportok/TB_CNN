import { useEffect, useState } from "react";
import Layout from "../components/Layouts";
import { Users, Activity, FileText, AlertTriangle } from "lucide-react";
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

  
  const CustomBarTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const total = data.total_analisis || 0;
      
      return (
        <div className="bg-white p-3 border border-gray-200 rounded shadow-lg">
          <p className="font-semibold mb-2">{data.mes}</p>
          {payload.map((entry, index) => {
            const count = Math.round((entry.value / 100) * total);
            return (
              <p key={index} style={{ color: entry.color }}>
                {entry.name}: {count} ({entry.value.toFixed(1)}%)
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
              Bienvenido al sistema <span className="text-teal-600">TB-CNN</span>
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
            <div className="p-5 bg-white rounded-2xl shadow-md flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Pacientes en el período</p>
                <h2 className="text-2xl font-bold">{stats.total_pacientes_periodo ?? 0}</h2>
              </div>
              <Users className="w-10 h-10 text-blue-500" />
            </div>

            <div className="p-5 bg-white rounded-2xl shadow-md flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Cantidad de pacientes con análisis &gt; 50%</p>
                <h2 className="text-2xl font-bold">{stats.pacientes_con_positivo ?? 0}</h2>
              </div>
              <Activity className="w-10 h-10 text-red-500" />
            </div>

            <div className="p-5 bg-white rounded-2xl shadow-md flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Tasa de positividad según total de análisis</p>
                <h2 className="text-2xl font-bold">{formatPercent(stats.tasa_positividad)}</h2>
                <p className="text-xs text-gray-400">{`${stats.predicciones_positivas ?? 0} mayores a 50% / ${stats.total_analisis_periodo ?? 0} total analizados`}</p>
              </div>
              <Activity className="w-10 h-10 text-teal-600" />
            </div>
          </div>

          
          <div className="bg-white rounded-2xl shadow-md p-6 mb-10">
            <h3 className="text-lg font-semibold mb-4">
              {(() => {
                const map = {
                  '24h': 'las últimas 24 hrs',
                  '7d': 'la última semana',
                  '1m': 'el último mes',
                  '6m': 'los últimos seis meses',
                  '1y': 'el último año',
                };
                return `Análisis de ${map[rangoTemporal] || 'período seleccionado'}`;
              })()}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Distribución de análisis según nivel de riesgo detectado.
            </p>
            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={stats.stats_mensuales}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mes" />
                  <YAxis label={{ value: 'Porcentaje (%)', angle: -90, position: 'insideLeft' }} />
                  <Tooltip content={<CustomBarTooltip />} />
                  <Legend />
                  <Bar name="Mayor al 50%" dataKey="porcentaje_positivos" fill="#ef4444" />
                  <Bar name="Menor o igual al 50%" dataKey="porcentaje_negativos" fill="#22c55e" />
                </BarChart>
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
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={120}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomPieTooltip />} />
                    <Legend />
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
