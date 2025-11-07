import { useState, useEffect } from "react";
import Layout from "../components/Layouts";
import { Upload, Brain, CheckCircle, AlertCircle } from "lucide-react";
import AlertModal from "../components/AlertModal";

function AnalisisRadiografia() {
  const [imagen, setImagen] = useState(null);
  const [preview, setPreview] = useState(null);
  const [resultado, setResultado] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progreso, setProgreso] = useState(0);
  const [modal, setModal] = useState({ open: false, title: "", message: "" });

  const [pacientesEjemplo] = useState([
    {
      id: 1,
      nombre: "María López",
      dni: "72435689",
      confianza: "98.3%",
      imagen: "http://localhost:5000/uploads/tbc1.jpeg",
    },
    {
      id: 2,
      nombre: "Juan Pérez",
      dni: "70891234",
      confianza: "92.1%",
      imagen: "http://localhost:5000/uploads/tbc1.jpeg",
    },
    {
      id: 3,
      nombre: "Ana Torres",
      dni: "75218903",
      confianza: "87.5%",
      imagen: "http://localhost:5000/uploads/tbc1.jpeg",
    },
  ]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImagen(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleAnalizar = async () => {
    if (!imagen) return;

    setLoading(true);
    setResultado(null);
    setProgreso(0);

    
    const interval = setInterval(() => {
      setProgreso((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 10;
      });
    }, 200);

    try {
      await new Promise((resolve) => setTimeout(resolve, 2200));

      setResultado({
        confianza: "94.7%",
      });
    } catch (error) {
      setModal({ open: true, title: "Error", message: "Error al procesar la radiografía." });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelar = () => {
    setImagen(null);
    setPreview(null);
    setResultado(null);
    setProgreso(0);
  };

  return (
    <Layout title="Análisis de Radiografía">
      <div className="px-2 sm:px-4 py-2">
        
        <div className="mb-4">
          <h2 className="text-left font-bold text-gray-700">
            Radiografía para análisis automático
          </h2>
        </div>

        
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 sm:p-6 w-full mb-6">
          <div className="mb-6 pb-6 border-b border-white">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <span className="w-1 h-5 bg-teal-600 mr-3 rounded"></span>
              Análisis con modelo CNN
            </h3>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              <div>
                <label
                  htmlFor="imagen"
                  className="block text-sm font-medium text-gray-700 mb-2 text-left"
                >
                  Subir radiografía de tórax
                </label>
                <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-md p-6 hover:border-teal-500 transition">
                  <input
                    type="file"
                    id="imagen"
                    name="imagen"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                  <label
                    htmlFor="imagen"
                    className="flex flex-col items-center cursor-pointer"
                  >
                    <Upload className="w-8 h-8 text-gray-500 mb-2" />
                    <span className="text-gray-600 text-sm">
                      {imagen ? "Cambiar imagen" : "Seleccionar imagen"}
                    </span>
                  </label>
                </div>

              </div>

              
              <div className="flex items-center justify-center">
                {preview ? (
                  <img
                    src={preview}
                    alt="Radiografía cargada"
                    className="w-64 h-64 object-cover rounded-md shadow-md border border-gray-300"
                  />
                ) : (
                  <div className="w-64 h-64 flex items-center justify-center text-gray-400 border-2 border-dashed border-gray-300 rounded-md">
                    Sin imagen
                  </div>
                )}
              </div>
            </div>
          </div>

          
          {loading && (
            <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
              <div
                className="bg-teal-600 h-3 rounded-full transition-all duration-300"
                style={{ width: `${progreso}%` }}
              ></div>
            </div>
          )}

          
          {resultado && (
            <div className="mb-6 pb-6 border-b border-white">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <span className="w-1 h-5 bg-teal-600 mr-3 rounded"></span>
                Resultado del Análisis
              </h3>
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 flex items-start space-x-3">
                <div>
                  <p className="text-gray-800">
                    <strong>Confianza del modelo:</strong> {resultado.confianza}
                  </p>
                </div>
              </div>
            </div>
          )}

          
          <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-4 pt-4 border-t border-white">
            <button
              type="button"
              onClick={handleCancelar}
              disabled={loading}
              className="px-6 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleAnalizar}
              disabled={loading || !imagen}
              className="px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              {loading ? (
                <>
                  <Brain className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" />
                  Analizando...
                </>
              ) : (
                "Analizar Radiografía"
              )}
            </button>
          </div>
        </div>

        
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 sm:p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <span className="w-1 h-5 bg-teal-600 mr-3 rounded"></span>
            Pacientes analizados
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {pacientesEjemplo.map((p) => (
              <div
                key={p.id}
                className="bg-gray-50 border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition"
              >
                <div className="flex items-center justify-center mb-3">
                  <img
                    src={p.imagen}
                    alt={p.nombre}
                    className="w-32 h-32 object-cover rounded-md border border-gray-300"
                  />
                </div>
                <p className="text-gray-800 font-semibold text-center">{p.nombre}</p>
                <p className="text-sm text-gray-500 text-center">DNI: {p.dni}</p>
                <p className="text-sm text-gray-500 text-center">
                  Confianza: {p.confianza}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
      <AlertModal open={modal.open} title={modal.title} message={modal.message} onClose={() => setModal({ open: false, title: "", message: "" })} />
    </Layout>
  );
}

export default AnalisisRadiografia;
