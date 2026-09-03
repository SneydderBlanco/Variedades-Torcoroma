import React, { useState, useEffect } from 'react';
import { X, UploadCloud, Image as ImageIcon, Save, Layout } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
const getImgUrl = (path) => path ? (path.startsWith('http') ? path : `${API_URL}${path}`) : '';


export default function WebConfigModal({ onClose }) {
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState({
    hero_subtitle: '',
    hero_title: '',
    hero_text: '',
    promo_title: '',
    promo_text: '',
    hero_img: null,
    promo_img: null
  });

  const [previewHero, setPreviewHero] = useState(null);
  const [previewPromo, setPreviewPromo] = useState(null);

  const [fileHero, setFileHero] = useState(null);
  const [filePromo, setFilePromo] = useState(null);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const res = await fetch(`${API_URL}/api/ecommerce/config`);
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
        if (data.hero_img) setPreviewHero(getImgUrl(data.hero_img));
        if (data.promo_img) setPreviewPromo(getImgUrl(data.promo_img));
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleHeroUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFileHero(file);
      setPreviewHero(URL.createObjectURL(file));
    }
  };

  const handlePromoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFilePromo(file);
      setPreviewPromo(URL.createObjectURL(file));
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('hero_subtitle', config.hero_subtitle || '');
      formData.append('hero_title', config.hero_title || '');
      formData.append('hero_text', config.hero_text || '');
      formData.append('promo_title', config.promo_title || '');
      formData.append('promo_text', config.promo_text || '');

      if (fileHero) formData.append('hero_img', fileHero);
      if (filePromo) formData.append('promo_img', filePromo);

      const res = await fetch(`${API_URL}/api/ecommerce/admin/config`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      if (res.ok) {
        alert('Apariencia actualizada correctamente.');
        onClose();
      } else {
        alert('Error al guardar la configuración.');
      }
    } catch (error) {
      console.error(error);
      alert('Error de conexión.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-torcoroma-gold" />
            Apariencia de la Tienda Web
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors bg-white rounded-full p-1 shadow-sm border border-gray-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-8 bg-white flex-1">
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4 border-b pb-2">
              <span className="bg-torcoroma-gold text-white text-xs font-black px-2 py-1 rounded">1</span>
              <h3 className="font-bold text-gray-800">Banner Principal (Hero)</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-black text-gray-600 mb-1 block uppercase">Antetítulo</label>
                  <input type="text" value={config.hero_subtitle || ''} onChange={e => setConfig({...config, hero_subtitle: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-semibold outline-none focus:border-torcoroma-gold" placeholder="Ej. NUEVA COLECCIÓN" />
                </div>
                <div>
                  <label className="text-xs font-black text-gray-600 mb-1 block uppercase">Título Principal</label>
                  <input type="text" value={config.hero_title || ''} onChange={e => setConfig({...config, hero_title: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-semibold outline-none focus:border-torcoroma-gold" placeholder="Ej. Eleva Tu Estilo." />
                </div>
                <div>
                  <label className="text-xs font-black text-gray-600 mb-1 block uppercase">Texto descriptivo</label>
                  <textarea value={config.hero_text || ''} onChange={e => setConfig({...config, hero_text: e.target.value})} rows="3" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-semibold outline-none focus:border-torcoroma-gold resize-none" placeholder="Descubre los calzados más exclusivos..." />
                </div>
              </div>
              <div>
                <label className="text-xs font-black text-gray-600 mb-1 block uppercase">Fondo del Banner</label>
                <div className="border-2 border-dashed border-gray-300 rounded-xl overflow-hidden relative bg-gray-50 h-48 flex items-center justify-center group">
                  {previewHero ? (
                    <img src={previewHero} alt="Preview Hero" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-gray-400 flex flex-col items-center">
                      <ImageIcon className="w-8 h-8 mb-2" />
                      <span className="text-xs font-bold">Sin imagen</span>
                    </div>
                  )}
                  <label className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                    <span className="text-white font-bold text-sm flex items-center gap-2"><UploadCloud className="w-4 h-4"/> Cambiar Fondo</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleHeroUpload} />
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4 border-b pb-2">
              <span className="bg-torcoroma-gold text-white text-xs font-black px-2 py-1 rounded">2</span>
              <h3 className="font-bold text-gray-800">Banner Secundario (Promocional)</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-black text-gray-600 mb-1 block uppercase">Título Promocional</label>
                  <input type="text" value={config.promo_title || ''} onChange={e => setConfig({...config, promo_title: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-semibold outline-none focus:border-torcoroma-gold" placeholder="Ej. Estilo y Confort..." />
                </div>
                <div>
                  <label className="text-xs font-black text-gray-600 mb-1 block uppercase">Texto Promocional</label>
                  <textarea value={config.promo_text || ''} onChange={e => setConfig({...config, promo_text: e.target.value})} rows="2" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-semibold outline-none focus:border-torcoroma-gold resize-none" placeholder="Encuentra tu talla ideal..." />
                </div>
              </div>
              <div>
                <label className="text-xs font-black text-gray-600 mb-1 block uppercase">Fondo Promocional</label>
                <div className="border-2 border-dashed border-gray-300 rounded-xl overflow-hidden relative bg-gray-50 h-32 flex items-center justify-center group">
                  {previewPromo ? (
                    <img src={previewPromo} alt="Preview Promo" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-gray-400 flex flex-col items-center">
                      <ImageIcon className="w-6 h-6 mb-1" />
                      <span className="text-xs font-bold">Sin imagen</span>
                    </div>
                  )}
                  <label className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                    <span className="text-white font-bold text-sm flex items-center gap-2"><UploadCloud className="w-4 h-4"/> Cambiar Fondo</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handlePromoUpload} />
                  </label>
                </div>
                <span className="text-[11px] text-gray-400 block mt-1">Recomendado: Imagen horizontal panorámica (ej. 1200 x 400 px)</span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-200 rounded-lg transition-colors">
            Cancelar
          </button>
          <button onClick={handleSave} disabled={loading} className="px-4 py-2 bg-torcoroma-gold text-white text-sm font-bold rounded-lg hover:bg-yellow-500 transition-colors shadow-sm flex items-center gap-2 disabled:opacity-50">
            {loading ? 'Guardando...' : <><Save className="w-4 h-4" /> Guardar Cambios</>}
          </button>
        </div>
      </div>
    </div>
  );
}
