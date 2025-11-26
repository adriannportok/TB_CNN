import { useState, useEffect } from "react";
import Layout from "../components/Layouts";
import axios from "axios";
import { Pencil, Trash2, ThumbsDown, Plus, X } from "lucide-react";
import AlertModal from "../components/AlertModal";

function Usuarios() {
  const [filtros, setFiltros] = useState({
    usuario: "",
  });
  const [usuarios, setUsuarios] = useState([]);
  const [usuariosFiltrados, setUsuariosFiltrados] = useState([]);
  const [usuarioSeleccionadoId, setUsuarioSeleccionadoId] = useState(null);
  const [prediccionesUsuario, setPrediccionesUsuario] = useState([]);
  const [loadingPredicciones, setLoadingPredicciones] = useState(false);
  
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const pageSizes = [5, 10, 25, 50];

  const [addOpen, setAddOpen] = useState(false);
  const [addFormData, setAddFormData] = useState({ usuario: '', clave: '', nombres: '', apellidos: '', rol: 'medico', estado: true });
  const [addLoading, setAddLoading] = useState(false);
  const [modal, setModal] = useState({ open: false, title: '', message: '', onConfirm: undefined });

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

  const capitalize = (s) => {
    if (!s && s !== 0) return "-";
    const str = String(s);
    if (str.length === 0) return "-";
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  const resetAddForm = () => {
    setAddFormData({ usuario: '', clave: '', nombres: '', apellidos: '', rol: 'medico', estado: true });
  };

  const handleAddChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name === 'usuario') {
      let v = value.replace(/[^A-Za-z0-9_\-\.@]/g, '');
      if (v.length > 64) v = v.slice(0,64);
      setAddFormData(prev => ({ ...prev, [name]: v }));
      return;
    }
    if (type === 'checkbox') {
      setAddFormData(prev => ({ ...prev, [name]: checked }));
      return;
    }
    setAddFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddSubmit = async () => {
    if (!addFormData.usuario || !addFormData.clave || !addFormData.nombres || !addFormData.apellidos) {
      setModal({ open: true, title: 'Validación', message: 'Por favor complete todos los campos obligatorios.' });
      return;
    }
    if (addFormData.clave.length < 6) {
      setModal({ open: true, title: 'Validación', message: 'La clave debe tener al menos 6 caracteres.' });
      return;
    }
    setAddLoading(true);
    try {
      const payload = {
        usuario: addFormData.usuario,
        clave: addFormData.clave,
        nombres: addFormData.nombres,
        apellidos: addFormData.apellidos,
        rol: addFormData.rol,
        estado: addFormData.estado,
      };
      const res = await axios.post('http://localhost:5000/api/usuarios', payload);
      if (res.status === 201 || res.status === 200) {
        setModal({ open: true, title: 'Éxito', message: 'Usuario creado correctamente.' });
        setAddOpen(false);
        resetAddForm();
        fetchUsuarios();
      } else {
        setModal({ open: true, title: 'Error', message: res.data?.error || 'Error creando usuario.' });
      }
    } catch (err) {
      setModal({ open: true, title: 'Error', message: err.response?.data?.error || err.message || 'Error creando usuario.' });
    } finally {
      setAddLoading(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(usuariosFiltrados.length / pageSize));

  

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
                <button onClick={() => { resetAddForm(); setAddOpen(true); }} className="inline-flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-md shadow-sm text-sm">
                  <Plus className="w-4 h-4" />
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha creación</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {usuariosFiltrados.length > 0 ? (
                  usuariosFiltrados.slice((page - 1) * pageSize, page * pageSize).map((usuario) => (
                    <tr key={usuario.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{usuario.rol ? capitalize(usuario.rol) : '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-900">{usuario.usuario}</span>                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{usuario.fechaRegistro ? formatearFecha(usuario.fechaRegistro) : '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {typeof usuario.estado === 'boolean' ? (
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${usuario.estado ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-red-100 text-red-800 border border-red-200'}`}>
                            {usuario.estado ? 'Activo' : 'Inactivo'}
                          </span>
                        ) : (
                          usuario.estado ?? '-'
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                        <div className="flex justify-center items-center gap-3">
                          <button className="relative group p-1">
                            <Pencil className="w-4 h-4 text-blue-600 hover:text-blue-800 cursor-pointer" />
                            <span className="pointer-events-none absolute -top-9 left-1/2 transform -translate-x-1/2 scale-95 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all bg-gray-800 text-white text-xs rounded px-2 py-1 shadow-lg whitespace-nowrap z-10">Editar usuario</span>
                          </button>
                          <button className="relative group p-1">
                            <ThumbsDown className="w-4 h-4 text-red-600 hover:text-red-800 cursor-pointer" />
                            <span className="pointer-events-none absolute -top-9 left-1/2 transform -translate-x-1/2 scale-95 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all bg-gray-800 text-white text-xs rounded px-2 py-1 shadow-lg whitespace-nowrap z-10">Dar baja usuario</span>
                          </button>
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

          {addOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
              <div className="absolute inset-0 bg-black opacity-40" onClick={() => setModal({ open: true, title: 'Confirmar', message: '¿Cancelar? Se perderán los datos.', onConfirm: () => { setAddOpen(false); resetAddForm(); } })} />
              <div className="relative z-10 w-full max-w-2xl mx-auto transform transition-all duration-200 ease-out scale-100">
                <div className="bg-white rounded-xl shadow-2xl overflow-hidden max-h-[90vh]">
                  <div className="bg-gradient-to-r from-teal-50 to-white p-4 border-b">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-teal-100 rounded-md flex items-center justify-center">
                          <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-800">Agregar Usuario</h3>
                          <p className="text-xs text-gray-500">Cree un nuevo usuario con rol y estado.</p>
                        </div>
                      </div>
                      <button onClick={() => setModal({ open: true, title: 'Confirmar', message: '¿Cancelar? Se perderán los datos.', onConfirm: () => { setAddOpen(false); resetAddForm(); } })} className="p-2 rounded-md text-gray-500 hover:bg-gray-100">
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Usuario</label>
                        <input type="text" name="usuario" value={addFormData.usuario} onChange={handleAddChange} className="w-full px-3 py-2 border border-gray-200 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Clave</label>
                        <input type="password" name="clave" value={addFormData.clave} onChange={handleAddChange} className="w-full px-3 py-2 border border-gray-200 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Nombres</label>
                        <input type="text" name="nombres" value={addFormData.nombres} onChange={handleAddChange} className="w-full px-3 py-2 border border-gray-200 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Apellidos</label>
                        <input type="text" name="apellidos" value={addFormData.apellidos} onChange={handleAddChange} className="w-full px-3 py-2 border border-gray-200 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Rol</label>
                        <select name="rol" value={addFormData.rol} onChange={handleAddChange} className="w-full px-3 py-2 border border-gray-200 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                          <option value="medico">Médico</option>
                          <option value="administrador">Administrador</option>
                        </select>
                      </div>
                      <div className="flex items-center gap-2">
                        <input type="checkbox" id="estado" name="estado" checked={!!addFormData.estado} onChange={handleAddChange} className="h-4 w-4" />
                        <label htmlFor="estado" className="text-sm text-gray-700">Activo</label>
                      </div>
                    </div>

                    <div className="mt-6 flex justify-end gap-3">
                      <button onClick={() => setModal({ open: true, title: 'Confirmar', message: '¿Cancelar? Se perderán los datos.', onConfirm: () => { setAddOpen(false); resetAddForm(); } })} className="px-4 py-2 bg-white border border-gray-300 rounded hover:bg-gray-50">Cancelar</button>
                      <button onClick={handleAddSubmit} disabled={addLoading} className="px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-500">{addLoading ? 'Guardando...' : 'Crear usuario'}</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <AlertModal open={modal.open} title={modal.title} message={modal.message} onClose={() => setModal({ open: false, title: '', message: '', onConfirm: undefined })} onConfirm={modal.onConfirm} confirmText={modal.confirmText} cancelText={modal.cancelText} />
        </div>
      </div>
    </Layout>
  );
}

export default Usuarios;
