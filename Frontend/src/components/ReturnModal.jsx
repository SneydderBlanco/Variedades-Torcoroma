import React, { useState } from 'react';
import { Search, X, CheckCircle, RefreshCw, Banknote, PackageOpen } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export default function ReturnModal({ onClose, onLocalExchange }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  
  const [processing, setProcessing] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const handleSearch = async () => {
    if (!searchTerm.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/pos/ventas/buscar?q=${encodeURIComponent(searchTerm)}`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data);
      }
    } catch (err) {
      console.error('Error searching:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefundCash = async (ticket, detalle) => {
    if (!window.confirm(`¿Estás seguro de devolver $${detalle.precio_venta_unitario.toLocaleString('es-CO')} en efectivo al cliente y reingresar el zapato al inventario?`)) {
      return;
    }
    
    setProcessing(true);
    try {
      const res = await fetch(`${API_URL}/api/pos/ventas/devolucion-dinero`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticket_numero: ticket.ticket_numero,
          id_variante: detalle.id_variante,
          cantidad: 1, // Siempre asumimos devolución de 1 par por simplicidad en esta fase
          monto: detalle.precio_venta_unitario,
          vendedor: 'CAJERO_ACTUAL', // TODO: Obtener del contexto
          modelo_nombre: detalle.modelo_nombre,
          color: detalle.color,
          talla: detalle.talla
        })
      });

      if (res.ok) {
        setSuccessMsg(`Devolución exitosa. Retira $${detalle.precio_venta_unitario.toLocaleString('es-CO')} de la caja.`);
        setTimeout(() => onClose(), 4000);
      } else {
        alert('Error al procesar la devolución de dinero.');
      }
    } catch (err) {
      console.error('Error refunding:', err);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b border-gray-100 bg-gray-50">
          <h2 className="text-xl font-black text-torcoroma-dark flex items-center gap-2">
            <RefreshCw className="text-torcoroma-gold w-6 h-6" />
            Gestión de Devoluciones
          </h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition">
            <X className="w-6 h-6" />
          </button>
        </div>

        {successMsg ? (
          <div className="p-10 flex flex-col items-center justify-center text-center">
            <CheckCircle className="w-20 h-20 text-green-500 mb-4 animate-bounce" />
            <h3 className="text-2xl font-bold text-gray-800 mb-2">¡Listo!</h3>
            <p className="text-lg text-gray-600">{successMsg}</p>
          </div>
        ) : (
          <div className="p-6 overflow-y-auto flex-grow flex flex-col">
            
            {/* Buscador */}
            <div className="mb-6">
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Buscar Factura o Zapato vendido:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Ej: TKT-1234, Adidas, Blanco, 38..."
                  className="flex-grow px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-torcoroma-gold outline-none text-torcoroma-dark font-semibold"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
                <button
                  onClick={handleSearch}
                  disabled={loading}
                  className="px-6 py-3 bg-torcoroma-dark text-torcoroma-gold rounded-xl font-bold hover:bg-black transition flex items-center gap-2"
                >
                  <Search className="w-5 h-5" />
                  {loading ? 'Buscando...' : 'Buscar'}
                </button>
              </div>
            </div>

            {/* Resultados */}
            {!selectedTicket ? (
              <div className="flex-grow">
                {searchResults.length === 0 && !loading && searchTerm && (
                  <div className="text-center p-8 text-gray-500 border-2 border-dashed border-gray-200 rounded-xl">
                    No se encontraron ventas que coincidan con la búsqueda.
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {searchResults.map((venta) => (
                    <div key={venta.id_venta} className="border border-gray-200 rounded-xl p-4 hover:border-torcoroma-gold transition cursor-pointer bg-white shadow-sm"
                         onClick={() => setSelectedTicket(venta)}>
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-bold text-torcoroma-dark">{venta.ticket_numero}</span>
                        <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-1 rounded-md">
                          {new Date(venta.fecha_venta).toLocaleDateString('es-CO')}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        Cliente: <span className="font-semibold">{venta.cliente_nombre || 'Consumidor Final'}</span>
                      </p>
                      <div className="flex flex-col gap-1">
                        {venta.detalles.map(d => (
                          <div key={d.id_detalle} className="text-xs flex justify-between bg-gray-50 p-1.5 rounded border border-gray-100">
                            <span>{d.cantidad}x {d.modelo_nombre} ({d.color} - {d.talla})</span>
                            <span className="font-bold">${d.precio_venta_unitario.toLocaleString('es-CO')}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              /* Detalle del Ticket Seleccionado */
              <div className="flex flex-col flex-grow">
                <button 
                  onClick={() => setSelectedTicket(null)}
                  className="self-start text-sm font-bold text-gray-500 hover:text-torcoroma-dark mb-4 flex items-center gap-1"
                >
                  ← Volver a resultados
                </button>
                
                <h3 className="text-lg font-bold text-torcoroma-dark mb-4">
                  Selecciona el artículo a devolver del {selectedTicket.ticket_numero}
                </h3>

                <div className="flex flex-col gap-3">
                  {selectedTicket.detalles.map(detalle => (
                    <div key={detalle.id_detalle} className="border border-gray-200 rounded-xl p-5 bg-white shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
                      <div className="flex-grow">
                        <h4 className="font-black text-torcoroma-dark text-lg uppercase">{detalle.modelo_nombre}</h4>
                        <p className="text-sm text-gray-500 font-semibold mb-2">
                          Color: {detalle.color} | Talla: {detalle.talla} | Cantidad: {detalle.cantidad}
                        </p>
                        <p className="text-torcoroma-gold font-black text-xl">
                          ${detalle.precio_venta_unitario.toLocaleString('es-CO')}
                        </p>
                      </div>

                      <div className="flex flex-col gap-2 w-full md:w-auto">
                        {/* BOTÓN: Cambio Local */}
                        <button
                          disabled={processing}
                          onClick={() => {
                            onLocalExchange({
                              id_modelo: null, // No lo tenemos directo pero no afecta si tenemos id_variante
                              id_variante: detalle.id_variante,
                              nombre: detalle.modelo_nombre,
                              color: detalle.color,
                              talla: detalle.talla,
                              precio: detalle.precio_venta_unitario, // Precio real (InvoiceTicket lo procesará en negativo por isReturn)
                              precio_minimo_venta: detalle.precio_venta_unitario,
                              cantidad: -1, // Negativo
                              stockDisponible: 9999, // Bypass stock
                              isReturn: true,
                              ticket_original: selectedTicket.ticket_numero
                            });
                            onClose();
                          }}
                          className="px-4 py-3 bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white border border-blue-200 rounded-xl font-bold transition flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                        >
                          <RefreshCw className="w-4 h-4" />
                          Cambio Local
                        </button>
                        
                        {/* BOTÓN: Devolución Dinero */}
                        <button
                          disabled={processing}
                          onClick={() => handleRefundCash(selectedTicket, detalle)}
                          className="px-4 py-3 bg-red-50 text-red-700 hover:bg-red-600 hover:text-white border border-red-200 rounded-xl font-bold transition flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                        >
                          <Banknote className="w-4 h-4" />
                          Devolver Dinero
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
