import React, { useState, useEffect } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { ShoppingBag, Check, ChevronLeft, ChevronRight, Info, Heart } from 'lucide-react';
import { useCart } from '../context/CartContext';
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
        
        {/* GALERÍA DE IMÁGENES */}
        <div className="producto-gallery">
          <div className="main-image-container">
            {imagenesMostrar.length > 0 ? (
              <>
                <img src={`${API_URL}${imagenesMostrar[currentImageIdx]}`} alt={producto.titulo_web} className="main-image" />
                {imagenesMostrar.length > 1 && (
                  <>
                    <button className="gallery-btn prev" onClick={prevImage}><ChevronLeft /></button>
                    <button className="gallery-btn next" onClick={nextImage}><ChevronRight /></button>
                  </>
                )}
              </>
            ) : (
              <div className="image-placeholder">Sin Foto</div>
            )}
            {producto.precio_oferta && <div className="sale-badge">OFERTA</div>}
          </div>
          
          {imagenesMostrar.length > 1 && (
            <div className="thumbnails">
              {imagenesMostrar.map((img, idx) => (
                <div 
                  key={idx} 
                  className={`thumbnail ${idx === currentImageIdx ? 'active' : ''}`}
                  onClick={() => setCurrentImageIdx(idx)}
                >
                  <img src={`${API_URL}${img}`} alt="thumbnail" />
                </div>
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
                <span className="price-old">${Number(producto.precio_venta).toLocaleString('es-CO')}</span>
              </>
            ) : (
              <span className="price-regular">${Number(producto.precio_venta).toLocaleString('es-CO')}</span>
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
    </div>
  );
}
