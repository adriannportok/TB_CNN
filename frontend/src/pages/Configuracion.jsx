import Layout from "../components/Layouts";

export default function Configuracion() {
  return (
    <Layout title="Configuración">
      <div className="mx-auto max-w-4xl py-8 px-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-2">Configuración</h2>
          <p className="text-sm text-gray-600">Aquí puedes ajustar las opciones del sistema.</p>
        </div>
      </div>
    </Layout>
  );
}
