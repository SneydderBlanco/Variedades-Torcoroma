import React, { useState, useEffect, useRef } from 'react';
import { Search, RefreshCw, Undo2 } from 'lucide-react';
import ReturnModal from './ReturnModal';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export default function POSPanel({ onAddToTicket, selectedLocationId = 2, ticketItems = [], onDecrementQty }) {
  // Búsqueda de modelos
  const [searchTerm, setSearchTerm] = useState('');
  const [models, setModels] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedModel, setSelectedModel] = useState(null);
  
  // Colores y tallas
  const [colors, setColors] = useState([]);
  const [selectedColor, setSelectedColor] = useState('');
  const [sizes, setSizes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);

  const dropdownRef = useRef(null);

  // Buscar modelos al escribir
  useEffect(() => {
    const fetchModels = async () => {
      if (searchTerm.trim().length === 0) {
        setModels([]);
        return;
      }
      try {
        const res = await fetch(`${API_URL}/api/pos/modelos?q=${encodeURIComponent(searchTerm)}`);
        if (res.ok) {
          const data = await res.json();
          setModels(data);
        }
      } catch (err) {
        console.error('Error fetching models:', err);
      }
    };

    const timer = setTimeout(fetchModels, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Cargar colores cuando cambie el modelo seleccionado
  useEffect(() => {
    if (!selectedModel) {
      setColors([]);
      setSelectedColor('');
      setSizes([]);
      return;
    }
    
    const fetchColors = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_URL}/api/pos/colores?modeloId=${selectedModel.id_modelo}`);
        if (res.ok) {
          const data = await res.json();
          setColors(data);
          setSelectedColor('');
          setSizes([]);
        }
      } catch (err) {
        console.error('Error fetching colors:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchColors();
  }, [selectedModel]);

  // Cargar tallas y stock cuando cambie el color seleccionado u ubicación
  useEffect(() => {
    if (!selectedModel || !selectedColor) {
      setSizes([]);
      return;
    }

    const fetchSizes = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `${API_URL}/api/pos/tallas?modeloId=${selectedModel.id_modelo}&color=${encodeURIComponent(
            selectedColor
          )}&ubicacionId=${selectedLocationId}`
        );
        if (res.ok) {
          const data = await res.json();
          // Ordenar tallas numéricamente
          const sorted = data.sort((a, b) => Number(a.talla) - Number(b.talla));
          setSizes(sorted);
        }
      } catch (err) {
        console.error('Error fetching sizes:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSizes();
  }, [selectedColor, selectedModel, selectedLocationId]);

  // Manejar click fuera de dropdown para cerrarlo
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectModel = (model) => {
    setSelectedModel(model);
    setSearchTerm(model.nombre);
    setShowDropdown(false);
  };

  const getStockBadgeColor = (stock) => {
    if (stock === 0) {
      // Gris claro para agotado
      return 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed opacity-60';
    }
    if (stock <= 5) {
      // Amarillo Torcoroma para stock bajo
      return 'bg-yellow-50 text-yellow-800 border-yellow-300 hover:border-yellow-500 hover:bg-yellow-100 cursor-pointer';
    }
    // Verde Esmeralda para stock alto
    return 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:border-emerald-500 hover:bg-emerald-100 cursor-pointer';
  };

  const handleAddPaseRapido = () => {
    const rawPrice = window.prompt("Ingrese el valor de ganancia (Precio del Pase Rápido):", "");
    if (!rawPrice) return;
    const price = parseInt(rawPrice.replace(/\D/g, ''), 10);
    if (isNaN(price) || price <= 0) {
      alert("Por favor, ingrese un valor válido mayor a 0.");
      return;
    }

    onAddToTicket({
      id_modelo: 999999,
      id_variante: 999999,
      nombre_modelo: "PASE RÁPIDO",
      color: "GENÉRICO",
      talla: "ÚNICA",
      precio: price,
      cantidad: 1,
      stockDisponible: 9999,
      precio_venta_final: price,
      distribucionManual: null // Evitar distribuir
    });
  };

  return (
    <div className={`rounded-2xl shadow-xl p-5 border flex flex-col h-full transition-colors bg-white border-gray-100`}>
      
      <div className="flex justify-between items-center mb-3">
        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">
          Paso 1: Buscar Calzado / Modelo
        </label>
        <div className="flex items-center gap-2">
          <button
            onClick={handleAddPaseRapido}
            className="px-4 py-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition bg-red-50 text-red-700 hover:bg-red-100 border-red-200 shadow-sm active:scale-95 uppercase tracking-wide"
          >
            <span className="text-sm">⚡</span> PASE
          </button>
          <button
            onClick={() => setShowReturnModal(true)}
            className={`px-4 py-2 rounded-xl text-xs font-bold border flex items-center gap-2 transition bg-red-50 text-red-700 hover:bg-red-100 border-red-200 shadow-sm`}
          >
            <Undo2 className={`w-4 h-4`} />
            DEVOLUCIÓN
          </button>
        </div>
      </div>

      <div className="mb-5 flex flex-col sm:flex-row gap-3 items-end" ref={dropdownRef}>
        <div className="flex-1 w-full relative">
          <div className="relative">
            <input
              type="text"
              className="w-full pl-9 pr-14 py-2.5 border border-gray-300 rounded-xl text-torcoroma-dark focus:ring-2 focus:ring-torcoroma-gold focus:border-torcoroma-gold outline-none transition text-sm font-semibold uppercase"
              placeholder="Buscar calzado..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
            />
            <Search className="absolute left-3 top-3 text-gray-400 w-4 h-4" />
            {searchTerm && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedModel(null);
                }}
                className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 text-xs font-bold cursor-pointer"
              >
                Limpiar
              </button>
            )}
          </div>

          {/* Dropdown Predictivo */}
          {showDropdown && models.length > 0 && (
            <ul className="absolute z-50 w-full bg-white border border-gray-200 mt-1 rounded-xl shadow-2xl max-h-52 overflow-y-auto divide-y divide-gray-100">
              {models.map((model) => (
                <li
                  key={model.id_modelo}
                  onClick={() => handleSelectModel(model)}
                  className="px-4 py-2.5 hover:bg-gray-50 cursor-pointer flex justify-between items-center transition"
                >
                  <div>
                    <span className="font-bold text-torcoroma-dark text-xs uppercase tracking-wide">{model.nombre}</span>
                    {model.es_externo && (
                      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-yellow-100 text-yellow-800 border border-yellow-200">
                        {model.id_proveedor_aliado}
                      </span>
                    )}
                  </div>
                  <span className="text-torcoroma-gold font-black text-sm">
                    ${Number(model.precio_minimo_venta).toLocaleString('es-CO')}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Desplegable de colores */}
        <div className="w-full sm:w-44 flex-shrink-0">
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
            Color
          </label>
          <select
            disabled={!selectedModel || colors.length === 0 || loading}
            value={selectedColor}
            onChange={(e) => {
              setSelectedColor(e.target.value);
            }}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-torcoroma-dark focus:ring-2 focus:ring-torcoroma-gold focus:border-torcoroma-gold outline-none transition text-sm font-bold bg-white uppercase disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed cursor-pointer"
          >
            {!selectedModel ? (
              <option value="">Seleccione modelo</option>
            ) : loading ? (
              <option value="">Cargando...</option>
            ) : colors.length === 0 ? (
              <option value="">Sin colores</option>
            ) : (
              <>
                <option value="">-- COLOR --</option>
                {colors.map((color) => (
                  <option key={color} value={color}>
                    {color}
                  </option>
                ))}
              </>
            )}
          </select>
        </div>
      </div>

      {/* Cargar Tallas con Semáforo de Stock */}
      {selectedModel && selectedColor && (
        <div className="mb-5 flex-grow">
          <div className="flex flex-col gap-1 mb-3">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">
              Paso 2: Talla disponible (Toca para agregar a la tirilla)
            </label>
          </div>

          {loading && sizes.length === 0 ? (
            <div className="flex items-center text-gray-500 gap-2 text-xs font-semibold py-4">
              <RefreshCw className="animate-spin w-4 h-4 text-torcoroma-gold" /> Cargando tallas y stock...
            </div>
          ) : sizes.length === 0 ? (
            <p className="text-gray-400 text-xs italic py-4">No hay stock disponible para este color.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
              {sizes.map((sz) => {
                // Cantidad actual del item en el ticket
                const cartItem = ticketItems.find(item => item.id_variante === sz.id_variante);
                const qtyInTicket = cartItem ? cartItem.cantidad : 0;
                const availableStock = sz.stock - qtyInTicket;

                return (
                  <button
                    key={sz.id_variante}
                    type="button"
                    disabled={sz.stock === 0 || availableStock <= 0}
                    onClick={() => {
                      onAddToTicket({
                        id_modelo: selectedModel.id_modelo,
                        id_variante: sz.id_variante,
                        nombre: selectedModel.nombre,
                        color: selectedColor,
                        talla: sz.talla,
                        cantidad: 1,
                        precio: Number(selectedModel.precio_minimo_venta),
                        precio_minimo_venta: Number(selectedModel.precio_minimo_venta),
                        stockDisponible: sz.stock,
                        stock_local: sz.stock_local,
                        externos: sz.externos
                      });
                    }}
                    className={`p-2.5 rounded-xl border text-center font-bold transition-all duration-200 active:scale-[0.98] flex flex-col items-center justify-center ${getStockBadgeColor(
                      sz.stock
                    )}`}
                    title="Agregar al tique"
                  >
                    <div className="text-sm">Talla {sz.talla}</div>
                    <div className="text-[10px] font-normal mt-0.5 opacity-80 flex flex-col items-center">
                      <span>{sz.stock === 0 ? 'Agotado' : `${availableStock} disp.`}</span>
                      {sz.externos && sz.externos.length > 0 && (
                        <span className="text-[8.5px] italic opacity-90 mt-0.5 max-w-[80px] truncate">
                          (+{sz.externos.reduce((a, c) => a + c.cantidad, 0)} externo)
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {showReturnModal && (
        <ReturnModal 
          onClose={() => setShowReturnModal(false)} 
          onLocalExchange={(item) => {
            onAddToTicket(item);
          }}
        />
      )}
    </div>
  );
}
