import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Star } from 'lucide-react';
import './Catalogo.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
const getImgUrl = (path) => path ? (path.startsWith('http') ? path : `${API_URL}${path}`) : '';


export default function Catalogo() {
  const { categoria } = useParams();
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProductos = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_URL}/api/ecommerce/productos`);
        if (res.ok) {
          const data = await res.json();
          // Filtrar por categoría si no es la vista general
          let filtrados = data;
          if (categoria) {
            filtrados = data.filter(p => {
              const catName = p.categoria_nombre?.toLowerCase() || '';
              const routeCat = categoria.toLowerCase();
              
              if ((routeCat === 'hombre' || routeCat === 'mujer') && catName === 'unisex') {
                return true;
              }
              
              return catName === routeCat;
            });
          }
          setProductos(filtrados);
        }
      } catch (error) {
        console.error("Error al cargar el catálogo", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProductos();
  }, [categoria]);

  return (
    <div className="catalogo-page container section-padding mt-20">
      <div className="catalogo-header">
        <h1 className="catalogo-title">
          Catálogo {categoria ? `- ${categoria.charAt(0).toUpperCase() + categoria.slice(1)}` : 'Completo'}
        </h1>
        <p className="catalogo-subtitle">Descubre nuestra exclusiva selección de calzado.</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 loading-grid">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => <div key={i} className="skeleton-card"></div>)}
        </div>
      ) : productos.length === 0 ? (
        <div className="no-products">
          No hay productos disponibles en esta categoría por ahora.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 products-grid">
          {productos.map(prod => (
            <Link to={`/producto/${prod.id_modelo}?color=${encodeURIComponent(prod.color_nombre)}`} key={`${prod.id_modelo}-${prod.color_nombre}`} className="product-card">
              <div className="product-image-container">
                {prod.imagen_principal ? (
                  <img src={getImgUrl(prod.imagen_principal)} alt={prod.modelo_nombre} className="product-image" />
                ) : (
                  <div className="image-placeholder">Sin Foto</div>
                )}
                {prod.precio_oferta && <div className="sale-badge">OFERTA</div>}
                <button className="wishlist-btn" onClick={(e) => e.preventDefault()}><Star className="w-4 h-4" /></button>
              </div>
              <div className="product-info">
                  <div className="product-price-top">
                    {prod.precio_oferta ? (
                      <span className="price-sale-top">${Number(prod.precio_oferta).toLocaleString('es-CO')}</span>
                    ) : (
                      <span className="price-regular-top">${Number(prod.precio_venta || 0).toLocaleString('es-CO')}</span>
                    )}
                  </div>
                  <h3 className="product-name-clean">{prod.titulo_web || prod.modelo_nombre}</h3>
                  <span className="product-category-clean">{prod.categoria_nombre || 'Novedad'}</span>
                  <span className="product-color-clean">{prod.color_nombre}</span>
                </div>
              </Link>
          ))}
        </div>
      )}
    </div>
  );
}
