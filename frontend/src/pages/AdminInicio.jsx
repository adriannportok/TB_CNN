import Layout from "../components/Layouts";

export default function AdminInicio() {
  return (
    <Layout title="Inicio (Administrador)">
      <div className="mx-auto max-w-4xl py-12 px-6">
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Bienvenido Administrador</h2>
          <p className="text-gray-600">Accede a las opciones de configuración desde el menú.</p>
        </div>
      </div>
    </Layout>
  );
}
