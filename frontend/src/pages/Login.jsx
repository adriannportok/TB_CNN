import { useState } from 'react';
import fondo from "../assets/perfecta.jpg";
import logo from "../assets/userdoc.svg";
import '../styles/Login.css'

function Login() {
  const [formData, setFormData] = useState({
    usuario: '',
    clave: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('http://localhost:5000/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (data.success) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('usuario', formData.usuario);
        localStorage.setItem('id_usuario', data.id_usuario);
        localStorage.setItem('rol', data.rol);
        localStorage.setItem('nombres', data.nombres);
        localStorage.setItem('apellidos', data.apellidos);
        // Redirect según rol
        const rol = (data.rol || '').toString().toLowerCase();
        if (rol === 'administrador' || rol === 'admin') {
          window.location.href = '/admin';
        } else {
          window.location.href = '/dashboard';
        }
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Error de conexión con el servidor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div
        className="flex min-h-screen flex-col justify-center px-6 py-12 lg:px-8 bg-cover bg-center"
        style={{ backgroundImage: `url(${fondo})` }}
      >
        <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm bg-white/80 p-6 rounded-xl shadow-lg">
          <img 
            src={logo}
            alt="Your Company" 
            className="mx-auto h-25 w-auto" 
          />
          <h2 className="mb-10 text-center text-2xl font-bold tracking-tight text-gray-900">
            TB-CNN
          </h2>
          
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="usuario" className="block text-sm font-medium text-gray-900 text-left">
                Usuario
              </label>
              <div className="mt-2">
                <input 
                  id="usuario" 
                  type="text" 
                  name="usuario" 
                  value={formData.usuario}
                  onChange={handleChange}
                  required 
                  autoComplete="username" 
                  className="block w-full rounded-md bg-white px-3 py-1.5 text-base 
                            text-gray-900 outline-1 outline-gray-300 
                            placeholder:text-gray-400 focus:outline-2 
                            focus:outline-teal-600 sm:text-sm" 
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="clave" className="block text-sm font-medium text-gray-900">
                  Contraseña
                </label>
              </div>
              <div className="mt-2">
                <input 
                  id="clave" 
                  type="password" 
                  name="clave" 
                  value={formData.clave}
                  onChange={handleChange}
                  required 
                  autoComplete="current-password" 
                  className="block w-full rounded-md bg-white px-3 py-1.5 text-base 
                            text-gray-900 outline-1 outline-gray-300 
                            placeholder:text-gray-400 focus:outline-2 
                            focus:outline-teal-600 sm:text-sm" 
                />
              </div>
            </div>

            <div>
              <button 
                type="submit" 
                disabled={loading}
                className="flex w-full justify-center rounded-md bg-teal-600 
                          px-3 py-1.5 text-sm font-semibold text-white shadow 
                          hover:bg-teal-500 disabled:opacity-50
                          focus-visible:outline-2 focus-visible:outline-offset-2 
                          focus-visible:outline-teal-600"
              >
                {loading ? 'Verificando...' : 'Ingresar'}
              </button>
            </div>
          </form>

          <p className="mt-10 text-center text-sm text-gray-500">
            ¿Olvidaste tu contraseña?{" "}
            <a href="#" className="font-semibold text-teal-600 hover:text-teal-500">
              Contactar al soporte
            </a>
          </p>
        </div>
      </div>
    </>
  )
}

export default Login