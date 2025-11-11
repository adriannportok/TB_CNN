import { useState, useEffect, useMemo } from "react";
import Layout from "../components/Layouts";
import axios from "axios";
import { FileText } from "lucide-react";
import html2pdf from "html2pdf.js";
import { Pencil, Trash2, ChevronDown } from "lucide-react";
import AlertModal from "../components/AlertModal";

function Pacientes() {
  const [filtros, setFiltros] = useState({
    nombreCompleto: "",
    dni: "",
    fechaInicio: "",
    fechaFin: "",
  });

  const [pacientes, setPacientes] = useState([]);
  const [pacientesFiltrados, setPacientesFiltrados] = useState([]);
  const [pacienteSeleccionadoId, setPacienteSeleccionadoId] = useState(null);
  const [prediccionesPaciente, setPrediccionesPaciente] = useState([]);
  const [loadingPredicciones, setLoadingPredicciones] = useState(false);
  const [modal, setModal] = useState({ open: false, title: "", message: "" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const pageSizes = [5, 10, 25, 50];

  useEffect(() => {
    fetchPacientes();
  }, []);

  const fetchPacientes = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/pacientes");
      if (Array.isArray(res.data)) {
        const data = res.data.map((p) => ({
          id: p.id_paciente,
          nombreCompleto: `${p.nombres} ${p.apellidos}`,
          dni: p.dni,
          fechaNacimiento: p.fecha_nac,
          edad: p.edad,
          sexo: p.sexo,
          fechaRegistro: p.fecha_registro,
          porcentaje: p.porcentaje,
        }));
        setPacientes(data);
        setPacientesFiltrados(data);
      } else {
        setModal({
          open: true,
          title: "Error",
          message: "Respuesta inesperada del servidor.",
        });
      }
    } catch (error) {
      setModal({
        open: true,
        title: "Error",
        message: "Error al obtener pacientes.",
      });
    }
  };

  useEffect(() => {
    let filtrados = pacientes;

    if (filtros.nombreCompleto) {
      filtrados = filtrados.filter((p) =>
        p.nombreCompleto
          .toLowerCase()
          .includes(filtros.nombreCompleto.toLowerCase()),
      );
    }

    if (filtros.dni) {
      filtrados = filtrados.filter((p) => p.dni.includes(filtros.dni));
    }

    if (filtros.fechaInicio || filtros.fechaFin) {
      if (filtros.fechaInicio && filtros.fechaFin) {
        const inicioDate = new Date(filtros.fechaInicio);
        const finDate = new Date(filtros.fechaFin);
        if (inicioDate > finDate) {
          setModal({
            open: true,
            title: "Validación",
            message: "La fecha de inicio debe ser anterior a la fecha fin.",
          });
          // No aplicar filtro si es inválido
          setPacientesFiltrados(pacientes);
          return;
        }
      }

      filtrados = filtrados.filter((p) => {
        const fechaRegistro = new Date(p.fechaRegistro);
        const inicio = filtros.fechaInicio
          ? new Date(filtros.fechaInicio)
          : null;
        const fin = filtros.fechaFin ? new Date(filtros.fechaFin) : null;

        if (inicio && fechaRegistro < inicio) return false;
        if (fin && fechaRegistro > fin) return false;
        return true;
      });
    }
    setPacientesFiltrados(filtrados);
    // ajustar página si es necesario
    setPage(1);
  }, [filtros, pacientes]);

  useEffect(() => {
    const totalPages = Math.max(
      1,
      Math.ceil(pacientesFiltrados.length / pageSize),
    );
    if (page > totalPages) setPage(totalPages);
  }, [pacientesFiltrados, pageSize]);

  const handleFiltroChange = (e) => {
    const { name, value } = e.target;
    let newValue = value;

    if (name === "nombreCompleto") {
      newValue = newValue.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ\s'\-]/g, "");
    }

    if (name === "dni") {
      newValue = newValue.replace(/\D/g, "");
      if (newValue.length > 8) newValue = newValue.slice(0, 8);
    }

    setFiltros((prev) => ({
      ...prev,
      [name]: newValue,
    }));
  };

  const handleGuardarPDF = () => {
    const element = document.getElementById("pdf-content");
    if (!element) {
      setModal({
        open: true,
        title: "Error",
        message: "No se encontró el contenido a guardar.",
      });
      return;
    }

    const css = `
    #pdf-content, #pdf-content * {
      color: #000 !important;
      background: #fff !important;
      border-color: #ddd !important;
      box-shadow: none !important;
      background-image: none !important;
      filter: none !important;
      -webkit-text-fill-color: #000 !important;
    }
    /* Asegurar tablas y celdas visibles */
    #pdf-content table { border-collapse: collapse !important; }
    #pdf-content th, #pdf-content td { border: 1px solid #ddd !important; background: #fff !important; color: #000 !important; }
  `;

    const styleEl = document.createElement("style");
    styleEl.setAttribute("data-temp-pdf-style", "1");
    styleEl.appendChild(document.createTextNode(css));
    document.head.appendChild(styleEl);

    const opt = {
      margin: 0.5,
      filename: "listado_pacientes.pdf",
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, allowTaint: true },
      jsPDF: { unit: "in", format: "a4", orientation: "portrait" },
    };

    html2pdf()
      .set(opt)
      .from(element)
      .save()
      .then(() => {
        document.head.removeChild(styleEl);
      })
      .catch((err) => {
        setModal({
          open: true,
          title: "Error",
          message: "Error al generar PDF.",
        });
        if (styleEl.parentNode) document.head.removeChild(styleEl);
      });
  };

  const formatearFecha = (fecha) => {
    if (!fecha) return "-";
    const date = new Date(fecha);
    return isNaN(date.getTime()) ? "-" : date.toLocaleDateString("es-ES");
  };

  const formatearConfianza = (porcentaje) => {
    if (porcentaje === null || porcentaje === undefined) return "0%";
    const val = Number(porcentaje);
    if (isNaN(val)) return "0%";
    // Si es entero mostrar sin decimales, si tiene fracción mostrar 2 decimales
    if (Number.isInteger(val)) return `${val}%`;
    return `${val.toFixed(2)}%`;
  };

  const fetchPredicciones = async (idPaciente) => {
    if (!idPaciente) return;
    setLoadingPredicciones(true);
    try {
      const res = await axios.get(
        `http://localhost:5000/api/analisis/predicciones/${idPaciente}`,
      );
      if (Array.isArray(res.data)) {
        setPrediccionesPaciente(res.data);
      } else {
        setPrediccionesPaciente([]);
      }
    } catch (err) {
      setPrediccionesPaciente([]);
    } finally {
      setLoadingPredicciones(false);
    }
  };

  const toggleMostrarPredicciones = async (idPaciente) => {
    if (pacienteSeleccionadoId === idPaciente) {
      setPacienteSeleccionadoId(null);
      setPrediccionesPaciente([]);
      return;
    }
    setPacienteSeleccionadoId(idPaciente);
    await fetchPredicciones(idPaciente);
  };

  const totalPages = Math.max(
    1,
    Math.ceil(pacientesFiltrados.length / pageSize),
  );

  return (
    <Layout title="Listado de Pacientes">
      <div className="px-2 sm:px-4 py-2">
        <div className="mb-4">
          <h2 className="text-left font-bold text-gray-700">
            Listado de pacientes registrados
          </h2>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 sm:p-6 w-full">
          <div className="mb-6 pb-6 border-b border-white">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <span className="w-1 h-5 bg-teal-600 mr-3 rounded"></span>
              Filtros de Búsqueda
            </h3>

            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 w-full lg:w-auto flex-1">
                <div className="sm:col-span-1">
                  <label
                    htmlFor="nombreCompleto"
                    className="block text-sm font-medium text-gray-700 mb-2 text-left"
                  >
                    Nombre completo
                  </label>
                  <input
                    type="text"
                    id="nombreCompleto"
                    name="nombreCompleto"
                    value={filtros.nombreCompleto}
                    onChange={handleFiltroChange}
                    placeholder="Buscar por nombre"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="sm:col-span-1">
                  <label
                    htmlFor="dni"
                    className="block text-sm font-medium text-gray-700 mb-2 text-left"
                  >
                    DNI
                  </label>
                  <input
                    type="text"
                    id="dni"
                    name="dni"
                    value={filtros.dni}
                    onChange={handleFiltroChange}
                    inputMode="numeric"
                    maxLength={8}
                    placeholder="Buscar por DNI"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label
                        htmlFor="fechaInicio"
                        className="block text-sm font-medium text-gray-700 mb-2 text-left"
                      >
                        Fecha inicio
                      </label>
                      <input
                        type="date"
                        id="fechaInicio"
                        name="fechaInicio"
                        value={filtros.fechaInicio}
                        onChange={handleFiltroChange}
                        className="w-full px-2 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="fechaFin"
                        className="block text-sm font-medium text-gray-700 mb-2 text-left"
                      >
                        Fecha fin
                      </label>
                      <input
                        type="date"
                        id="fechaFin"
                        name="fechaFin"
                        value={filtros.fechaFin}
                        onChange={handleFiltroChange}
                        className="w-full px-2 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto flex-shrink-0">
                <button
                  type="button"
                  onClick={handleGuardarPDF}
                  className="flex items-center px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <FileText className="w-4 h-4 mr-2 text-white" />
                  Guardar PDF
                </button>
              </div>
            </div>
          </div>
          <div>
            <div className="flex items-start justify-between mb-2">
              <h3 className="text-lg font-semibold text-gray-900 mb-0 flex items-center">
                <span className="w-1 h-5 bg-teal-600 mr-3 rounded"></span>
                Resultados
              </h3>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-600">Mostrar:</label>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setPage(1);
                    }}
                    className="block w-20 text-sm py-1 px-2 border border-gray-200 rounded bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    {pageSizes.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  <span className="text-sm text-gray-600">filas</span>
                </div>
              </div>
            </div>

            <div id="pdf-content" className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nombre Completo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      DNI
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fecha de Nacimiento
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Edad
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Sexo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado Análisis
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Confianza
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {pacientesFiltrados.length > 0 ? (
                    pacientesFiltrados
                      .slice((page - 1) * pageSize, page * pageSize)
                      .map((paciente) => (
                        <>
                          <tr key={paciente.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {paciente.nombreCompleto}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {paciente.dni}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {paciente.fechaNacimiento
                                ? formatearFecha(paciente.fechaNacimiento)
                                : "-"}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {paciente.edad ?? "-"}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {paciente.sexo}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <span
                                className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                  paciente.porcentaje && paciente.porcentaje > 0
                                    ? "bg-green-100 text-green-800"
                                    : "bg-yellow-100 text-yellow-800"
                                }`}
                              >
                                {paciente.porcentaje && paciente.porcentaje > 0
                                  ? "Analizado"
                                  : "Pendiente"}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatearConfianza(paciente.porcentaje)}
                            </td>

                            <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                              <div className="flex justify-center items-center gap-3">
                                {(() => {
                                  const hasAnalisis = paciente.porcentaje && paciente.porcentaje > 0;
                                  return (
                                    <button
                                      onClick={() => hasAnalisis && toggleMostrarPredicciones(paciente.id)}
                                      aria-disabled={!hasAnalisis}
                                      title={hasAnalisis ? 'Ver análisis' : 'No hay análisis'}
                                      className={`p-1 rounded ${hasAnalisis ? 'text-teal-600 hover:text-teal-800' : 'text-gray-300 cursor-not-allowed'}`}
                                    >
                                      <ChevronDown className="w-5 h-5" />
                                    </button>
                                  );
                                })()}
                                <Pencil className="w-4 h-4 text-blue-600 hover:text-blue-800 cursor-pointer" />
                                <Trash2 className="w-4 h-4 text-red-600 hover:text-red-800 cursor-pointer" />
                              </div>
                            </td>
                          </tr>
                          {pacienteSeleccionadoId === paciente.id && (
                            <tr>
                              <td colSpan="8" className="bg-gray-50">
                                <div className="p-4">
                                  <h4 className="text-sm font-semibold text-gray-800 mb-2">
                                    Análisis realizados
                                  </h4>
                                  {loadingPredicciones ? (
                                    <div className="text-sm text-gray-600">
                                      Cargando análisis...
                                    </div>
                                  ) : prediccionesPaciente.length === 0 ? (
                                    <div className="text-sm text-gray-600">
                                      No hay análisis registrados para este
                                      paciente.
                                    </div>
                                  ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                      {prediccionesPaciente.map((pred) => (
                                        <div
                                          key={pred.id_pred}
                                          className="bg-white border border-gray-200 rounded-lg p-3 flex items-start gap-3"
                                        >
                                          {pred.ruta_imagen ? (
                                            <img
                                              src={`http://localhost:5000/${pred.ruta_imagen}`}
                                              alt={`Pred ${pred.id_pred}`}
                                              className="w-20 h-20 object-cover rounded-md border"
                                            />
                                          ) : (
                                            <div className="w-20 h-20 bg-gray-100 rounded-md flex items-center justify-center text-gray-400">
                                              Sin imagen
                                            </div>
                                          )}
                                          <div className="flex-1 text-sm">
                                            <p className="font-semibold">
                                              {pred.porcentaje !== null
                                                ? `${Number(pred.porcentaje).toFixed(2)}%`
                                                : "Pendiente"}
                                            </p>
                                            <p className="text-xs text-gray-500">
                                              {pred.fecha_pred
                                                ? new Date(
                                                    pred.fecha_pred,
                                                  ).toLocaleString()
                                                : "-"}
                                            </p>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      ))
                  ) : (
                    <tr>
                      <td
                        colSpan="8"
                        className="px-6 py-4 text-center text-sm text-gray-500 italic"
                      >
                        No se encontraron pacientes con los filtros aplicados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination controls */}
            {pacientesFiltrados.length > 0 && (
              <div className="mt-4 flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Mostrando{" "}
                  <span className="font-medium text-gray-900">
                    {Math.min(
                      (page - 1) * pageSize + 1,
                      pacientesFiltrados.length,
                    )}
                  </span>{" "}
                  -{" "}
                  <span className="font-medium text-gray-900">
                    {Math.min(page * pageSize, pacientesFiltrados.length)}
                  </span>{" "}
                  de{" "}
                  <span className="font-medium text-gray-900">
                    {pacientesFiltrados.length}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1 bg-white border border-gray-200 rounded-md text-sm shadow-sm hover:bg-gray-50 disabled:opacity-50"
                  >
                    Anterior
                  </button>

                  <div className="flex items-center gap-1 overflow-x-auto">
                    {Array.from({ length: totalPages }).map((_, i) => {
                      const p = i + 1;
                      return (
                        <button
                          key={p}
                          onClick={() => setPage(p)}
                          className={`px-3 py-1 text-sm rounded-md border ${p === page ? "bg-teal-600 text-white border-teal-600" : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"}`}
                        >
                          {p}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-3 py-1 bg-white border border-gray-200 rounded-md text-sm shadow-sm hover:bg-gray-50 disabled:opacity-50"
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            )}

            {pacientesFiltrados.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No se encontraron pacientes
              </div>
            )}
          </div>
        </div>
      </div>
      <AlertModal
        open={modal.open}
        title={modal.title}
        message={modal.message}
        onClose={() => setModal({ open: false, title: "", message: "" })}
      />
    </Layout>
  );
}

export default Pacientes;
