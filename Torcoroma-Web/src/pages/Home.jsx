import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Star, Heart } from 'lucide-react';
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
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4 lg:gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="aspect-square bg-gray-100 rounded-sm animate-pulse"></div>
            ))}
          </div>
        ) : destacados.length === 0 ? (
          <div className="no-products">
            No hay productos destacados por el momento.
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4 lg:gap-6">
            {destacados.map(prod => (
              <Link 
                to={`/producto/${prod.id_modelo}?color=${encodeURIComponent(prod.color_nombre)}`} 
                key={`${prod.id_modelo}-${prod.color_nombre}`} 
                className="group flex flex-col cursor-pointer transition-transform duration-200 hover:-translate-y-1 text-left"
              >
                {/* Contenedor de Imagen */}
                <div className="relative aspect-square w-full bg-gray-100 rounded-sm overflow-hidden flex items-center justify-center">
                  {prod.imagen_principal ? (
                    <img 
                      src={getImgUrl(prod.imagen_principal)} 
                      alt={prod.modelo_nombre} 
                      className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500 ease-out" 
                    />
                  ) : (
                    <div className="text-gray-400 text-xs font-semibold uppercase">Sin Foto</div>
                  )}

                  {/* Badge de Oferta */}
                  {prod.precio_oferta && (
                    <span className="absolute top-2 left-2 bg-red-600 text-white text-[9px] sm:text-xs font-black px-1.5 py-0.5 sm:px-2 rounded-full uppercase tracking-wider shadow-sm">
                      OFERTA
                    </span>
                  )}

                  {/* Botón Wishlist */}
                  <button 
                    className="absolute top-2 right-2 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/90 hover:bg-white text-gray-400 hover:text-red-500 flex items-center justify-center transition-all duration-200 shadow-sm cursor-pointer" 
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                    aria-label="Agregar a favoritos"
                  >
                    <Heart className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </button>
                </div>

                {/* Información del Producto */}
                <div className="pt-2 sm:pt-2.5 pb-1 flex flex-col">
                  {/* Precio */}
                  <div className="flex items-baseline gap-1.5 mb-0.5">
                    {prod.precio_oferta ? (
                      <>
                        <span className="text-xs sm:text-sm md:text-base font-bold text-gray-900">
                          ${Number(prod.precio_oferta).toLocaleString('es-CO')}
                        </span>
                        <span className="text-[10px] sm:text-xs text-gray-400 line-through">
                          ${Number(prod.precio_venta || prod.precio_web || 0).toLocaleString('es-CO')}
                        </span>
                      </>
                    ) : (
                      <span className="text-xs sm:text-sm md:text-base font-bold text-gray-900">
                        ${Number(prod.precio_venta || prod.precio_web || 0).toLocaleString('es-CO')}
                      </span>
                    )}
                  </div>

                  {/* Título / Nombre */}
                  <h3 className="text-xs sm:text-sm font-normal text-gray-900 truncate leading-snug">
                    {prod.titulo_web || prod.modelo_nombre}
                  </h3>

                  {/* Categoría */}
                  <span className="text-[11px] sm:text-xs text-gray-500 font-normal truncate mt-0.5">
                    {prod.categoria_nombre || 'Calzado'}
                  </span>

                  {/* Color */}
                  <span className="text-[10px] sm:text-[11px] text-gray-400 font-normal uppercase truncate">
                    {prod.color_nombre}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* BANNER PROMOCIONAL */}
      <section 
        className="promo-banner container"
        style={webConfig?.promo_img ? { backgroundImage: `url(${getImgUrl(webConfig.promo_img)})` } : {}}
      >
        <div className="promo-overlay"></div>
        <div className="promo-content glass">
          <span className="promo-badge">OFERTA ESPECIAL</span>
          <h2>{webConfig?.promo_title || 'Estilo y Confort sin Compromisos.'}</h2>
          <p>{webConfig?.promo_text || 'Encuentra tu talla ideal con nuestro sistema de inventario en vivo.'}</p>
          <Link to="/catalogo" className="btn btn-primary mt-2">Explorar Colección</Link>
        </div>
      </section>
    </div>
  );
}
