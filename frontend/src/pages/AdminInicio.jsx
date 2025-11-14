import Layout from "../components/Layouts";
import { useEffect, useState } from "react";
import axios from "axios";
import { Users, UserCheck, UserPlus, Activity } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

export default function AdminInicio() {
  const [stats, setStats] = useState({
    totalUsuarios: 0,
    medicos: 0,
    administradores: 0,
    pacientes: 0,
    analisisPendientes: 0,
    analisisAnalizados: 0,
    usuariosRoles: [],
    recientesPacientes: [],
  });

  const fetchData = async () => {
    try {
      const [uRes, pRes] = await Promise.all([
        axios.get('http://localhost:5000/api/usuarios'),
        axios.get('http://localhost:5000/api/pacientes'),
      ]);

      const usuarios = Array.isArray(uRes.data) ? uRes.data.map(u => ({
        id: u.id_usuario ?? u.id,
        usuario: u.usuario ?? u.username ?? u.user ?? '-',
        rol: (u.rol || '').toLowerCase(),
        nombre: (u.nombres && u.apellidos) ? `${u.nombres} ${u.apellidos}` : (u.nombre || u.nombreCompleto || u.displayName || u.usuario || u.username || '-'),
        fechaRegistro: u.fecha_registro ?? u.fecha_creacion ?? u.created_at ?? null
      })) : [];

      const pacientes = Array.isArray(pRes.data) ? pRes.data.map(p => ({
        id: p.id_paciente,
        nombreCompleto: `${p.nombres} ${p.apellidos}`,
        porcentaje: p.porcentaje,
        fechaRegistro: p.fecha_registro,
      })) : [];

      const totalUsuarios = usuarios.length;
      const medicos = usuarios.filter(u => u.rol === 'medico').length;
      const administradores = usuarios.filter(u => u.rol === 'administrador').length;

      const analisisAnalizados = pacientes.filter(p => p.porcentaje !== null && typeof p.porcentaje !== 'undefined').length;
      const analisisPendientes = pacientes.length - analisisAnalizados;

      // usuarios por rol para el pie
      const roleCounts = usuarios.reduce((acc, u) => {
        const r = u.rol || 'otro';
        acc[r] = (acc[r] || 0) + 1;
        return acc;
      }, {});
      const usuariosRoles = Object.keys(roleCounts).map(k => ({ name: k, value: roleCounts[k] }));

      // recientes: generar eventos tipo auditoría a partir de usuarios y pacientes
      const recentUsers = usuarios
        .filter(u => u.fechaRegistro)
        .map(u => ({
          date: new Date(u.fechaRegistro),
          text: `Cuenta creada: ${u.nombre}`,
          actor: u.usuario || u.nombre
        }));

      const recentPatients = pacientes
        .filter(p => p.fechaRegistro)
        .map(p => ({
          date: new Date(p.fechaRegistro),
          text: `Paciente registrado: ${p.nombreCompleto}`,
          actor: '-' 
        }));

      const eventos = [...recentUsers, ...recentPatients].sort((a,b) => b.date - a.date).slice(0,10);

      // últimos usuarios (lista para tarjeta lateral)
      const ultimosUsuarios = usuarios
        .filter(u => u.fechaRegistro)
        .sort((a,b) => new Date(b.fechaRegistro) - new Date(a.fechaRegistro))
        .slice(0,5);

      // métricas admin específicas
      const now = new Date();
      const days30 = new Date(now); days30.setDate(now.getDate() - 30);
      const newUsers30d = usuarios.filter(u => u.fechaRegistro && new Date(u.fechaRegistro) >= days30).length;
      const inactiveAccounts = usuarios.filter(u => (u.estado === false) || (u.estado === 'inactivo') || (u.estado === 'Inactivo')).length;

      setStats({ totalUsuarios, medicos, administradores, pacientes: pacientes.length, analisisPendientes, analisisAnalizados, usuariosRoles, eventos, newUsers30d, inactiveAccounts, ultimosUsuarios });
    } catch (err) {
      console.error('Error cargando datos admin:', err);
      // Silencioso: dejar valores en 0
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const COLORS = ['#0ea5a4', '#f97373', '#f59e0b', '#60a5fa', '#7c3aed'];

  return (
    <Layout title="Inicio (Administrador)">
      <div className="mx-auto max-w-7xl py-6 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="p-6 bg-white rounded-2xl shadow-md border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Usuarios registrados</p>
                <h3 className="text-2xl font-extrabold text-gray-900">{stats.totalUsuarios}</h3>
                <p className="text-xs text-gray-400 mt-1">Médicos: {stats.medicos} · Admin: {stats.administradores}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center ring-1 ring-gray-200">
                <Users className="w-6 h-6 text-teal-600" />
              </div>
            </div>
          </div>

          <div className="p-6 bg-white rounded-2xl shadow-md border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Usuarios nuevos (30 días)</p>
                <h3 className="text-2xl font-extrabold text-gray-900">{stats.newUsers30d ?? 0}</h3>
                <p className="text-xs text-gray-400 mt-1">Cuentas creadas en los últimos 30 días</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center ring-1 ring-gray-200">
                <UserPlus className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="p-6 bg-white rounded-2xl shadow-md border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Cuentas inactivas</p>
                <h3 className="text-2xl font-extrabold text-gray-900">{stats.inactiveAccounts ?? 0}</h3>
                <p className="text-xs text-gray-400 mt-1">Cuentas con estado inactivo</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center ring-1 ring-gray-200">
                <UserCheck className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="col-span-1 lg:col-span-1 space-y-6">
              <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100">
                <h4 className="text-lg font-semibold mb-4">Usuarios por rol</h4>
                {stats.usuariosRoles.length > 0 ? (
                  <div className="h-56 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={stats.usuariosRoles} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={30}>
                          {stats.usuariosRoles.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No hay datos de usuarios.</p>
                )}
              </div>

              <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100">
                <h4 className="text-lg font-semibold mb-4">Últimos usuarios</h4>
                {stats.ultimosUsuarios && stats.ultimosUsuarios.length > 0 ? (
                  <div className="space-y-3">
                    {stats.ultimosUsuarios.map((u, idx) => (
                      <div key={u.id ?? idx} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border">
                        <div>
                          <p className="font-semibold text-sm">{u.nombre || u.usuario}</p>
                          <p className="text-xs text-gray-500">{u.usuario}</p>
                        </div>
                        <div className="text-xs text-gray-500">{u.fechaRegistro ? new Date(u.fechaRegistro).toLocaleString() : '-'}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No se encontraron usuarios recientes.</p>
                )}
              </div>
            </div>

          <div className="col-span-1 lg:col-span-2 bg-white rounded-2xl shadow-md p-6 border border-gray-100">
            <h4 className="text-lg font-semibold mb-4">Registro de Auditoría (Recientes)</h4>
            {(!stats.eventos || stats.eventos.length === 0) ? (
              <div>
                <p className="text-sm text-gray-500">No se encontraron eventos recientes.</p>
                <p className="text-xs text-gray-400 mt-2">Nota: si su backend dispone de un endpoint de auditoría, puede integrarlo para mostrar eventos de login y acciones de usuario.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {stats.eventos.map((e, idx) => (
                  <div key={idx} className="flex items-start justify-between bg-gray-50 p-3 rounded-lg border">
                    <div>
                      <p className="font-semibold text-sm">{e.text}</p>
                      <p className="text-xs text-gray-500">Actor: {e.actor}</p>
                    </div>
                    <div className="text-xs text-gray-500">{e.date ? new Date(e.date).toLocaleString() : '-'}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
