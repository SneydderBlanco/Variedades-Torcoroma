import React, { useState, useEffect } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { ShoppingBag, Check, ChevronLeft, ChevronRight, Info, Heart, X, Maximize2 } from 'lucide-react';
import { useCart } from '../context/CartContext';
import './Producto.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
const getImgUrl = (path) => path ? (path.startsWith('http') ? path : `${API_URL}${path}`) : '';


export default function Producto() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const colorQuery = searchParams.get('color') || '';
  const { addToCart } = useCart();
  const [producto, setProducto] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedColor, setSelectedColor] = useState('');
  const [selectedTalla, setSelectedTalla] = useState('');
  const [currentImageIdx, setCurrentImageIdx] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);

  // Distancia mínima en píxeles para reconocer un deslizamiento (swipe)
  const minSwipeDistance = 40;

  const onTouchStartHandler = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMoveHandler = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEndHandler = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    if (isLeftSwipe) {
      nextImage();
    } else if (isRightSwipe) {
      prevImage();
    }
  };

  // Bloquear scroll de la página y permitir navegación con teclado en el Modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isModalOpen) return;
      if (e.key === 'Escape') setIsModalOpen(false);
      if (e.key === 'ArrowRight') nextImage();
      if (e.key === 'ArrowLeft') prevImage();
    };

    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isModalOpen, currentImageIdx]);

  // Resetear índice al cambiar de color
  useEffect(() => {
    setCurrentImageIdx(0);
  }, [selectedColor]);

  useEffect(() => {
    const fetchProducto = async () => {
      try {
        const res = await fetch(`${API_URL}/api/ecommerce/productos/${id}?color=${encodeURIComponent(colorQuery)}`);
        if (res.ok) {
          const data = await res.json();
          setProducto(data);
          
          // Seleccionar el primer color que tenga stock por defecto
          const colores = Object.keys(data.stock || {});
          if (colores.length > 0) {
            setSelectedColor(colores[0]);
          }
        } else {
          setProducto(null);
        }
      } catch (error) {
        console.error("Error al cargar producto", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProducto();
  }, [id]);

  if (loading) {
    return <div className="producto-page container mt-20"><div className="loading-spinner">Cargando detalles...</div></div>;
  }

  if (!producto) {
    return (
      <div className="producto-page container mt-20 no-products">
        <h2>Producto no encontrado</h2>
        <Link to="/catalogo" className="btn btn-primary mt-4">Volver al Catálogo</Link>
      </div>
    );
  }

  const coloresDisponibles = Object.keys(producto.stock || {});
  const tallasDisponibles = selectedColor ? Object.keys(producto.stock[selectedColor] || {}) : [];
  const stockTallaActual = (selectedColor && selectedTalla) ? producto.stock[selectedColor][selectedTalla] : 0;

  const getImagenesA_Mostrar = () => {
    if (!producto || !producto.imagenes) return [];
    const delColor = producto.imagenes.filter(img => img.color_nombre === selectedColor);
    if (delColor.length > 0) return delColor.map(i => i.ruta_imagen);
    const generales = producto.imagenes.filter(img => !img.color_nombre);
    if (generales.length > 0) return generales.map(i => i.ruta_imagen);
    return producto.imagenes.map(i => i.ruta_imagen);
  };

  const imagenesMostrar = getImagenesA_Mostrar();

  const nextImage = () => {
    setCurrentImageIdx((prev) => (prev + 1) % imagenesMostrar.length);
  };

  const prevImage = () => {
    setCurrentImageIdx((prev) => (prev - 1 + imagenesMostrar.length) % imagenesMostrar.length);
  };

  return (
    <div className="producto-page container mt-20 section-padding">
      <div className="producto-layout">
        
        {/* GALERÍA DE IMÁGENES RESPONSIVA CON SWIPE Y ZOOM */}
        <div className="flex flex-col gap-3 w-full">
          {/* Contenedor Principal de la Imagen */}
          <div 
            className="relative w-full aspect-square sm:aspect-[4/3] md:aspect-square max-h-[500px] bg-gray-50 border border-gray-100 rounded-2xl overflow-hidden flex items-center justify-center select-none cursor-zoom-in group shadow-xs"
            onTouchStart={onTouchStartHandler}
            onTouchMove={onTouchMoveHandler}
            onTouchEnd={onTouchEndHandler}
            onClick={() => imagenesMostrar.length > 0 && setIsModalOpen(true)}
          >
            {imagenesMostrar.length > 0 ? (
              <>
                <img 
                  src={getImgUrl(imagenesMostrar[currentImageIdx])} 
                  alt={producto.titulo_web || producto.modelo_nombre} 
                  className="w-full h-full object-contain p-2 sm:p-4 transition-transform duration-300 group-hover:scale-[1.02]" 
                />

                {/* Botón flotante para abrir Modal / Zoom */}
                <button
                  onClick={(e) => { e.stopPropagation(); setIsModalOpen(true); }}
                  className="absolute bottom-3 right-3 w-8 h-8 rounded-full bg-white/90 hover:bg-white text-gray-700 flex items-center justify-center shadow-md transition-all duration-200 cursor-pointer opacity-90 hover:opacity-100 z-10"
                  title="Ver en pantalla completa"
                  aria-label="Ampliar imagen"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>

                {/* Flechas de navegación (si hay más de 1 imagen) */}
                {imagenesMostrar.length > 1 && (
                  <>
                    <button 
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/80 hover:bg-white text-gray-800 flex items-center justify-center shadow-md transition-all duration-200 cursor-pointer active:scale-95 z-10"
                      onClick={(e) => { e.stopPropagation(); prevImage(); }}
                      aria-label="Imagen anterior"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button 
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/80 hover:bg-white text-gray-800 flex items-center justify-center shadow-md transition-all duration-200 cursor-pointer active:scale-95 z-10"
                      onClick={(e) => { e.stopPropagation(); nextImage(); }}
                      aria-label="Siguiente imagen"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </>
                )}

                {/* Indicadores de paginación táctil (Dots para móvil) */}
                {imagenesMostrar.length > 1 && (
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/20 backdrop-blur-xs z-10">
                    {imagenesMostrar.map((_, dotIdx) => (
                      <button
                        key={dotIdx}
                        onClick={(e) => { e.stopPropagation(); setCurrentImageIdx(dotIdx); }}
                        className={`transition-all duration-300 rounded-full ${
                          dotIdx === currentImageIdx 
                            ? 'w-4 h-1.5 bg-white' 
                            : 'w-1.5 h-1.5 bg-white/50 hover:bg-white/80'
                        }`}
                        aria-label={`Ir a imagen ${dotIdx + 1}`}
                      />
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="text-gray-400 text-sm font-semibold uppercase">Sin Foto</div>
            )}

            {/* Badge de Oferta */}
            {producto.precio_oferta && (
              <span className="absolute top-3 left-3 bg-red-600 text-white text-[10px] sm:text-xs font-black px-2.5 py-1 rounded-full uppercase tracking-wider shadow-sm z-10">
                OFERTA
              </span>
            )}
          </div>
          
          {/* Miniaturas inferiores */}
          {imagenesMostrar.length > 1 && (
            <div className="flex gap-2.5 sm:gap-3 overflow-x-auto py-1 scrollbar-none">
              {imagenesMostrar.map((img, idx) => (
                <button 
                  key={idx} 
                  className={`w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-gray-50 border-2 overflow-hidden flex-shrink-0 cursor-pointer transition-all duration-200 p-1 flex items-center justify-center ${
                    idx === currentImageIdx 
                      ? 'border-gray-900 shadow-sm ring-1 ring-gray-900 opacity-100 scale-102' 
                      : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                  onClick={() => setCurrentImageIdx(idx)}
                  aria-label={`Ver miniatura ${idx + 1}`}
                >
                  <img src={getImgUrl(img)} alt={`Miniatura ${idx + 1}`} className="w-full h-full object-contain" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* INFO DEL PRODUCTO */}
        <div className="producto-details">
          <div className="breadcrumb">
            <Link to="/">Inicio</Link> / <Link to={`/catalogo/${producto.categoria_nombre?.toLowerCase()}`}>{producto.categoria_nombre}</Link> / <span>{producto.modelo_nombre}</span>
          </div>
          
          <h1 className="producto-title text-uppercase">{producto.titulo_web || producto.modelo_nombre}</h1>
          
          <div className="producto-prices">
            {producto.precio_oferta ? (
              <>
                <span className="price-sale">${Number(producto.precio_oferta).toLocaleString('es-CO')}</span>
                <span className="price-old">${Number(producto.precio_venta || producto.precio_web || 0).toLocaleString('es-CO')}</span>
              </>
            ) : (
              <span className="price-regular">${Number(producto.precio_venta || producto.precio_web || 0).toLocaleString('es-CO')}</span>
            )}
          </div>

          <div className="producto-description">
            {producto.descripcion || 'Sin descripción detallada.'}
          </div>

          {/* COLOR */}
          <div className="selector-section">
            <h3 className="selector-title" style={{marginBottom: 0}}>Color: <span className="selector-value">{selectedColor || colorQuery}</span></h3>
          </div>

          {/* SELECCIÓN DE TALLA (ESTILO DEPORTIVO) */}
          <div className="selector-section" style={{marginTop: '2rem'}}>
            <div className="flex-between" style={{ marginBottom: '1rem' }}>
              <h3 className="selector-title" style={{ margin: 0 }}>Tallas</h3>
              <button className="size-guide-btn">Guía de tallas</button>
            </div>
            
            <div className="size-grid">
              {tallasDisponibles.map(talla => {
                const stock = producto.stock[selectedColor][talla];
                return (
                  <button 
                    key={talla} 
                    className={`size-box ${selectedTalla === talla ? 'active' : ''} ${stock === 0 ? 'disabled' : ''}`}
                    onClick={() => stock > 0 && setSelectedTalla(talla)}
                    disabled={stock === 0}
                  >
                    {talla}
                  </button>
                );
              })}
              {tallasDisponibles.length === 0 && selectedColor && <span className="text-gray-500 text-sm">Agotado en todos los tamaños</span>}
            </div>
            
            {tallasDisponibles.length > 0 && (
              <div className="talla-info-box">
                <Info className="w-4 h-4" /> 
                <span><b>Talla real.</b> Te recomendamos pedir tu talla habitual.</span>
              </div>
            )}
          </div>

          {/* ACCIONES DEL CARRITO */}
          <div className="cart-actions-wrapper">
            <button 
              className={`add-to-cart-box ${(!selectedColor || !selectedTalla || stockTallaActual === 0) ? 'disabled' : ''}`}
              disabled={!selectedColor || !selectedTalla || stockTallaActual === 0}
              onClick={() => addToCart(producto, selectedColor, selectedTalla)}
            >
              <span>{(!selectedColor || !selectedTalla) ? 'Selecciona Talla y Color' : stockTallaActual === 0 ? 'Agotado' : 'Añadir al carrito'}</span>
              <ShoppingBag className="w-5 h-5" />
            </button>
            <button className="wishlist-box">
              <Heart className="w-6 h-6" />
            </button>
          </div>

          <div className="delivery-info">
            <p><strong>Envío Gratis</strong> en compras superiores a $150.000</p>
            <p><strong>Cambios y Devoluciones</strong> hasta 30 días después de tu compra.</p>
          </div>
        </div>

      </div>

      {/* LIGHTBOX / MODAL DE AMPLIACIÓN FULLSCREEN */}
      {isModalOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col justify-between select-none"
          onClick={() => setIsModalOpen(false)}
          onTouchStart={onTouchStartHandler}
          onTouchMove={onTouchMoveHandler}
          onTouchEnd={onTouchEndHandler}
        >
          {/* Barra superior del Modal */}
          <div className="w-full px-4 sm:px-8 py-4 flex items-center justify-between text-white z-20">
            <span className="text-xs sm:text-sm font-bold tracking-widest uppercase bg-white/10 px-3 py-1 rounded-full backdrop-blur-xs">
              {currentImageIdx + 1} / {imagenesMostrar.length}
            </span>
            <button 
              onClick={() => setIsModalOpen(false)}
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer transition-colors backdrop-blur-xs"
              aria-label="Cerrar modal"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Contenedor central con Imagen Completa */}
          <div 
            className="relative flex-1 flex items-center justify-center p-2 sm:p-6 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {imagenesMostrar.length > 0 && (
              <img 
                src={getImgUrl(imagenesMostrar[currentImageIdx])} 
                alt={producto.titulo_web || producto.modelo_nombre} 
                className="max-h-[82vh] max-w-[95vw] object-contain rounded-lg transition-all duration-300 touch-pinch-zoom shadow-2xl" 
              />
            )}

            {/* Flechas de navegación en el Modal */}
            {imagenesMostrar.length > 1 && (
              <>
                <button 
                  onClick={(e) => { e.stopPropagation(); prevImage(); }}
                  className="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center backdrop-blur-xs transition-all cursor-pointer z-20 active:scale-95"
                  aria-label="Imagen anterior"
                >
                  <ChevronLeft className="w-6 h-6 sm:w-7 sm:h-7" />
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); nextImage(); }}
                  className="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center backdrop-blur-xs transition-all cursor-pointer z-20 active:scale-95"
                  aria-label="Siguiente imagen"
                >
                  <ChevronRight className="w-6 h-6 sm:w-7 sm:h-7" />
                </button>
              </>
            )}
          </div>

          {/* Tira inferior de miniaturas en el Modal */}
          {imagenesMostrar.length > 1 && (
            <div 
              className="w-full px-4 py-4 flex items-center justify-center gap-2 overflow-x-auto z-20"
              onClick={(e) => e.stopPropagation()}
            >
              {imagenesMostrar.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentImageIdx(idx)}
                  className={`w-12 h-12 sm:w-14 sm:h-14 rounded-lg bg-white/5 border-2 overflow-hidden flex-shrink-0 cursor-pointer transition-all p-1 ${
                    idx === currentImageIdx ? 'border-white opacity-100 scale-110' : 'border-transparent opacity-40 hover:opacity-75'
                  }`}
                  aria-label={`Miniatura ${idx + 1}`}
                >
                  <img src={getImgUrl(img)} alt={`thumb-${idx}`} className="w-full h-full object-contain" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
