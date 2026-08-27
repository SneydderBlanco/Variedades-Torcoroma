import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Star } from 'lucide-react';
import './Home.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
const getImgUrl = (path) => path ? (path.startsWith('http') ? path : `${API_URL}${path}`) : '';


export default function Home() {
  const [destacados, setDestacados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [webConfig, setWebConfig] = useState(null);

  useEffect(() => {
    const fetchHomeData = async () => {
      try {
        const [resProds, resConfig] = await Promise.all([
          fetch(`${API_URL}/api/ecommerce/productos`),
          fetch(`${API_URL}/api/ecommerce/config`)
        ]);
        
        if (resProds.ok) {
          const data = await resProds.json();
          setDestacados(data.slice(0, 4));
        }

        if (resConfig.ok) {
          setWebConfig(await resConfig.json());
        }
      } catch (error) {
        console.error("Error al cargar datos del Home", error);
      } finally {
        setLoading(false);
      }
    };
    fetchHomeData();
  }, []);

  return (
    <div className="home-page">
      {/* HERO SECTION */}
      <section 
        className="hero"
        style={webConfig?.hero_img ? { backgroundImage: `linear-gradient(to right, rgba(17, 24, 39, 0.9), rgba(17, 24, 39, 0.4)), url(${API_URL}${webConfig.hero_img})` } : {}}
      >
        <div className="hero-content container">
          <span className="hero-subtitle">{webConfig?.hero_subtitle || 'NUEVA COLECCIÓN'}</span>
          <h1 className="hero-title" dangerouslySetInnerHTML={{ __html: webConfig?.hero_title || 'Eleva Tu<br/>Estilo.' }}></h1>
          <p className="hero-text">
            {webConfig?.hero_text || 'Descubre los calzados más exclusivos de Torcoroma. Diseños vanguardistas, confort absoluto y calidad premium para cada paso que des.'}
          </p>
          <div className="hero-actions">
            <Link to="/catalogo/hombre" className="btn btn-primary">
              Comprar Hombre <ArrowRight className="w-4 h-4" />
            </Link>
            <Link to="/catalogo/mujer" className="btn btn-outline">
              Comprar Mujer
            </Link>
          </div>
        </div>
        <div className="hero-overlay"></div>
      </section>

      {/* DESTACADOS SECTION */}
      <section className="featured container section-padding">
        <div className="section-header">
          <h2 className="section-title">Productos Destacados</h2>
          <Link to="/catalogo" className="view-all-link">Ver todo el catálogo</Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 loading-grid">
            {[1, 2, 3, 4].map(i => <div key={i} className="skeleton-card"></div>)}
          </div>
        ) : destacados.length === 0 ? (
          <div className="no-products">
            No hay productos destacados por el momento.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 products-grid">
            {destacados.map(prod => (
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
                  <span className="product-category">{prod.categoria_nombre || 'Novedad'}</span>
                  <h3 className="product-name">{prod.titulo_web || prod.modelo_nombre}</h3>
                  <span className="product-color text-xs text-gray-500 uppercase block mb-1">{prod.color_nombre}</span>
                  <div className="product-price">
                    {prod.precio_oferta ? (
                      <>
                        <span className="price-sale">${Number(prod.precio_oferta).toLocaleString('es-CO')}</span>
                      </>
                    ) : (
                      <span className="price-regular">Ver precio</span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* BANNER PROMOCIONAL */}
      <section 
        className="promo-banner container section-padding"
        style={webConfig?.promo_img ? { backgroundImage: `url(${getImgUrl(webConfig.promo_img)})` } : {}}
      >
        <div className="promo-content glass">
          <h2>{webConfig?.promo_title || 'Estilo y Confort sin Compromisos.'}</h2>
          <p>{webConfig?.promo_text || 'Encuentra tu talla ideal con nuestro sistema de inventario en vivo.'}</p>
          <Link to="/catalogo" className="btn btn-primary mt-4">Explorar Colección</Link>
        </div>
      </section>
    </div>
  );
}
