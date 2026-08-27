import React, { useState, useEffect } from 'react';
import { Plus, Minus, X, Building, PlusCircle, Check, Trash2, Edit } from 'lucide-react';

const PermitidosPanel = ({ modelos, fetchInventory }) => {
  const [locales, setLocales] = useState([]);
  const [stockPermitidos, setStockPermitidos] = useState([]);
  const [showAddLocalModal, setShowAddLocalModal] = useState(false);
  const [newLocalName, setNewLocalName] = useState('');
  
  // Estado para los modelos que se están visualizando por local (ya que si no tienen stock, el backend no los envía)
  const [activeModelsByLocal, setActiveModelsByLocal] = useState({});
  
  // Estado para añadir un modelo nuevo a un local
  const [addingModelToLocal, setAddingModelToLocal] = useState(null); // id_local
  const [selectedNewModel, setSelectedNewModel] = useState('');

  // Estado para la fila en línea "Añadir color"
  // addingRow = { localId, modeloId }
  const [addingRow, setAddingRow] = useState(null);
  const [rowColor, setRowColor] = useState('');
  const [rowSize, setRowSize] = useState('');

  // Estado para editar un local
  const [editingLocal, setEditingLocal] = useState(null); // id_local
  const [editLocalName, setEditLocalName] = useState('');

  // Estado para editar el nombre de un modelo globalmente
  const [editingModel, setEditingModel] = useState(null); // modeloId
  const [editModelName, setEditModelName] = useState('');

  const fetchLocales = async () => {
    try {
      const res = await fetch('http://localhost:4000/api/pos/locales');
      const data = await res.json();
      setLocales(data);
    } catch (err) {
      console.error('Error fetching locales', err);
    }
  };

  const fetchStock = async () => {
    try {
      const res = await fetch('http://localhost:4000/api/pos/permitidos/stock');
      const data = await res.json();
      setStockPermitidos(data);
      
      // Sincronizar modelos activos
      const active = {};
      data.forEach(localStock => {
        const id = localStock.id_local;
        active[id] = Object.keys(localStock.modelos).map(Number);
      });
      setActiveModelsByLocal(prev => {
        const next = { ...prev };
        for (const [id, models] of Object.entries(active)) {
          next[id] = Array.from(new Set([...(next[id] || []), ...models]));
        }
        return next;
      });
    } catch (err) {
      console.error('Error fetching stock', err);
    }
  };

  useEffect(() => {
    fetchLocales();
    fetchStock();
  }, []);

  const handleAddLocal = async () => {
    if (!newLocalName.trim()) return;
    try {
      const res = await fetch('http://localhost:4000/api/pos/locales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre_local: newLocalName })
      });
      if (res.ok) {
        setNewLocalName('');
        setShowAddLocalModal(false);
        fetchLocales();
      } else {
        const err = await res.json();
        alert(err.error || 'Error al agregar local');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRenameLocal = async (id_local) => {
    if (!editLocalName.trim()) return;
    try {
      const res = await fetch(`http://localhost:4000/api/pos/locales/${id_local}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre_local: editLocalName })
      });
      if (res.ok) {
        setEditingLocal(null);
        setEditLocalName('');
        fetchLocales();
      } else {
        const err = await res.json();
        alert(err.error || 'Error al renombrar local');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteLocal = async (id_local) => {
    if (!confirm('¿Estás seguro de eliminar este local? Todo su stock se devolverá al inventario principal.')) return;
    try {
      const res = await fetch(`http://localhost:4000/api/pos/locales/${id_local}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchLocales();
        fetchStock();
        if (fetchInventory) fetchInventory();
      } else {
        const err = await res.json();
        alert(err.error || 'Error al eliminar local');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveStock = async (id_local, modeloId, color, talla, cantidad) => {
    try {
      const res = await fetch('http://localhost:4000/api/pos/permitidos/stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_local, modeloId, color, talla, cantidad })
      });
      if (res.ok) {
        fetchStock();
        if (fetchInventory) fetchInventory();
      } else {
        const err = await res.json();
        alert(err.error || 'Error al guardar stock');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddModelToLocal = (id_local) => {
    if (!selectedNewModel) return;
    const mId = parseInt(selectedNewModel);
    setActiveModelsByLocal(prev => ({
      ...prev,
      [id_local]: Array.from(new Set([...(prev[id_local] || []), mId]))
    }));
    setAddingModelToLocal(null);
    setSelectedNewModel('');
    // Automáticamente abrir la fila de "Añadir color" para este nuevo modelo
    setAddingRow({ localId: id_local, modeloId: mId });
    setRowColor('');
    setRowSize('');
  };

  const handleSizeChange = async (id_local, modeloId, color, oldSize, newSize) => {
    if (!newSize || oldSize === newSize) return;
    try {
      await fetch('http://localhost:4000/api/pos/permitidos/stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_local, modeloId, color, talla: oldSize, cantidad: 0 })
      });
      const res = await fetch('http://localhost:4000/api/pos/permitidos/stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_local, modeloId, color, talla: newSize, cantidad: 1 })
      });
      if (res.ok) {
        fetchStock();
        if (fetchInventory) fetchInventory();
      } else {
        alert('Error al actualizar la talla');
        fetchStock();
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleRenameModel = async (modeloId) => {
    if (!editModelName.trim()) return;
    try {
      const res = await fetch('http://localhost:4000/api/pos/modelos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modeloId, nuevoNombre: editModelName })
      });
      if (res.ok) {
        setEditingModel(null);
        setEditModelName('');
        fetchStock();
        if (fetchInventory) fetchInventory(); // Refresh the main inventory models array
      } else {
        const err = await res.json();
        alert(err.error || 'Error al renombrar modelo');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemoveModelFromLocal = async (id_local, modeloId) => {
    if (!confirm('¿Devolver todo el stock de este modelo al inventario principal?')) return;
    try {
      const localStock = stockPermitidos.find(s => s.id_local === id_local);
      if (!localStock) return;
      const modeloStock = localStock.modelos[modeloId];
      if (!modeloStock || !modeloStock.colores) return;

      const requests = [];
      Object.entries(modeloStock.colores).forEach(([colorName, tallas]) => {
        tallas.forEach(t => {
          if (t.cantidad > 0) {
            requests.push(
              fetch('http://localhost:4000/api/pos/permitidos/stock', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id_local, modeloId, color: colorName, talla: t.talla, cantidad: 0 })
              })
            );
          }
        });
      });
      await Promise.all(requests);
      
      setActiveModelsByLocal(prev => ({
        ...prev,
        [id_local]: (prev[id_local] || []).filter(id => id !== modeloId)
      }));
      
      fetchStock();
      if (fetchInventory) fetchInventory();
    } catch (err) {
      console.error(err);
      alert('Error al remover el modelo del local');
    }
  };

  const handleAddRowSubmit = (id_local, modeloId) => {
    if (!rowColor || !rowSize) return;
    handleSaveStock(id_local, modeloId, rowColor, rowSize, 1);
    // Limpiamos solo los inputs para dejar lista la fila para el siguiente (Paso 3, 4...)
    setRowColor('');
    setRowSize('');
  };

  return (
    <div className="p-4 bg-gray-50 rounded-lg min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Building size={28} className="text-[#F5C227]" />
          Distribución a Locales Permitidos
        </h2>
        <button
          onClick={() => setShowAddLocalModal(true)}
          className="bg-[#F5C227] hover:bg-[#d4a822] text-gray-900 font-bold py-2 px-4 rounded shadow flex items-center gap-2 transition"
        >
          <Plus size={20} /> Agregar Local
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {locales.map(local => {
          const localStock = stockPermitidos.find(s => s.id_local === local.id_local) || { modelos: {} };
          const activeModels = activeModelsByLocal[local.id_local] || [];

          return (
            <div key={local.id_local} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-gray-50/80 px-6 py-4 flex justify-between items-center border-b border-gray-200">
                {editingLocal === local.id_local ? (
                  <div className="flex items-center gap-2">
                    <input 
                      type="text" 
                      className="border border-gray-300 rounded px-2 py-1 outline-none focus:ring-2 focus:ring-[#F5C227] text-gray-700 font-bold uppercase tracking-wide"
                      value={editLocalName}
                      onChange={e => setEditLocalName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleRenameLocal(local.id_local)}
                      autoFocus
                    />
                    <button onClick={() => handleRenameLocal(local.id_local)} className="text-emerald-600 hover:bg-emerald-50 p-1.5 rounded transition"><Check size={18}/></button>
                    <button onClick={() => setEditingLocal(null)} className="text-gray-500 hover:bg-gray-100 p-1.5 rounded transition"><X size={18}/></button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <h3 className="text-xl font-bold text-gray-700 tracking-wide uppercase">{local.nombre_local}</h3>
                    <div className="flex gap-1 opacity-60 hover:opacity-100 transition">
                      <button onClick={() => { setEditingLocal(local.id_local); setEditLocalName(local.nombre_local); }} className="text-gray-500 hover:text-blue-600 hover:bg-blue-50 p-1 rounded transition" title="Renombrar Local"><Edit size={16}/></button>
                      <button onClick={() => handleDeleteLocal(local.id_local)} className="text-gray-500 hover:text-red-600 hover:bg-red-50 p-1 rounded transition" title="Eliminar Local y Devolver Stock"><Trash2 size={16}/></button>
                    </div>
                  </div>
                )}
                <button
                  onClick={() => setAddingModelToLocal(local.id_local)}
                  className="text-sm font-bold text-[#F5C227] hover:text-[#d4a822] flex items-center gap-1.5 transition bg-yellow-50 px-3 py-1.5 rounded-lg border border-yellow-100"
                >
                  <PlusCircle size={16} /> Añadir Modelo
                </button>
              </div>

              {addingModelToLocal === local.id_local && (
                <div className="p-4 bg-yellow-50/30 border-b border-gray-200 flex items-center gap-4">
                  <select
                    className="border border-gray-300 rounded-lg p-2 text-sm w-64 focus:ring-2 focus:ring-[#F5C227] outline-none font-semibold text-gray-700"
                    value={selectedNewModel}
                    onChange={e => setSelectedNewModel(e.target.value)}
                  >
                    <option value="">Seleccione el modelo...</option>
                    {modelos.map(m => (
                      <option key={m.id_modelo} value={m.id_modelo}>{m.nombre}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => handleAddModelToLocal(local.id_local)}
                    className="bg-[#F5C227] hover:bg-[#d4a822] text-gray-900 font-bold py-2 px-4 rounded-lg text-sm transition"
                  >
                    Confirmar
                  </button>
                  <button
                    onClick={() => setAddingModelToLocal(null)}
                    className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-2 px-4 rounded-lg text-sm transition"
                  >
                    Cancelar
                  </button>
                </div>
              )}

              <div className="p-6">
                {activeModels.length === 0 ? (
                  <p className="text-gray-400 text-sm italic text-center py-4">No hay modelos asignados a este local.</p>
                ) : (
                  <div className="space-y-6">
                    {activeModels.map(modeloId => {
                      const modeloGlobalInfo = modelos.find(m => m.id_modelo === modeloId);
                      const modeloStock = localStock.modelos[modeloId];
                      const nombreModelo = modeloGlobalInfo ? modeloGlobalInfo.nombre : (modeloStock ? modeloStock.modelo_nombre : `Modelo #${modeloId}`);
                      
                      // Extraer todas las filas de stock (color, talla, cantidad) para hacer la tabla
                      const rows = [];
                      if (modeloStock && modeloStock.colores) {
                        Object.entries(modeloStock.colores).forEach(([colorName, tallas]) => {
                          tallas.forEach(t => {
                            if (t.cantidad > 0) {
                              rows.push({ color: colorName, talla: t.talla, cantidad: t.cantidad });
                            }
                          });
                        });
                      }

                      const isAddingColor = addingRow && addingRow.localId === local.id_local && addingRow.modeloId === modeloId;

                      return (
                        <div key={modeloId} className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                          <div className="bg-gray-100/50 px-4 py-3 font-extrabold text-gray-800 border-b border-gray-200 flex justify-between items-center h-12">
                            {editingModel === modeloId ? (
                              <div className="flex items-center gap-2 w-full">
                                <input 
                                  type="text" 
                                  className="border border-gray-300 rounded px-2 py-1 outline-none focus:ring-2 focus:ring-[#F5C227] text-gray-700 font-bold uppercase tracking-wide flex-1 text-sm"
                                  value={editModelName}
                                  onChange={e => setEditModelName(e.target.value)}
                                  onKeyDown={e => e.key === 'Enter' && handleRenameModel(modeloId)}
                                  autoFocus
                                />
                                <button onClick={() => handleRenameModel(modeloId)} className="text-emerald-600 hover:bg-emerald-50 p-1 rounded transition"><Check size={18}/></button>
                                <button onClick={() => setEditingModel(null)} className="text-gray-500 hover:bg-gray-100 p-1 rounded transition"><X size={18}/></button>
                              </div>
                            ) : (
                              <>
                                <span className="truncate">{nombreModelo}</span>
                                <div className="flex gap-1 opacity-60 hover:opacity-100 transition ml-2">
                                  <button 
                                    onClick={() => { setEditingModel(modeloId); setEditModelName(nombreModelo); }}
                                    className="text-gray-400 hover:text-blue-500 hover:bg-blue-50 p-1 rounded transition"
                                    title="Renombrar modelo"
                                  >
                                    <Edit size={16} />
                                  </button>
                                  <button 
                                    onClick={() => handleRemoveModelFromLocal(local.id_local, modeloId)}
                                    className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-1 rounded transition"
                                    title="Remover modelo del local (devolverá el stock)"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                          
                          <div className="p-0">
                            <table className="w-full text-left border-collapse text-sm">
                              {rows.length > 0 && (
                                <thead>
                                  <tr className="bg-white border-b border-gray-100 text-gray-500 text-xs uppercase tracking-wider">
                                    <th className="py-2.5 px-4 font-semibold w-1/3">Color</th>
                                    <th className="py-2.5 px-4 font-semibold w-1/3">Talla</th>
                                    <th className="py-2.5 px-4 font-semibold text-center">Acciones</th>
                                  </tr>
                                </thead>
                              )}
                              <tbody>
                                {rows.map((r, idx) => (
                                  <tr key={idx} className="border-b border-gray-50 hover:bg-gray-50 transition">
                                    <td className="py-3 px-4 font-semibold text-gray-700">{r.color}</td>
                                    <td className="py-3 px-4 font-bold text-gray-800">
                                      <input 
                                        type="number"
                                        min="21" max="45"
                                        className="w-20 border border-gray-300 rounded p-1 text-sm focus:ring-2 focus:ring-[#F5C227] outline-none font-bold bg-white"
                                        defaultValue={r.talla}
                                        onBlur={(e) => handleSizeChange(local.id_local, modeloId, r.color, r.talla, e.target.value)}
                                      />
                                    </td>
                                    <td className="py-3 px-4 flex justify-center items-center">
                                      <button 
                                        onClick={() => handleSaveStock(local.id_local, modeloId, r.color, r.talla, 0)}
                                        className="text-red-400 hover:text-red-600 p-1.5 rounded-full hover:bg-red-50 transition"
                                        title="Eliminar asignación"
                                      >
                                        <Trash2 size={16} />
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                                
                                {isAddingColor && (
                                  <tr className="bg-yellow-50/20 border-b border-yellow-100">
                                    <td className="py-2 px-3">
                                      <select
                                        className="w-full border border-gray-300 rounded p-1.5 text-sm focus:ring-2 focus:ring-[#F5C227] outline-none"
                                        value={rowColor}
                                        onChange={e => setRowColor(e.target.value)}
                                        autoFocus
                                      >
                                        <option value="">Seleccione...</option>
                                        {modeloGlobalInfo?.colores?.map((c, i) => (
                                          <option key={i} value={c.nombre_color}>{c.nombre_color}</option>
                                        ))}
                                      </select>
                                    </td>
                                    <td className="py-2 px-3">
                                      <input
                                        type="number"
                                        min="21" max="45"
                                        placeholder="Ej: 39"
                                        className="w-full border border-gray-300 rounded p-1.5 text-sm focus:ring-2 focus:ring-[#F5C227] outline-none"
                                        value={rowSize}
                                        onChange={e => setRowSize(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleAddRowSubmit(local.id_local, modeloId)}
                                      />
                                    </td>
                                    <td className="py-2 px-3 text-center">
                                      <div className="flex justify-center gap-1">
                                        <button
                                          onClick={() => handleAddRowSubmit(local.id_local, modeloId)}
                                          className="text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 p-1.5 rounded transition"
                                          title="Guardar fila"
                                        >
                                          <Check size={18} />
                                        </button>
                                        <button
                                          onClick={() => setAddingRow(null)}
                                          className="text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 p-1.5 rounded transition"
                                          title="Cancelar"
                                        >
                                          <X size={18} />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                            
                            {!isAddingColor && (
                              <div className="px-4 py-3 bg-gray-50/50 border-t border-gray-100">
                                <button
                                  onClick={() => {
                                    setAddingRow({ localId: local.id_local, modeloId });
                                    setRowColor('');
                                    setRowSize('');
                                  }}
                                  className="text-sm font-semibold text-gray-600 hover:text-[#d4a822] flex items-center gap-1.5 transition"
                                >
                                  <Plus size={16} /> añadir color
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {locales.length === 0 && (
          <div className="text-center py-10 bg-white rounded-xl shadow-sm border border-gray-100">
            <Building size={48} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 text-lg">No hay locales permitidos registrados.</p>
            <p className="text-gray-400 text-sm">Haz clic en "Agregar Local" para comenzar.</p>
          </div>
        )}
      </div>

      {showAddLocalModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 shadow-xl w-96">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Agregar Nuevo Local</h3>
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-600 mb-1">Nombre del Local</label>
              <input
                type="text"
                className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-[#F5C227] outline-none"
                placeholder="Ej. Karen, Sede Sur..."
                value={newLocalName}
                onChange={e => setNewLocalName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddLocal()}
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowAddLocalModal(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddLocal}
                className="px-4 py-2 bg-[#F5C227] hover:bg-[#d4a822] text-gray-900 font-bold rounded-lg transition"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PermitidosPanel;
