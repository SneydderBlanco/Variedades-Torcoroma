import React, { useState, useEffect, useRef } from 'react';
import { Landmark, Home, PlusCircle, Save, RefreshCw, X, AlertTriangle, Edit, Trash2, Truck, Image as ImageIcon, UploadCloud, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import PermitidosPanel from './PermitidosPanel';
import KardexPanel from './KardexPanel';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
const TALLAS_RANGO = Array.from({ length: 24 }, (_, i) => String(21 + i)); // ['21', '22', ..., '44']

export default function InventoryGrid() {
  const { user } = useAuth();
  const isAdmin = user?.rol === 'ADMIN';
  const [activeTab, setActiveTab] = useState(2); // 2 = INVENTARIO LOCAL (Local Principal), 1 = PERMITIDOS (Bodega)
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  
  // Matriz de inventario leída de la base de datos
  const [inventoryMatrix, setInventoryMatrix] = useState([]);
  
  // Registro de modificaciones en caliente: { "modeloId::colorName": { "talla": cantidad } }
  const [modifiedRows, setModifiedRows] = useState({});

  // Modal para agregar modelo
  const [showModal, setShowModal] = useState(false);
  const [newModelName, setNewModelName] = useState('');
  const [newModelSupplier, setNewModelSupplier] = useState('');
  const [newModelPurchasePrice, setNewModelPurchasePrice] = useState('');
  const [newModelSalePrice, setNewModelSalePrice] = useState('');
  const [allSuppliers, setAllSuppliers] = useState([]); // Todos los proveedores en base de datos
  const [supplierSuggestions, setSupplierSuggestions] = useState([]);
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);
  const [isValidSupplier, setIsValidSupplier] = useState(true);

  // Imagen para nuevo color
  const [newColorImage, setNewColorImage] = useState(null);
  const [newColorImagePreview, setNewColorImagePreview] = useState(null);

  // Auto-guardado
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);

  // Modal para agregar color
  const [showColorModal, setShowColorModal] = useState(false);
  const [selectedModelForColor, setSelectedModelForColor] = useState(null);
  const [newColorName, setNewColorName] = useState('');
  
  // Celda de input que tiene el foco actual en el grid
  const [focusedCell, setFocusedCell] = useState(null); // { globalRowIdx, talla }

  // Modales de edición y eliminación de modelos
  const [showEditModelModal, setShowEditModelModal] = useState(false);
  const [selectedModelForEdit, setSelectedModelForEdit] = useState(null);
  const [editModelName, setEditModelName] = useState('');

  const [showDeleteModelModal, setShowDeleteModelModal] = useState(false);
  const [selectedModelForDelete, setSelectedModelForDelete] = useState(null);

  // Modales de edición y eliminación de colores
  const [showEditColorModal, setShowEditColorModal] = useState(false);
  const [selectedModelForEditColor, setSelectedModelForEditColor] = useState(null);
  const [oldColorForEdit, setOldColorForEdit] = useState('');
  const [newColorNameForEdit, setNewColorNameForEdit] = useState('');

  const [showDeleteColorModal, setShowDeleteColorModal] = useState(false);
  const [selectedModelForDeleteColor, setSelectedModelForDeleteColor] = useState(null);
  const [colorForDelete, setColorForDelete] = useState('');

  const supplierDropdownRef = useRef(null);

  // Carga matricial de datos desde la base de datos
  const loadInventoryMatrix = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch(`${API_URL}/api/pos/modelos?matrix=true&ubicacionId=${activeTab}`);
      if (res.ok) {
        let data = await res.json();
        data = data.filter(model => model.id_modelo !== 999999); // Ocultar Pase Rapido
        setInventoryMatrix(data);
        setModifiedRows({}); // Resetear modificaciones
      } else {
        throw new Error('No se pudo cargar la matriz de inventario.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Error al conectar con la base de datos de inventario.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInventoryMatrix();
  }, [activeTab]);

  // Cargar todos los proveedores cuando el modal de agregar modelo se abre
  useEffect(() => {
    if (showModal) {
      const fetchAllSuppliers = async () => {
        try {
          const res = await fetch(`${API_URL}/api/proveedores`);
          if (res.ok) {
            const data = await res.json();
            setAllSuppliers(data);
            // Si el input está vacío, sugerir todos por defecto
            if (!newModelSupplier.trim()) {
              setSupplierSuggestions(data);
            }
          }
        } catch (err) {
          console.error('Error fetching all suppliers:', err);
        }
      };
      fetchAllSuppliers();
    }
  }, [showModal]);

  // Filtrar sugerencias y validar proveedor localmente de forma instantánea
  useEffect(() => {
    if (!newModelSupplier.trim()) {
      setSupplierSuggestions(allSuppliers);
      setIsValidSupplier(true); // Válido si está vacío (sin proveedor)
      return;
    }

    const searchStr = newModelSupplier.toUpperCase().trim();
    const filtered = allSuppliers.filter((sup) =>
      sup.nombre.toUpperCase().includes(searchStr)
    );
    setSupplierSuggestions(filtered);

    // Es válido si hay sugerencias que coinciden con lo que se escribe, o si coincide exactamente
    setIsValidSupplier(filtered.length > 0);
  }, [newModelSupplier, allSuppliers]);

  // Efecto de autoguardado de stock
  useEffect(() => {
    if (Object.keys(modifiedRows).length === 0) return;

    const timeoutId = setTimeout(async () => {
      setIsAutoSaving(true);
      try {
        const rowsToSave = { ...modifiedRows };
        for (const [key, tallasMap] of Object.entries(rowsToSave)) {
          const [modeloId, color] = key.split('::');
          await fetch(`${API_URL}/api/pos/stock`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              modeloId: parseInt(modeloId, 10),
              color: color,
              tallas: tallasMap,
              ubicacionId: activeTab
            })
          });
        }
        setModifiedRows(prev => {
          const next = { ...prev };
          Object.keys(rowsToSave).forEach(k => delete next[k]);
          return next;
        });
        setLastSaved(new Date());
      } catch (err) {
        console.error("Error auto-guardando stock:", err);
      } finally {
        setIsAutoSaving(false);
      }
    }, 1000); // 1 segundo de espera después de dejar de escribir

    return () => clearTimeout(timeoutId);
  }, [modifiedRows, activeTab]);

  // Cerrar dropdown de proveedores al hacer click fuera
  useEffect(() => {
    function handleClickOutside(event) {
      if (supplierDropdownRef.current && !supplierDropdownRef.current.contains(event.target)) {
        setShowSupplierDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Generar fila global plana para mapear inputs en el teclado
  const getFlatColorRows = () => {
    const rows = [];
    inventoryMatrix.forEach((model, modelIdx) => {
      model.colores.forEach((color, colorIdx) => {
        rows.push({
          modelIdx,
          colorIdx,
          id_modelo: model.id_modelo,
          nombre_color: color.nombre_color,
          tallas: color.tallas
        });
      });
    });
    return rows;
  };

  const flatRows = getFlatColorRows();
  const totalColorRows = flatRows.length;

  // Manejar entrada de teclado y saltar foco
  const handleKeyDown = (e, globalRowIdx, talla) => {
    const tallaInt = parseInt(talla, 10);
    
    if (e.key === 'ArrowRight' || e.key === 'Enter') {
      e.preventDefault();
      if (tallaInt < 44) {
        const nextTalla = tallaInt + 1;
        const target = document.getElementById(`input-${globalRowIdx}-${nextTalla}`);
        target?.focus();
        target?.select();
      } else if (globalRowIdx + 1 < totalColorRows) {
        const target = document.getElementById(`input-${globalRowIdx + 1}-21`);
        target?.focus();
        target?.select();
      }
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      if (tallaInt > 21) {
        const prevTalla = tallaInt - 1;
        const target = document.getElementById(`input-${globalRowIdx}-${prevTalla}`);
        target?.focus();
        target?.select();
      } else if (globalRowIdx > 0) {
        const target = document.getElementById(`input-${globalRowIdx - 1}-44`);
        target?.focus();
        target?.select();
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (globalRowIdx > 0) {
        const target = document.getElementById(`input-${globalRowIdx - 1}-${talla}`);
        target?.focus();
        target?.select();
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (globalRowIdx + 1 < totalColorRows) {
        const target = document.getElementById(`input-${globalRowIdx + 1}-${talla}`);
        target?.focus();
        target?.select();
      }
    }
  };

  // Manejar cambio de valor numérico en una celda
  const handleCellChange = (modelIdx, colorIdx, talla, val) => {
    const updated = [...inventoryMatrix];
    const parsed = parseInt(val, 10);
    const newVal = isNaN(parsed) || parsed < 0 ? 0 : parsed;
    updated[modelIdx].colores[colorIdx].tallas[talla] = newVal;
    setInventoryMatrix(updated);
    
    // Registrar la fila modificada
    const model = updated[modelIdx];
    const color = model.colores[colorIdx];
    const key = `${model.id_modelo}::${color.nombre_color}`;
    
    setModifiedRows(prev => ({
      ...prev,
      [key]: {
        ...(prev[key] || color.tallas),
        [talla]: newVal
      }
    }));
  };

  // Calcular total por color (fila)
  const calculateRowTotal = (color) => {
    return Object.values(color.tallas).reduce((sum, qty) => sum + qty, 0);
  };

  // Agregar nuevo modelo a la base de datos
  const handleAddModel = async (e) => {
    e.preventDefault();
    if (!newModelName.trim()) return;
    
    // Validar coincidencia exacta con algún proveedor registrado si se ingresó algo
    if (newModelSupplier.trim()) {
      const matchExact = allSuppliers.some(
        (sup) => sup.nombre.toUpperCase() === newModelSupplier.toUpperCase().trim()
      );
      if (!matchExact) {
        setErrorMsg('Por favor, selecciona un proveedor registrado de la lista (coincidencia exacta requerida).');
        return;
      }
    }

    // Validar precio de venta no negativo
    const compra = 0; // Removido precio de compra
    const venta = newModelSalePrice ? parseFloat(newModelSalePrice) : 0;
    if (venta < 0) {
      setErrorMsg('El precio de venta no puede ser negativo.');
      return;
    }

    // Encontrar si el proveedor seleccionado es externo
    const matchedSupplier = newModelSupplier.trim()
      ? allSuppliers.find(sup => sup.nombre.toUpperCase() === newModelSupplier.toUpperCase().trim())
      : null;
    const es_externo = matchedSupplier ? !!matchedSupplier.es_externo : false;

    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch(`${API_URL}/api/pos/modelos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          nombre: newModelName.toUpperCase().trim(),
          id_proveedor_aliado: newModelSupplier.trim() ? newModelSupplier.toUpperCase().trim() : null,
          precio_compra: compra,
          precio_minimo_venta: venta,
          es_externo
        })
      });

      const data = await res.json();

      if (res.ok) {
        setSuccessMsg(`¡Modelo "${data.nombre}" creado exitosamente con color "TODO BLANCO"!`);
        setNewModelName('');
        setNewModelSupplier('');
        setNewModelPurchasePrice('');
        setNewModelSalePrice('');
        setShowModal(false);
        loadInventoryMatrix();
        setTimeout(() => setSuccessMsg(''), 4000);
      } else {
        setErrorMsg(data.error || 'Error al registrar el modelo.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Error de red al intentar crear el modelo.');
    } finally {
      setSaving(false);
    }
  };

  // Abrir modal de añadir color
  const handleOpenColorModal = (model) => {
    setSelectedModelForColor(model);
    setNewColorName('');
    setShowColorModal(true);
  };

  // Agregar nuevo color a un modelo
  const handleAddColorSubmit = async (e) => {
    e.preventDefault();
    if (!newColorName.trim() || !selectedModelForColor) return;

    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch(`${API_URL}/api/pos/colores`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          modeloId: selectedModelForColor.id_modelo,
          color: newColorName.toUpperCase().trim()
        })
      });

      const data = await res.json();

      if (res.ok) {
        if (newColorImage) {
          const formData = new FormData();
          formData.append('imagen', newColorImage);
          formData.append('color', newColorName.toUpperCase().trim());
          try {
            const token = localStorage.getItem('token');
            await fetch(`${API_URL}/api/ecommerce/admin/productos/${selectedModelForColor.id_modelo}/imagenes`, {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${token}` },
              body: formData
            });
          } catch (imgErr) {
            console.error('Error subiendo imagen:', imgErr);
          }
        }

        setSuccessMsg(`¡Color "${newColorName.toUpperCase()}" añadido con éxito al modelo!`);
        setNewColorName('');
        setNewColorImage(null);
        setNewColorImagePreview(null);
        setSelectedModelForColor(null);
        setShowColorModal(false);
        loadInventoryMatrix();
        setTimeout(() => setSuccessMsg(''), 4000);
      } else {
        setErrorMsg(data.error || 'Error al añadir el color.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Error de red al intentar añadir el color.');
    } finally {
      setSaving(false);
    }
  };

  // Triggers para Editar/Eliminar Modelos
  const handleOpenEditModelModal = (model) => {
    setSelectedModelForEdit(model);
    setEditModelName(model.nombre);
    setShowEditModelModal(true);
  };

  const handleOpenDeleteModelModal = (model) => {
    setSelectedModelForDelete(model);
    setShowDeleteModelModal(true);
  };

  // Triggers para Editar/Eliminar Colores
  const handleOpenEditColorModal = (model, colorName) => {
    setSelectedModelForEditColor(model);
    setOldColorForEdit(colorName);
    setNewColorNameForEdit(colorName);
    setShowEditColorModal(true);
  };

  const handleOpenDeleteColorModal = (model, colorName) => {
    setSelectedModelForDeleteColor(model);
    setColorForDelete(colorName);
    setShowDeleteColorModal(true);
  };

  // Envío de edición del modelo
  const handleEditModelSubmit = async (e) => {
    e.preventDefault();
    if (!editModelName.trim() || !selectedModelForEdit) return;

    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await fetch(`${API_URL}/api/pos/modelos`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          modeloId: selectedModelForEdit.id_modelo,
          nuevoNombre: editModelName.toUpperCase().trim()
        })
      });

      const data = await res.json();

      if (res.ok) {
        setSuccessMsg('Modelo renombrado exitosamente.');
        setShowEditModelModal(false);
        setSelectedModelForEdit(null);
        loadInventoryMatrix();
        setTimeout(() => setSuccessMsg(''), 4000);
      } else {
        setErrorMsg(data.error || 'Error al renombrar el modelo.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Error de red al intentar renombrar el modelo.');
    } finally {
      setSaving(false);
    }
  };

  // Envío de eliminación del modelo
  const handleDeleteModelSubmit = async () => {
    if (!selectedModelForDelete) return;

    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await fetch(`${API_URL}/api/pos/modelos`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          modeloId: selectedModelForDelete.id_modelo
        })
      });

      const data = await res.json();

      if (res.ok) {
        setSuccessMsg(`Modelo "${selectedModelForDelete.nombre}" eliminado exitosamente.`);
        setShowDeleteModelModal(false);
        setSelectedModelForDelete(null);
        loadInventoryMatrix();
        setTimeout(() => setSuccessMsg(''), 4000);
      } else {
        setErrorMsg(data.error || 'Error al eliminar el modelo.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Error de red al intentar eliminar el modelo.');
    } finally {
      setSaving(false);
    }
  };

  // Envío de edición del color
  const handleEditColorSubmit = async (e) => {
    e.preventDefault();
    if (!newColorNameForEdit.trim() || !selectedModelForEditColor) return;

    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await fetch(`${API_URL}/api/pos/colores`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          modeloId: selectedModelForEditColor.id_modelo,
          oldColor: oldColorForEdit,
          newColor: newColorNameForEdit.toUpperCase().trim()
        })
      });

      const data = await res.json();

      if (res.ok) {
        setSuccessMsg('Color renombrado exitosamente.');
        setShowEditColorModal(false);
        setSelectedModelForEditColor(null);
        loadInventoryMatrix();
        setTimeout(() => setSuccessMsg(''), 4000);
      } else {
        setErrorMsg(data.error || 'Error al renombrar el color.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Error de red al intentar renombrar el color.');
    } finally {
      setSaving(false);
    }
  };

  // Envío de eliminación del color
  const handleDeleteColorSubmit = async () => {
    if (!selectedModelForDeleteColor || !colorForDelete) return;

    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await fetch(`${API_URL}/api/pos/colores`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          modeloId: selectedModelForDeleteColor.id_modelo,
          color: colorForDelete
        })
      });

      const data = await res.json();

      if (res.ok) {
        setSuccessMsg(`Color "${colorForDelete}" eliminado exitosamente del modelo.`);
        setShowDeleteColorModal(false);
        setSelectedModelForDeleteColor(null);
        setColorForDelete('');
        loadInventoryMatrix();
        setTimeout(() => setSuccessMsg(''), 4000);
      } else {
        setErrorMsg(data.error || 'Error al eliminar el color.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Error de red al intentar eliminar el color.');
    } finally {
      setSaving(false);
    }
  };

  // Variable de mapeo para obtener el índice global de una fila
  let globalRowCounter = 0;

  return (
    <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100 flex flex-col h-full">
      {/* Cabecera y selectores */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b border-gray-100 pb-4">
        <div>
          <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">Inventario y Stock</h2>
        </div>
        <div className="flex bg-gray-100 rounded-xl p-1 gap-1 self-start md:self-auto flex-wrap">
          <button
            onClick={() => setActiveTab(2)}
            className={`px-5 py-2.5 rounded-lg flex items-center gap-1.5 text-xs sm:text-sm font-bold tracking-wider transition-all cursor-pointer ${
              activeTab === 2 ? 'bg-white text-torcoroma-dark shadow-sm' : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <Landmark className="w-4 h-4" />
            INVENTARIO LOCAL
          </button>
          <button
            onClick={() => setActiveTab(1)}
            className={`px-5 py-2.5 rounded-lg flex items-center gap-1.5 text-xs sm:text-sm font-bold tracking-wider transition-all cursor-pointer ${
              activeTab === 1 ? 'bg-white text-torcoroma-dark shadow-sm' : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <Home className="w-4 h-4" />
            PERMITIDOS
          </button>
          {isAdmin && (
            <button
              onClick={() => setActiveTab(3)}
              className={`px-5 py-2.5 rounded-lg flex items-center gap-1.5 text-xs sm:text-sm font-bold tracking-wider transition-all cursor-pointer ${
                activeTab === 3 ? 'bg-white text-torcoroma-dark shadow-sm' : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <RefreshCw className="w-4 h-4" />
              MOVIMIENTOS
            </button>
          )}
        </div>
      </div>

      {/* Alertas */}
      {errorMsg && (
        <div className="bg-red-50 text-red-800 rounded-xl p-3.5 border border-red-100 text-sm font-semibold mb-4 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 text-red-600" />
          {errorMsg}
        </div>
      )}

      {activeTab === 3 ? (
        <KardexPanel />
      ) : activeTab === 1 ? (
        <PermitidosPanel modelos={inventoryMatrix} fetchInventory={loadInventoryMatrix} />
      ) : (
        <>
          {/* Botón superior Agregar Modelo (Ajustado visualmente: sin [+]) */}
      <div className="mb-4 flex justify-between items-center">
        <span className="text-xs text-gray-500 font-semibold uppercase tracking-wider">
          Cuadrícula de Tallas (21 a 44)
        </span>
        {isAdmin && (
          <button
            onClick={() => setShowModal(true)}
            className="bg-gray-900 text-white font-medium py-2 px-5 rounded-lg hover:bg-black hover:shadow-md transition-all flex items-center gap-2 text-sm cursor-pointer border border-gray-800"
          >
            <PlusCircle className="w-4 h-4" />
            Agregar Modelo
          </button>
        )}
      </div>

      {/* Grid horizontal con scroll */}
      {loading && inventoryMatrix.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-500 gap-3">
          <RefreshCw className="animate-spin w-8 h-8 text-torcoroma-gold" />
          <span className="font-medium">Cargando matriz de inventario...</span>
        </div>
      ) : inventoryMatrix.length === 0 ? (
        <div className="text-center py-20 text-gray-400 italic text-sm border border-dashed border-gray-200 rounded-xl bg-gray-50/50">
          No hay modelos registrados en el sistema. Presione "Agregar Modelo" para comenzar.
        </div>
      ) : (
        <div className="flex-grow overflow-auto rounded-xl border border-gray-200 max-h-[calc(100vh-340px)] min-h-[420px] relative shadow-sm">
          <table className="w-full border-separate border-spacing-0 min-w-[1300px] text-sm">
            <thead className="sticky top-0 z-20 shadow-sm">
              <tr className="bg-gray-100 text-torcoroma-dark font-extrabold text-center">
                <th className="p-3 border-r border-b border-gray-200 text-left min-w-[200px] bg-gray-100 sticky top-0 left-0 z-30 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                  COLOR
                </th>
                {TALLAS_RANGO.map(talla => (
                  <th
                    key={talla}
                    className="p-3 border-r border-b border-gray-200 w-11 bg-gray-100 text-torcoroma-dark font-extrabold sticky top-0 z-20"
                  >
                    {talla}
                  </th>
                ))}
                <th className="p-3 w-20 border-r border-b border-gray-200 bg-yellow-100 text-torcoroma-gold font-black sticky top-0 z-20">
                  TOTAL
                </th>
                <th className="p-3 w-16 border-b border-gray-200 bg-gray-100 text-torcoroma-dark font-extrabold sticky top-0 z-20">
                  ACCIONES
                </th>
              </tr>
            </thead>
            <tbody>
              {inventoryMatrix.map((model, modelIdx) => {
                const elements = [];

                // 1. Fila de separación del Modelo (Con iconos de editar y papelera roja de eliminar)
                elements.push(
                  <tr key={`model-sep-${model.id_modelo}`} className="bg-yellow-50/50 border-y border-gray-200">
                    <td 
                      colSpan={TALLAS_RANGO.length + 3} 
                      className="p-2.5 text-center font-extrabold text-torcoroma-dark bg-[#fdf8ee] tracking-widest text-sm relative border-y border-gray-200"
                    >
                      <div className="flex items-center justify-center gap-4 relative">
                        <span>{model.nombre}</span>
                        {isAdmin && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleOpenEditModelModal(model)}
                              className="p-1 text-gray-400 hover:text-torcoroma-gold transition cursor-pointer"
                              title="Editar nombre del modelo"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleOpenDeleteModelModal(model)}
                              className="p-1 text-gray-400 hover:text-red-600 transition cursor-pointer"
                              title="Eliminar modelo completo"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );

                // 2. Filas de colores
                model.colores.forEach((color, colorIdx) => {
                  const currentRowIdx = globalRowCounter;
                  globalRowCounter++;

                  elements.push(
                    <tr key={`color-row-${model.id_modelo}-${color.nombre_color}`} className="hover:bg-gray-50/50 transition">
                      {/* Celda del color (Sticky con botón de editar nombre) */}
                      <td className="p-3 border-r border-b border-gray-200 bg-white sticky left-0 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] font-bold text-torcoroma-dark uppercase tracking-wide text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <span>{color.nombre_color}</span>
                          {isAdmin && (
                            <button
                              onClick={() => handleOpenEditColorModal(model, color.nombre_color)}
                              className="p-1 text-gray-400 hover:text-torcoroma-gold transition cursor-pointer"
                              title="Editar nombre del color"
                            >
                              <Edit className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Celdas numéricas de las tallas */}
                      {TALLAS_RANGO.map(talla => {
                        const isFocused = focusedCell && focusedCell.globalRowIdx === currentRowIdx && focusedCell.talla === talla;
                        const cellVal = color.tallas[talla];
                        const displayVal = (cellVal === 0 || cellVal === undefined)
                          ? (isFocused ? '' : '0')
                          : cellVal;

                        return (
                          <td key={talla} className="p-1 border-r border-b border-gray-200 text-center">
                            <input
                              id={`input-${currentRowIdx}-${talla}`}
                              type="number"
                              min="0"
                              disabled={!isAdmin}
                              className={`w-9 py-1 text-center font-semibold bg-transparent rounded border border-transparent outline-none transition text-sm scroll-mt-14 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                                isAdmin ? 'focus:bg-white focus:border-torcoroma-gold focus:ring-1 focus:ring-torcoroma-gold' : 'cursor-not-allowed opacity-80'
                              }`}
                              value={displayVal}
                              placeholder={isFocused ? "" : "0"}
                              onChange={(e) => handleCellChange(modelIdx, colorIdx, talla, e.target.value)}
                              onKeyDown={(e) => handleKeyDown(e, currentRowIdx, talla)}
                              onFocus={(e) => {
                                setFocusedCell({ globalRowIdx: currentRowIdx, talla });
                                e.target.select();
                              }}
                              onBlur={() => setFocusedCell(null)}
                            />
                          </td>
                        );
                      })}

                      {/* Total de Fila */}
                      <td className="p-2 border-r border-b border-gray-200 text-center font-bold text-torcoroma-dark bg-yellow-50/30">
                        {calculateRowTotal(color)}
                      </td>

                      {/* Acciones del color */}
                      <td className="p-2 border-b border-gray-200 text-center">
                        {isAdmin && (
                          <button
                            onClick={() => handleOpenDeleteColorModal(model, color.nombre_color)}
                            className="p-1 text-red-400 hover:text-red-700 hover:bg-red-50 rounded-lg transition cursor-pointer inline-flex items-center justify-center"
                            title="Eliminar color"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                });
 
                // 3. Fila de añadir Color para este bloque de modelo (Ajustado visualmente: sin [+])
                if (isAdmin) {
                  elements.push(
                    <tr key={`add-color-row-${model.id_modelo}`} className="border-b border-gray-200">
                      <td colSpan={TALLAS_RANGO.length + 3} className="p-2 bg-gray-50/40 text-left pl-4 border-b border-gray-200">
                        <button
                          onClick={() => handleOpenColorModal(model)}
                          className="text-xs font-bold text-gray-500 hover:text-torcoroma-gold flex items-center gap-1 cursor-pointer transition"
                        >
                          <PlusCircle className="w-3.5 h-3.5" />
                          Añadir Color
                        </button>
                      </td>
                    </tr>
                  );
                }

                return elements;
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Acciones al pie */}
      {!loading && (
        <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-t border-gray-100 pt-6">
          <button
            onClick={loadInventoryMatrix}
            className="px-4 py-2 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50 flex items-center justify-center gap-1.5 cursor-pointer text-sm"
          >
            <RefreshCw className="w-4 h-4" /> Recargar Matriz
          </button>
          
          {successMsg && (
            <div className="text-emerald-600 font-bold text-sm bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-2">
              {successMsg}
            </div>
          )}

          {isAdmin && (
            <div className="flex items-center justify-center min-w-[200px] h-[52px] bg-gray-50 border border-gray-200 rounded-xl px-6">
              {isAutoSaving ? (
                <span className="flex items-center gap-2 text-torcoroma-gold font-bold text-sm">
                  <RefreshCw className="w-5 h-5 animate-spin" /> Guardando...
                </span>
              ) : Object.keys(modifiedRows).length > 0 ? (
                <span className="flex items-center gap-2 text-gray-500 font-bold text-sm">
                  <RefreshCw className="w-5 h-5 text-gray-400 animate-spin" /> Esperando...
                </span>
              ) : lastSaved ? (
                <span className="flex items-center gap-2 text-emerald-600 font-bold text-sm">
                  <CheckCircle className="w-5 h-5" /> Guardado automático
                </span>
              ) : (
                <span className="text-gray-400 font-bold text-sm">Stock sincronizado</span>
              )}
            </div>
          )}
        </div>
      )}
      </>
      )}

      {/* Modal para Agregar Modelo con Autocompletado de Proveedor */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full min-h-[480px] border border-gray-100 transform transition-all relative flex flex-col justify-between">
            <div className="bg-torcoroma-dark text-white p-5 flex items-center justify-between rounded-t-2xl">
              <h3 className="font-extrabold text-base tracking-wider">AGREGAR NUEVO MODELO</h3>
              <button 
                onClick={() => {
                  setShowModal(false);
                  setNewModelName('');
                  setNewModelSupplier('');
                  setNewModelPurchasePrice('');
                  setNewModelSalePrice('');
                }}
                className="text-gray-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddModel} className="p-6 space-y-4 flex-grow flex flex-col justify-between">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                    Nombre del Modelo *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. NIKE DUNK LOW"
                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-torcoroma-gold focus:border-torcoroma-gold outline-none transition text-sm text-torcoroma-dark font-semibold uppercase"
                    value={newModelName}
                    onChange={(e) => setNewModelName(e.target.value)}
                  />
                </div>

                {/* Input de Proveedor con Autocompletado predictivo */}
                <div className="relative" ref={supplierDropdownRef}>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                    Proveedor
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. DON JUAN"
                    className={`w-full p-3 border rounded-xl focus:ring-2 outline-none transition text-sm text-torcoroma-dark font-semibold uppercase ${
                      !isValidSupplier && newModelSupplier.trim()
                        ? 'border-red-300 focus:ring-red-200 focus:border-red-500 bg-red-50/20'
                        : 'border-gray-300 focus:ring-torcoroma-gold focus:border-torcoroma-gold'
                    }`}
                    value={newModelSupplier}
                    onChange={(e) => {
                      setNewModelSupplier(e.target.value);
                      setShowSupplierDropdown(true);
                      setIsValidSupplier(false);
                    }}
                    onFocus={() => setShowSupplierDropdown(true)}
                  />

                  {/* Advertencia si no es válido */}
                  {!isValidSupplier && newModelSupplier.trim() && (
                    <p className="text-red-600 text-xs font-semibold mt-1 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Proveedor no registrado. Debe existir en la base de datos.
                    </p>
                  )}

                  {/* Dropdown Predictivo de Proveedores */}
                  {showSupplierDropdown && (
                    supplierSuggestions.length > 0 ? (
                      <ul className="absolute z-50 w-full bg-white border border-gray-150 top-full mt-1.5 rounded-xl shadow-2xl max-h-56 overflow-y-auto divide-y divide-gray-100 border-collapse overflow-hidden">
                        {supplierSuggestions.map((sup) => (
                          <li
                            key={sup.id_proveedor}
                            onClick={() => {
                              setNewModelSupplier(sup.nombre);
                              setIsValidSupplier(true);
                              setShowSupplierDropdown(false);
                            }}
                            className="px-4 py-3 hover:bg-yellow-50/40 cursor-pointer flex items-center justify-between transition-all duration-150 text-xs font-bold text-torcoroma-dark uppercase tracking-wide group"
                          >
                            <div className="flex items-center gap-2.5">
                              <Truck className="w-3.5 h-3.5 text-gray-400 group-hover:text-torcoroma-gold transition-colors" />
                              <span>{sup.nombre}</span>
                            </div>
                            {sup.es_externo ? (
                              <span className="text-[9px] bg-purple-50 text-purple-750 border border-purple-150 px-2 py-0.5 rounded-full font-extrabold uppercase select-none">
                                Aliado Externo
                              </span>
                            ) : (
                              <span className="text-[9px] bg-emerald-50 text-emerald-700 border border-emerald-150 px-2 py-0.5 rounded-full font-extrabold uppercase select-none">
                                Propio
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="absolute z-50 w-full bg-white border border-gray-150 top-full mt-1.5 rounded-xl shadow-2xl p-5 text-center text-xs text-gray-500 font-bold italic flex flex-col items-center justify-center gap-2.5">
                        <AlertTriangle className="w-5 h-5 text-yellow-500 animate-pulse" />
                        <span>
                          {newModelSupplier.trim()
                            ? "Sin resultados. Regístrelo primero en Proveedores."
                            : "No hay proveedores registrados en el sistema."}
                        </span>
                      </div>
                    )
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                    Precio Venta Mínimo *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    placeholder="Ej. 180000"
                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-torcoroma-gold focus:border-torcoroma-gold outline-none transition text-sm text-torcoroma-dark font-semibold"
                    value={newModelSalePrice}
                    onChange={(e) => setNewModelSalePrice(e.target.value)}
                  />
                </div>

                <div className="bg-yellow-50/50 border border-yellow-200/60 rounded-xl p-3.5 flex items-start gap-3">
                  <PlusCircle className="w-5 h-5 text-torcoroma-gold mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold text-torcoroma-dark">Inicialización Automática</h4>
                    <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">
                      El modelo se creará automáticamente con el color <strong className="text-torcoroma-dark">"TODO BLANCO"</strong> y con stock en <strong className="text-torcoroma-dark">0</strong> para el rango de tallas del <strong>21 al 44</strong> en todas las ubicaciones.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-100 mt-auto">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setNewModelName('');
                    setNewModelSupplier('');
                    setNewModelPurchasePrice('');
                    setNewModelSalePrice('');
                  }}
                  className="w-1/2 py-3 border border-gray-300 rounded-xl text-gray-700 font-bold hover:bg-gray-50 transition text-sm cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving || (!isValidSupplier && newModelSupplier.trim() !== '')}
                  className="w-1/2 py-3 bg-torcoroma-gold text-white font-bold rounded-xl hover:bg-yellow-600 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed transition text-sm cursor-pointer shadow-md shadow-yellow-500/10"
                >
                  {saving ? 'Guardando...' : 'Crear Modelo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal para Agregar Color */}
      {showColorModal && selectedModelForColor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-gray-100 overflow-hidden transform transition-all">
            <div className="bg-torcoroma-dark text-white p-5 flex items-center justify-between">
              <h3 className="font-extrabold text-base tracking-wider uppercase">Añadir Color a {selectedModelForColor.nombre}</h3>
              <button 
                onClick={() => {
                  setShowColorModal(false);
                  setNewColorName('');
                  setNewColorImage(null);
                  setNewColorImagePreview(null);
                  setSelectedModelForColor(null);
                }}
                className="text-gray-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddColorSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                  Nombre del Color *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. TODO NEGRO, AZUL MARINO, ROJO"
                  className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-torcoroma-gold focus:border-torcoroma-gold outline-none transition text-sm text-torcoroma-dark font-semibold uppercase"
                  value={newColorName}
                  onChange={(e) => setNewColorName(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="pt-2 border-t border-gray-100">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                  Foto del Color (Tienda Web)
                </label>
                {newColorImagePreview ? (
                  <div className="relative w-24 h-24 rounded-xl border border-gray-200 overflow-hidden bg-white mb-2 mx-auto">
                    <img src={newColorImagePreview} className="w-full h-full object-contain" alt="Preview" />
                    <button
                      type="button"
                      onClick={() => {
                        setNewColorImage(null);
                        setNewColorImagePreview(null);
                      }}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <label className="flex items-center justify-center gap-2 w-full bg-gray-50 border border-dashed border-gray-300 text-gray-600 hover:bg-gray-100 hover:border-gray-400 px-4 py-3 rounded-xl font-bold text-xs uppercase cursor-pointer transition">
                    <UploadCloud className="w-4 h-4" />
                    Adjuntar Foto del Color
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) {
                          setNewColorImage(file);
                          setNewColorImagePreview(URL.createObjectURL(file));
                        }
                      }} 
                    />
                  </label>
                )}
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowColorModal(false);
                    setNewColorName('');
                    setNewColorImage(null);
                    setNewColorImagePreview(null);
                    setSelectedModelForColor(null);
                  }}
                  className="w-1/2 py-3 border border-gray-300 rounded-xl text-gray-700 font-bold hover:bg-gray-50 transition text-sm cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving || !newColorName.trim()}
                  className="w-1/2 py-3 bg-torcoroma-gold text-white font-bold rounded-xl hover:bg-yellow-600 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed transition text-sm cursor-pointer shadow-md shadow-yellow-500/10"
                >
                  {saving ? 'Añadiendo...' : 'Añadir Color'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal para Editar Modelo */}
      {showEditModelModal && selectedModelForEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-gray-100 overflow-hidden transform transition-all">
            <div className="bg-torcoroma-dark text-white p-5 flex items-center justify-between">
              <h3 className="font-extrabold text-base tracking-wider uppercase">EDITAR NOMBRE DE MODELO</h3>
              <button 
                onClick={() => {
                  setShowEditModelModal(false);
                  setSelectedModelForEdit(null);
                  setEditModelName('');
                }}
                className="text-gray-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleEditModelSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                  Nombre del Modelo *
                </label>
                <input
                  type="text"
                  required
                  className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-torcoroma-gold focus:border-torcoroma-gold outline-none transition text-sm text-torcoroma-dark font-semibold uppercase"
                  value={editModelName}
                  onChange={(e) => setEditModelName(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModelModal(false);
                    setSelectedModelForEdit(null);
                    setEditModelName('');
                  }}
                  className="w-1/2 py-3 border border-gray-300 rounded-xl text-gray-700 font-bold hover:bg-gray-50 transition text-sm cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving || !editModelName.trim()}
                  className="w-1/2 py-3 bg-torcoroma-gold text-white font-bold rounded-xl hover:bg-yellow-600 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed transition text-sm cursor-pointer shadow-md shadow-yellow-500/10"
                >
                  {saving ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Confirmación para Eliminar Modelo */}
      {showDeleteModelModal && selectedModelForDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-gray-100 overflow-hidden transform transition-all p-6 text-center">
            <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-100 shadow-md">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-torcoroma-dark uppercase tracking-wide">¿ELIMINAR MODELO COMPLETO?</h3>
            <p className="text-sm text-gray-500 mt-2 leading-relaxed">
              Estás a punto de eliminar el modelo <strong className="text-torcoroma-dark">"{selectedModelForDelete.nombre}"</strong>. Esta acción eliminará permanentemente todos sus colores, tallas y stock en la base de datos de manera irreversible.
            </p>

            <div className="flex gap-3 pt-6 mt-6 border-t border-gray-100">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModelModal(false);
                  setSelectedModelForDelete(null);
                }}
                className="w-1/2 py-3 border border-gray-300 rounded-xl text-gray-700 font-bold hover:bg-gray-50 transition text-sm cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteModelSubmit}
                disabled={saving}
                className="w-1/2 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition text-sm cursor-pointer shadow-md shadow-red-500/10"
              >
                {saving ? 'Eliminando...' : 'Sí, Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para Editar Color */}
      {showEditColorModal && selectedModelForEditColor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-gray-100 overflow-hidden transform transition-all">
            <div className="bg-torcoroma-dark text-white p-5 flex items-center justify-between">
              <h3 className="font-extrabold text-base tracking-wider uppercase">EDITAR NOMBRE DE COLOR</h3>
              <button 
                onClick={() => {
                  setShowEditColorModal(false);
                  setSelectedModelForEditColor(null);
                  setOldColorForEdit('');
                  setNewColorNameForEdit('');
                }}
                className="text-gray-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleEditColorSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                  Nombre del Color *
                </label>
                <input
                  type="text"
                  required
                  className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-torcoroma-gold focus:border-torcoroma-gold outline-none transition text-sm text-torcoroma-dark font-semibold uppercase"
                  value={newColorNameForEdit}
                  onChange={(e) => setNewColorNameForEdit(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditColorModal(false);
                    setSelectedModelForEditColor(null);
                    setOldColorForEdit('');
                    setNewColorNameForEdit('');
                  }}
                  className="w-1/2 py-3 border border-gray-300 rounded-xl text-gray-700 font-bold hover:bg-gray-50 transition text-sm cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving || !newColorNameForEdit.trim()}
                  className="w-1/2 py-3 bg-torcoroma-gold text-white font-bold rounded-xl hover:bg-yellow-600 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed transition text-sm cursor-pointer shadow-md shadow-yellow-500/10"
                >
                  {saving ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Confirmación para Eliminar Color */}
      {showDeleteColorModal && selectedModelForDeleteColor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-gray-100 overflow-hidden transform transition-all p-6 text-center">
            <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-100 shadow-md">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-torcoroma-dark uppercase tracking-wide">¿ELIMINAR COLOR?</h3>
            <p className="text-sm text-gray-500 mt-2 leading-relaxed">
              Estás a punto de eliminar el color <strong className="text-torcoroma-dark">"{colorForDelete}"</strong> del modelo <strong className="text-torcoroma-dark">"{selectedModelForDeleteColor.nombre}"</strong>. Esto eliminará permanentemente todo su stock e hileras asociadas en la base de datos de forma irreversible.
            </p>

            <div className="flex gap-3 pt-6 mt-6 border-t border-gray-100">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteColorModal(false);
                  setSelectedModelForDeleteColor(null);
                  setColorForDelete('');
                }}
                className="w-1/2 py-3 border border-gray-300 rounded-xl text-gray-700 font-bold hover:bg-gray-50 transition text-sm cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteColorSubmit}
                disabled={saving}
                className="w-1/2 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition text-sm cursor-pointer shadow-md shadow-red-500/10"
              >
                {saving ? 'Eliminando...' : 'Sí, Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
