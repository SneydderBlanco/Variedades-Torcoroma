import React, { useState, useEffect } from 'react';
import { Printer, Trash2, Calendar, DollarSign, CreditCard, Wallet, X, AlertCircle, Check, Download, FileText } from 'lucide-react';
import { exportToExcel, exportToPDF } from '../utils/exportUtils';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export default function FacturacionPanel({ userRole = 'ADMIN', initialTab, initialDate }) {
  const [fecha, setFecha] = useState(() => {
    if (initialDate) return initialDate;
    // Inicializar con la fecha de hoy local en formato YYYY-MM-DD
    const offset = -5; // America/Bogota
    const d = new Date(new Date().getTime() + offset * 3600 * 1000);
    return d.toISOString().split('T')[0];
  });

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [historialData, setHistorialData] = useState({
    totales: { efectivo: 0, transferencia: 0, tarjeta: 0, total: 0 },
    ventas: []
  });

  // Pestaña activa: 'LOCAL' o 'DIAN'
  const [activeTab, setActiveTab] = useState('LOCAL');

  // Modal de reimpresión de tirilla
  const [selectedVenta, setSelectedVenta] = useState(null);

  // Cargar historial de ventas
  const cargarHistorial = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const url = activeTab === 'DIAN'
        ? `${API_URL}/api/pos/ventas/historial?dianPendientes=true`
        : `${API_URL}/api/pos/ventas/historial?fecha=${fecha}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setHistorialData(data);
      } else {
        throw new Error('Error al obtener el historial de ventas.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('No se pudo establecer conexión para leer el historial.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarHistorial();
  }, [fecha, activeTab]);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  useEffect(() => {
    if (initialDate) {
      setFecha(initialDate);
    }
  }, [initialDate]);

  // Forzar fecha a hoy para roles no administrativos (auditoría del día actual)
  useEffect(() => {
    if (userRole !== 'ADMIN') {
      const offset = -5; // America/Bogota
      const d = new Date(new Date().getTime() + offset * 3600 * 1000);
      setFecha(d.toISOString().split('T')[0]);
    }
  }, [userRole]);

  // Anular venta
  const handleAnularVenta = async (venta) => {
    if (userRole !== 'ADMIN') {
      alert('Solo el administrador (Chris) puede anular ventas.');
      return;
    }

    const confirmar = window.confirm(
      `¿ESTÁS SEGURO DE ANULAR LA VENTA ${venta.ticket_numero}?\n\nEsta acción:\n1. Devolverá los calzados al stock físico.\n2. Borrará el registro financiero.\n\nEsta acción no se puede deshacer.`
    );
    if (!confirmar) return;

    try {
      const res = await fetch(`${API_URL}/api/pos/ventas/anular/${venta.id_venta}`, {
        method: 'POST'
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessMsg(`Venta ${venta.ticket_numero} anulada. El stock fue devuelto.`);
        cargarHistorial();
        setTimeout(() => setSuccessMsg(''), 4000);
      } else {
        alert(data.error || 'Error al anular la venta.');
      }
    } catch (err) {
      console.error(err);
      alert('Error de red al intentar anular la venta.');
    }
  };

  // Confirmar que la factura electrónica DIAN fue emitida manualmente
  const handleConfirmarDianEmitido = async (venta) => {
    if (userRole !== 'ADMIN') {
      alert('Solo el administrador (Chris) puede cambiar el estado DIAN.');
      return;
    }

    const confirmar = window.confirm(
      `¿Confirmas que has emitido manualmente la Factura Electrónica en el sistema de la DIAN para el ticket ${venta.ticket_numero}?`
    );
    if (!confirmar) return;

    try {
      const res = await fetch(`${API_URL}/api/pos/ventas/estado-dian/${venta.id_venta}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ estado_dian: 'EMITIDO' })
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessMsg(`Estado DIAN del ticket ${venta.ticket_numero} actualizado a EMITIDO.`);
        cargarHistorial();
        setTimeout(() => setSuccessMsg(''), 4000);
      } else {
        alert(data.error || 'Error al actualizar el estado DIAN.');
      }
    } catch (err) {
      console.error(err);
      alert('Error de red al intentar actualizar el estado DIAN.');
    }
  };

  const getMetodoPagoBadge = (metodo) => {
    const baseClass = "px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border select-none inline-block";
    switch (metodo.toUpperCase()) {
      case 'EFECTIVO':
        return <span className={`${baseClass} bg-emerald-50 text-emerald-800 border-emerald-200`}>💵 EFECTIVO</span>;
      case 'TRANSFERENCIA':
        return <span className={`${baseClass} bg-blue-50 text-blue-800 border-blue-200`}>📲 TRANSFERENCIA</span>;
      case 'TARJETA':
        return <span className={`${baseClass} bg-purple-50 text-purple-800 border-purple-200`}>💳 TARJETA</span>;
      default:
        return <span className={`${baseClass} bg-gray-50 text-gray-800 border-gray-200`}>{metodo}</span>;
    }
  };

  // Filtrar ventas en el cliente según la pestaña activa
  const ventasFiltradas = activeTab === 'DIAN'
    ? historialData.ventas.filter(v => v.requiere_dian === true && v.estado_dian === 'PENDIENTE')
    : historialData.ventas;

  const exportColumns = [
    { header: 'Fecha', accessor: (v) => new Date(v.fecha_venta).toLocaleString('es-CO') },
    { header: 'Ticket', accessor: 'ticket_numero' },
    { header: 'Vendedor', accessor: 'vendedor' },
    { header: 'Método Pago', accessor: 'metodo_pago' },
    { header: 'Total Venta', accessor: (v) => `$${v.total_venta.toLocaleString('es-CO')}` },
    { header: 'Descuentos', accessor: (v) => v.detalles.reduce((sum, det) => sum + Number(det.descuento_aplicado), 0) },
    { header: 'Detalles', accessor: (v) => v.detalles.map(d => `${d.cantidad}x ${d.modelo_nombre} (${d.color} T${d.talla})`).join(', ') }
  ];

  const handleExportExcel = () => {
    exportToExcel(ventasFiltradas, exportColumns, `Ventas_${fecha}`);
  };

  const handleExportPDF = () => {
    exportToPDF(ventasFiltradas, exportColumns, `Ventas_${fecha}`, `Reporte de Ventas - ${fecha}`);
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100 flex flex-col h-full">
      {/* Cabecera, Tabs y Selector de Fecha */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 border-b border-gray-100 pb-4">
        <div>
          <h2 className="text-xl font-bold text-torcoroma-dark">Facturación y Caja</h2>
          <p className="text-sm text-gray-500 mt-0.5">Auditoría de ventas, cuadre de caja diario y control de facturas DIAN.</p>
        </div>

        {/* Tabs de Selección de Pestaña y Selector de Fecha */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 self-stretch lg:self-auto">
          {/* Tabs con los colores de la marca */}
          <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200 self-start sm:self-auto flex-nowrap whitespace-nowrap">
            <button
              type="button"
              onClick={() => setActiveTab('LOCAL')}
              className={`px-4 py-2 rounded-lg text-xs font-black transition-all cursor-pointer select-none active:scale-95 ${
                activeTab === 'LOCAL'
                  ? 'bg-torcoroma-gold text-torcoroma-dark shadow-sm'
                  : 'bg-transparent text-gray-500 hover:text-torcoroma-dark'
              }`}
            >
              VENTAS LOCAL
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('DIAN')}
              className={`px-4 py-2 rounded-lg text-xs font-black transition-all cursor-pointer select-none active:scale-95 ${
                activeTab === 'DIAN'
                  ? 'bg-torcoroma-gold text-torcoroma-dark shadow-sm'
                  : 'bg-transparent text-gray-500 hover:text-torcoroma-dark'
              }`}
            >
              TRÁMITES DIAN
            </button>
          </div>

          {/* Filtro por fecha */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <Calendar className="w-4 h-4 text-gray-400" />
            <input
              type="date"
              value={fecha}
              disabled={userRole !== 'ADMIN'}
              onChange={(e) => setFecha(e.target.value)}
              className={`border border-gray-300 rounded-xl px-3 py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-torcoroma-gold focus:border-torcoroma-gold text-gray-700 bg-white shadow-sm uppercase ${
                userRole !== 'ADMIN' ? 'opacity-70 cursor-not-allowed bg-gray-50' : 'cursor-pointer'
              }`}
            />
            <button onClick={handleExportExcel} className="flex items-center gap-1.5 px-3 py-2 bg-green-50 text-green-700 hover:bg-green-100 font-bold rounded-xl transition-colors text-xs border border-green-200" title="Exportar Excel">
              <Download className="w-4 h-4" /> Excel
            </button>
            <button onClick={handleExportPDF} className="flex items-center gap-1.5 px-3 py-2 bg-red-50 text-red-700 hover:bg-red-100 font-bold rounded-xl transition-colors text-xs border border-red-200" title="Exportar PDF">
              <FileText className="w-4 h-4" /> PDF
            </button>
          </div>
        </div>
      </div>

      {/* Alertas */}
      {successMsg && (
        <div className="bg-emerald-50 text-emerald-800 rounded-xl p-3.5 border border-emerald-100 text-sm font-bold mb-4 flex items-center gap-2">
          <span>✓</span>
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="bg-red-50 text-red-800 rounded-xl p-3.5 border border-red-100 text-sm font-semibold mb-4 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          {errorMsg}
        </div>
      )}

      {/* Resumen de Caja del Día (Tarjetas de Cuadre) - Solo se muestra en la pestaña "VENTAS LOCAL" */}
      {activeTab === 'LOCAL' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Tarjeta Efectivo */}
          <div className="bg-[#f3f3f3] border border-gray-200 rounded-2xl p-4 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-emerald-100 text-emerald-800 rounded-xl">
              <Wallet className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block">Total Efectivo</span>
              <span className="text-lg font-black text-gray-900 font-mono">
                ${historialData.totales.efectivo.toLocaleString('es-CO')}
              </span>
            </div>
          </div>

          {/* Tarjeta Transferencia */}
          <div className="bg-[#f3f3f3] border border-gray-200 rounded-2xl p-4 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-blue-100 text-blue-800 rounded-xl">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block">Total Transferencias</span>
              <span className="text-lg font-black text-gray-900 font-mono">
                ${historialData.totales.transferencia.toLocaleString('es-CO')}
              </span>
            </div>
          </div>

          {/* Tarjeta Tarjeta */}
          <div className="bg-[#f3f3f3] border border-gray-200 rounded-2xl p-4 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-purple-100 text-purple-800 rounded-xl">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block">Total Tarjetas</span>
              <span className="text-lg font-black text-gray-900 font-mono">
                ${historialData.totales.tarjeta.toLocaleString('es-CO')}
              </span>
            </div>
          </div>

          {/* Tarjeta Total Neto */}
          <div className="bg-[#ffd535] border border-[#e5bf2f] rounded-2xl p-4 shadow-md flex items-center gap-4">
            <div className="p-3 bg-white/30 text-torcoroma-dark rounded-xl">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-extrabold text-yellow-950 uppercase tracking-wider block">Total Neto del Día</span>
              <span className="text-xl font-black text-torcoroma-dark font-mono">
                ${historialData.totales.total.toLocaleString('es-CO')}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Tabla del Historial de Ventas o Trámites DIAN */}
      {loading && ventasFiltradas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-500 gap-3">
          <RefreshCw className="animate-spin w-8 h-8 text-torcoroma-gold" />
          <span className="font-medium">Cargando ventas...</span>
        </div>
      ) : ventasFiltradas.length === 0 ? (
        <div className="text-center py-20 text-gray-455 italic text-xs border border-dashed border-gray-200 rounded-xl bg-gray-50/50">
          {activeTab === 'DIAN'
            ? '✓ No hay trámites DIAN pendientes en el historial.'
            : 'No hay ventas registradas el día seleccionado.'}
        </div>
      ) : (
        <div className="flex-grow overflow-x-auto rounded-xl border border-gray-250">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-gray-100 text-torcoroma-dark font-extrabold border-b border-gray-200 text-left">
                <th className="p-3 w-28">HORA / TICKET</th>
                <th className="p-3">PRODUCTOS VENDIDOS</th>
                <th className="p-3 w-36">MÉTODO DE PAGO</th>
                <th className="p-3 w-44">DESCUENTO / ALERTA</th>
                <th className="p-3 w-32 text-right">TOTAL COBRADO</th>
                <th className="p-3 w-28 text-center">ACCIONES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-150">
              {ventasFiltradas.map((venta) => {
                // Calcular descuento total
                const totalDescuento = venta.detalles.reduce((sum, det) => sum + Number(det.descuento_aplicado), 0);
                const isSelected = selectedVenta?.id_venta === venta.id_venta;
                
                return (
                  <tr 
                    key={venta.id_venta} 
                    onClick={() => setSelectedVenta(venta)}
                    className={`cursor-pointer transition select-none ${
                      isSelected ? 'bg-yellow-50/80 hover:bg-yellow-55/90 font-medium' : 'hover:bg-gray-50/40'
                    }`}
                  >
                    {/* Hora / Ticket */}
                    <td className="p-3 font-mono text-xs">
                      <span className="font-bold text-gray-900 block">
                        {new Date(venta.fecha_venta).toLocaleTimeString('es-CO', {
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true
                        })}
                      </span>
                      <span className="text-[10px] text-gray-400 block font-semibold mt-0.5">{venta.ticket_numero}</span>
                    </td>

                    {/* Productos */}
                    <td className="p-3 text-xs">
                      <div className="mb-1">
                        {venta.detalles.some(d => d.cantidad < 0) ? (
                          <span className="bg-orange-100 text-orange-800 text-[9px] font-black px-1.5 py-0.5 rounded shadow-sm border border-orange-200">CAMBIO</span>
                        ) : (
                          <span className="bg-emerald-100 text-emerald-800 text-[9px] font-black px-1.5 py-0.5 rounded shadow-sm border border-emerald-200">VENTA</span>
                        )}
                      </div>
                      <ul className="space-y-1">
                        {venta.detalles.filter(d => d.cantidad > 0).map((det) => (
                          <li key={det.id_detalle} className="text-gray-800 font-medium">
                            <span className="font-extrabold text-torcoroma-dark mr-1">{det.cantidad}x</span> 
                            {det.modelo_nombre} 
                            <span className="text-[10px] text-gray-500 font-bold ml-1.5 bg-gray-100 px-1 py-0.5 rounded shadow-sm">
                              {det.color} • T{det.talla}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </td>

                    {/* Método de pago */}
                    <td className="p-3">
                      {getMetodoPagoBadge(venta.metodo_pago)}
                    </td>

                    {/* Descuento / Alerta */}
                    <td className="p-3 text-xs">
                      {totalDescuento > 0 ? (
                        <span className="bg-yellow-50 text-yellow-900 border border-yellow-250 px-2 py-0.5 rounded font-extrabold text-[10px] tracking-tight uppercase shadow-inner block w-fit">
                          Margen Ajustado: -${totalDescuento.toLocaleString('es-CO')}
                        </span>
                      ) : (
                        <span className="text-gray-400 italic font-medium">Precio full</span>
                      )}
                    </td>

                    {/* Total cobrado */}
                    <td className="p-3 text-right font-black font-mono text-gray-900">
                      <div>${venta.total_venta.toLocaleString('es-CO')}</div>
                      {venta.requiere_dian && (
                        <div className="mt-1">
                          {venta.estado_dian === 'PENDIENTE' ? (
                            <span 
                              className="px-2 py-0.5 rounded text-[9px] font-black uppercase border select-none inline-block shadow-sm"
                              style={{ backgroundColor: '#F5C227', borderColor: '#dcb023', color: '#451a03' }}
                            >
                              DIAN PENDIENTE
                            </span>
                          ) : (
                            <span 
                              className="px-2 py-0.5 rounded text-[9px] font-black uppercase border select-none inline-block bg-emerald-50 text-emerald-800 border-emerald-200 shadow-sm"
                            >
                              DIAN EMITIDO
                            </span>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Acciones */}
                    <td className="p-3 flex items-center justify-center gap-1.5">
                      {userRole === 'ADMIN' && venta.requiere_dian && venta.estado_dian === 'PENDIENTE' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleConfirmarDianEmitido(venta);
                          }}
                          className="p-2 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-xl transition cursor-pointer flex items-center justify-center shadow-sm border border-emerald-100 bg-white active:scale-95"
                          title="Confirmar Emisión DIAN"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedVenta(venta);
                        }}
                        className="p-2 text-gray-500 hover:text-torcoroma-dark hover:bg-gray-100 rounded-xl transition cursor-pointer flex items-center justify-center shadow-sm border border-gray-200 bg-white active:scale-95"
                        title="Reimprimir tirilla"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>
                      {userRole === 'ADMIN' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAnularVenta(venta);
                          }}
                          className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl transition cursor-pointer flex items-center justify-center shadow-sm border border-red-100 bg-white active:scale-95"
                          title="Anular venta"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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

      {/* MODAL: Tirilla Térmica Digital */}
      {selectedVenta && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className={`bg-white rounded-2xl shadow-2xl relative flex flex-col justify-between max-h-[95vh] overflow-hidden transition-all duration-300 ${
            selectedVenta.requiere_dian ? 'max-w-4xl w-full' : 'max-w-sm w-full'
          }`}>
            <div className="bg-torcoroma-dark text-white p-4 flex items-center justify-between rounded-t-2xl flex-shrink-0">
              <h3 className="font-extrabold text-sm tracking-wider uppercase">
                {selectedVenta.requiere_dian ? 'Tirilla de Venta y Datos DIAN' : 'Tirilla Térmica POS'}
              </h3>
              <button 
                onClick={() => setSelectedVenta(null)}
                className="text-gray-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            {/* Cuerpo de la Tirilla (Scrollable y papel térmico) */}
            <div className="p-6 overflow-y-auto bg-gray-50 flex-grow font-mono text-xs select-none">
              <div className={`grid gap-6 ${selectedVenta.requiere_dian ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
                
                {/* COLUMNA 1: Tirilla de Venta estándar */}
                <div className="relative border border-gray-200/80 rounded-xl p-5 bg-gradient-to-b from-[#FCFBF9] to-[#F5F3EB] text-gray-800 shadow-md flex flex-col justify-between">
                  <div>
                    {/* Cabecera del negocio */}
                    <div className="text-center border-b border-dashed border-gray-300 pb-3 mb-3">
                      <h4 className="font-extrabold text-sm tracking-wider text-torcoroma-dark font-sans">
                        VARIEDADES TORCOROMA
                      </h4>
                      <p className="text-[10px] text-gray-500 font-sans font-medium">Nit: 13.456.789-0</p>
                      <p className="text-[10px] text-gray-500 font-sans leading-tight mt-0.5">Calle 10 # 5-20, Centro - Cúcuta</p>
                      <div className="mt-3 space-y-0.5 border-t border-gray-200/50 pt-1.5 text-[10px] text-gray-500 font-sans">
                        <p className="flex justify-between">
                          <span>N° Ticket:</span>
                          <span className="font-bold text-gray-700">{selectedVenta.ticket_numero}</span>
                        </p>
                        <p className="flex justify-between">
                          <span>Fecha:</span>
                          <span className="text-gray-700">
                            {new Date(selectedVenta.fecha_venta).toLocaleString('es-CO', {
                              year: 'numeric',
                              month: 'numeric',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: true
                            })}
                          </span>
                        </p>
                        <p className="flex justify-between">
                          <span>Vendedor:</span>
                          <span className="font-bold text-gray-700">{selectedVenta.vendedor}</span>
                        </p>
                      </div>
                    </div>

                    {/* Listado de Productos */}
                    <div className="space-y-3 border-b border-dashed border-gray-300 pb-3">
                      {selectedVenta.detalles.some(d => d.cantidad < 0) && (
                        <div className="text-center font-black text-orange-600 bg-orange-50 border-y border-orange-200 py-1 text-[10px] uppercase tracking-widest mb-2">
                          *** TICKET DE CAMBIO ***
                        </div>
                      )}
                      
                      {/* Productos Llevados */}
                      {selectedVenta.detalles.filter(d => d.cantidad > 0).length > 0 && (
                        <div className="mb-2">
                          {selectedVenta.detalles.some(d => d.cantidad < 0) && (
                            <div className="text-[10px] font-bold text-gray-400 uppercase mb-1">Entregado al cliente:</div>
                          )}
                          {selectedVenta.detalles.filter(d => d.cantidad > 0).map((det) => (
                            <div key={det.id_detalle} className="flex flex-col gap-0.5 mb-1.5">
                              <div className="font-sans font-extrabold text-gray-900 uppercase text-[11px] leading-tight">
                                {det.modelo_nombre}
                              </div>
                              <div className="flex justify-between text-[10px] text-gray-500">
                                <span>
                                  {det.color} • T{det.talla}
                                </span>
                                <span>
                                  {det.cantidad} x ${det.precio_venta_unitario.toLocaleString('es-CO')}
                                </span>
                              </div>
                              {det.descuento_aplicado > 0 && (
                                <div className="text-[9px] text-red-600 font-bold font-sans">
                                  Margen Ajustado: -${Number(det.descuento_aplicado).toLocaleString('es-CO')}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Productos Devueltos */}
                      {selectedVenta.detalles.filter(d => d.cantidad < 0).length > 0 && (
                        <div className="mt-2 pt-2 border-t border-dashed border-gray-200">
                          <div className="text-[10px] font-bold text-orange-500 uppercase mb-1">Recibido por el local (Devolución):</div>
                          {selectedVenta.detalles.filter(d => d.cantidad < 0).map((det) => (
                            <div key={det.id_detalle} className="flex flex-col gap-0.5 mb-1.5">
                              <div className="font-sans font-bold text-gray-600 uppercase text-[10px] leading-tight line-through opacity-70">
                                {det.modelo_nombre}
                              </div>
                              <div className="flex justify-between text-[10px] text-gray-500 opacity-70">
                                <span>
                                  {det.color} • T{det.talla}
                                </span>
                                <span>
                                  {Math.abs(det.cantidad)} x -${det.precio_venta_unitario.toLocaleString('es-CO')}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Totales */}
                    <div className="pt-3 space-y-1.5 text-right text-[11px]">
                      <div className="flex justify-between text-gray-500 font-sans font-medium">
                        <span>Método de Pago:</span>
                        <span className="font-bold text-torcoroma-dark">{selectedVenta.metodo_pago}</span>
                      </div>
                      <div className="flex justify-between text-xs font-bold bg-torcoroma-gold/10 border border-torcoroma-gold/20 rounded-lg p-2 text-torcoroma-dark font-sans shadow-inner items-center">
                        <span>TOTAL COBRADO:</span>
                        <span className="text-sm font-black font-mono text-gray-900">
                          ${selectedVenta.total_venta.toLocaleString('es-CO')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Barcode estético */}
                  <div className="mt-5 flex flex-col items-center opacity-70">
                    <svg className="w-36 h-6" viewBox="0 0 100 20" preserveAspectRatio="none">
                      <rect x="0" width="2.5" height="20" fill="#374151" />
                      <rect x="4" width="1" height="20" fill="#374151" />
                      <rect x="6" width="3.5" height="20" fill="#374151" />
                      <rect x="11" width="1.5" height="20" fill="#374151" />
                      <rect x="14" width="2" height="20" fill="#374151" />
                      <rect x="17" width="4" height="20" fill="#374151" />
                      <rect x="22.5" width="1" height="20" fill="#374151" />
                      <rect x="25" width="3" height="20" fill="#374151" />
                      <rect x="29" width="2.5" height="20" fill="#374151" />
                      <rect x="32.5" width="1" height="20" fill="#374151" />
                      <rect x="35" width="4.5" height="20" fill="#374151" />
                      <rect x="41" width="2" height="20" fill="#374151" />
                      <rect x="44" width="1" height="20" fill="#374151" />
                      <rect x="46" width="3.5" height="20" fill="#374151" />
                      <rect x="51" width="2.5" height="20" fill="#374151" />
                      <rect x="54.5" width="1" height="20" fill="#374151" />
                      <rect x="57" width="4" height="20" fill="#374151" />
                      <rect x="62.5" width="2" height="20" fill="#374151" />
                      <rect x="65.5" width="1" height="20" fill="#374151" />
                      <rect x="68" width="3.5" height="20" fill="#374151" />
                      <rect x="73" width="2" height="20" fill="#374151" />
                      <rect x="76" width="1" height="20" fill="#374151" />
                      <rect x="78" width="4" height="20" fill="#374151" />
                      <rect x="83.5" width="2.5" height="20" fill="#374151" />
                      <rect x="87" width="1" height="20" fill="#374151" />
                      <rect x="89" width="3" height="20" fill="#374151" />
                      <rect x="93" width="2.5" height="20" fill="#374151" />
                      <rect x="97" width="1" height="20" fill="#374151" />
                      <rect x="99" width="1" height="20" fill="#374151" />
                    </svg>
                    <span className="text-[8px] text-gray-500 tracking-[0.25em] mt-1 font-mono">*{selectedVenta.ticket_numero}*</span>
                  </div>
                </div>

                {/* COLUMNA 2: Tirilla de Datos DIAN (Solo si requiere_dian) */}
                {selectedVenta.requiere_dian && (
                  <div className="relative border border-gray-200/80 rounded-xl p-5 bg-gradient-to-b from-[#FCFBF9] to-[#F5F3EB] text-gray-800 shadow-md font-sans flex flex-col justify-between">
                    <div>
                      {/* Cabecera DIAN */}
                      <div className="text-center border-b border-dashed border-gray-300 pb-3 mb-4">
                        <h4 className="font-extrabold text-xs tracking-wider text-torcoroma-dark">
                          INFORMACIÓN CLIENTE (DIAN)
                        </h4>
                        <p className="text-[9px] text-gray-500 font-medium">Detalles registrados para Factura Electrónica</p>
                        <div className="mt-2.5 text-[10px] text-gray-500 font-sans border-t border-gray-200/50 pt-1.5 flex justify-between">
                          <span>Estado de Emisión:</span>
                          <span className={`font-black uppercase text-[10px] ${
                            selectedVenta.estado_dian === 'PENDIENTE' ? 'text-amber-600 animate-pulse' : 'text-emerald-600'
                          }`}>
                            {selectedVenta.estado_dian === 'PENDIENTE' ? '⚠️ PENDIENTE' : '✓ EMITIDO'}
                          </span>
                        </div>
                      </div>

                      {/* Detalles del Cliente */}
                      <div className="space-y-2.5 text-xs text-gray-700">
                        <div className="flex flex-col border-b border-gray-200/60 pb-1.5">
                          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wide">Nombre o Razón Social</span>
                          <span className="font-extrabold text-torcoroma-dark uppercase mt-0.5 break-words">
                            {selectedVenta.cliente_dian?.nombre_completo || 'No registrado'}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3 border-b border-gray-200/60 pb-1.5">
                          <div className="flex flex-col">
                            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wide">Tipo Documento</span>
                            <span className="font-extrabold text-torcoroma-dark mt-0.5">
                              {selectedVenta.cliente_dian?.tipo_documento || 'No registrado'}
                            </span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wide">Identificación</span>
                            <span className="font-extrabold text-torcoroma-dark mt-0.5">
                              {selectedVenta.cliente_dian?.numero_documento || 'No registrado'}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 border-b border-gray-200/60 pb-1.5">
                          <div className="flex flex-col">
                            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wide">Tipo Persona</span>
                            <span className="font-extrabold text-torcoroma-dark mt-0.5">
                              {selectedVenta.cliente_dian?.tipo_persona || 'No registrado'}
                            </span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wide">Teléfono</span>
                            <span className="font-extrabold text-torcoroma-dark mt-0.5">
                              {selectedVenta.cliente_dian?.telefono || 'No registrado'}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-col border-b border-gray-200/60 pb-1.5">
                          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wide">Correo Electrónico</span>
                          <span className="font-bold text-gray-800 mt-0.5 break-all">
                            {selectedVenta.cliente_dian?.correo || 'No registrado'}
                          </span>
                        </div>

                        <div className="flex flex-col pb-1">
                          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wide">Dirección</span>
                          <span className="font-bold text-gray-800 mt-0.5 uppercase break-words leading-tight">
                            {selectedVenta.cliente_dian?.direccion || 'No registrado'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Nota aclaratoria */}
                    <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-xl text-[10px] text-yellow-900 leading-relaxed font-sans shadow-inner">
                      📌 <strong>Nota:</strong> Estos datos se guardan para permitir la emisión manual de la Factura Electrónica en el portal DIAN posteriormente.
                    </div>
                  </div>
                )}
                
              </div>
            </div>
            
            {/* Botón de Reimprimir de la Tirilla */}
            <div className="p-4 border-t border-gray-150 flex gap-2 rounded-b-2xl bg-gray-50 flex-shrink-0">
              <button
                onClick={() => {
                  window.print();
                }}
                className="flex-grow bg-torcoroma-dark hover:bg-slate-800 text-white font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-1.5 text-xs shadow-md cursor-pointer transition active:scale-[0.98]"
              >
                <Printer className="w-4 h-4" /> Reimprimir Tirilla
              </button>
              <button
                onClick={() => setSelectedVenta(null)}
                className="bg-white border border-gray-300 text-gray-500 font-bold py-2.5 px-4 rounded-xl hover:bg-gray-100 transition text-xs cursor-pointer active:scale-[0.98]"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Inline refresh animation helper
function RefreshCw({ className }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 8H18.5" />
    </svg>
  );
}
