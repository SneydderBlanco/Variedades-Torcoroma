import React, { useState, useEffect } from 'react';
import { Search, UploadCloud, Globe, CheckCircle, Tag, XCircle, Image as ImageIcon, X, Layout } from 'lucide-react';
import WebConfigModal from './WebConfigModal';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
const getImgUrl = (path) => path ? (path.startsWith('http') ? path : `${API_URL}${path}`) : '';


export default function EcommercePanel() {
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [unloadedProducts, setUnloadedProducts] = useState([]);
  
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [loading, setLoading] = useState(true);
  
  // Estados de edición
  const [editingProd, setEditingProd] = useState(null);
  const [selectedCategoria, setSelectedCategoria] = useState('');
  const [tituloWeb, setTituloWeb] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [precioOferta, setPrecioOferta] = useState('');
  const [isOfertaActiva, setIsOfertaActiva] = useState(false);
  const [imagenes, setImagenes] = useState([]);
  const [modelColors, setModelColors] = useState([]);
  const [selectedColorUI, setSelectedColorUI] = useState('');

  // Estados para Cargar Modelo
  const [loadingUnloaded, setLoadingUnloaded] = useState(false);

  useEffect(() => {
    fetchCategorias();
    fetchProductos();
  }, []);

  const fetchCategorias = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/ecommerce/categorias`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setCategorias(await res.json());
    } catch (error) {
      console.error(error);
    }
  };

  const fetchProductos = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/ecommerce/admin/productos`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const dbProds = await res.json();
        setProductos(prev => {
          const drafts = prev.filter(p => p.isDraft);
          return [...drafts, ...dbProds];
        });
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUnloadedAndOpenModal = async () => {
    setLoadingUnloaded(true);
    setShowLoadModal(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/ecommerce/admin/productos/disponibles`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setUnloadedProducts(await res.json());
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingUnloaded(false);
    }
  };

  const handleLoadModel = (modelo) => {
    const newDraft = {
      isDraft: true,
      draftId: Date.now() + Math.random(),
      id_modelo: modelo.id_modelo,
      modelo_nombre: modelo.modelo_nombre,
      color_nombre: '',
      id_categoria: '',
      titulo_web: '',
      descripcion: '',
      precio_oferta: null,
      destacado: false,
      activo_web: false,
      cant_imagenes: 0
    };
    setProductos(prev => [newDraft, ...prev]);
    setShowLoadModal(false);
    handleEditClick(newDraft);
  };

  const handleRemoveFromWeb = async (id_modelo, color_nombre, isDraft, draftId) => {
    if (isDraft) {
      setProductos(prev => prev.filter(p => p.draftId !== draftId));
      if (editingProd?.draftId === draftId) setEditingProd(null);
      return;
    }
    if (!window.confirm('¿Seguro que deseas quitar esta publicación del gestor web? Sus fotos se mantendrán guardadas.')) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/ecommerce/admin/productos/${id_modelo}?color=${encodeURIComponent(color_nombre)}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        if (editingProd?.id_modelo === id_modelo && editingProd?.color_nombre === color_nombre) setEditingProd(null);
        fetchProductos();
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleEditClick = async (prod) => {
    setEditingProd(prod);
    setSelectedCategoria(prod.id_categoria || '');
    setTituloWeb(prod.titulo_web || '');
    setDescripcion(prod.descripcion || '');
    setIsOfertaActiva(prod.precio_oferta != null);
    setPrecioOferta(prod.precio_oferta || '');
    setSelectedColorUI(prod.color_nombre || '');
    
    if (!prod.isDraft) {
      loadImagenes(prod.id_modelo, prod.color_nombre);
    } else {
      setImagenes([]);
    }

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/ecommerce/admin/productos/${prod.id_modelo}/colores`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const colors = await res.json();
        const uniqueColors = [...new Set(colors.filter(Boolean))];
        setModelColors(uniqueColors);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const loadImagenes = async (id_modelo, color_nombre) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/ecommerce/admin/productos/${id_modelo}/imagenes?color=${encodeURIComponent(color_nombre)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setImagenes(data);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleSave = async () => {
    if (!selectedColorUI) {
      alert("Debes seleccionar un color para publicarlo.");
      return;
    }

    if (editingProd.isDraft) {
      const isDuplicate = productos.some(p => !p.isDraft && p.id_modelo === editingProd.id_modelo && p.color_nombre === selectedColorUI);
      if (isDuplicate) {
        alert("Ese color ya está publicado para este modelo.");
        return;
      }
    }

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/ecommerce/admin/productos/${editingProd.id_modelo}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          color: selectedColorUI,
          id_categoria: selectedCategoria,
          titulo_web: tituloWeb,
          descripcion,
          precio_oferta: isOfertaActiva ? precioOferta : null,
          destacado: false,
          activo_web: true
        })
      });
      if (res.ok) {
        if (editingProd.isDraft) {
          setProductos(prev => prev.filter(p => p.draftId !== editingProd.draftId));
        }
        setEditingProd(null);
        fetchProductos();
      } else {
        alert('Error al guardar configuración web');
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('imagen', file);
    if (editingProd.color_nombre) {
      formData.append('color', editingProd.color_nombre);
    }

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/ecommerce/admin/productos/${editingProd.id_modelo}/imagenes`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      if (res.ok) {
        loadImagenes(editingProd.id_modelo, editingProd.color_nombre);
        fetchProductos(); // Actualizar el contador de imágenes en la lista
      } else {
        alert('Error subiendo imagen');
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleDeleteImage = async (id_imagen) => {
    if (!window.confirm('¿Seguro que deseas eliminar esta foto?')) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/ecommerce/admin/imagenes/${id_imagen}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        loadImagenes(editingProd.id_modelo, editingProd.color_nombre);
        fetchProductos();
      } else {
        alert('Error al eliminar imagen');
      }
    } catch (error) {
      console.error(error);
    }
  };

  const filteredProducts = productos.filter(p => 
    p.modelo_nombre.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const groupedUnloaded = Object.values(unloadedProducts.reduce((acc, curr) => {
    if (!acc[curr.id_modelo]) {
      acc[curr.id_modelo] = {
        id_modelo: curr.id_modelo,
        modelo_nombre: curr.modelo_nombre,
        proveedor_nombre: curr.proveedor_nombre,
        colores: []
      };
    }
    acc[curr.id_modelo].colores.push(curr.color);
    return acc;
  }, {}));

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 flex flex-col xl:h-full overflow-y-auto xl:overflow-hidden">
      {/* HEADER */}
      <div className="p-6 border-b border-gray-150 flex flex-col xl:flex-row justify-between items-center bg-gray-50/50 gap-4">
        <div>
          <h2 className="text-xl font-black text-torcoroma-dark flex items-center gap-2">
            <Globe className="text-torcoroma-gold w-6 h-6" /> Gestor Tienda Virtual
          </h2>
          <p className="text-xs text-gray-500 font-medium mt-1">Configura cómo se ven tus zapatos en internet.</p>
        </div>
        <div className="flex items-center gap-3 w-full xl:w-auto">
          <div className="relative flex-grow xl:w-64">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar modelo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-torcoroma-gold outline-none shadow-sm"
            />
          </div>
          <button
            onClick={() => setShowConfigModal(true)}
            className="bg-white border border-gray-200 text-gray-700 font-medium py-2 px-4 rounded-xl hover:bg-gray-50 transition-all flex items-center gap-2 text-sm whitespace-nowrap shadow-sm"
          >
            <Layout className="w-4 h-4" />
            Apariencia
          </button>
          <button
            onClick={fetchUnloadedAndOpenModal}
            className="bg-gray-900 text-white font-medium py-2 px-4 rounded-xl hover:bg-black transition-all flex items-center gap-2 text-sm whitespace-nowrap shadow-sm"
          >
            <UploadCloud className="w-4 h-4" />
            Cargar Modelo
          </button>
        </div>
      </div>

      {/* CONTENT */}
      <div className="flex-grow flex flex-col xl:flex-row h-auto xl:h-[calc(100vh-250px)]">
        
        {/* LISTA DE PRODUCTOS */}
        <div className="w-full xl:w-2/3 xl:h-full h-[500px] border-r border-gray-150 overflow-y-auto p-4 bg-gray-50/30">
          {loading ? (
            <div className="animate-pulse flex flex-col gap-3">
              {[1,2,3,4].map(i => <div key={i} className="h-16 bg-gray-200 rounded-xl"></div>)}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredProducts.map(prod => {
                const isSelected = prod.isDraft 
                  ? editingProd?.draftId === prod.draftId 
                  : editingProd?.id_modelo === prod.id_modelo && editingProd?.color_nombre === prod.color_nombre && !editingProd?.isDraft;
                  
                return (
                  <div 
                    key={prod.isDraft ? prod.draftId : `${prod.id_modelo}-${prod.color_nombre}`}
                    onClick={() => handleEditClick(prod)}
                    className={`bg-white border rounded-2xl p-4 cursor-pointer transition shadow-sm hover:shadow-md ${
                      isSelected ? 'border-torcoroma-gold ring-1 ring-torcoroma-gold bg-yellow-50/10' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2 relative group">
                      <div>
                        <h3 className="font-bold text-gray-900 text-sm uppercase leading-tight truncate pr-2" title={prod.modelo_nombre}>
                          {prod.modelo_nombre}
                        </h3>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase border inline-block mt-1 ${prod.isDraft ? 'bg-orange-100 text-orange-700 border-orange-200' : 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                          {prod.isDraft ? 'Nuevo Borrador' : prod.color_nombre}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        {prod.activo_web ? (
                          <CheckCircle className="text-emerald-500 w-5 h-5 flex-shrink-0" title="Activo en Web" />
                        ) : (
                          <CheckCircle className="text-gray-300 w-5 h-5 flex-shrink-0" title="No Activo en Web" />
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); handleRemoveFromWeb(prod.id_modelo, prod.color_nombre, prod.isDraft, prod.draftId); }}
                          className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity ml-1 cursor-pointer"
                          title={prod.isDraft ? "Descartar borrador" : "Quitar del gestor web"}
                        >
                          <XCircle className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 text-xs font-semibold text-gray-500 mt-2">
                      <span className="flex items-center gap-1">
                        <ImageIcon className="w-3.5 h-3.5" /> {prod.cant_imagenes || 0} Fotos
                      </span>
                      <span className="flex items-center gap-1">
                        <Tag className="w-3.5 h-3.5" /> {prod.categoria_nombre || 'Sin Categ.'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* PANEL DE EDICIÓN */}
        <div className="w-full xl:w-1/3 h-auto xl:h-full bg-white p-6 overflow-visible xl:overflow-y-auto shadow-inner">
          {!editingProd ? (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-50 space-y-4">
              <Globe className="w-20 h-20 text-gray-300" />
              <p className="text-sm font-bold text-gray-500">Selecciona un producto<br/>para configurar su perfil web.</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Producto Original</span>
                <h3 className="text-lg font-black text-gray-900 leading-tight">{editingProd.modelo_nombre}</h3>
              </div>

              {/* SECCIÓN FOTOS */}
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                <h4 className="text-xs font-black uppercase text-gray-500 mb-3 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4" /> Fotografías Web
                </h4>
                
                {editingProd.isDraft ? (
                  <div className="w-full h-24 border-2 border-dashed border-torcoroma-gold/50 bg-yellow-50 rounded-xl flex items-center justify-center text-xs text-torcoroma-dark font-bold text-center px-4">
                    Guarda la configuración seleccionando un color para poder subir fotos.
                  </div>
                ) : (
                  <>
                    <div className="flex gap-2 overflow-x-auto pb-2 mb-3 snap-x">
                      {imagenes.length === 0 ? (
                        <div className="w-full h-24 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center text-xs text-gray-400 font-semibold bg-gray-50/50">
                          Sin imágenes
                        </div>
                      ) : (
                        imagenes.map(img => (
                          <div key={img.id_imagen} className="relative w-24 h-24 flex-shrink-0 rounded-xl border border-gray-200 overflow-hidden snap-center bg-white group">
                            <img src={getImgUrl(img.ruta_imagen)} className="w-full h-full object-contain" alt="Zapato" />
                            <button 
                              onClick={() => handleDeleteImage(img.id_imagen)}
                              className="absolute top-1.5 right-1.5 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 hover:scale-110 active:scale-95 transition-all opacity-0 group-hover:opacity-100 z-10"
                              title="Eliminar foto"
                            >
                              <X className="w-3.5 h-3.5" strokeWidth={3} />
                            </button>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className="flex items-center justify-center gap-2 w-full bg-gray-900 text-white hover:bg-black px-4 py-2.5 rounded-xl font-bold text-xs uppercase cursor-pointer transition active:scale-95 shadow-sm whitespace-nowrap">
                        <UploadCloud className="w-4 h-4" />
                        Subir Foto
                        <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                      </label>
                    </div>
                  </>
                )}
              </div>

              {/* SECCIÓN CONFIGURACIÓN */}
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-black text-gray-600 mb-1 block">TÍTULO EN LA WEB</label>
                  <input type="text" value={tituloWeb} onChange={e=>setTituloWeb(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-semibold outline-none focus:border-torcoroma-gold" />
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="text-xs font-black text-gray-600 mb-1 block">CATEGORÍA</label>
                    <select value={selectedCategoria} onChange={e=>setSelectedCategoria(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-bold outline-none focus:border-torcoroma-gold bg-white">
                      <option value="">Seleccionar...</option>
                      {categorias.map(c => <option key={c.id_categoria} value={c.id_categoria}>{c.nombre}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-black text-gray-600 mb-1 block">COLOR</label>
                    <select 
                      value={selectedColorUI} 
                      onChange={e=>setSelectedColorUI(e.target.value)} 
                      className={`w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-bold outline-none focus:border-torcoroma-gold bg-white uppercase text-gray-700 ${!editingProd.isDraft ? 'bg-gray-100 cursor-not-allowed text-gray-500' : ''}`}
                      disabled={!editingProd.isDraft}
                      title={!editingProd.isDraft ? "No puedes cambiar el color de una publicación ya guardada. Elimínala y crea otra." : ""}
                    >
                      <option value="">Seleccionar...</option>
                      {modelColors.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="text-xs font-black text-gray-600 mb-1 block">DESCRIPCIÓN</label>
                  <textarea value={descripcion} onChange={e=>setDescripcion(e.target.value)} rows="3" placeholder="Ej. Zapatillas súper cómodas para el día a día..." className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium outline-none focus:border-torcoroma-gold resize-none" />
                </div>

                <div className="flex flex-col gap-3">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      checked={isOfertaActiva} 
                      onChange={(e) => {
                        setIsOfertaActiva(e.target.checked);
                        if (!e.target.checked) setPrecioOferta('');
                      }} 
                      className="w-4 h-4 text-torcoroma-gold focus:ring-torcoroma-gold rounded" 
                    />
                    <span className="text-sm font-bold text-torcoroma-dark">🏷️ Oferta</span>
                  </label>
                  
                  {isOfertaActiva && (
                    <div className="bg-red-50 p-3 rounded-lg border border-red-100">
                      <label className="text-xs font-black text-red-600 mb-1 block">PRECIO OFERTA ($)</label>
                      <input 
                        type="number" 
                        placeholder="Ej. 85000" 
                        value={precioOferta} 
                        onChange={e=>setPrecioOferta(e.target.value)} 
                        className="w-full px-3 py-2 border border-red-200 rounded-lg text-sm font-semibold outline-none focus:border-red-400 placeholder-red-300 bg-white" 
                      />
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <button onClick={handleSave} className="w-full bg-[#F5C227] hover:bg-[#e0b01c] text-torcoroma-dark font-black text-xs uppercase py-3 rounded-xl transition shadow-md active:scale-95">
                    Guardar Configuración
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODAL PARA CARGAR MODELO */}
      {showLoadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col overflow-hidden">
            <div className="bg-gray-900 text-white p-5 flex items-center justify-between">
              <h3 className="font-extrabold text-base tracking-wider flex items-center gap-2">
                <UploadCloud className="w-5 h-5" />
                SELECCIONAR MODELO PARA WEB
              </h3>
              <button 
                onClick={() => setShowLoadModal(false)}
                className="text-gray-300 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-4 flex-grow overflow-y-auto bg-gray-50">
              {loadingUnloaded ? (
                <div className="flex justify-center items-center py-12">
                  <div className="animate-spin w-8 h-8 border-4 border-torcoroma-gold border-t-transparent rounded-full"></div>
                </div>
              ) : unloadedProducts.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <p className="font-medium text-lg">Todos los modelos ya están cargados en el gestor web.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {groupedUnloaded.map(prod => (
                    <div 
                      key={prod.id_modelo}
                      onClick={() => handleLoadModel(prod)}
                      className="bg-white border border-gray-200 rounded-xl p-4 cursor-pointer hover:border-torcoroma-gold hover:shadow-md transition-all group flex flex-col justify-between"
                    >
                      <div>
                        <h4 className="font-bold text-gray-900 text-sm mb-1 line-clamp-2">{prod.modelo_nombre}</h4>
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                          <Tag className="w-3 h-3" /> {prod.proveedor_nombre || 'Sin Proveedor'}
                        </p>
                      </div>
                      <div className="mt-3 text-right">
                        <span className="text-xs font-bold text-torcoroma-gold opacity-0 group-hover:opacity-100 transition-opacity">
                          Cargar Modelo →
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {showConfigModal && <WebConfigModal onClose={() => setShowConfigModal(false)} />}
    </div>
  );
}
