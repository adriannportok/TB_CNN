
  /*
    Función de utilidad comentada: exportar CSV de análisis (pendientes o realizados).
    Descomentar para usar en la UI (se añadió botón comentado arriba).
  */
  /*
  const exportAnalisisCSV = (tipo = 'pendientes') => {
    try {
      const list = tipo === 'pendientes' ? pacientesPendientes : pacientesAnalizados;
      if (!list || list.length === 0) {
        openModal({ title: 'Atención', message: 'No hay elementos para exportar.' });
        return;
      }
      const headers = ['id_pred', 'paciente', 'dni', 'fecha_registro', 'estado', 'porcentaje'];
      const rows = list.map(item => [
        item.id_pred,
        `"${(item.nombres || '') + ' ' + (item.apellidos || '')}"`,
        item.dni || '',
        item.fecha_registro || '',
        (item.porcentaje === null || typeof item.porcentaje === 'undefined') ? 'Pendiente' : 'Analizado',
        item.porcentaje ?? ''
      ].join(','));
      const csv = [headers.join(','), ...rows].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analisis_${tipo}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      openModal({ title: 'Error', message: 'Error al exportar CSV.' });
    }
  };
  */

                {/*
                  Bloques de reporte comentados: descomenta para usar en demo.
                  - Exportar CSV de pendientes/realizados
                  - Entrada de búsqueda/filtrado rápido
                */}

                {/*
                <button
                  onClick={() => {
                    // exportAnalisisCSV('pendientes');
                  }}
                  className="ml-2 px-3 py-1 bg-indigo-600 text-white rounded-md text-sm"
                >
                  Exportar CSV
                </button>

                <input
                  type="text"
                  placeholder="Buscar por nombre/DNI (descomentar)"
                  // onChange={(e) => setFiltroBusqueda(e.target.value)}
                  className="ml-2 px-3 py-1 border border-gray-300 rounded-md text-sm hidden sm:block"
                />
                */}

