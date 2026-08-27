import React, { useState, useEffect } from 'react';
import { 
  RefreshCw, Search, Download, FileText, 
  ArrowDownRight, ArrowUpRight, ArrowRightLeft, 
  Settings2, ChevronLeft, ChevronRight, Clock, User 
} from 'lucide-react';
import { exportToExcel, exportToPDF } from '../utils/exportUtils';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export default function KardexPanel() {
  const [kardex, setKardex] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 12;

  // Fechas por defecto: últimos 7 días
  const [fechaInicio, setFechaInicio] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  
  const [fechaFin, setFechaFin] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  const loadKardex = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/pos/kardex?fechaInicio=${fechaInicio}&fechaFin=${fechaFin}`);
      if (res.ok) {
        const data = await res.json();
        setKardex(data);
      }
    } catch (err) {
      console.error('Error fetching kardex:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadKardex();
  }, [fechaInicio, fechaFin]);

  // Si cambia la búsqueda, regresamos a la página 1
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, fechaInicio, fechaFin]);

  const filteredKardex = kardex.filter(item => 
    item.modelo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.color.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.talla.includes(searchTerm) ||
    item.tipo_movimiento.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Lógica de paginación
  const totalPages = Math.ceil(filteredKardex.length / ITEMS_PER_PAGE) || 1;
  const currentItems = filteredKardex.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const exportColumns = [
    { header: 'Fecha', accessor: (item) => new Date(item.fecha).toLocaleString('es-CO') },
    { header: 'Usuario', accessor: 'usuario' },
    { header: 'Movimiento', accessor: 'tipo_movimiento' },
    { header: 'Modelo', accessor: 'modelo' },
    { header: 'Color', accessor: 'color' },
    { header: 'Talla', accessor: 'talla' },
    { header: 'Cantidad', accessor: 'cantidad' },
    { header: 'Ubicación', accessor: 'ubicacion' },
    { header: 'Detalle', accessor: 'detalle' }
  ];

  const handleExportExcel = () => {
    exportToExcel(filteredKardex, exportColumns, 'Kardex_Inventario');
  };

  const handleExportPDF = () => {
    exportToPDF(filteredKardex, exportColumns, 'Kardex_Inventario', 'Reporte Kardex');
  };

  // Función para dar estilo al tipo de movimiento
  const getMovementConfig = (tipo) => {
    switch (tipo) {
      case 'VENTA':
        return { icon: ArrowDownRight, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', label: 'Venta (Salida)' };
      case 'CAMBIO_DEVOLUCION':
        return { icon: ArrowUpRight, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', label: 'Devolución (Entrada)' };
      case 'TRASLADO':
        return { icon: ArrowRightLeft, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200', label: 'Traslado' };
      case 'AJUSTE':
        return { icon: Settings2, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', label: 'Ajuste Manual' };
      case 'COMPRA':
        return { icon: ArrowUpRight, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', label: 'Compra (Entrada)' };
      default:
        return { icon: FileText, color: 'text-gray-600', bg: 'bg-gray-50', border: 'border-gray-200', label: tipo };
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h3 className="text-xl font-black text-torcoroma-dark">Historial de Movimientos</h3>
          <p className="text-sm text-gray-500 font-medium">Registro detallado de entradas y salidas del inventario</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={handleExportExcel} className="flex items-center gap-1.5 px-3 py-2 bg-green-50 text-green-700 hover:bg-green-600 hover:text-white font-bold rounded-xl transition-all text-sm border border-green-200">
            <Download className="w-4 h-4" /> Excel
          </button>
          <button onClick={handleExportPDF} className="flex items-center gap-1.5 px-3 py-2 bg-red-50 text-red-700 hover:bg-red-600 hover:text-white font-bold rounded-xl transition-all text-sm border border-red-200">
            <FileText className="w-4 h-4" /> PDF
          </button>
          <button onClick={loadKardex} className="flex items-center justify-center p-2.5 bg-gray-50 border border-gray-200 text-gray-600 rounded-xl hover:bg-torcoroma-gold hover:text-white hover:border-torcoroma-gold transition-all shadow-sm">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="flex flex-col xl:flex-row gap-4 mb-6">
        {/* Buscador */}
        <div className="relative flex-grow">
          <input
            type="text"
            placeholder="Buscar por modelo, color o ticket..."
            className="w-full pl-11 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-torcoroma-gold/50 focus:bg-white outline-none text-sm transition-all font-medium text-torcoroma-dark"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Search className="absolute left-4 top-3 text-gray-400 w-4 h-4" />
        </div>
        
        {/* Filtros de Fecha */}
        <div className="flex items-center gap-2 text-sm bg-gray-50 border border-gray-200 p-1.5 rounded-xl flex-shrink-0">
          <span className="text-gray-500 font-bold pl-3 pr-1">Desde:</span>
          <input 
            type="date" 
            value={fechaInicio} 
            onChange={(e) => setFechaInicio(e.target.value)}
            className="border border-gray-200 bg-white rounded-lg px-2.5 py-1.5 outline-none text-gray-700 shadow-sm focus:border-torcoroma-gold font-medium"
          />
          <span className="text-gray-500 font-bold pl-2 pr-1">Hasta:</span>
          <input 
            type="date" 
            value={fechaFin} 
            onChange={(e) => setFechaFin(e.target.value)}
            className="border border-gray-200 bg-white rounded-lg px-2.5 py-1.5 outline-none text-gray-700 shadow-sm focus:border-torcoroma-gold font-medium"
          />
        </div>
      </div>

      <div className="flex-grow flex flex-col min-h-0">
        <div className="overflow-y-auto pr-2 custom-scrollbar space-y-3 pb-4">
          {currentItems.map((mov) => {
            const config = getMovementConfig(mov.tipo_movimiento);
            const Icon = config.icon;
            
            return (
              <div key={mov.id_movimiento} className="flex flex-col md:flex-row bg-white border border-gray-200 rounded-xl p-4 gap-4 hover:shadow-md transition-shadow items-center">
                {/* Icono de Movimiento */}
                <div className={`flex flex-col items-center justify-center p-3 rounded-xl border ${config.bg} ${config.border} ${config.color} min-w-[100px]`}>
                  <Icon className="w-6 h-6 mb-1" />
                  <span className="text-[10px] font-black uppercase text-center leading-tight">{config.label}</span>
                </div>

                {/* Detalles Principales */}
                <div className="flex-grow flex flex-col justify-center min-w-0">
                  <h4 className="font-black text-torcoroma-dark text-base truncate uppercase">{mov.modelo}</h4>
                  <div className="flex items-center gap-3 mt-1 text-sm text-gray-600 font-medium">
                    <span className="bg-gray-100 px-2 py-0.5 rounded-md border border-gray-200 truncate max-w-[150px]">{mov.color}</span>
                    <span className="bg-gray-100 px-2 py-0.5 rounded-md border border-gray-200 font-bold">Talla {mov.talla}</span>
                    <span className="text-gray-400 text-xs truncate max-w-[150px] hidden sm:inline-block">• {mov.ubicacion}</span>
                  </div>
                  {mov.detalle && (
                    <p className="text-xs text-gray-500 mt-2 italic truncate">Nota: {mov.detalle}</p>
                  )}
                </div>

                {/* Cantidad y Fecha */}
                <div className="flex flex-row md:flex-col items-center md:items-end justify-between w-full md:w-auto gap-2 md:gap-1 pl-0 md:pl-4 md:border-l md:border-gray-100">
                  <div className={`text-2xl font-black font-mono ${mov.cantidad > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                    {mov.cantidad > 0 ? `+${mov.cantidad}` : mov.cantidad}
                  </div>
                  <div className="flex flex-col items-end text-xs text-gray-500 font-medium gap-1">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {new Date(mov.fecha).toLocaleDateString('es-CO')} {new Date(mov.fecha).toLocaleTimeString('es-CO', {hour: '2-digit', minute:'2-digit'})}
                    </div>
                    <div className="flex items-center gap-1">
                      <User className="w-3.5 h-3.5" />
                      {mov.usuario.replace(' (Dueño)', '')}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {currentItems.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
              <FileText className="w-12 h-12 mb-3 text-gray-300" />
              <p className="font-bold text-gray-500">No se encontraron movimientos.</p>
              <p className="text-sm">Intenta buscar con otros términos o cambia el rango de fechas.</p>
            </div>
          )}
        </div>
        
        {/* Controles de Paginación */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 mt-2 border-t border-gray-100">
            <span className="text-sm text-gray-500 font-medium">
              Mostrando página <span className="font-bold text-torcoroma-dark">{currentPage}</span> de {totalPages} 
              <span className="hidden sm:inline"> (Total: {filteredKardex.length} registros)</span>
            </span>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
