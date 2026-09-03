import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { ShoppingBag, Check, ChevronLeft, ChevronRight, Info, Heart, X, Maximize2, ArrowRight } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { getOptimizedImgUrl } from '../utils/imageOptimizer';
import { getProductosWeb } from '../services/ecommerceService';
import './Producto.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';


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
  
  // Touch & Drag state para animación fluida de deslizamiento
  const [touchStartX, setTouchStartX] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [hasMoved, setHasMoved] = useState(false);

  // Touch state para el Modal
  const [modalTouchStartX, setModalTouchStartX] = useState(0);
  const [modalDragOffset, setModalDragOffset] = useState(0);
  const [isModalDragging, setIsModalDragging] = useState(false);

  // Manejadores de arrastre para el carrusel principal
  const handleTouchStart = (e) => {
    setTouchStartX(e.touches[0].clientX);
    setIsDragging(true);
    setHasMoved(false);
    setDragOffset(0);
  };

  const handleTouchMove = (e) => {
    if (!isDragging) return;
    const currentX = e.touches[0].clientX;
    const diff = currentX - touchStartX;
    if (Math.abs(diff) > 4) {
      setHasMoved(true);
    }
    // Resistencia en extremos
    if ((currentImageIdx === 0 && diff > 0) || (currentImageIdx === imagenesMostrar.length - 1 && diff < 0)) {
      setDragOffset(diff * 0.25);
    } else {
      setDragOffset(diff);
    }
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);
    const threshold = 45;
    if (dragOffset < -threshold && currentImageIdx < imagenesMostrar.length - 1) {
      setCurrentImageIdx(prev => prev + 1);
    } else if (dragOffset > threshold && currentImageIdx > 0) {
      setCurrentImageIdx(prev => prev - 1);
    }
    setDragOffset(0);
  };

  const handleSlideClick = (idx) => {
    if (!hasMoved) {
      setCurrentImageIdx(idx);
      setIsModalOpen(true);
    }
  };

  // Manejadores de arrastre para el Modal Fullscreen
  const handleModalTouchStart = (e) => {
    setModalTouchStartX(e.touches[0].clientX);
    setIsModalDragging(true);
    setModalDragOffset(0);
  };

  const handleModalTouchMove = (e) => {
    if (!isModalDragging) return;
    const currentX = e.touches[0].clientX;
    const diff = currentX - modalTouchStartX;
    if ((currentImageIdx === 0 && diff > 0) || (currentImageIdx === imagenesMostrar.length - 1 && diff < 0)) {
      setModalDragOffset(diff * 0.25);
    } else {
      setModalDragOffset(diff);
    }
  };

  const handleModalTouchEnd = () => {
    if (!isModalDragging) return;
    setIsModalDragging(false);
    const threshold = 45;
    if (modalDragOffset < -threshold && currentImageIdx < imagenesMostrar.length - 1) {
      setCurrentImageIdx(prev => prev + 1);
    } else if (modalDragOffset > threshold && currentImageIdx > 0) {
      setCurrentImageIdx(prev => prev - 1);
    }
    setModalDragOffset(0);
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
      document.body.classList.add('lightbox-open');
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = 'unset';
      document.body.classList.remove('lightbox-open');
    }

    return () => {
      document.body.style.overflow = 'unset';
      document.body.classList.remove('lightbox-open');
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isModalOpen, currentImageIdx]);

  // Resetear índice al cambiar de color
  useEffect(() => {
    setCurrentImageIdx(0);
  }, [selectedColor]);

  // Estado y referencia para la sección "Más Modelos"
  const [relacionados, setRelacionados] = useState([]);
  const carouselRef = useRef(null);

  const scrollCarousel = (direction) => {
    if (carouselRef.current) {
      const scrollAmount = direction === 'left' ? -320 : 320;
      carouselRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  // Desplazar automáticamente hacia arriba cuando cambia el producto
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [id]);

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

  // Cargar más modelos sugeridos (excluyendo el actual y priorizando misma categoría)
  useEffect(() => {
    let isMounted = true;
    const loadRelacionados = async () => {
      try {
        const allProds = await getProductosWeb();
        if (isMounted && allProds && allProds.length > 0) {
          const otros = allProds.filter(p => Number(p.id_modelo) !== Number(id));
          const mismaCat = otros.filter(p => 
            p.categoria_nombre && producto?.categoria_nombre && 
            p.categoria_nombre.toLowerCase() === producto.categoria_nombre.toLowerCase()
          );
          const otrasCat = otros.filter(p => !mismaCat.some(m => m.id_modelo === p.id_modelo));
          const seleccion = [...mismaCat, ...otrasCat].slice(0, 10);
          setRelacionados(seleccion);
        }
      } catch (err) {
        console.error("Error al cargar productos relacionados", err);
      }
    };
    loadRelacionados();
    return () => { isMounted = false; };
  }, [id, producto?.categoria_nombre]);

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
        
        {/* GALERÍA DE IMÁGENES RESPONSIVA CON ANIMACIÓN FLUIDA Y SWIPE */}
        <div className="flex flex-col gap-3 w-full">
          {/* Contenedor Principal de la Imagen */}
          <div 
            className="relative w-full aspect-square sm:aspect-[4/3] md:aspect-square max-h-[500px] bg-gray-50 border border-gray-100 rounded-2xl overflow-hidden flex items-center justify-center select-none shadow-xs group"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {imagenesMostrar.length > 0 ? (
              <>
                {/* Track deslizante continuo con animación fluida (tipo app nativa) */}
                <div 
                  className="flex h-full w-full will-change-transform cursor-zoom-in"
                  style={{
                    transform: `translateX(calc(-${currentImageIdx * 100}% + ${dragOffset}px))`,
                    transition: isDragging ? 'none' : 'transform 420ms cubic-bezier(0.16, 1, 0.3, 1)'
                  }}
                >
                  {imagenesMostrar.map((img, idx) => (
                    <div 
                      key={idx} 
                      className={`w-full h-full flex-shrink-0 flex items-center justify-center p-2 sm:p-4 transition-all duration-500 ease-out ${
                        idx === currentImageIdx ? 'opacity-100 scale-100' : 'opacity-35 scale-95'
                      }`}
                      onClick={() => handleSlideClick(idx)}
                    >
                      <img 
                        src={getOptimizedImgUrl(img, 800)} 
                        alt={`${producto.titulo_web || producto.modelo_nombre} - vista ${idx + 1}`} 
                        className="w-full h-full object-contain pointer-events-none select-none transition-transform duration-500"
                        draggable={false}
                      />
                    </div>
                  ))}
                </div>

                {/* Botón flotante para abrir Modal / Zoom */}
                <button
                  onClick={(e) => { e.stopPropagation(); setIsModalOpen(true); }}
                  className="absolute bottom-3 right-3 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/90 hover:bg-white text-gray-800 flex items-center justify-center shadow-lg transition-all duration-200 cursor-pointer opacity-90 hover:opacity-100 hover:scale-110 active:scale-95 z-10 border border-black/5 backdrop-blur-xs"
                  title="Ver en pantalla completa"
                  aria-label="Ampliar imagen"
                >
                  <Maximize2 className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>

                {/* Flechas de navegación (si hay más de 1 imagen) */}
                {imagenesMostrar.length > 1 && (
                  <>
                    <button 
                      className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/90 hover:bg-white text-gray-900 flex items-center justify-center shadow-lg transition-all duration-200 cursor-pointer active:scale-90 hover:scale-105 z-10 border border-black/5 backdrop-blur-xs group"
                      onClick={(e) => { e.stopPropagation(); prevImage(); }}
                      aria-label="Imagen anterior"
                    >
                      <ChevronLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform duration-200" />
                    </button>
                    <button 
                      className="absolute right-2.5 sm:right-3 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/90 hover:bg-white text-gray-900 flex items-center justify-center shadow-lg transition-all duration-200 cursor-pointer active:scale-90 hover:scale-105 z-10 border border-black/5 backdrop-blur-xs group"
                      onClick={(e) => { e.stopPropagation(); nextImage(); }}
                      aria-label="Siguiente imagen"
                    >
                      <ChevronRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform duration-200" />
                    </button>
                  </>
                )}

                {/* Indicadores de paginación táctil (Dots para móvil) */}
                {imagenesMostrar.length > 1 && (
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/25 backdrop-blur-xs z-10 pointer-events-auto">
                    {imagenesMostrar.map((_, dotIdx) => (
                      <button
                        key={dotIdx}
                        onClick={(e) => { e.stopPropagation(); setCurrentImageIdx(dotIdx); }}
                        className={`transition-all duration-300 rounded-full ${
                          dotIdx === currentImageIdx 
                            ? 'w-5 h-1.5 bg-white' 
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
                  <img src={getOptimizedImgUrl(img, 180)} alt={`Miniatura ${idx + 1}`} className="w-full h-full object-contain" />
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

      {/* SECCIÓN QUIZÁ TAMBIÉN TE GUSTE... (ESTILO EXACTO ADIDAS) */}
      {relacionados.length > 0 && (
        <section className="mt-16 sm:mt-24 pt-10 sm:pt-14 border-t border-gray-200">
          <div className="flex items-center justify-between mb-6 sm:mb-8">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-gray-900 uppercase font-sans">
              QUIZÁ TAMBIÉN TE GUSTE...
            </h2>
            <Link 
              to="/catalogo" 
              className="hidden sm:inline-flex items-center gap-1.5 text-xs font-bold text-gray-800 hover:text-black uppercase tracking-wider underline underline-offset-4"
            >
              Ver catálogo completo <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Grilla de Calzados: 4 Columnas en PC y 2 en Móvil (Estilo Adidas) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
            {relacionados.map((prod) => (
              <Link
                key={`${prod.id_modelo}-${prod.color_nombre}`}
                to={`/producto/${prod.id_modelo}?color=${encodeURIComponent(prod.color_nombre || '')}`}
                className="group flex flex-col text-left transition-transform duration-200 hover:-translate-y-1"
              >
                {/* Contenedor de Imagen gris minimalista (#ebedee) idéntico a Adidas */}
                <div className="relative aspect-square w-full bg-[#ebedee] overflow-hidden flex items-center justify-center">
                  {prod.imagen_principal ? (
                    <img 
                      src={getOptimizedImgUrl(prod.imagen_principal, 500)} 
                      alt={prod.modelo_nombre} 
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300 ease-out" 
                    />
                  ) : (
                    <div className="text-gray-400 text-xs font-medium">Sin Foto</div>
                  )}

                  {/* Botón Favoritos (Corazón limpio outline sin círculo, idéntico a Adidas) */}
                  <button 
                    type="button"
                    className="absolute top-2.5 right-2.5 sm:top-3 sm:right-3 p-1 text-gray-800 hover:text-red-500 hover:scale-110 transition-all duration-200 cursor-pointer"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                    aria-label="Agregar a favoritos"
                  >
                    <Heart className="w-5 h-5 stroke-[1.75] hover:fill-red-500" />
                  </button>
                </div>

                {/* Info del Producto (Tipografía y estructura idéntica a Adidas) */}
                <div className="pt-2.5 sm:pt-3 pb-2 flex flex-col">
                  {/* Precio Principal */}
                  <div className="flex flex-col">
                    {prod.precio_oferta ? (
                      <>
                        <span className="text-xs sm:text-sm font-bold text-gray-900">
                          ${Number(prod.precio_oferta).toLocaleString('es-CO')}
                        </span>
                        <span className="text-[11px] sm:text-xs font-semibold text-[#00735c] mt-0.5">
                          ${Number(prod.precio_oferta).toLocaleString('es-CO')} en oferta
                        </span>
                        <span className="text-[10px] sm:text-[11px] text-gray-400 line-through">
                          ${Number(prod.precio_venta || prod.precio_web || 0).toLocaleString('es-CO')}
                        </span>
                      </>
                    ) : (
                      <span className="text-xs sm:text-sm font-bold text-gray-900">
                        ${Number(prod.precio_venta || prod.precio_web || 0).toLocaleString('es-CO')}
                      </span>
                    )}
                  </div>

                  {/* Nombre / Título del modelo en Title Case */}
                  <h3 className="text-xs sm:text-sm font-normal text-gray-900 mt-1 line-clamp-1 group-hover:underline">
                    {prod.titulo_web || prod.modelo_nombre}
                  </h3>

                  {/* Categoría / Marca */}
                  <span className="text-[11px] sm:text-xs text-gray-500 font-normal mt-0.5 capitalize">
                    {prod.categoria_nombre || 'Calzado Urbano'}
                  </span>
                </div>
              </Link>
            ))}
          </div>

          {/* Enlace móvil para ver más modelos */}
          <div className="mt-8 text-center sm:hidden">
            <Link 
              to="/catalogo"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-900 uppercase tracking-wider py-2.5 px-6 rounded-full border border-gray-300 bg-white hover:bg-gray-50"
            >
              Ver todo el catálogo <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </section>
      )}

      {/* LIGHTBOX / MODAL DE AMPLIACIÓN FULLSCREEN CON PORTAL DIRECTO A BODY */}
      {isModalOpen && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 z-[999999] bg-black/95 backdrop-blur-xl flex flex-col justify-between select-none modal-lightbox-animate overflow-hidden"
          onClick={() => setIsModalOpen(false)}
        >
          {/* Barra superior con contador y pista */}
          <div className="w-full h-14 sm:h-16 flex-shrink-0 px-4 sm:px-8 flex items-center justify-between text-white z-20 pointer-events-none">
            <div className="flex items-center gap-3">
              <span className="text-xs sm:text-sm font-black tracking-widest uppercase bg-white/10 px-3.5 py-1.5 rounded-full backdrop-blur-md border border-white/15 shadow-sm">
                {currentImageIdx + 1} / {imagenesMostrar.length}
              </span>
              <span className="hidden sm:inline-block text-xs text-gray-400 font-medium tracking-wide">
                Usa las flechas o desliza para navegar • Presiona Esc o toca afuera para salir
              </span>
            </div>
          </div>

          {/* Contenedor central con Track Deslizante para el Modal */}
          <div 
            className="relative flex-1 w-full min-h-0 flex items-center justify-center overflow-hidden cursor-pointer"
            onTouchStart={handleModalTouchStart}
            onTouchMove={handleModalTouchMove}
            onTouchEnd={handleModalTouchEnd}
            onClick={() => setIsModalOpen(false)}
          >
            {imagenesMostrar.length > 0 && (
              <div 
                className="flex h-full w-full items-center will-change-transform pointer-events-none"
                style={{
                  transform: `translateX(calc(-${currentImageIdx * 100}% + ${modalDragOffset}px))`,
                  transition: isModalDragging ? 'none' : 'transform 420ms cubic-bezier(0.16, 1, 0.3, 1)'
                }}
              >
                {imagenesMostrar.map((img, idx) => (
                  <div 
                    key={idx} 
                    className={`w-full h-full flex-shrink-0 flex items-center justify-center p-2 sm:p-6 transition-all duration-500 ease-out ${
                      idx === currentImageIdx ? 'opacity-100 scale-100' : 'opacity-20 scale-90'
                    }`}
                  >
                    <div 
                      className="relative pointer-events-auto flex items-center justify-center max-h-full max-w-full group/photo"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <img 
                        src={getOptimizedImgUrl(img, 1200)} 
                        alt={`${producto.titulo_web || producto.modelo_nombre} - ampliada ${idx + 1}`} 
                        className="max-h-[calc(100vh-160px)] max-w-[95vw] sm:max-w-[85vw] object-contain rounded-2xl transition-transform duration-500 touch-pinch-zoom shadow-2xl select-none" 
                        draggable={false}
                      />
                      {/* Botón flotante X aesthetic directamente SOBRE la foto en la esquina superior derecha */}
                      <button 
                        onClick={(e) => { e.stopPropagation(); setIsModalOpen(false); }}
                        className="absolute top-3 right-3 sm:top-4 sm:right-4 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-black/60 hover:bg-black/85 text-white flex items-center justify-center shadow-lg backdrop-blur-md border border-white/20 transition-all duration-200 cursor-pointer active:scale-90 hover:scale-105 z-30"
                        title="Cerrar (Esc)"
                        aria-label="Cerrar imagen"
                      >
                        <X className="w-5 h-5 text-white stroke-[2.5]" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Flechas de navegación en el Modal */}
            {imagenesMostrar.length > 1 && (
              <>
                <button 
                  onClick={(e) => { e.stopPropagation(); prevImage(); }}
                  className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 w-11 h-11 sm:w-13 sm:h-13 rounded-full bg-white/10 hover:bg-white/25 active:scale-90 text-white flex items-center justify-center backdrop-blur-md transition-all duration-200 cursor-pointer z-30 border border-white/20 shadow-xl group"
                  aria-label="Imagen anterior"
                >
                  <ChevronLeft className="w-6 h-6 sm:w-7 sm:h-7 group-hover:-translate-x-0.5 transition-transform duration-200" />
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); nextImage(); }}
                  className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 w-11 h-11 sm:w-13 sm:h-13 rounded-full bg-white/10 hover:bg-white/25 active:scale-90 text-white flex items-center justify-center backdrop-blur-md transition-all duration-200 cursor-pointer z-30 border border-white/20 shadow-xl group"
                  aria-label="Siguiente imagen"
                >
                  <ChevronRight className="w-6 h-6 sm:w-7 sm:h-7 group-hover:translate-x-0.5 transition-transform duration-200" />
                </button>
              </>
            )}
          </div>

          {/* Tira inferior de miniaturas en el Modal */}
          {imagenesMostrar.length > 1 && (
            <div 
              className="w-full h-18 sm:h-20 flex-shrink-0 px-4 py-3 flex items-center justify-center gap-2.5 overflow-x-auto z-20 bg-gradient-to-t from-black/90 via-black/50 to-transparent scrollbar-none"
              onClick={(e) => e.stopPropagation()}
            >
              {imagenesMostrar.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentImageIdx(idx)}
                  className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-white/5 border-2 overflow-hidden flex-shrink-0 cursor-pointer transition-all duration-300 p-1 flex items-center justify-center ${
                    idx === currentImageIdx 
                      ? 'border-yellow-400 ring-2 ring-yellow-400/50 opacity-100 scale-110 shadow-2xl bg-white/10' 
                      : 'border-white/10 opacity-40 hover:opacity-80 hover:scale-105'
                  }`}
                  aria-label={`Miniatura ${idx + 1}`}
                >
                  <img src={getOptimizedImgUrl(img, 150)} alt={`thumb-${idx}`} className="w-full h-full object-contain" />
                </button>
              ))}
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}
