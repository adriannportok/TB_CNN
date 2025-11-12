import { useState, useEffect } from "react";
import Layout from "../components/Layouts";
import axios from "axios";
import { Pencil, Trash2, Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";

function Usuarios() {
  const [filtros, setFiltros] = useState({
    usuario: "",
  });
  const [usuarios, setUsuarios] = useState([]);
  const [usuariosFiltrados, setUsuariosFiltrados] = useState([]);
  const [usuarioSeleccionadoId, setUsuarioSeleccionadoId] = useState(null);
  const [prediccionesUsuario, setPrediccionesUsuario] = useState([]);
  const [loadingPredicciones, setLoadingPredicciones] = useState(false);
  const [visibleClaves, setVisibleClaves] = useState({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const pageSizes = [5, 10, 25, 50];
  const navigate = useNavigate();

  useEffect(() => {
    fetchUsuarios();
  }, []);

  const fetchUsuarios = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/usuarios");
      if (Array.isArray(res.data)) {
        const data = res.data.map((u) => ({
          id: u.id_usuario ?? u.id ?? u.id_user,
          usuario: u.usuario ?? u.username ?? u.user ?? "-",
          clave: u.clave ?? "-",
          fechaRegistro: u.fecha_creacion ?? u.fecha_registro ?? u.created_at ?? null,
          rol: u.rol ?? u.role ?? "-",
          estado: u.estado ?? "-",
        }));
        setUsuarios(data);
        setUsuariosFiltrados(data);
      } else {
        setUsuarios([]);
        setUsuariosFiltrados([]);
      }
    } catch (error) {
      setUsuarios([]);
      setUsuariosFiltrados([]);
    }
  };

  useEffect(() => {
    let filtrados = usuarios;
    if (filtros.usuario) {
      filtrados = filtrados.filter((p) => p.usuario && p.usuario.toLowerCase().includes(filtros.usuario.toLowerCase()));
    }
    setUsuariosFiltrados(filtrados);
    setPage(1);
  }, [filtros, usuarios]);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(usuariosFiltrados.length / pageSize));
    if (page > totalPages) setPage(totalPages);
  }, [usuariosFiltrados, pageSize]);

  const handleFiltroChange = (e) => {
    const { name, value } = e.target;
    let newValue = value;
    if (name === "usuario") {
      // allow typical username chars
      newValue = newValue.replace(/[^A-Za-z0-9_\-\.@]/g, "");
      if (newValue.length > 64) newValue = newValue.slice(0, 64);
    }
    setFiltros((prev) => ({ ...prev, [name]: newValue }));
  };

  const formatearFecha = (fecha) => {
    if (!fecha) return "-";
    const d = new Date(fecha);
    if (isNaN(d.getTime())) return "-";
    try {
      return d.toLocaleString("es-ES");
    } catch (e) {
      return d.toISOString();
    }
  };

  const totalPages = Math.max(1, Math.ceil(usuariosFiltrados.length / pageSize));

  const toggleClaveVisible = (id) => {
    setVisibleClaves((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <Layout title="Usuarios">
      <div className="px-2 sm:px-4 py-2">
        <div className="mb-4">
          <h2 className="text-left font-bold text-gray-700">Listado de usuarios</h2>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 sm:p-6 w-full">
          <div className="mb-6 pb-6 border-b border-white">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <span className="w-1 h-5 bg-teal-600 mr-3 rounded"></span>
              Filtros de Búsqueda
            </h3>

            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-4">
              <div className="w-full lg:w-1/3">
                <label htmlFor="usuario" className="block text-sm font-medium text-gray-700 mb-2 text-left">Usuario</label>
                <input type="text" id="usuario" name="usuario" value={filtros.usuario} onChange={handleFiltroChange} placeholder="Buscar por usuario" className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
              </div>

              <div className="w-full lg:w-auto flex items-center justify-end">
                <button onClick={() => navigate('/usuarios/nuevo')} className="inline-flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-md shadow-sm text-sm">
                  Añadir Usuario
                </button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rol</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usuario</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Clave</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {usuariosFiltrados.length > 0 ? (
                  usuariosFiltrados.slice((page - 1) * pageSize, page * pageSize).map((usuario) => (
                    <tr key={usuario.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{usuario.rol}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-900">{usuario.usuario}</span>
                          <small className="text-gray-500">{usuario.fechaRegistro ? formatearFecha(usuario.fechaRegistro) : '-'}</small>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center justify-start gap-2">
                          <span className="font-mono text-sm text-gray-800">{visibleClaves[usuario.id] ? usuario.clave : '••••••••'}</span>
                          <button title={visibleClaves[usuario.id] ? 'Ocultar clave' : 'Mostrar clave'} onClick={() => toggleClaveVisible(usuario.id)} className="p-1 rounded text-gray-600 hover:text-gray-800">
                            {visibleClaves[usuario.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{usuario.estado ?? '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                        <div className="flex justify-center items-center gap-3">
                          <Pencil className="w-4 h-4 text-blue-600 hover:text-blue-800 cursor-pointer" />
                          <Trash2 className="w-4 h-4 text-red-600 hover:text-red-800 cursor-pointer" />
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="px-6 py-4 text-center text-sm text-gray-500 italic">No se encontraron usuarios con los filtros aplicados.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination controls */}
          {usuariosFiltrados.length > 0 && (
            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Mostrando <span className="font-medium text-gray-900">{Math.min((page - 1) * pageSize + 1, usuariosFiltrados.length)}</span> - <span className="font-medium text-gray-900">{Math.min(page * pageSize, usuariosFiltrados.length)}</span> de <span className="font-medium text-gray-900">{usuariosFiltrados.length}</span>
              </div>

              <div className="flex items-center gap-2">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 bg-white border border-gray-200 rounded-md text-sm shadow-sm hover:bg-gray-50 disabled:opacity-50">Anterior</button>

                <div className="flex items-center gap-1 overflow-x-auto">
                  {Array.from({ length: totalPages }).map((_, i) => {
                    const p = i + 1;
                    return (
                      <button key={p} onClick={() => setPage(p)} className={`px-3 py-1 text-sm rounded-md border ${p === page ? "bg-teal-600 text-white border-teal-600" : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"}`}>{p}</button>
                    );
                  })}
                </div>

                <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1 bg-white border border-gray-200 rounded-md text-sm shadow-sm hover:bg-gray-50 disabled:opacity-50">Siguiente</button>
              </div>
            </div>
          )}

        </div>
      </div>
    </Layout>
  );
}

export default Usuarios;
