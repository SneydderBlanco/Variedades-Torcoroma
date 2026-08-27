import React, { useState, useEffect, useRef } from 'react';
import { Search, RefreshCw, Box, MapPin, Globe } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export default function LocalizadorPanel() {
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
  
  // Resultados del localizador
  const [selectedSize, setSelectedSize] = useState('');
  const [locatorResult, setLocatorResult] = useState(null);
  const [loadingLocator, setLoadingLocator] = useState(false);

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
      setLocatorResult(null);
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
          setLocatorResult(null);
        }
      } catch (err) {
        console.error('Error fetching colors:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchColors();
  }, [selectedModel]);

  // Cargar TODAS las tallas para este color, independientemente del local principal
  // Usamos ubicacionId=2 temporalmente para obtener el catálogo de tallas desde el inventario principal,
  // O podemos buscar todas las tallas globales, pero como el catálogo nace del principal, nos sirve.
  useEffect(() => {
    if (!selectedModel || !selectedColor) {
      setSizes([]);
      setLocatorResult(null);
      return;
    }

    const fetchSizes = async () => {
      setLoading(true);
      try {
        // Usamos la API de tallas para traer las variantes. Como queremos ver la lista de tallas,
        // no importa el stock específico aquí, porque el Localizador buscará en todas partes luego.
        const res = await fetch(
          `${API_URL}/api/pos/tallas?modeloId=${selectedModel.id_modelo}&color=${encodeURIComponent(
            selectedColor
          )}&ubicacionId=2`
        );
        if (res.ok) {
          const data = await res.json();
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
  }, [selectedColor, selectedModel]);

  // Ejecutar el localizador cuando se seleccione una talla
  useEffect(() => {
    if (!selectedModel || !selectedColor || !selectedSize) {
      return;
    }

    const runLocator = async () => {
      setLoadingLocator(true);
      try {
        const res = await fetch(
          `${API_URL}/api/pos/localizador?modeloId=${selectedModel.id_modelo}&color=${encodeURIComponent(
            selectedColor
          )}&talla=${encodeURIComponent(selectedSize)}`
        );
        if (res.ok) {
          const data = await res.json();
          setLocatorResult(data);
        }
      } catch (err) {
        console.error('Error en el localizador:', err);
      } finally {
        setLoadingLocator(false);
      }
    };

    runLocator();
  }, [selectedSize, selectedModel, selectedColor]);

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
    setSelectedSize('');
    setLocatorResult(null);
  };

  const getStockBadgeColor = (sz) => {
    if (selectedSize === sz.talla) {
      return 'bg-torcoroma-dark text-white border-torcoroma-dark ring-2 ring-offset-1 ring-torcoroma-dark';
    }
    return 'bg-gray-50 text-gray-700 border-gray-300 hover:border-torcoroma-dark hover:bg-gray-100 cursor-pointer';
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full items-start w-full">
      
      {/* Columna Izquierda: Búsqueda y Selección */}
      <div className="lg:col-span-5 bg-white rounded-2xl shadow-xl p-6 md:p-8 border border-gray-100 flex flex-col">
        
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-gray-100 text-gray-700 rounded-xl">
            <Globe className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-torcoroma-dark tracking-wide">
              Radar Global
            </h2>
            <p className="text-sm text-gray-500 font-medium">Encuentra dónde se encuentra un par específico.</p>
          </div>
        </div>

        {/* Búsqueda */}
        <div className="mb-6 flex flex-col gap-4" ref={dropdownRef}>
          <div className="w-full relative">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
              1. Buscar Modelo
            </label>
            <div className="relative">
              <input
                type="text"
                className="w-full pl-10 pr-14 py-3 border border-gray-300 rounded-xl text-torcoroma-dark focus:ring-2 focus:ring-[#F5C227] focus:border-[#F5C227] outline-none transition text-sm font-semibold uppercase"
                placeholder="Buscar calzado..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setShowDropdown(true);
                }}
                onFocus={() => setShowDropdown(true)}
              />
              <Search className="absolute left-3.5 top-3.5 text-gray-400 w-5 h-5" />
              {searchTerm && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedModel(null);
                    setSelectedColor('');
                    setSelectedSize('');
                    setLocatorResult(null);
                  }}
                  className="absolute right-4 top-3 text-gray-400 hover:text-gray-600 text-xs font-bold"
                >
                  Limpiar
                </button>
              )}
            </div>

            {/* Dropdown Predictivo */}
            {showDropdown && models.length > 0 && (
              <ul className="absolute z-50 w-full bg-white border border-gray-200 mt-1 rounded-xl shadow-2xl max-h-60 overflow-y-auto divide-y divide-gray-100">
                {models.map((model) => (
                  <li
                    key={model.id_modelo}
                    onClick={() => handleSelectModel(model)}
                    className="px-4 py-3 hover:bg-gray-50 cursor-pointer flex justify-between items-center transition"
                  >
                    <span className="font-bold text-torcoroma-dark text-sm uppercase tracking-wide">{model.nombre}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="w-full flex-shrink-0">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
              2. Color
            </label>
            <select
              disabled={!selectedModel || colors.length === 0 || loading}
              value={selectedColor}
              onChange={(e) => {
                setSelectedColor(e.target.value);
                setSelectedSize('');
                setLocatorResult(null);
              }}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl text-torcoroma-dark focus:ring-2 focus:ring-[#F5C227] outline-none transition text-sm font-bold bg-white uppercase disabled:bg-gray-50 disabled:text-gray-400 cursor-pointer"
            >
              {!selectedModel ? (
                <option value="">Seleccione modelo</option>
              ) : loading ? (
                <option value="">Cargando...</option>
              ) : colors.length === 0 ? (
                <option value="">Sin colores</option>
              ) : (
                <>
                  <option value="">-- SELECCIONAR --</option>
                  {colors.map((color) => (
                    <option key={color} value={color}>{color}</option>
                  ))}
                </>
              )}
            </select>
          </div>
        </div>

        {/* Cuadrícula de Tallas */}
        {selectedModel && selectedColor && (
          <div className="mb-4">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
              3. Talla a Localizar
            </label>
            {loading && sizes.length === 0 ? (
              <div className="flex items-center text-gray-500 gap-2 text-sm font-semibold py-4">
                <RefreshCw className="animate-spin w-5 h-5 text-[#F5C227]" /> Cargando tallas...
              </div>
            ) : sizes.length === 0 ? (
              <p className="text-gray-400 text-sm italic py-4">No hay tallas registradas para esta variante.</p>
            ) : (
              <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {sizes.map((sz) => (
                  <button
                    key={sz.id_variante}
                    type="button"
                    onClick={() => setSelectedSize(sz.talla)}
                    className={`p-3 rounded-xl border text-center font-bold transition-all duration-200 active:scale-95 ${getStockBadgeColor(sz)}`}
                  >
                    <div className="text-base">{sz.talla}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Columna Derecha: Resultados del Radar */}
      <div className="lg:col-span-7 flex flex-col h-full">
        {selectedSize ? (
          <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 border border-gray-100 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 border-b border-gray-100 pb-4">
              <div>
                <h3 className="text-lg font-extrabold text-torcoroma-dark uppercase flex items-center gap-2">
                  <Search className="w-5 h-5 text-[#F5C227]" />
                  Resultados de Búsqueda
                </h3>
                <p className="text-gray-500 font-medium mt-1">
                  <span className="font-bold text-gray-800">{selectedModel.nombre}</span> • Color <span className="font-bold text-gray-800">{selectedColor}</span> • Talla <span className="font-bold text-gray-800">{selectedSize}</span>
                </p>
              </div>
              
              {loadingLocator && (
                <div className="flex items-center text-[#F5C227] gap-2 font-bold text-sm bg-yellow-50 px-3 py-1.5 rounded-full">
                  <RefreshCw className="animate-spin w-4 h-4" /> Buscando...
                </div>
              )}
            </div>

            {locatorResult && !loadingLocator && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                
                {/* Card Total Global (Destacada arriba en ambas columnas si se quiere, o en una) */}
                <div className="sm:col-span-2 bg-[#F5C227]/10 border border-[#F5C227]/30 rounded-2xl p-6 flex flex-col justify-between shadow-sm">
                  <div>
                    <div className="flex items-center gap-2 text-yellow-700 mb-2">
                      <Globe className="w-5 h-5" />
                      <h4 className="font-bold uppercase text-xs tracking-wider">Total Global de la Empresa</h4>
                    </div>
                    <p className="text-sm text-yellow-800/80">Suma total de la bodega principal más todos los locales permitidos.</p>
                  </div>
                  <div className="mt-4 flex items-end justify-between">
                    <span className="text-6xl font-black text-yellow-600">{locatorResult.total_global}</span>
                    <span className="text-sm font-bold text-yellow-700 mb-2">pares en total</span>
                  </div>
                </div>

                {/* Card Bodega */}
                <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-gray-500 mb-2">
                      <Box className="w-5 h-5" />
                      <h4 className="font-bold uppercase text-xs tracking-wider">Bodega / Mostrador</h4>
                    </div>
                    <p className="text-sm text-gray-500">Inventario principal disponible para venta inmediata.</p>
                  </div>
                  <div className="mt-4 flex items-end justify-between">
                    <span className="text-4xl font-black text-gray-800">{locatorResult.mostrador_principal}</span>
                    <span className="text-sm font-bold text-gray-500 mb-1">pares</span>
                  </div>
                </div>

                {/* Card Permitidos */}
                <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 flex flex-col">
                  <div className="flex items-center gap-2 text-blue-600 mb-3">
                    <MapPin className="w-5 h-5" />
                    <h4 className="font-bold uppercase text-xs tracking-wider">En Permitidos</h4>
                  </div>
                  
                  <div className="flex-1">
                    {locatorResult.locales_permitidos.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-sm text-blue-400 font-medium italic text-center">
                        No hay mercancía asignada a locales.
                      </div>
                    ) : (
                      <ul className="space-y-2">
                        {locatorResult.locales_permitidos.map((local, idx) => (
                          <li key={idx} className="flex justify-between items-center bg-white/60 rounded-lg px-3 py-2 border border-blue-50">
                            <span className="font-extrabold text-blue-900 text-sm">{local.nombre_local}</span>
                            <span className="font-bold text-blue-600 bg-white shadow-sm px-2 py-0.5 rounded-full text-xs">
                              {local.cantidad} {local.cantidad === 1 ? 'par' : 'pares'}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

              </div>
            )}
          </div>
        ) : (
          <div className="bg-white/50 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center p-12 text-center text-gray-400 h-full min-h-[400px]">
             <div className="bg-gray-100 p-4 rounded-full mb-4">
               <Search className="w-12 h-12 text-gray-300" />
             </div>
             <p className="font-bold text-xl text-gray-500 mb-2">Esperando selección...</p>
             <p className="text-sm font-medium">Por favor, selecciona un Modelo, Color y Talla en el panel izquierdo para rastrear el inventario.</p>
          </div>
        )}
      </div>

    </div>
  );
}
