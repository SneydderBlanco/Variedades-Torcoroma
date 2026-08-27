import React, { useState, useEffect } from 'react';
import { Calendar, Wallet, AlertCircle, Check, X, Trash2, ChevronDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export default function GastosPanel() {
  const { user } = useAuth();
  const isAdmin = user?.rol === 'ADMIN';
  const [fecha, setFecha] = useState(() => {
    // Inicializar con la fecha de hoy local en formato YYYY-MM-DD
    const offset = -5; // America/Bogota
    const d = new Date(new Date().getTime() + offset * 3600 * 1000);
    return d.toISOString().split('T')[0];
  });

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [gastosList, setGastosList] = useState([]);
  const [gastoConcepto, setGastoConcepto] = useState('');
  const [gastoMonto, setGastoMonto] = useState('');

  // Estados para edición
  const [editingGastoId, setEditingGastoId] = useState(null);
  const [editConcepto, setEditConcepto] = useState('');
  const [editMonto, setEditMonto] = useState('');

  // Cargar lista de gastos
  const cargarGastos = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch(`${API_URL}/api/gastos/hoy?fecha=${fecha}`);
      if (res.ok) {
        const data = await res.json();
        setGastosList(data);
      } else {
        throw new Error('Error al obtener la lista de gastos.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('No se pudo establecer conexión para leer los gastos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarGastos();
  }, [fecha]);

  // Forzar fecha a hoy para roles no administrativos
  useEffect(() => {
    if (!isAdmin) {
      const offset = -5; // America/Bogota
      const d = new Date(new Date().getTime() + offset * 3600 * 1000);
      setFecha(d.toISOString().split('T')[0]);
    }
  }, [isAdmin]);

  // Manejar cambio de monto con máscara de miles colombiana (COP)
  const handleMontoChange = (e) => {
    const rawValue = e.target.value.replace(/\D/g, ''); // Remover caracteres no numéricos
    if (rawValue === '') {
      setGastoMonto('');
      return;
    }
    const numericValue = parseInt(rawValue, 10);
    setGastoMonto(numericValue.toLocaleString('es-CO'));
  };

  // Registrar nuevo gasto
  const handleSubmitGasto = async (e) => {
    e.preventDefault();
    if (!gastoConcepto.trim() || !gastoMonto) {
      alert('Por favor, ingresa el concepto y el monto del gasto.');
      return;
    }

    const cleanMonto = Number(gastoMonto.toString().replace(/\./g, ''));
    if (isNaN(cleanMonto) || cleanMonto <= 0) {
      alert('El monto debe ser mayor a 0.');
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/gastos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          concepto: gastoConcepto.trim(),
          monto: cleanMonto
        })
      });

      const data = await res.json();
      if (res.ok) {
        setGastoConcepto('');
        setGastoMonto('');
        setSuccessMsg('Gasto registrado exitosamente en la base de datos.');
        cargarGastos();
        setTimeout(() => setSuccessMsg(''), 4000);
      } else {
        alert(data.error || 'Error al registrar el egreso.');
      }
    } catch (err) {
      console.error(err);
      alert('Error de red al registrar el gasto.');
    }
  };

  // Guardar cambios del gasto editado
  const handleSaveEdit = async (id_gasto) => {
    if (!editConcepto.trim() || !editMonto) {
      alert('Por favor, ingresa el concepto y el monto del gasto.');
      return;
    }

    const cleanMonto = Number(editMonto.toString().replace(/\./g, ''));
    if (isNaN(cleanMonto) || cleanMonto <= 0) {
      alert('El monto debe ser mayor a 0.');
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/gastos/${id_gasto}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          concepto: editConcepto.trim(),
          monto: cleanMonto
        })
      });

      const data = await res.json();
      if (res.ok) {
        setSuccessMsg('Gasto actualizado exitosamente.');
        setEditingGastoId(null);
        cargarGastos();
        setTimeout(() => setSuccessMsg(''), 4000);
      } else {
        alert(data.error || 'Error al actualizar el gasto.');
      }
    } catch (err) {
      console.error(err);
      alert('Error de red al actualizar el gasto.');
    }
  };

  // Eliminar un gasto
  const handleDeleteGasto = async (gasto) => {
    const confirmar = window.confirm(
      `¿ESTÁS SEGURO DE ELIMINAR EL GASTO: "${gasto.concepto}" por $${gasto.monto.toLocaleString('es-CO')}?`
    );
    if (!confirmar) return;

    try {
      const res = await fetch(`${API_URL}/api/gastos/${gasto.id_gasto}`, {
        method: 'DELETE'
      });

      const data = await res.json();
      if (res.ok) {
        setSuccessMsg('Gasto eliminado exitosamente.');
        setEditingGastoId(null);
        cargarGastos();
        setTimeout(() => setSuccessMsg(''), 4000);
      } else {
        alert(data.error || 'Error al eliminar el gasto.');
      }
    } catch (err) {
      console.error(err);
      alert('Error de red al intentar eliminar el gasto.');
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100 flex flex-col h-full space-y-6">
      {/* Cabecera y Selector de Fecha */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-gray-100 pb-4">
        <div>
          <h2 className="text-xl font-bold text-torcoroma-dark">Registro de gastos</h2>
          <p className="text-sm text-gray-500 mt-0.5">Control diario de salidas de dinero de la caja registradora principal.</p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Calendar className="w-4 h-4 text-gray-400" />
          <input
            type="date"
            value={fecha}
            disabled={!isAdmin}
            onChange={(e) => setFecha(e.target.value)}
            className={`border border-gray-300 rounded-xl px-3 py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-[#F5C227] focus:border-[#F5C227] text-gray-700 bg-white shadow-sm uppercase ${
              !isAdmin ? 'opacity-70 cursor-not-allowed bg-gray-50' : 'cursor-pointer'
            }`}
          />
        </div>
      </div>

      {/* Alertas */}
      {successMsg && (
        <div className="bg-emerald-50 text-emerald-800 rounded-xl p-3.5 border border-emerald-100 text-sm font-bold flex items-center gap-2">
          <span>✓</span>
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="bg-red-50 text-red-800 rounded-xl p-3.5 border border-red-100 text-sm font-semibold flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          {errorMsg}
        </div>
      )}

      {/* Formulario de Registro de Gasto */}
      <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 shadow-xs">
        <h3 className="text-xs font-black text-torcoroma-dark uppercase tracking-wider mb-3 flex items-center gap-2">
          REGISTRAR GASTO
        </h3>
        <form onSubmit={handleSubmitGasto} className="flex flex-col sm:flex-row items-end gap-4">
          <div className="flex-grow space-y-1.5 w-full">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Concepto del Gasto</label>
            <input
              type="text"
              required
              placeholder="Ej: Almuerzo personal, Útiles de aseo, Bolsa de empaque..."
              value={gastoConcepto}
              onChange={(e) => setGastoConcepto(e.target.value)}
              className="w-full border border-gray-350 rounded-xl px-4 py-2.5 text-sm font-semibold outline-none focus:ring-2 focus:ring-[#F5C227] focus:border-[#F5C227] text-gray-800 bg-white"
            />
          </div>

          <div className="w-full sm:w-64 space-y-1.5">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Monto ($ COP)</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-extrabold text-sm">$</span>
              <input
                type="text"
                required
                placeholder="0"
                value={gastoMonto}
                onChange={handleMontoChange}
                className="w-full border border-gray-350 rounded-xl pl-8 pr-4 py-2.5 text-sm font-black text-red-700 font-mono outline-none focus:ring-2 focus:ring-[#F5C227] focus:border-[#F5C227] bg-white"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full sm:w-auto bg-[#F5C227] hover:bg-[#e0b01c] active:scale-98 transition text-torcoroma-dark font-black text-xs uppercase px-6 py-3.5 rounded-xl border border-[#e5bf2f] shadow-md flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap self-stretch sm:self-auto"
          >
            Registrar Gasto
          </button>
        </form>
      </div>

      {/* Tabla de Gastos de Hoy */}
      <div className="flex-grow flex flex-col min-h-[250px]">
        <div className="mb-3">
          <h3 className="text-xs font-black text-torcoroma-dark uppercase tracking-wider flex items-center gap-2">
            EGRESOS DEL DÍA ({fecha})
          </h3>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-450 font-semibold text-xs">
            Cargando gastos...
          </div>
        ) : gastosList.length === 0 ? (
          <div className="text-center py-12 text-gray-400 italic text-xs border border-dashed border-gray-200 rounded-xl bg-gray-50/50 flex-grow flex items-center justify-center">
            No se han registrado egresos o gastos para el día seleccionado.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white flex-grow">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-gray-50 text-torcoroma-dark font-extrabold border-b border-gray-200 text-left">
                  <th className="p-3 w-28">Hora</th>
                  <th className="p-3">Contenido</th>
                  <th className="p-3 w-36 text-right">Monto</th>
                  <th className="p-3 w-28 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-150">
                {gastosList.map((gasto) => {
                  const timeStr = new Date(gasto.fecha).toLocaleTimeString('es-CO', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: true
                  });
                  const isEditing = editingGastoId === gasto.id_gasto;
                  
                  return (
                    <tr key={gasto.id_gasto} className={`transition font-semibold text-gray-800 ${isEditing ? 'bg-amber-50/40' : 'hover:bg-gray-50/55'}`}>
                      {/* Hora */}
                      <td className="p-3 font-mono text-gray-400 text-xs align-middle">{timeStr}</td>
                      
                      {/* Contenido */}
                      <td className="p-3 align-middle">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editConcepto}
                            onChange={(e) => setEditConcepto(e.target.value)}
                            className="w-full border border-gray-300 rounded-xl px-3 py-1.5 text-xs font-semibold outline-none focus:ring-2 focus:ring-[#F5C227] focus:border-[#F5C227] text-gray-850 bg-white"
                          />
                        ) : (
                          <span className="uppercase">{gasto.concepto}</span>
                        )}
                      </td>
                      
                      {/* Monto */}
                      <td className="p-3 align-middle text-right">
                        {isEditing ? (
                          <div className="relative w-full max-w-[150px] ml-auto">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-extrabold text-xs">$</span>
                            <input
                              type="text"
                              value={editMonto}
                              onChange={(e) => {
                                const rawValue = e.target.value.replace(/\D/g, '');
                                if (rawValue === '') {
                                  setEditMonto('');
                                  return;
                                }
                                setEditMonto(parseInt(rawValue, 10).toLocaleString('es-CO'));
                              }}
                              className="w-full border border-gray-300 rounded-xl pl-6 pr-3 py-1.5 text-xs font-black text-red-700 font-mono text-right outline-none focus:ring-2 focus:ring-[#F5C227] focus:border-[#F5C227] bg-white"
                            />
                          </div>
                        ) : (
                          <span className="font-black font-mono text-red-650">
                            -${gasto.monto.toLocaleString('es-CO')}
                          </span>
                        )}
                      </td>
                      
                      {/* Acciones */}
                      <td className="p-3 align-middle text-center w-28">
                        {isEditing ? (
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleSaveEdit(gasto.id_gasto)}
                              title="Guardar"
                              className="p-1.5 bg-emerald-100 hover:bg-emerald-250 text-emerald-800 rounded-lg transition cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingGastoId(null)}
                              title="Cancelar"
                              className="p-1.5 bg-gray-100 hover:bg-gray-250 text-gray-650 rounded-lg transition cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                            {isAdmin && (
                              <button
                                type="button"
                                onClick={() => handleDeleteGasto(gasto)}
                                title="Eliminar"
                                className="p-1.5 bg-red-50 hover:bg-red-150 text-red-650 rounded-lg transition cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingGastoId(gasto.id_gasto);
                              setEditConcepto(gasto.concepto);
                              setEditMonto(gasto.monto.toLocaleString('es-CO'));
                            }}
                            title="Editar o Eliminar"
                            className="p-1.5 hover:bg-gray-100 text-gray-400 hover:text-[#F5C227] rounded-lg transition cursor-pointer animate-none"
                          >
                            <ChevronDown className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
