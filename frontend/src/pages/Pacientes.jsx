import { useState, useEffect, useRef } from "react";
import { createPortal } from 'react-dom';
import Layout from "../components/Layouts";
import axios from "axios";
import { FileText } from "lucide-react";
import html2pdf from "html2pdf.js";
import { Pencil, Trash2, ChevronDown, Plus, X, Download } from "lucide-react";
import { useNavigate } from 'react-router-dom';
import AlertModal from "../components/AlertModal";

function Pacientes() {
  function Tooltip({ children, text }) {
    const [show, setShow] = useState(false);
    return (
      <div className="relative inline-flex" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
        {children}
        {show && (
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-50">
            <div className="bg-gray-800 text-white text-xs rounded px-2 py-1 shadow-lg whitespace-nowrap">
              {text}
            </div>
            <div className="w-2 h-2 bg-gray-800 transform rotate-45 -mt-1 mx-auto" />
          </div>
        )}
      </div>
    );
  }
  const [filtros, setFiltros] = useState({
    nombreCompleto: "",
    dni: "",
    fechaInicio: "",
    fechaFin: "",
    minAnalisis: 0,
    peligro: 'all',
  });

  const filtrosActivos = Boolean(
    (filtros.nombreCompleto && filtros.nombreCompleto.trim() !== '') ||
    (filtros.dni && filtros.dni.trim() !== '') ||
    filtros.fechaInicio ||
    filtros.fechaFin ||
    Number(filtros.minAnalisis) > 0 ||
    (filtros.peligro && filtros.peligro !== 'all')
  );

  const [pacientes, setPacientes] = useState([]);
  const [pacientesFiltrados, setPacientesFiltrados] = useState([]);
  const [maxAnalisis, setMaxAnalisis] = useState(0);
  const [pacienteSeleccionadoId, setPacienteSeleccionadoId] = useState(null);
  const [prediccionesPaciente, setPrediccionesPaciente] = useState([]);
  const [loadingPredicciones, setLoadingPredicciones] = useState(false);
  const [modal, setModal] = useState({ open: false, title: "", message: "" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const pageSizes = [5, 10, 25, 50];
  
  const [registerOpen, setRegisterOpen] = useState(false);
  const [regFormData, setRegFormData] = useState({
    nombre: "",
    apellido: "",
    fechaNacimiento: "",
    genero: "",
    dni: "",
    imagen: null,
  });
  const [regPreview, setRegPreview] = useState(null);
  const [regLoading, setRegLoading] = useState(false);
  const [regValidating, setRegValidating] = useState(false);
  const [regValidated, setRegValidated] = useState(false);
  const [regValidationError, setRegValidationError] = useState(null);
  const regFileInputRef = useRef(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    id: null,
    nombre: "",
    apellido: "",
    fechaNacimiento: "",
    genero: "",
    dni: "",
    imagen: null,
  });
  const [editPreview, setEditPreview] = useState(null);
  const [editLoading, setEditLoading] = useState(false);
  const editFileInputRef = useRef(null);
  const [editImageAllowed, setEditImageAllowed] = useState(true);
  const [editValidating, setEditValidating] = useState(false);
  const [editValidated, setEditValidated] = useState(false);
  const [editValidationError, setEditValidationError] = useState(null);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [imageModalData, setImageModalData] = useState(null);
  const [newAnalisisOpen, setNewAnalisisOpen] = useState(false);
  const [newAnalisisPacienteId, setNewAnalisisPacienteId] = useState(null);
  const [newAnalisisPacienteData, setNewAnalisisPacienteData] = useState(null);
  const [newAnalisisFile, setNewAnalisisFile] = useState(null);
  const [newAnalisisPreview, setNewAnalisisPreview] = useState(null);
  const [newAnalisisLoading, setNewAnalisisLoading] = useState(false);
  const [newAnalisisValidating, setNewAnalisisValidating] = useState(false);
  const [newAnalisisValidated, setNewAnalisisValidated] = useState(false);
  const [newAnalisisValidationError, setNewAnalisisValidationError] = useState(null);
  const newAnalisisFileInputRef = useRef(null);

  const [floatingTooltip, setFloatingTooltip] = useState(null);

  const showFloatingTooltip = (text, targetEl) => {
    if (!targetEl) return;
    const rect = targetEl.getBoundingClientRect();
    setFloatingTooltip({ text, rect });
  };

  const hideFloatingTooltip = () => setFloatingTooltip(null);

  useEffect(() => {
    fetchPacientes();
  }, []);
  const navigate = useNavigate();

  const fetchPacientes = async () => {
    try {
      const id_usuario = localStorage.getItem('id_usuario');
      const params = {};
      if (id_usuario) params.id_usuario = id_usuario;
      const res = await axios.get("http://localhost:5000/api/pacientes", { params });
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
          analisisCount: Number(p.analisis_count || 0),
        }));

        const computedMax = data.reduce((m, it) => Math.max(m, it.analisisCount), 0);
        setMaxAnalisis(computedMax);

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
    if (Number(filtros.minAnalisis) > 0) {
      const min = Number(filtros.minAnalisis);
      filtrados = filtrados.filter((p) => (Number(p.analisisCount || 0) >= min));
    }

    if (filtros.peligro && filtros.peligro !== 'all') {
      if (filtros.peligro === 'gt50') {
        filtrados = filtrados.filter((p) => p.porcentaje !== null && p.porcentaje !== undefined && !isNaN(Number(p.porcentaje)) && Number(p.porcentaje) > 50);
      } else if (filtros.peligro === 'lt50') {
        filtrados = filtrados.filter((p) => p.porcentaje !== null && p.porcentaje !== undefined && !isNaN(Number(p.porcentaje)) && Number(p.porcentaje) <= 50);
      }
    }

    setPacientesFiltrados(filtrados);
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

    if (name === 'minAnalisis') {
      newValue = String(Math.max(0, Number(newValue || 0)));
    }

    if (name === 'peligro') {
      newValue = value;
    }

    setFiltros((prev) => ({
      ...prev,
      [name]: newValue,
    }));
  };

  const handleGuardarPDF = () => {
    try {
      const tempContainer = document.createElement('div');
      tempContainer.setAttribute('id', 'pdf-temp-content');
      tempContainer.style.padding = '12px';
      tempContainer.style.background = '#ffffff';

      const title = document.createElement('h2');
      title.textContent = 'Pacientes Analizados';
      title.style.fontFamily = 'Arial, Helvetica, sans-serif';
      title.style.margin = '0';
      title.style.padding = '0';
      title.style.fontSize = '18px';
      title.style.fontWeight = '700';
      title.style.textAlign = 'center';
      title.style.marginBottom = '6px';

      const metaRow = document.createElement('div');
      metaRow.style.display = 'flex';
      metaRow.style.justifyContent = 'space-between';
      metaRow.style.alignItems = 'center';
      metaRow.style.marginBottom = '10px';
      metaRow.style.fontFamily = 'Arial, Helvetica, sans-serif';
      metaRow.style.fontSize = '12px';
      metaRow.style.color = '#374151';

      const medicoSpan = document.createElement('div');
      let medicoNombre = '';
      const nombresLS = localStorage.getItem('nombres');
      const apellidosLS = localStorage.getItem('apellidos');
      if (nombresLS || apellidosLS) {
        medicoNombre = `${nombresLS || ''} ${apellidosLS || ''}`.trim();
      }
      const keysToTry = ['userData', 'usuario_data', 'usuario', 'user', 'username'];
      for (const key of keysToTry) {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        if (medicoNombre) break;
        try {
          const parsed = JSON.parse(raw);
          if (!parsed) continue;
          if (parsed.nombres && parsed.apellidos) {
            medicoNombre = `${parsed.nombres} ${parsed.apellidos}`.trim();
            break;
          }
          if (parsed.nombre && parsed.apellido) {
            medicoNombre = `${parsed.nombre} ${parsed.apellido}`.trim();
            break;
          }
          if (parsed.nombre) {
            medicoNombre = parsed.nombre;
            break;
          }
          if (parsed.nombreCompleto) {
            medicoNombre = parsed.nombreCompleto;
            break;
          }
          if (parsed.displayName) {
            medicoNombre = parsed.displayName;
            break;
          }
          if (parsed.usuario) {
            medicoNombre = parsed.usuario;
            break;
          }
          if (parsed.username) {
            medicoNombre = parsed.username;
            break;
          }
        } catch (e) {
          medicoNombre = raw;
          break;
        }
      }
      if (!medicoNombre) {
        medicoNombre = (localStorage.getItem('usuario') || localStorage.getItem('username') || localStorage.getItem('user') || '').toString();
      }
      medicoSpan.textContent = medicoNombre ? `Médico a cargo: ${medicoNombre}` : 'Médico a cargo: -';

      const fechaSpan = document.createElement('div');
      const now = new Date();
      const fechaStr = now.toLocaleString('es-PE', { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' });
      fechaSpan.textContent = `Fecha descarga: ${fechaStr}`;

      metaRow.appendChild(medicoSpan);
      metaRow.appendChild(fechaSpan);

      tempContainer.appendChild(title);
      tempContainer.appendChild(metaRow);

      const table = document.createElement('table');
      table.style.width = '100%';
      table.style.borderCollapse = 'collapse';
      table.style.fontFamily = 'Arial, Helvetica, sans-serif';

      const thead = document.createElement('thead');
      const headerRow = document.createElement('tr');
      ['Nombre Completo', 'DNI', 'Fecha de Nacimiento', 'Edad', 'Sexo', 'Peligro'].forEach(h => {
        const th = document.createElement('th');
        th.textContent = h;
        th.style.border = '1px solid #ddd';
        th.style.padding = '6px 8px';
        th.style.background = '#f3f4f6';
        th.style.fontSize = '12px';
        th.style.textAlign = 'left';
        headerRow.appendChild(th);
      });
      thead.appendChild(headerRow);
      table.appendChild(thead);

      const tbody = document.createElement('tbody');

      const pageItems = (pacientesFiltrados || []).slice((page - 1) * pageSize, page * pageSize);
      pageItems.forEach((p) => {
        const tr = document.createElement('tr');
        const cells = [
          p.nombreCompleto || '-',
          p.dni || '-',
          p.fechaNacimiento ? formatearFecha(p.fechaNacimiento) : '-',
          p.edad ?? '-',
          p.sexo || '-',
          formatearConfianza(p.porcentaje),
        ];
        cells.forEach(text => {
          const td = document.createElement('td');
          td.textContent = text;
          td.style.border = '1px solid #ddd';
          td.style.padding = '6px 8px';
          td.style.fontSize = '12px';
          td.style.color = '#000';
          td.style.background = '#fff';
          tr.appendChild(td);
        });
        tbody.appendChild(tr);
      });

      table.appendChild(tbody);
      tempContainer.appendChild(table);

      const css = `
        #pdf-temp-content, #pdf-temp-content * { color: #000 !important; background: #fff !important; }
        #pdf-temp-content table { border-collapse: collapse !important; }
        #pdf-temp-content th, #pdf-temp-content td { border: 1px solid #ddd !important; background: #fff !important; color: #000 !important; }
      `;
      const styleEl = document.createElement('style');
      styleEl.setAttribute('data-temp-pdf-style', '1');
      styleEl.appendChild(document.createTextNode(css));
      document.head.appendChild(styleEl);

      document.body.appendChild(tempContainer);

      const formatDateForFilename = (d) => {
        try {
          if (!d) return null;
          if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
            const [y, m, day] = d.split('-');
            return `${day}-${m}-${y}`;
          }
          const dt = new Date(d);
          if (isNaN(dt.getTime())) return null;
          const day = String(dt.getDate()).padStart(2, '0');
          const month = String(dt.getMonth() + 1).padStart(2, '0');
          const year = dt.getFullYear();
          return `${day}-${month}-${year}`;
        } catch (e) {
          return null;
        }
      };

      let filenameDate = null;
      if (filtros.fechaInicio && filtros.fechaFin) {
        const start = formatDateForFilename(filtros.fechaInicio);
        const end = formatDateForFilename(filtros.fechaFin);
        if (start && end) filenameDate = `${start}_a_${end}`;
      } else if (filtros.fechaInicio) {
        const start = formatDateForFilename(filtros.fechaInicio);
        if (start) filenameDate = start;
      } else if (filtros.fechaFin) {
        const end = formatDateForFilename(filtros.fechaFin);
        if (end) filenameDate = end;
      }
      if (!filenameDate) {
        const nowDate = new Date();
        const day = String(nowDate.getDate()).padStart(2, '0');
        const month = String(nowDate.getMonth() + 1).padStart(2, '0');
        const year = nowDate.getFullYear();
        filenameDate = `${day}-${month}-${year}`;
      }

      const storageKey = `pdf_count_${filenameDate}`;
      let count = 1;
      try {
        const raw = localStorage.getItem(storageKey);
        if (raw) {
          const parsed = parseInt(raw, 10);
          if (!isNaN(parsed)) count = parsed + 1;
        }
        localStorage.setItem(storageKey, String(count));
      } catch (e) {
        count = 1;
      }
      const uniqueSuffix = String(count).padStart(3, '0');
      const opt = {
        margin: 0.5,
        filename: `Listado_Pacientes_${filenameDate}_${uniqueSuffix}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, allowTaint: true },
        jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' },
      };

      html2pdf()
        .set(opt)
        .from(tempContainer)
        .save()
        .then(() => {
          if (styleEl.parentNode) document.head.removeChild(styleEl);
          if (tempContainer.parentNode) document.body.removeChild(tempContainer);
        })
        .catch((err) => {
          setModal({ open: true, title: 'Error', message: 'Error al generar PDF.' });
          if (styleEl.parentNode) document.head.removeChild(styleEl);
          if (tempContainer.parentNode) document.body.removeChild(tempContainer);
        });
    } catch (err) {
      setModal({ open: true, title: 'Error', message: 'Error al generar PDF.' });
    }
  };

  const handleRegChange = (e) => {
    const { name, value } = e.target;
    let newValue = value;
    if (name === "nombre" || name === "apellido") {
      newValue = newValue.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ\s'\-]/g, "");
    }
    if (name === "dni") {
      newValue = newValue.replace(/\D/g, "");
      if (newValue.length > 8) newValue = newValue.slice(0, 8);
    }
    setRegFormData((prev) => ({ ...prev, [name]: newValue }));
  };

  const handleRegImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
      const allowedExt = /\.(jpe?g|png|webp)$/i;
      if (!allowedTypes.includes(file.type) && !allowedExt.test(file.name)) {
        setRegFormData((prev) => ({ ...prev, imagen: null }));
        setRegPreview(null);
        setRegValidated(false);
        setRegValidationError('Formato de archivo no válido');
        return;
      }
      setRegFormData((prev) => ({ ...prev, imagen: file }));
      setRegPreview(URL.createObjectURL(file));
      setRegValidated(false);
      setRegValidationError(null);
      (async () => {
        try {
          setRegValidating(true);
          const fd = new FormData();
          fd.append('imagen', file);
          const res = await axios.post('http://localhost:5000/api/validacion/rcx', fd);
          if (res.data && typeof res.data.valid !== 'undefined') {
            if (res.data.valid) {
              setRegValidated(true);
              setRegValidationError(null);
            } else {
              setRegValidated(false);
              setRegValidationError('La imagen no es una radiografía de tórax.');
            }
          } else {
            setRegValidated(false);
            setRegValidationError('Respuesta inválida del servidor de validación');
          }
        } catch (err) {
          console.error('Error validando imagen RCX:', err);
          setRegValidated(false);
          setRegValidationError('La imagen no es una radiografía de tórax.');
        } finally {
          setRegValidating(false);
        }
      })();
    }
  };

  const openEditModal = (paciente) => {
    setEditFormData({
      id: paciente.id,
      nombre: paciente.nombreCompleto.split(' ')[0] || '',
      apellido: paciente.nombreCompleto.split(' ').slice(1).join(' ') || '',
      fechaNacimiento: paciente.fechaNacimiento || '',
      genero: paciente.sexo || '',
      dni: paciente.dni || '',
      imagen: null,
    });
    setEditPreview(null);
    const isPending = paciente.porcentaje === null || typeof paciente.porcentaje === 'undefined';
    setEditImageAllowed(isPending);
    // Reset validation state when opening
    setEditValidated(false);
    setEditValidationError(null);
    setEditValidating(false);
    setEditOpen(true);
  };

  const closeEditModal = () => {
    setEditOpen(false);
    setEditPreview(null);
    setEditFormData({ id: null, nombre: '', apellido: '', fechaNacimiento: '', genero: '', dni: '', imagen: null });
    setEditValidated(false);
    setEditValidationError(null);
    setEditValidating(false);
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    let newValue = value;
    if (name === 'nombre' || name === 'apellido') {
      newValue = newValue.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ\s'\-]/g, '');
    }
    if (name === 'dni') {
      newValue = newValue.replace(/\D/g, '');
      if (newValue.length > 8) newValue = newValue.slice(0, 8);
    }
    setEditFormData((prev) => ({ ...prev, [name]: newValue }));
  };

  const handleEditImageChange = (e) => {
    if (!editImageAllowed) return;
    const file = e.target.files[0];
    if (file) {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
      const allowedExt = /\.(jpe?g|png|webp)$/i;
      if (!allowedTypes.includes(file.type) && !allowedExt.test(file.name)) {
        setEditFormData((prev) => ({ ...prev, imagen: null }));
        setEditPreview(null);
        setEditValidated(false);
        setEditValidationError('Formato de archivo no válido');
        return;
      }
      setEditFormData((prev) => ({ ...prev, imagen: file }));
      setEditPreview(URL.createObjectURL(file));
      setEditValidated(false);
      setEditValidationError(null);

      (async () => {
        try {
          setEditValidating(true);
          const fd = new FormData();
          fd.append('imagen', file);
          const res = await axios.post('http://localhost:5000/api/validacion/rcx', fd);
          if (res.data && typeof res.data.valid !== 'undefined') {
            if (res.data.valid) {
              setEditValidated(true);
              setEditValidationError(null);
            } else {
              setEditValidated(false);
              setEditValidationError('La imagen no es una radiografía de tórax.');
            }
          } else {
            setEditValidated(false);
            setEditValidationError('Error al validar la imagen.');
          }
        } catch (err) {
          console.error('Error validando imagen RCX (editar):', err);
          setEditValidated(false);
          setEditValidationError('La imagen no es una radiografía de tórax.');
        } finally {
          setEditValidating(false);
        }
      })();
    }
  };

  const handleEditSubmit = async () => {
    setEditLoading(true);
    try {
      const nameRegex = /^[A-Za-zÀ-ÖØ-öø-ÿ\s'\-]+$/;
      if (editFormData.nombre && !nameRegex.test(editFormData.nombre)) {
        setModal({ open: true, title: 'Validación', message: 'Los nombres solo pueden contener letras, espacios, guiones o apóstrofes.' });
        return;
      }
      if (editFormData.apellido && !nameRegex.test(editFormData.apellido)) {
        setModal({ open: true, title: 'Validación', message: 'Los apellidos solo pueden contener letras, espacios, guiones o apóstrofes.' });
        return;
      }
      if (editFormData.dni && !/^\d{1,8}$/.test(editFormData.dni)) {
        setModal({ open: true, title: 'Validación', message: 'El DNI debe contener solo números y como máximo 8 dígitos.' });
        return;
      }

      const usuario = localStorage.getItem('usuario');
      if (!usuario) {
        setModal({ open: true, title: 'Sesión', message: 'No hay sesión activa.' });
        setEditOpen(false);
        return;
      }

      if (editFormData.imagen) {
        if (!editImageAllowed) {
          setModal({ open: true, title: 'Operación no permitida', message: 'No se puede cambiar la radiografía: solo se permite editar la última radiografía pendiente.' });
          setEditLoading(false);
          return;
        }
        if (editValidating) {
          setModal({ open: true, title: 'Validación', message: 'La imagen aún se está validando. Por favor espere e intente nuevamente.' });
          return;
        }
        if (!editValidated) {
          setModal({ open: true, title: 'Validación', message: editValidationError || 'La imagen no es una radiografía de tórax. Edición cancelada.' });
          return;
        }
      }

      const formDataToSend = new FormData();
      formDataToSend.append('usuario', usuario || '');
      if (editFormData.nombre) formDataToSend.append('nombre', editFormData.nombre);
      if (editFormData.apellido) formDataToSend.append('apellido', editFormData.apellido);
      if (editFormData.dni) formDataToSend.append('dni', editFormData.dni);
      if (editFormData.genero) formDataToSend.append('genero', editFormData.genero);
      if (editFormData.fechaNacimiento) formDataToSend.append('fechaNacimiento', editFormData.fechaNacimiento);
      if (editFormData.imagen) formDataToSend.append('imagen', editFormData.imagen);

      const res = await axios.patch(`http://localhost:5000/api/pacientes/${editFormData.id}`, formDataToSend);
      if (res.status === 200) {
        setModal({ open: true, title: 'Éxito', message: 'Paciente actualizado.', onConfirm: () => { setEditOpen(false); setEditPreview(null); setEditValidated(false); setEditValidationError(null); fetchPacientes(); }, secondaryAction: { text: 'Ir a Análisis', onClick: () => { navigate('/analisisradiografia'); } } });
        setEditOpen(false);
        setEditPreview(null);
        setEditValidated(false);
        setEditValidationError(null);
        fetchPacientes();
      }
    } catch (err) {
      setModal({ open: true, title: 'Error', message: err.response?.data?.error || 'Error al actualizar paciente.' });
    } finally {
      setEditLoading(false);
    }
  };

  const resetRegForm = () => {
    setRegFormData({ nombre: "", apellido: "", fechaNacimiento: "", genero: "", dni: "", imagen: null });
    setRegPreview(null);
    setRegValidated(false);
    setRegValidating(false);
    setRegValidationError(null);
  };

  const handleRegisterSubmit = async () => {
    setRegLoading(true);
    try {
      if (
        !regFormData.nombre ||
        !regFormData.apellido ||
        !regFormData.dni ||
        !regFormData.fechaNacimiento ||
        !regFormData.genero ||
        !regFormData.imagen
      ) {
        setModal({ open: true, title: "Validación", message: "Por favor complete todos los campos obligatorios, incluyendo la imagen." });
        return;
      }

      const nameRegex = /^[A-Za-zÀ-ÖØ-öø-ÿ\s'\-]+$/;
      if (!nameRegex.test(regFormData.nombre) || !nameRegex.test(regFormData.apellido)) {
        setModal({ open: true, title: "Validación", message: "Los nombres y apellidos solo pueden contener letras, espacios, guiones o apóstrofes." });
        return;
      }

      if (!/^\d{1,8}$/.test(regFormData.dni)) {
        setModal({ open: true, title: "Validación", message: "El DNI debe contener solo números y como máximo 8 dígitos." });
        return;
      }

      const id_usuario = localStorage.getItem("id_usuario");
      const usuario = localStorage.getItem("usuario");
      if (!id_usuario || !usuario) {
        setModal({ open: true, title: "Sesión", message: "No hay sesión activa." });
        setRegisterOpen(false);
        return;
      }

      if (regValidating) {
        setModal({ open: true, title: "Validación", message: "La imagen aún se está validando. Por favor espere e intente nuevamente." });
        return;
      }
      if (!regValidated) {
        setModal({ open: true, title: "Validación", message: regValidationError || "La imagen no es una radiografía de tórax. Registro cancelado." });
        return;
      }

      const formDataToSend = new FormData();
      formDataToSend.append("id_usuario", id_usuario);
      formDataToSend.append("nombre", regFormData.nombre);
      formDataToSend.append("apellido", regFormData.apellido);
      formDataToSend.append("dni", regFormData.dni);
      formDataToSend.append("fechaNacimiento", regFormData.fechaNacimiento);
      formDataToSend.append("genero", regFormData.genero);
      formDataToSend.append("imagen", regFormData.imagen);
      formDataToSend.append("usuario", usuario);

      const response = await axios.post("http://localhost:5000/api/pacientes", formDataToSend, { headers: { "Content-Type": "multipart/form-data" } });

      if (response.status === 201) {
        setModal({ open: true, title: "Éxito", message: "Paciente registrado exitosamente.", onConfirm: () => { setRegisterOpen(false); resetRegForm(); fetchPacientes(); }, secondaryAction: { text: 'Ir a Análisis', onClick: () => { navigate('/analisisradiografia'); } } });
        setRegisterOpen(false);
        resetRegForm();
        fetchPacientes();
      }
    } catch (error) {
      if (error.response?.data?.error) {
        setModal({ open: true, title: "Error", message: `Error: ${error.response.data.error}` });
      } else {
        setModal({ open: true, title: "Error", message: "Error al registrar el paciente." });
      }
    } finally {
      setRegLoading(false);
    }
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

  const handleDeletePaciente = async (idPaciente) => {
    try {
      const usuario = localStorage.getItem('usuario');
      const res = await axios.delete(`http://localhost:5000/api/pacientes/${idPaciente}`, { params: { usuario } });
      if (res.status === 200) {
        setModal({ open: true, title: 'Éxito', message: 'Paciente eliminado.' });
        fetchPacientes();
      }
    } catch (err) {
      const msg = err.response?.data?.error || 'Error al eliminar paciente.';
      setModal({ open: true, title: 'Error', message: msg });
    }
  };

  const handleCrearNuevoAnalisis = async (idPaciente) => {
    return;
  };

  const handleNewAnalisisFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
      const allowedExt = /\.(jpe?g|png|webp)$/i;
      if (!allowedTypes.includes(file.type) && !allowedExt.test(file.name)) {
        setNewAnalisisFile(null);
        setNewAnalisisPreview(null);
        setNewAnalisisValidated(false);
        setNewAnalisisValidationError('Formato de archivo no válido');
        return;
      }
      setNewAnalisisFile(file);
      setNewAnalisisPreview(URL.createObjectURL(file));
      setNewAnalisisValidated(false);
      setNewAnalisisValidationError(null);

      (async () => {
        try {
          setNewAnalisisValidating(true);
          const fd = new FormData();
          fd.append('imagen', file);
          const res = await axios.post('http://localhost:5000/api/validacion/rcx', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
          if (res.data && typeof res.data.valid !== 'undefined') {
            if (res.data.valid) {
              setNewAnalisisValidated(true);
              setNewAnalisisValidationError(null);
            } else {
              setNewAnalisisValidated(false);
              setNewAnalisisValidationError('La imagen no es una radiografía de tórax.');
            }
          } else {
            setNewAnalisisValidated(false);
            setNewAnalisisValidationError('Respuesta inválida del servidor de validación');
          }
        } catch (err) {
          console.error('Error validando imagen RCX (nuevo análisis):', err);
          setNewAnalisisValidated(false);
          setNewAnalisisValidationError('La imagen no es una radiografía de tórax.');
        } finally {
          setNewAnalisisValidating(false);
        }
      })();
    }
  };

  const handleCrearNuevoAnalisisSubmit = async () => {
    if (!newAnalisisPacienteId) return;
    setNewAnalisisLoading(true);
    try {
      const usuario = localStorage.getItem('usuario');
      if (!usuario) {
        setModal({ open: true, title: 'Sesión', message: 'No hay sesión activa.' });
        return;
      }
      if (!newAnalisisFile) {
        setModal({ open: true, title: 'Validación', message: 'Por favor seleccione una imagen para el nuevo análisis.' });
        return;
      }
      if (newAnalisisValidating) {
        setModal({ open: true, title: 'Validación', message: 'La imagen aún se está validando. Por favor espere e intente nuevamente.' });
        return;
      }
      if (!newAnalisisValidated) {
        setModal({ open: true, title: 'Validación', message: newAnalisisValidationError || 'La imagen no es una radiografía de tórax. Operación cancelada.' });
        return;
      }

      const fd = new FormData();
      fd.append('usuario', usuario);
      fd.append('imagen', newAnalisisFile);

      const res = await axios.post(`http://localhost:5000/api/analisis/nuevo/${newAnalisisPacienteId}`, fd);
      if (res.status === 201) {
        setModal({ open: true, title: 'Éxito', message: 'Nuevo análisis creado y marcado como pendiente.', onConfirm: () => { setNewAnalisisOpen(false); setNewAnalisisPreview(null); setNewAnalisisFile(null); fetchPacientes(); }, secondaryAction: { text: 'Ir a Análisis', onClick: () => { navigate('/analisisradiografia'); } } });
        setNewAnalisisOpen(false);
        setNewAnalisisPreview(null);
        setNewAnalisisFile(null);
        fetchPacientes();
      }
    } catch (err) {
      setModal({ open: true, title: 'Error', message: err.response?.data?.error || 'Error al crear nuevo análisis.' });
    } finally {
      setNewAnalisisLoading(false);
    }
  };

  const totalPages = Math.max(
    1,
    Math.ceil(pacientesFiltrados.length / pageSize),
  );

  return (
    <Layout title="Gestión de Pacientes - Historial de Análisis">
      <div className="px-2 sm:px-4 py-2">


        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 sm:p-6 w-full">
          <div className="mb-6 pb-6 border-b border-white">

            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-end">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const visibleCount = (pacientesFiltrados || []).slice((page - 1) * pageSize, page * pageSize).length;
                      setModal({
                        open: true,
                        title: 'Confirmar',
                        message: `¿Generar PDF con ${visibleCount} paciente(s) visibles en la página?`,
                        onConfirm: handleGuardarPDF,
                      });
                    }}
                    className="flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <FileText className="w-4 h-4 mr-2 text-white" />
                    Guardar PDF
                  </button>

                    <button
                      type="button"
                      onClick={() => {
                        setFiltros({ nombreCompleto: '', dni: '', fechaInicio: '', fechaFin: '', minAnalisis: 0, peligro: 'all' });
                        setPage(1);
                        setPacienteSeleccionadoId(null);
                        setPrediccionesPaciente([]);
                      }}
                      disabled={!filtrosActivos}
                      aria-disabled={!filtrosActivos}
                      className={`flex items-center px-4 py-2 border rounded-md shadow-sm text-sm font-medium ${filtrosActivos ? 'border-teal-200 bg-teal-100 text-teal-700 hover:bg-teal-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-300' : 'border-gray-200 text-gray-400 bg-gray-100 cursor-not-allowed'}`}
                    >
                      Limpiar filtros
                    </button>

                    <button
                      type="button"
                      onClick={() => { resetRegForm(); setRegisterOpen(true); }}
                      className="flex items-center px-4 py-2 border border-gray-200 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                    >
                      <Plus className="w-4 h-4 mr-2 text-teal-600" />
                      Agregar Paciente
                    </button>
 
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 w-full lg:w-auto">
                <div>
                  <label htmlFor="nombreCompleto" className="block text-sm font-medium text-gray-700 mb-2 text-left">Nombre completo</label>
                  <input type="text" id="nombreCompleto" name="nombreCompleto" value={filtros.nombreCompleto} onChange={handleFiltroChange} placeholder="Buscar por nombre" className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>

                <div>
                  <label htmlFor="dni" className="block text-sm font-medium text-gray-700 mb-2 text-left">DNI</label>
                  <input type="text" id="dni" name="dni" value={filtros.dni} onChange={handleFiltroChange} inputMode="numeric" maxLength={8} placeholder="Buscar por DNI" className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>

                <div>
                  <label htmlFor="fechaInicio" className="block text-sm font-medium text-gray-700 mb-2 text-left">Fecha inicio</label>
                  <input type="date" id="fechaInicio" name="fechaInicio" value={filtros.fechaInicio} onChange={handleFiltroChange} className="w-full px-2 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>

                <div>
                  <label htmlFor="fechaFin" className="block text-sm font-medium text-gray-700 mb-2 text-left">Fecha fin</label>
                  <input type="date" id="fechaFin" name="fechaFin" value={filtros.fechaFin} onChange={handleFiltroChange} className="w-full px-2 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Min. análisis</label>
                  <select name="minAnalisis" value={filtros.minAnalisis} onChange={handleFiltroChange} className="w-full px-2 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value={0}>Todos</option>
                    {Array.from({ length: Math.max(1, maxAnalisis) }).map((_, i) => (
                      <option key={i+1} value={i+1}>{i+1}+</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Peligro</label>
                  <select name="peligro" value={filtros.peligro} onChange={handleFiltroChange} className="w-full px-2 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="all">Todos</option>
                    <option value="gt50">Mayor a 50%</option>
                    <option value="lt50">Menor o igual 50%</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
          <div>
            <div className="flex items-start justify-between mb-2">
              <h3 className="text-lg font-semibold text-gray-900 mb-0 flex items-center">
                <span className="w-1 h-5 bg-teal-600 mr-3 rounded"></span>
                Pacientes - Historial de Análisis
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
                      Peligro
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
                              {(() => {
                                const hasAnalisis = paciente.porcentaje !== null && typeof paciente.porcentaje !== 'undefined';
                                return (
                                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${hasAnalisis ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}>
                                    {hasAnalisis ? "Analizado" : "Pendiente"}
                                  </span>
                                );
                              })()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatearConfianza(paciente.porcentaje)}
                            </td>

                            <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                              <div className="flex justify-center items-center gap-3">
                                {(() => {
                                  const hasAnalisis = paciente.porcentaje !== null && typeof paciente.porcentaje !== 'undefined';
                                  const open = pacienteSeleccionadoId === paciente.id;
                                  const tip = hasAnalisis ? (open ? 'Cerrar análisis previos' : 'Ver análisis previos') : 'No hay análisis';
                                  return (
                                    <div className="relative group p-1" onMouseEnter={(e) => showFloatingTooltip(tip, e.currentTarget)} onMouseLeave={hideFloatingTooltip}>
                                      <button
                                        onClick={() => hasAnalisis && toggleMostrarPredicciones(paciente.id)}
                                        aria-disabled={!hasAnalisis}
                                        aria-expanded={open}
                                        aria-label={tip}
                                        className={`p-1 rounded ${hasAnalisis ? 'text-teal-600 hover:text-teal-800' : 'text-gray-300 cursor-not-allowed'}`}
                                      >
                                        <ChevronDown className={`w-5 h-5 transform transition-transform duration-200 ${open ? 'rotate-180' : 'rotate-0'}`} />
                                      </button>
                                    </div>
                                  );
                                })()}

                                <div className="relative group p-1" onMouseEnter={(e) => showFloatingTooltip('Editar paciente', e.currentTarget)} onMouseLeave={hideFloatingTooltip}>
                                  <button onClick={() => openEditModal(paciente)} className="p-1" aria-label="Editar paciente">
                                    <Pencil className="w-4 h-4 text-blue-600 hover:text-blue-800 cursor-pointer" />
                                  </button>
                                </div>

                                {(() => {
                                  const isPending = paciente.porcentaje === null || typeof paciente.porcentaje === 'undefined';
                                  const tip = isPending ? 'No se puede crear análisis: paciente pendiente' : 'Añadir nuevo análisis';
                                  return (
                                    <div className="relative group p-1" onMouseEnter={(e) => showFloatingTooltip(tip, e.currentTarget)} onMouseLeave={hideFloatingTooltip}>
                                      <button
                                        onClick={() => {
                                          if (isPending) return;
                                          setNewAnalisisPacienteId(paciente.id);
                                          setNewAnalisisPacienteData(paciente);
                                          setNewAnalisisFile(null);
                                          setNewAnalisisPreview(null);
                                          setNewAnalisisValidated(false);
                                          setNewAnalisisValidationError(null);
                                          setNewAnalisisOpen(true);
                                        }}
                                        className={`p-1 ${isPending ? 'text-gray-300 cursor-not-allowed' : 'text-teal-600 hover:text-teal-800'}`}
                                        aria-disabled={isPending}
                                        aria-label={tip}
                                      >
                                        <Plus className="w-4 h-4" />
                                      </button>
                                    </div>
                                  );
                                })()}

                                <div className="relative group p-1" onMouseEnter={(e) => showFloatingTooltip('Eliminar paciente', e.currentTarget)} onMouseLeave={hideFloatingTooltip}>
                                  <button onClick={() => setModal({ open: true, title: 'Confirmar', message: '¿Eliminar paciente? Esta acción no se puede deshacer.', onConfirm: () => { setModal({ open: false }); handleDeletePaciente(paciente.id); } })} className="p-1" aria-label="Eliminar paciente">
                                    <Trash2 className="w-4 h-4 text-red-600 hover:text-red-800 cursor-pointer" />
                                  </button>
                                </div>
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
                                                  className="w-20 h-20 object-cover rounded-md border cursor-pointer"
                                                  onClick={() => { setImageModalData(pred); setImageModalOpen(true); }}
                                                />
                                              ) : (
                                                <div className="w-20 h-20 bg-gray-100 rounded-md flex items-center justify-center text-gray-400 cursor-default">
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
                      <td colSpan="8" className="px-6 py-4 text-center text-sm text-gray-500 italic">
                        No se encontraron pacientes
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {registerOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
                <div className="absolute inset-0 bg-black opacity-40" onClick={() => { setRegisterOpen(false); resetRegForm(); }} />
                <div className="relative z-10 w-full max-w-4xl mx-auto transform transition-all duration-200 ease-out scale-100">
                  <div className="bg-white rounded-xl shadow-2xl overflow-hidden max-h-[90vh]">
                    <div className="bg-gradient-to-r from-teal-50 to-white p-4 border-b">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-teal-100 rounded-md flex items-center justify-center">
                            <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-gray-800">Agregar Paciente</h3>
                            <p className="text-xs text-gray-500">Registra un nuevo paciente y sube la radiografía</p>
                          </div>
                        </div>
                        <button onClick={() => setModal({ open: true, title: 'Confirmar', message: '¿Cancelar? Se perderán los datos.', onConfirm: () => { setRegisterOpen(false); resetRegForm(); }, confirmText: 'Cancelar', cancelText: 'Volver' })} className="p-2 rounded-md text-gray-500 hover:bg-gray-100">
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                    <div className="p-6">
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Nombres</label>
                            <input type="text" name="nombre" value={regFormData.nombre} onChange={handleRegChange} className="w-full px-3 py-2 border border-gray-200 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Apellidos</label>
                            <input type="text" name="apellido" value={regFormData.apellido} onChange={handleRegChange} className="w-full px-3 py-2 border border-gray-200 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">DNI</label>
                            <input type="text" name="dni" value={regFormData.dni} onChange={handleRegChange} inputMode="numeric" maxLength={8} className="w-full px-3 py-2 border border-gray-200 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Fecha de Nacimiento</label>
                            <input type="date" name="fechaNacimiento" value={regFormData.fechaNacimiento} onChange={handleRegChange} className="w-full px-3 py-2 border border-gray-200 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Radiografía de tórax</label>
                            <input ref={regFileInputRef} type="file" name="imagen" accept="image/*" onChange={handleRegImageChange} className="hidden" />
                            <div style={{display: 'flex', gap: 12, alignItems: 'center'}}>
                              <div
                                role="button"
                                tabIndex={0}
                                onClick={() => regFileInputRef.current && regFileInputRef.current.click()}
                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') regFileInputRef.current && regFileInputRef.current.click(); }}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 12,
                                  padding: '10px 14px',
                                  borderRadius: 10,
                                  border: '1px solid rgba(13,148,136,0.15)',
                                  background: '#ffffff',
                                  boxShadow: '0 1px 2px rgba(16,24,40,0.03)',
                                  cursor: 'pointer',
                                  minWidth: 220,
                                }}
                                aria-label="Seleccionar radiografía"
                              >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                                  <path d="M16 16L21 11" stroke="#0d9488" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                  <path d="M21 11V17C21 18.1046 20.1046 19 19 19H5C3.89543 19 3 18.1046 3 17V7C3 5.89543 3.89543 5 5 5H11" stroke="#0d9488" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                  <path d="M7 9H7.01" stroke="#0d9488" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                                <div style={{display: 'flex', flexDirection: 'column', alignItems: 'flex-start'}}>
                                  <span style={{fontSize: 14, color: '#0f766e', fontWeight: 600}}>Seleccionar radiografía</span>
                                  <span style={{fontSize: 12, color: '#6b7280'}}>{regFormData.imagen ? regFormData.imagen.name : 'Arrastra o haz clic para seleccionar'}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Género</label>
                            <div className="flex items-center space-x-6 mt-3">
                              <label className="flex items-center space-x-2">
                                <input type="radio" name="genero" value="M" checked={regFormData.genero === "M"} onChange={handleRegChange} className="text-teal-600 focus:ring-teal-500" />
                                <span>M</span>
                              </label>
                              <label className="flex items-center space-x-2">
                                <input type="radio" name="genero" value="F" checked={regFormData.genero === "F"} onChange={handleRegChange} className="text-teal-600 focus:ring-teal-500" />
                                <span>F</span>
                              </label>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-center">
                          {regPreview ? (
                            <img src={regPreview} alt="Preview" className="w-48 h-56 object-cover rounded-md shadow-lg border" />
                          ) : (
                            <div className="w-48 h-56 flex items-center justify-center text-gray-400 border-2 border-dashed rounded-md">Sin imagen</div>
                          )}
                        </div>
                        <div className="flex items-center justify-center">
                          {regValidating ? (
                            <p className="text-sm text-gray-500 mt-2">Validando imagen...</p>
                          ) : regValidated ? (
                            <p className="text-sm text-green-600 mt-2">Radiografía de tórax válida</p>
                          ) : regValidationError ? (
                            <p className="text-sm text-red-600 mt-2">{regValidationError}</p>
                          ) : null}
                        </div>
                      </div>

                      <div className="flex justify-end gap-3 mt-6">
                        <button onClick={() => setModal({ open: true, title: 'Confirmar', message: '¿Cancelar? Se perderán los datos.', onConfirm: () => { setRegisterOpen(false); resetRegForm(); }, confirmText: 'Cancelar', cancelText: 'Volver' })} className="px-4 py-2 border border-gray-200 rounded-md bg-white text-gray-700 hover:bg-gray-50">Cancelar</button>
                        <button onClick={handleRegisterSubmit} disabled={regLoading} className="px-4 py-2 bg-teal-600 text-white rounded-md shadow hover:bg-teal-700 inline-flex items-center">
                          {regLoading ? (
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>
                          ) : null}
                          {regLoading ? 'Registrando...' : 'Registrar Paciente'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {newAnalisisOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
                <div className="absolute inset-0 bg-black opacity-40" onClick={() => { setNewAnalisisOpen(false); setNewAnalisisFile(null); setNewAnalisisPreview(null); setNewAnalisisPacienteData(null); setNewAnalisisPacienteId(null); }} />
                <div className="relative z-10 w-full max-w-3xl mx-auto transform transition-all duration-200 ease-out scale-100">
                  <div className="bg-white rounded-xl shadow-2xl overflow-hidden max-h-[90vh]">
                    <div className="bg-gradient-to-r from-teal-50 to-white p-4 border-b">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-teal-100 rounded-md flex items-center justify-center">
                            <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-gray-800">Nuevo Análisis</h3>
                            <p className="text-xs text-gray-500">Sube una nueva radiografía para crear un análisis pendiente</p>
                          </div>
                        </div>
                        <button onClick={() => { setNewAnalisisOpen(false); setNewAnalisisPacienteData(null); setNewAnalisisPacienteId(null); }} className="p-2 rounded-md text-gray-500 hover:bg-gray-100">
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                    <div className="p-6">
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Nombres</label>
                              <input type="text" value={newAnalisisPacienteData ? (newAnalisisPacienteData.nombreCompleto.split(' ')[0] || '') : ''} readOnly className="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-gray-700" />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Apellidos</label>
                              <input type="text" value={newAnalisisPacienteData ? (newAnalisisPacienteData.nombreCompleto.split(' ').slice(1).join(' ') || '') : ''} readOnly className="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-gray-700" />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">DNI</label>
                              <input type="text" value={newAnalisisPacienteData ? (newAnalisisPacienteData.dni || '') : ''} readOnly className="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-gray-700" />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Fecha de Nacimiento</label>
                              <input type="date" value={newAnalisisPacienteData ? (newAnalisisPacienteData.fechaNacimiento || '') : ''} readOnly className="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-gray-700" />
                            </div>
                            <div className="md:col-span-2">
                              <label className="block text-sm font-medium text-gray-700 mb-2">Género</label>
                              <div className="flex items-center space-x-6 mt-3">
                                <label className="flex items-center space-x-2">
                                  <input type="radio" name="genero_new" value="M" checked={newAnalisisPacienteData ? newAnalisisPacienteData.sexo === 'M' || newAnalisisPacienteData.sexo === 'M' : false} readOnly disabled />
                                  <span>M</span>
                                </label>
                                <label className="flex items-center space-x-2">
                                  <input type="radio" name="genero_new" value="F" checked={newAnalisisPacienteData ? newAnalisisPacienteData.sexo === 'F' || newAnalisisPacienteData.sexo === 'F' : false} readOnly disabled />
                                  <span>F</span>
                                </label>
                              </div>
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Radiografía de tórax</label>
                            <input ref={newAnalisisFileInputRef} type="file" name="imagen" accept="image/*,.dcm" onChange={handleNewAnalisisFileChange} className="hidden" />
                            <div style={{display: 'flex', gap: 12, alignItems: 'center'}}>
                              <div
                                role="button"
                                tabIndex={0}
                                onClick={() => newAnalisisFileInputRef.current && newAnalisisFileInputRef.current.click()}
                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') newAnalisisFileInputRef.current && newAnalisisFileInputRef.current.click(); }}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 12,
                                  padding: '10px 14px',
                                  borderRadius: 10,
                                  border: '1px solid rgba(13,148,136,0.15)',
                                  background: '#ffffff',
                                  boxShadow: '0 1px 2px rgba(16,24,40,0.03)',
                                  cursor: 'pointer',
                                  minWidth: 220,
                                }}
                                aria-label="Seleccionar radiografía (nuevo análisis)"
                              >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                                  <path d="M16 16L21 11" stroke="#0d9488" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                  <path d="M21 11V17C21 18.1046 20.1046 19 19 19H5C3.89543 19 3 18.1046 3 17V7C3 5.89543 3.89543 5 5 5H11" stroke="#0d9488" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                  <path d="M7 9H7.01" stroke="#0d9488" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                                <div style={{display: 'flex', flexDirection: 'column', alignItems: 'flex-start'}}>
                                  <span style={{fontSize: 14, color: '#0f766e', fontWeight: 600}}>Seleccionar radiografía</span>
                                  <span style={{fontSize: 12, color: '#6b7280'}}>{newAnalisisFile ? newAnalisisFile.name : 'Arrastra o haz clic para seleccionar'}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        
                        </div>

                        <div className="flex items-center justify-center">
                          {newAnalisisPreview ? (
                            <img src={newAnalisisPreview} alt="Preview" className="w-48 h-56 object-cover rounded-md shadow-lg border" />
                          ) : (
                            <div className="w-48 h-56 flex items-center justify-center text-gray-400 border-2 border-dashed rounded-md">Sin imagen</div>
                          )}
                        </div>
                        <div className="flex items-center justify-center">
                          {newAnalisisValidating ? (
                            <p className="text-sm text-gray-500 mt-2">Validando imagen...</p>
                          ) : newAnalisisValidated ? (
                            <p className="text-sm text-green-600 mt-2">Radiografía de tórax válida</p>
                          ) : newAnalisisValidationError ? (
                            <p className="text-sm text-red-600 mt-2">{newAnalisisValidationError}</p>
                          ) : null}
                        </div>
                      </div>

                      <div className="flex justify-end gap-3 mt-6">
                        <button onClick={() => { setNewAnalisisOpen(false); setNewAnalisisFile(null); setNewAnalisisPreview(null); setNewAnalisisPacienteData(null); setNewAnalisisPacienteId(null); }} className="px-4 py-2 border border-gray-200 rounded-md bg-white text-gray-700 hover:bg-gray-50">Cancelar</button>
                        <button onClick={handleCrearNuevoAnalisisSubmit} disabled={newAnalisisLoading} className="px-4 py-2 bg-teal-600 text-white rounded-md shadow hover:bg-teal-700 inline-flex items-center">
                          {newAnalisisLoading ? (
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>
                          ) : null}
                          {newAnalisisLoading ? 'Creando...' : 'Crear análisis'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {editOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
                <div className="absolute inset-0 bg-black opacity-40" onClick={closeEditModal} />
                <div className="relative z-10 w-full max-w-3xl mx-auto transform transition-all duration-200 ease-out scale-100">
                  <div className="bg-white rounded-xl shadow-2xl overflow-hidden max-h-[90vh]">
                    <div className="bg-gradient-to-r from-teal-50 to-white p-4 border-b">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-teal-100 rounded-md flex items-center justify-center">
                            <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-gray-800">Editar Paciente</h3>
                            <p className="text-xs text-gray-500">Modifica datos del paciente o sube una nueva radiografía (se analizará).</p>
                          </div>
                        </div>
                        <button onClick={() => setModal({ open: true, title: 'Confirmar', message: '¿Cancelar? Se perderán los cambios no guardados.', onConfirm: () => { closeEditModal(); }, confirmText: 'Cancelar', cancelText: 'Volver' })} className="p-2 rounded-md text-gray-500 hover:bg-gray-100">
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                    <div className="p-6">
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Nombres</label>
                            <input type="text" name="nombre" value={editFormData.nombre} onChange={handleEditChange} className="w-full px-3 py-2 border border-gray-200 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Apellidos</label>
                            <input type="text" name="apellido" value={editFormData.apellido} onChange={handleEditChange} className="w-full px-3 py-2 border border-gray-200 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">DNI</label>
                            <input type="text" name="dni" value={editFormData.dni} onChange={handleEditChange} inputMode="numeric" maxLength={8} className="w-full px-3 py-2 border border-gray-200 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Fecha de Nacimiento</label>
                            <input type="date" name="fechaNacimiento" value={editFormData.fechaNacimiento} onChange={handleEditChange} className="w-full px-3 py-2 border border-gray-200 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Radiografía (última)</label>
                            <input ref={editFileInputRef} type="file" name="imagen" accept="image/*" onChange={handleEditImageChange} className="hidden" />
                            <div style={{display: 'flex', gap: 12, alignItems: 'center'}}>
                              <div
                                role="button"
                                tabIndex={0}
                                onClick={() => { if (!editImageAllowed) return; editFileInputRef.current && editFileInputRef.current.click(); }}
                                onKeyDown={(e) => { if (!editImageAllowed) return; if (e.key === 'Enter' || e.key === ' ') editFileInputRef.current && editFileInputRef.current.click(); }}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 12,
                                  padding: '10px 14px',
                                  borderRadius: 10,
                                  border: '1px solid rgba(13,148,136,0.15)',
                                  background: '#ffffff',
                                  boxShadow: '0 1px 2px rgba(16,24,40,0.03)',
                                  cursor: editImageAllowed ? 'pointer' : 'not-allowed',
                                  minWidth: 220,
                                  opacity: editImageAllowed ? 1 : 0.6,
                                }}
                                aria-label="Seleccionar radiografía (editar)"
                                aria-disabled={!editImageAllowed}
                                title={editImageAllowed ? 'Seleccionar radiografía' : 'No se puede editar la radiografía porque este paciente ya tiene análisis'}
                              >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                                  <path d="M16 16L21 11" stroke="#0d9488" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                  <path d="M21 11V17C21 18.1046 20.1046 19 19 19H5C3.89543 19 3 18.1046 3 17V7C3 5.89543 3.89543 5 5 5H11" stroke="#0d9488" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                  <path d="M7 9H7.01" stroke="#0d9488" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                                <div style={{display: 'flex', flexDirection: 'column', alignItems: 'flex-start'}}>
                                  <span style={{fontSize: 14, color: '#0f766e', fontWeight: 600}}>Seleccionar radiografía</span>
                                  <span style={{fontSize: 12, color: '#6b7280'}}>{editFormData.imagen ? editFormData.imagen.name : (editImageAllowed ? 'Arrastra o haz clic para seleccionar' : 'Edición de imagen no permitida')}</span>
                                </div>
                              </div>
                            </div>
                            <p className="text-xs text-gray-400 mt-1">Subir una nueva imagen creará un nuevo análisis pendiente.</p>
                            {!editImageAllowed && (
                              <p className="text-xs text-red-600 mt-1">No es posible modificar la radiografía porque este paciente ya tiene uno o más análisis registrados.</p>
                            )}
                            {editImageAllowed && (
                              <p className="text-xs text-teal-600 mt-1">Se puede modificar la radiografía.</p>
                            )}
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Género</label>
                            <div className="flex items-center space-x-6 mt-3">
                              <label className="flex items-center space-x-2">
                                <input type="radio" name="genero" value="M" checked={editFormData.genero === "M"} onChange={handleEditChange} className="text-teal-600 focus:ring-teal-500" />
                                <span>M</span>
                              </label>
                              <label className="flex items-center space-x-2">
                                <input type="radio" name="genero" value="F" checked={editFormData.genero === "F"} onChange={handleEditChange} className="text-teal-600 focus:ring-teal-500" />
                                <span>F</span>
                              </label>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-center">
                          {editPreview ? (
                            <img src={editPreview} alt="Preview" className="w-48 h-56 object-cover rounded-md shadow-lg border" />
                          ) : (
                            <div className="w-48 h-56 flex items-center justify-center text-gray-400 border-2 border-dashed rounded-md">Sin imagen nueva</div>
                          )}
                        </div>
                        <div className="flex items-center justify-center">
                          {editValidating ? (
                            <p className="text-sm text-gray-500 mt-2">Validando imagen...</p>
                          ) : editValidated ? (
                            <p className="text-sm text-green-600 mt-2">Radiografía de tórax válida</p>
                          ) : editValidationError ? (
                            <p className="text-sm text-red-600 mt-2">{editValidationError}</p>
                          ) : null}
                        </div>
                      </div>

                      <div className="flex justify-end gap-3 mt-6">
                        <button onClick={() => setModal({ open: true, title: 'Confirmar', message: '¿Cancelar? Se perderán los cambios no guardados.', onConfirm: () => { closeEditModal(); }, confirmText: 'Cancelar', cancelText: 'Volver' })} className="px-4 py-2 border border-gray-200 rounded-md bg-white text-gray-700 hover:bg-gray-50">Cancelar</button>
                        <button onClick={handleEditSubmit} disabled={editLoading} className="px-4 py-2 bg-teal-600 text-white rounded-md shadow hover:bg-teal-700 inline-flex items-center">
                          {editLoading ? (
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>
                          ) : null}
                          {editLoading ? 'Guardando...' : 'Guardar cambios'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

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

            
          </div>
        </div>
      </div>
      <AlertModal
        open={modal.open}
        title={modal.title}
        message={modal.message}
        onClose={() => setModal({ open: false, title: "", message: "", onConfirm: undefined })}
        onConfirm={modal.onConfirm}
        secondaryAction={modal.secondaryAction}
        confirmText={modal.confirmText}
        cancelText={modal.cancelText}
      />
      {floatingTooltip && createPortal(
        <div
          style={{
            position: 'fixed',
            top: `${floatingTooltip.rect.top - 36}px`,
            left: `${floatingTooltip.rect.left + floatingTooltip.rect.width / 2}px`,
            transform: 'translateX(-50%)',
            zIndex: 99999,
            pointerEvents: 'none',
          }}
          className="bg-gray-800 text-white text-xs rounded px-2 py-1 shadow-lg whitespace-nowrap"
        >
          {floatingTooltip.text}
        </div>,
        document.body,
      )}
      {imageModalOpen && imageModalData && (
        <div className="fixed inset-0 z-60 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black opacity-60" onClick={() => { setImageModalOpen(false); setImageModalData(null); }} />
          <div className="relative z-10 w-full max-w-3xl mx-auto transform transition-all duration-200 ease-out scale-100">
            <div className="bg-white rounded-xl shadow-2xl overflow-hidden">
              <div className="bg-gradient-to-r from-teal-50 to-white p-4 border-b">
                <div className="relative">
                  <div className="flex items-center justify-center">
                    <div className="text-center">
                      <h3 className="text-lg font-semibold text-gray-800">Radiografía</h3>
                      <p className="text-xs text-gray-500">Detalles de la predicción seleccionada</p>
                    </div>
                  </div>
                  <button onClick={() => { setImageModalOpen(false); setImageModalData(null); }} className="absolute right-3 top-3 p-2 rounded-md text-gray-500 hover:bg-gray-100">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                <div className="md:col-span-2 flex items-center justify-center">
                  {imageModalData.ruta_imagen ? (
                    <img src={`http://localhost:5000/${imageModalData.ruta_imagen}`} alt={`Pred ${imageModalData.id_pred}`} className="max-h-[70vh] w-full object-contain rounded-md" />
                  ) : (
                    <div className="w-full h-80 bg-gray-100 rounded-md flex items-center justify-center text-gray-400">Sin imagen</div>
                  )}
                </div>
                <div className="md:col-span-1">
                  <div className="text-sm mb-3 text-center">
                    <strong>Porcentaje:</strong>
                    <span className={`ml-2 inline-flex items-center px-2 py-1 text-xs font-medium rounded ${imageModalData.porcentaje === null || typeof imageModalData.porcentaje === 'undefined' ? 'bg-yellow-100 text-yellow-800' : (Number(imageModalData.porcentaje) >= 50 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800')}`}>
                      {imageModalData.porcentaje === null || typeof imageModalData.porcentaje === 'undefined' ? 'Pendiente' : `${Number(imageModalData.porcentaje).toFixed(2)}%`}
                    </span>
                  </div>
                  <div className="text-sm text-gray-700 mb-4 text-center"><strong>Fecha:</strong> {imageModalData.fecha_pred || imageModalData.fecha_registro || '-'}</div>
                  <div className="flex flex-col sm:flex-row gap-2 mt-2 justify-center">
                    {imageModalData.ruta_imagen ? (
                      <a href={`http://localhost:5000/${imageModalData.ruta_imagen}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-md text-sm text-gray-700 hover:bg-gray-50">
                        <Download className="w-4 h-4" />
                        Abrir / Descargar
                      </a>
                    ) : null}
                    <button onClick={() => { setImageModalOpen(false); setImageModalData(null); }} className="px-3 py-2 bg-teal-600 text-white rounded-md">Cerrar</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

export default Pacientes;
