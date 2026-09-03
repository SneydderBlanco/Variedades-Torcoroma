import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Heart, Sparkles } from 'lucide-react';
import { getProductosWeb, subscribeToEcommerceUpdates } from '../services/ecommerceService';
import { getOptimizedImgUrl } from '../utils/imageOptimizer';
import './Catalogo.css';

export default function Catalogo() {
  const { categoria } = useParams();
  const [allProductos, setAllProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isWarmingUp, setIsWarmingUp] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        const data = await getProductosWeb({
          onWarmupNotice: (warming) => {
            if (isMounted) setIsWarmingUp(warming);
          }
        });
        if (isMounted) {
          setAllProductos(data || []);
          setLoading(false);
          setIsWarmingUp(false);
        }
      } catch (error) {
        console.error("Error al cargar el catálogo", error);
        if (isMounted) setLoading(false);
      }
    };

    loadData();

    // Suscribirse a actualizaciones en background (SWR)
    const unsubscribe = subscribeToEcommerceUpdates((type, data) => {
      if (type === 'productos' && isMounted) {
        setAllProductos(data);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  // Filtrado instantáneo en cliente sin re-fetch al cambiar de categoría
  const productosFiltrados = useMemo(() => {
    if (!categoria) return allProductos;

    const routeCat = categoria.toLowerCase();
    return allProductos.filter(p => {
      const catName = p.categoria_nombre?.toLowerCase() || '';
      if ((routeCat === 'hombre' || routeCat === 'mujer') && catName === 'unisex') {
        return true;
      }
      return catName === routeCat;
    });
  }, [allProductos, categoria]);

  return (
    <div className="catalogo-page container section-padding mt-20">
      <div className="catalogo-header">
        <h1 className="catalogo-title">
          Catálogo {categoria ? `- ${categoria.charAt(0).toUpperCase() + categoria.slice(1)}` : 'Completo'}
        </h1>
        <p className="catalogo-subtitle">Descubre nuestra exclusiva selección de calzado.</p>
      </div>

      {/* Aviso amigable si el servidor está despertando por primera vez (Render cold start) */}
      {isWarmingUp && loading && (
        <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-sm flex items-center gap-3 shadow-xs">
          <div className="animate-spin w-4 h-4 border-2 border-amber-600 border-t-transparent rounded-full flex-shrink-0"></div>
          <div>
            <p className="font-semibold flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-600" /> Conectando con el catálogo de Torcoroma...
            </p>
            <p className="text-xs text-amber-700 mt-0.5">
              El servidor se está iniciando por primera vez, tomará solo unos segundos.
            </p>
          </div>
        </div>
      )}

      {loading && allProductos.length === 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4 lg:gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
            <div key={i} className="aspect-square bg-gray-100 rounded-sm animate-pulse"></div>
          ))}
        </div>
      ) : productosFiltrados.length === 0 ? (
        <div className="no-products">
          No hay productos disponibles en esta categoría por ahora.
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4 lg:gap-6">
          {productosFiltrados.map(prod => (
            <Link 
              to={`/producto/${prod.id_modelo}?color=${encodeURIComponent(prod.color_nombre)}`} 
              key={`${prod.id_modelo}-${prod.color_nombre}`} 
              className="group flex flex-col cursor-pointer transition-transform duration-200 hover:-translate-y-1 text-left"
            >
              {/* Contenedor de Imagen optimizada */}
              <div className="relative aspect-square w-full bg-gray-100 rounded-sm overflow-hidden flex items-center justify-center">
                {prod.imagen_principal ? (
                  <img 
                    src={getOptimizedImgUrl(prod.imagen_principal, 500)} 
                    alt={prod.modelo_nombre} 
                    loading="lazy"
                    decoding="async"
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
    </div>
  );
}
