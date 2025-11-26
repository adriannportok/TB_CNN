import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layouts";
import axios from "axios";
import AlertModal from "../components/AlertModal";

function RegistroPaciente() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    nombre: "",
    apellido: "",
    fechaNacimiento: "",
    genero: "",
    dni: "",
    imagen: null,
  });

  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState({ open: false, title: "", message: "" });

  const handleChange = (e) => {
    const { name, value } = e.target;
    let newValue = value;

    
    if (name === 'nombre' || name === 'apellido') {
      newValue = newValue.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ\s'\-]/g, '');
    }

    if (name === 'dni') {
      newValue = newValue.replace(/\D/g, '');
      if (newValue.length > 8) newValue = newValue.slice(0, 8);
    }

    setFormData((prev) => ({
      ...prev,
      [name]: newValue,
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData((prev) => ({ ...prev, imagen: file }));
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleRegister = async () => {
    setLoading(true);
    try {
      
      if (
        !formData.nombre ||
        !formData.apellido ||
        !formData.dni ||
        !formData.fechaNacimiento ||
        !formData.genero ||
        !formData.imagen
      ) {
        setModal({ open: true, title: "Validación", message: "Por favor complete todos los campos obligatorios, incluyendo la imagen." });
        return;
      }

      const nameRegex = /^[A-Za-zÀ-ÖØ-öø-ÿ\s'\-]+$/;
      if (!nameRegex.test(formData.nombre) || !nameRegex.test(formData.apellido)) {
        setModal({ open: true, title: "Validación", message: "Los nombres y apellidos solo pueden contener letras, espacios, guiones o apóstrofes." });
        return;
      }

      if (!/^\d{1,8}$/.test(formData.dni)) {
        setModal({ open: true, title: "Validación", message: "El DNI debe contener solo números y como máximo 8 dígitos." });
        return;
      }

      const id_usuario = localStorage.getItem("id_usuario");
      const usuario = localStorage.getItem("usuario");

      if (!id_usuario || !usuario) {
        setModal({ open: true, title: "Sesión", message: "No hay sesión activa." });
        navigate("/");
        return;
      }

      const formDataToSend = new FormData();
      formDataToSend.append("id_usuario", id_usuario);
      formDataToSend.append("nombre", formData.nombre);
      formDataToSend.append("apellido", formData.apellido);
      formDataToSend.append("dni", formData.dni);
      formDataToSend.append("fechaNacimiento", formData.fechaNacimiento);
      formDataToSend.append("genero", formData.genero);
      formDataToSend.append("imagen", formData.imagen);
      formDataToSend.append("usuario", usuario);

      const response = await axios.post(
        "http://localhost:5000/api/pacientes",
        formDataToSend,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (response.status === 201) {
        setModal({ open: true, title: "Éxito", message: "Paciente registrado exitosamente." });
        const timer = setTimeout(() => {
          navigate("/pacientes");
        }, 800);
      }
    } catch (error) {
      if (error.response?.data?.error) {
        setModal({ open: true, title: "Error", message: `Error: ${error.response.data.error}` });
      } else {
        setModal({ open: true, title: "Error", message: "Error al registrar el paciente." });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setModal({ open: true, title: 'Confirmar', message: '¿Estás seguro de que quieres cancelar? Se perderán los datos no guardados.', onConfirm: () => { navigate('/pacientes'); } });
  };

  const closeModal = () => setModal({ open: false, title: "", message: "" });

  return (
    <Layout title="Registro de Paciente">
      <div className="px-2 sm:px-4 py-2">
        <div className="mb-4">
      <h2 className="text-left font-bold text-gray-700">
        Ingresar los datos del nuevo paciente
          </h2>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 sm:p-6 w-full">
          <div className="mb-6 pb-6 border-b border-white">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <span className="w-1 h-5 bg-teal-600 mr-3 rounded"></span>
              Información Personal
            </h3>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="nombre"
                    className="block text-sm font-medium text-gray-700 mb-2 text-left"
                  >
                    Nombres
                  </label>
                  <input
                    type="text"
                    id="nombre"
                    name="nombre"
                    value={formData.nombre}
                    onChange={handleChange}
                    required
                    placeholder="Ingrese el nombre"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label
                    htmlFor="apellido"
                    className="block text-sm font-medium text-gray-700 mb-2 text-left"
                  >
                    Apellidos
                  </label>
                  <input
                    type="text"
                    id="apellido"
                    name="apellido"
                    value={formData.apellido}
                    onChange={handleChange}
                    required
                    placeholder="Ingrese el apellido"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
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
                    value={formData.dni}
                    onChange={handleChange}
                    inputMode="numeric"
                    maxLength={8}
                    required
                    placeholder="Número de documento"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label
                    htmlFor="fechaNacimiento"
                    className="block text-sm font-medium text-gray-700 mb-2 text-left"
                  >
                    Fecha de Nacimiento
                  </label>
                  <input
                    type="date"
                    id="fechaNacimiento"
                    name="fechaNacimiento"
                    value={formData.fechaNacimiento}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label
                    htmlFor="imagen"
                    className="block text-sm font-medium text-gray-700 mb-2 text-left"
                  >
                    Radiografía de tórax
                  </label>
                  <input
                    type="file"
                    id="imagen"
                    name="imagen"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="w-full border border-gray-300 p-2 rounded-md cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 text-left">
                    Género
                  </label>
                  <div className="flex items-center space-x-6 mt-3">
                    <label className="flex items-center space-x-2">
                      <input
                        type="radio"
                        name="genero"
                        value="M"
                        checked={formData.genero === "M"}
                        onChange={handleChange}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-gray-700">M</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="radio"
                        name="genero"
                        value="F"
                        checked={formData.genero === "F"}
                        onChange={handleChange}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-gray-700">F</span>
                    </label>
                  </div>
                </div>
              </div>

              
              <div className="flex items-center justify-center">
                {preview ? (
                  <img
                    src={preview}
                    alt="Vista previa del paciente"
                    className="w-48 h-56 object-cover rounded-md shadow-md border border-gray-300"
                  />
                ) : (
                  <div className="w-48 h-56 flex items-center justify-center text-gray-400 border-2 border-dashed border-gray-300 rounded-md">
                    Sin imagen
                  </div>
                )}
              </div>
            </div>
          </div>

          
          <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-4 pt-4 border-t border-white">
            <button
              type="button"
              onClick={handleCancel}
              disabled={loading}
              className="px-6 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleRegister}
              disabled={loading}
              className="px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 flex items-center"
            >
              {loading ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Registrando...
                </>
              ) : (
                "Registrar Paciente"
              )}
            </button>
          </div>
        </div>
      </div>
  <AlertModal open={modal.open} title={modal.title} message={modal.message} onClose={() => setModal({ open: false, title: "", message: "", onConfirm: undefined })} onConfirm={modal.onConfirm} confirmText={modal.confirmText} cancelText={modal.cancelText} />
    </Layout>
  );
}

export default RegistroPaciente;
