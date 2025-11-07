import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import './index.css'
import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Pacientes from './pages/Pacientes.jsx'
import RegistroPaciente from './pages/RegistroPaciente.jsx'
import AnalisisRadiografia from './pages/AnalisisRadiografia.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/pacientes" element={<Pacientes />} />
        <Route path="/registropaciente" element={<RegistroPaciente />} />
        <Route path="/analisisradiografia" element={<AnalisisRadiografia />} />
      </Routes>
    </Router>
  </StrictMode>,
)