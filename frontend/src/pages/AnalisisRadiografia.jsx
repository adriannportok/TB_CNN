import React, { useState, useEffect, useRef } from "react";
import Layout from "../components/Layouts";
import { Upload, Brain, CheckCircle, AlertCircle, History, Loader2 } from "lucide-react";
import axios from "axios";

const API_BASE = "http://localhost:5000";

function AnalisisRadiografia() {
  const [imagen, setImagen] = useState(null);
  const [preview, setPreview] = useState(null);
  const [resultado, setResultado] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progreso, setProgreso] = useState(0);
  const [pacientesAnalizados, setPacientesAnalizados] = useState([]);
  const [pacientesPendientes, setPacientesPendientes] = useState([]);
  const [prediccionesPaciente, setPrediccionesPaciente] = useState(null);
  const [pacienteSeleccionado, setPacienteSeleccionado] = useState(null);
  const modalRef = useRef(null);
  const [loadingPredId, setLoadingPredId] = useState(null);
  const [notifModal, setNotifModal] = useState({ open: false, title: "", message: "", type: "info" });

  const openModal = ({ title, message, type = "info" }) => {
    setNotifModal({ open: true, title, message, type });
  };
  const closeModal = () => setNotifModal((prev) => ({ ...prev, open: false }));

  const [itemsPorPaginaPendientes, setItemsPorPaginaPendientes] = useState(6);
  const [paginaActualPendientes, setPaginaActualPendientes] = useState(1);
  const [itemsPorPaginaAnalizados, setItemsPorPaginaAnalizados] = useState(6);
  const [paginaActualAnalizados, setPaginaActualAnalizados] = useState(1);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        setPacienteSeleccionado(null);
        setPrediccionesPaciente(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    fetchAnalisis();
  }, []);

  useEffect(() => {
    if (pacienteSeleccionado) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [pacienteSeleccionado]);

  const fetchAnalisis = async () => {
    try {
      const usuario = localStorage.getItem('usuario');
      if (!usuario) {
        console.warn('fetchAnalisis: no hay usuario en localStorage');
        setPacientesAnalizados([]);
        setPacientesPendientes([]);
        return;
      }
      const response = await axios.get(`${API_BASE}/api/analisis`, { params: { usuario } });
      if (response.data) {
        setPacientesPendientes(response.data.pendientes || []);
        setPacientesAnalizados(response.data.realizados || []);
      } else {
        setPacientesAnalizados([]);
        setPacientesPendientes([]);
      }
    } catch (error) {
      console.error("Error al obtener análisis (pendientes/realizados):", error);
      setPacientesAnalizados([]);
      setPacientesPendientes([]);
    }
  };

  const fetchPrediccionesPaciente = async (idPaciente) => {
    try {
      const response = await axios.get(`${API_BASE}/api/analisis/predicciones/${idPaciente}`);
      setPrediccionesPaciente(response.data || []);
      setPacienteSeleccionado(pacientesAnalizados.find((p) => p.id_paciente === idPaciente));
    } catch (error) {
      console.error("Error al obtener predicciones:", error);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImagen(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleAnalizar = async (id_pred) => {
    if (!id_pred) return;
    setLoading(true);
    setLoadingPredId(id_pred);
    try {
      const response = await axios.post(`${API_BASE}/api/analisis/ejecutar/${id_pred}`);
        if (response.status === 200) {
        const { porcentaje, nivel_confianza, simulado } = response.data;
        const pct = porcentaje !== null && porcentaje !== undefined && !isNaN(Number(porcentaje)) ? Number(porcentaje) : null;
        const pctText = pct !== null ? `${pct.toFixed(2)}%` : 'Pendiente';

        // Construir mensaje principal y mensaje de recomendación según porcentaje
        const title = simulado ? "Análisis simulado" : "Análisis completado";
        let body = `${title}`; // no incluir porcentaje en el título

        // Agregar línea de Peligro
        body += `\nPeligro: ${pctText}`;

        // Mensaje de acción/recomendación
        let recomendacion = '';
        if (pct !== null) {
          if (pct >= 50) {
            recomendacion = 'Alta probabilidad de tuberculosis, se recomienda tener en cuenta al paciente.';
          } else {
            recomendacion = 'Baja probabilidad de tuberculosis, seguimiento y monitoreo bajo.';
          }
        } else {
          recomendacion = 'No hay porcentaje disponible.';
        }

        const message = `${body}\n\n${recomendacion}`;
        openModal({ title, message, type: simulado ? "warning" : "success" });
        // refresh lists (pendientes y realizados)
        await fetchAnalisis();
      }
    } catch (error) {
      console.error("Error en el análisis:", error);
      openModal({ title: "Error", message: "Error al procesar la radiografía", type: "error" });
    } finally {
      setLoading(false);
      setLoadingPredId(null);
    }
  };

  const totalPaginasPendientes = Math.ceil(pacientesPendientes.length / itemsPorPaginaPendientes);
  const indexUltimoPendientes = paginaActualPendientes * itemsPorPaginaPendientes;
  const indexPrimeroPendientes = indexUltimoPendientes - itemsPorPaginaPendientes;
  const pacientesPendientesPaginados = pacientesPendientes.slice(indexPrimeroPendientes, indexUltimoPendientes);

  const totalPaginasAnalizados = Math.ceil(pacientesAnalizados.length / itemsPorPaginaAnalizados);
  const indexUltimoAnalizados = paginaActualAnalizados * itemsPorPaginaAnalizados;
  const indexPrimeroAnalizados = indexUltimoAnalizados - itemsPorPaginaAnalizados;
  const pacientesAnalizadosPaginados = pacientesAnalizados.slice(indexPrimeroAnalizados, indexUltimoAnalizados);

  

  return (
    <Layout title="Análisis de Radiografía">
      <div className="px-2 sm:px-4 py-2">
        {loading && (
          <div className="fixed top-0 left-0 right-0 z-50">
            <div className="h-1 w-full bg-teal-100">
              <div className="h-1 w-1/3 bg-teal-600 animate-pulse"></div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 sm:p-6 w-full mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <span className="w-1 h-5 bg-orange-500 mr-3 rounded"></span>
              Pacientes por analizar ({pacientesPendientes.length})
            </h3>

            {pacientesPendientes.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Mostrar:</span>
                <select
                  value={itemsPorPaginaPendientes}
                  onChange={(e) => {
                    setItemsPorPaginaPendientes(Number(e.target.value));
                    setPaginaActualPendientes(1);
                  }}
                  className="px-3 py-1.5 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
                >
                  <option value={3}>3</option>
                  <option value={6}>6</option>
                  <option value={9}>9</option>
                  <option value={12}>12</option>
                  <option value={pacientesPendientes.length}>Todos</option>
                </select>
              </div>
            )}
          </div>

          {pacientesPendientes.length === 0 ? (
            <div className="text-center py-8 text-gray-500"> No hay pacientes pendientes de análisis </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {pacientesPendientesPaginados.map((paciente) => (
                  <div key={paciente.id_pred} className="bg-gray-50 border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition">
                    <div className="flex items-center justify-center mb-3">
                      <img src={`${API_BASE}/${paciente.ruta_imagen}`} alt={`${paciente.nombres} ${paciente.apellidos}`} className="w-32 h-32 object-cover rounded-md border border-gray-300" />
                    </div>
                    <p className="text-gray-800 font-semibold text-center">{paciente.nombres} {paciente.apellidos}</p>
                    <p className="text-sm text-gray-500 text-center">DNI: {paciente.dni}</p>
                    <p className="text-sm text-gray-500 text-center">Registrado: {new Date(paciente.fecha_registro).toLocaleDateString()}</p>
                    <button
                      onClick={() => handleAnalizar(paciente.id_pred)}
                      disabled={loadingPredId === paciente.id_pred}
                      className={`mt-3 w-full px-4 py-2 rounded-md transition flex items-center justify-center text-white ${loadingPredId === paciente.id_pred ? "bg-teal-400 cursor-not-allowed" : "bg-teal-600 hover:bg-teal-700"}`}
                    >
                      {loadingPredId === paciente.id_pred ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analizando...
                        </>
                      ) : (
                        <>
                          <Brain className="w-4 h-4 mr-2" /> Analizar
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>

              {totalPaginasPendientes > 1 && (
                <div className="flex justify-center items-center mt-6 gap-2">
                  <button onClick={() => setPaginaActualPendientes(paginaActualPendientes - 1)} disabled={paginaActualPendientes === 1} className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">Anterior</button>
                  <span className="text-sm text-gray-600"> Página {paginaActualPendientes} de {totalPaginasPendientes} </span>
                  <button onClick={() => setPaginaActualPendientes(paginaActualPendientes + 1)} disabled={paginaActualPendientes === totalPaginasPendientes} className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">Siguiente</button>
                </div>
              )}
            </>
          )}
        </div>

        

        {/* Sección 'Pacientes analizados' removida: ahora se muestra en la pantalla Pacientes */}

        {/* Modal historial */}
        {pacienteSeleccionado && prediccionesPaciente && (
          <div className="fixed inset-0 z-50 flex items-center justify-center" onMouseDown={(e) => { if (modalRef.current && !modalRef.current.contains(e.target)) { setPacienteSeleccionado(null); setPrediccionesPaciente(null); } }}>
            <div className="absolute inset-0 backdrop-blur-sm bg-white/10"></div>
            <div ref={modalRef} role="dialog" aria-modal="true" className="relative bg-gray-50 border border-gray-200 rounded-lg shadow-md max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6 z-10 mx-4">
              <div className="mb-4 border-b border-gray-200 pb-2">
                <div className="relative">
                  <div className="text-center">
                    <h3 className="text-lg font-semibold text-gray-800">Historial de {pacienteSeleccionado.nombres} {pacienteSeleccionado.apellidos}</h3>
                  </div>
                  <button onClick={() => { setPacienteSeleccionado(null); setPrediccionesPaciente(null); }} aria-label="Cerrar modal" className="absolute right-3 top-0 px-6 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">Cerrar</button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {prediccionesPaciente.map((pred) => (
                  <div key={pred.id_pred} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition text-center">
                    {pred.ruta_imagen ? (
                      <img src={`${API_BASE}/${pred.ruta_imagen}`} alt={`Análisis del ${new Date(pred.fecha_pred).toLocaleDateString()}`} className="w-full h-48 object-cover rounded-md mb-2 border border-gray-300" />
                    ) : (
                      <div className="w-full h-48 flex items-center justify-center bg-gray-100 rounded-md mb-2 text-gray-400 border border-gray-300">Sin imagen</div>
                    )}
                    <p className="font-semibold text-gray-800">Predicción: {pred.porcentaje !== null ? `${Number(pred.porcentaje).toFixed(1)}%` : 'Pendiente'}</p>
                    <p className="text-sm text-gray-500">{pred.fecha_pred ? new Date(pred.fecha_pred).toLocaleString() : '-'}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {notifModal.open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true">
            <div className="absolute inset-0 bg-black/30"></div>
            <div className="relative bg-white rounded-lg shadow-lg max-w-sm w-full p-6 mx-4">
              <div className="mb-3 text-center"><h3 className="text-lg font-semibold text-gray-800">{notifModal.title || "Mensaje"}</h3></div>
              <p className="text-gray-600 whitespace-pre-line text-center">{notifModal.message}</p>
              <div className="mt-5 flex justify-center"><button onClick={closeModal} className="px-5 py-2 rounded-md bg-teal-600 text-white hover:bg-teal-700">Aceptar</button></div>
            </div>
          </div>
        )}

      </div>
    </Layout>
  );
}

export default AnalisisRadiografia;
