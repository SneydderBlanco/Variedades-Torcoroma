import React, { useEffect } from 'react';
import { X, Minus, Plus, ShoppingBag, Trash2, ArrowRight, ArrowLeft, ShieldCheck, Truck, Search } from 'lucide-react';
import { useCart } from '../context/CartContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
const getImgUrl = (path) => path ? (path.startsWith('http') ? path : `${API_URL}${path}`) : '';

export default function CartDrawer() {
  const { isDrawerOpen, toggleDrawer, cart, removeFromCart, updateQuantity, cartTotal, itemsCount } = useCart();

  // Meta para envío gratis ($150.000 COP)
  const FREE_SHIPPING_THRESHOLD = 150000;
  const shippingRemaining = Math.max(0, FREE_SHIPPING_THRESHOLD - cartTotal);
  const shippingProgress = Math.min(100, (cartTotal / FREE_SHIPPING_THRESHOLD) * 100);

  // Bloquear scroll de fondo y ocultar navbar cuando el carrito está abierto
  useEffect(() => {
    if (isDrawerOpen) {
      document.body.style.overflow = 'hidden';
      document.body.classList.add('cart-open');
    } else {
      document.body.style.overflow = 'unset';
      document.body.classList.remove('cart-open');
    }
    return () => {
      document.body.style.overflow = 'unset';
      document.body.classList.remove('cart-open');
    };
  }, [isDrawerOpen]);

  // Cerrar carrito al presionar tecla Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isDrawerOpen) {
        toggleDrawer();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDrawerOpen, toggleDrawer]);

  const handleWhatsAppCheckout = () => {
    const phone = "573224613457"; 
    
    let message = `¡Hola Variedades Torcoroma! 👋\n`;
    message += `Quiero solicitar el siguiente pedido desde la tienda virtual:\n\n`;
    message += `🛍️ *DETALLE DEL PEDIDO:*\n`;
    
    cart.forEach((item, index) => {
      message += `${index + 1}. *${item.nombre}*\n`;
      message += `   • Color: ${item.color} | Talla: ${item.talla}\n`;
      message += `   • Cantidad: ${item.cantidad} x $${Number(item.precio).toLocaleString('es-CO')}\n`;
      message += `   • Subtotal: $${Number(item.precio * item.cantidad).toLocaleString('es-CO')}\n\n`;
    });
    
    message += `━━━━━━━━━━━━━━━━━━━━\n`;
    message += `💰 *TOTAL A PAGAR:* $${Number(cartTotal).toLocaleString('es-CO')}\n`;
    if (cartTotal >= FREE_SHIPPING_THRESHOLD) {
      message += `🚚 *ENVÍO:* ¡GRATIS! (Aplica en compras > $150.000)\n`;
    }
    message += `━━━━━━━━━━━━━━━━━━━━\n\n`;
    message += `¿Me podrían confirmar disponibilidad y los métodos de pago disponibles para despacho? ¡Muchas gracias!`;

    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${phone}?text=${encodedMessage}`;
    
    window.open(whatsappUrl, '_blank');
  };

  return (
    <>
      {/* Fondo Oscuro / Overlay con desenfoque (z-[9998] para cubrir toda la pantalla detrás del carrito) */}
      <div 
        className={`fixed inset-0 bg-black/60 backdrop-blur-xs z-[9998] transition-opacity duration-300 ${
          isDrawerOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={toggleDrawer}
        aria-hidden="true"
      />

      {/* Sidebar / Offcanvas Lateral con fondo sólido blanco y z-[9999] */}
      <aside 
        className={`fixed top-0 right-0 h-full h-[100dvh] max-h-[100dvh] w-full max-w-md bg-white z-[9999] shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out ${
          isDrawerOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        aria-modal="true"
        role="dialog"
      >
        {/* Cabecera para MÓVIL (sm:hidden) - Réplica exacta del Navbar con TORCOROMA */}
        <div className="flex sm:hidden w-full bg-white border-b border-gray-100 px-4 py-4 items-center justify-between flex-shrink-0 z-10 shadow-xs">
          {/* Logo TORCOROMA idéntico al Navbar */}
          <span className="text-xl font-black tracking-[2px] text-gray-900 select-none">
            TORCOROMA
          </span>

          {/* Iconos derechos idénticos al Navbar */}
          <div className="flex items-center gap-3.5 text-gray-900">
            <button 
              type="button"
              className="p-1 text-gray-900 hover:text-[#F5C227] transition-colors cursor-pointer"
              aria-label="Buscar"
            >
              <Search className="w-5 h-5" />
            </button>

            <button 
              type="button"
              onClick={toggleDrawer}
              className="relative p-1 text-gray-900 hover:text-[#F5C227] transition-colors cursor-pointer"
              aria-label="Carrito de compras"
              title="Cerrar carrito"
            >
              <ShoppingBag className="w-5 h-5" />
              {itemsCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-[#F5C227] text-gray-900 text-[10px] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center">
                  {itemsCount}
                </span>
              )}
            </button>

            <button 
              type="button"
              onClick={toggleDrawer}
              className="p-1 text-gray-900 hover:text-[#F5C227] transition-colors cursor-pointer active:scale-95"
              aria-label="Cerrar carrito"
              title="Cerrar carrito"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Cabecera para COMPUTADOR (hidden sm:flex) - Diseño original clásico */}
        <div className="hidden sm:flex px-6 py-5 border-b border-gray-100 items-center justify-between bg-white flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gray-900 text-[#F5C227] flex items-center justify-center shadow-sm">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-gray-900 tracking-tight flex items-center gap-2">
                TU CARRITO
                {itemsCount > 0 && (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                    {itemsCount} {itemsCount === 1 ? 'ítem' : 'ítems'}
                  </span>
                )}
              </h2>
            </div>
          </div>
          <button 
            onClick={toggleDrawer}
            className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all duration-200 cursor-pointer"
            aria-label="Cerrar carrito"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Barra de Envío Gratis */}
        <div className="px-5 sm:px-6 py-3 bg-gray-50 border-b border-gray-100 text-xs flex-shrink-0">
          <div className="flex items-center justify-between font-semibold text-gray-700 mb-1.5">
            <span className="flex items-center gap-1.5">
              <Truck className="w-4 h-4 text-[#F5C227]" />
              {cartTotal >= FREE_SHIPPING_THRESHOLD ? (
                <span className="text-green-700 font-bold">¡Felicidades! Tienes Envío Gratis 🎉</span>
              ) : (
                <span>Te faltan <b className="text-gray-900">${Number(shippingRemaining).toLocaleString('es-CO')}</b> para Envío Gratis</span>
              )}
            </span>
            <span className="text-gray-400 text-[11px] font-medium">{Math.round(shippingProgress)}%</span>
          </div>
          <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-[#F5C227] transition-all duration-500 rounded-full"
              style={{ width: `${shippingProgress}%` }}
            />
          </div>
        </div>

        {/* Lista de Productos */}
        <div className="flex-1 overflow-y-auto px-6 py-4 divide-y divide-gray-100">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-16 text-gray-400">
              <div className="w-20 h-20 rounded-full bg-gray-50 flex items-center justify-center mb-4 text-gray-300">
                <ShoppingBag className="w-10 h-10" />
              </div>
              <h3 className="text-base font-bold text-gray-800 mb-1">Tu carrito está vacío</h3>
              <p className="text-xs text-gray-500 max-w-xs mb-6">
                Descubre los mejores modelos de calzado urbano y añade tus favoritos.
              </p>
              <button 
                onClick={toggleDrawer}
                className="px-6 py-3 rounded-xl bg-gray-900 hover:bg-black text-white text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer shadow-md hover:shadow-lg active:scale-95"
              >
                Explorar Catálogo
              </button>
            </div>
          ) : (
            cart.map((item, index) => (
              <div key={`${item.id_modelo}-${item.color}-${item.talla}`} className="py-4 first:pt-0 last:pb-0 flex gap-4">
                {/* Miniatura del zapato */}
                <div className="w-20 h-20 rounded-xl bg-gray-100 border border-gray-100 overflow-hidden flex-shrink-0 relative">
                  {item.imagen ? (
                    <img 
                      src={getImgUrl(item.imagen)} 
                      alt={item.nombre} 
                      className="w-full h-full object-cover" 
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-gray-400">
                      Sin Foto
                    </div>
                  )}
                </div>

                {/* Información del Ítem */}
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-sm font-bold text-gray-900 leading-snug line-clamp-1">
                        {item.nombre}
                      </h4>
                      <button 
                        onClick={() => removeFromCart(index)}
                        className="text-gray-300 hover:text-red-500 p-1 rounded transition-colors cursor-pointer"
                        title="Eliminar producto"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-gray-100 text-gray-600 uppercase">
                        {item.color}
                      </span>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-gray-100 text-gray-900">
                        Talla {item.talla}
                      </span>
                    </div>
                  </div>

                  {/* Acciones: Cantidad y Subtotal */}
                  <div className="flex items-center justify-between mt-3">
                    {/* Controles de Cantidad */}
                    <div className="flex items-center border border-gray-200 rounded-lg bg-gray-50 overflow-hidden">
                      <button 
                        onClick={() => updateQuantity(index, item.cantidad - 1)}
                        disabled={item.cantidad <= 1}
                        className="w-7 h-7 flex items-center justify-center text-gray-600 hover:bg-gray-200 disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
                        aria-label="Disminuir cantidad"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-8 text-center text-xs font-black text-gray-900 select-none">
                        {item.cantidad}
                      </span>
                      <button 
                        onClick={() => updateQuantity(index, item.cantidad + 1)}
                        disabled={item.cantidad >= item.maxStock}
                        className="w-7 h-7 flex items-center justify-center text-gray-600 hover:bg-gray-200 disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
                        aria-label="Aumentar cantidad"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Precio / Subtotal */}
                    <span className="text-sm font-black text-gray-900">
                      ${Number(item.precio * item.cantidad).toLocaleString('es-CO')}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer y Checkout */}
        {cart.length > 0 && (
          <div className="p-5 sm:p-6 border-t border-gray-100 bg-white space-y-3.5 sm:space-y-4 shadow-lg flex-shrink-0 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
            {/* Desglose de Precios */}
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-gray-500 font-medium">
                <span>Subtotal</span>
                <span className="text-gray-900 font-semibold">${Number(cartTotal).toLocaleString('es-CO')}</span>
              </div>
              <div className="flex justify-between text-gray-500 font-medium">
                <span>Envío estimado</span>
                <span className={cartTotal >= FREE_SHIPPING_THRESHOLD ? "text-green-600 font-bold" : "text-gray-600"}>
                  {cartTotal >= FREE_SHIPPING_THRESHOLD ? "Gratis" : "Por calcular"}
                </span>
              </div>
              <div className="pt-2 border-t border-gray-100 flex justify-between items-baseline">
                <span className="text-sm font-bold text-gray-900">Total estimado</span>
                <span className="text-xl font-black text-gray-900 tracking-tight">
                  ${Number(cartTotal).toLocaleString('es-CO')}
                </span>
              </div>
            </div>

            {/* Botón Principal: Checkout WhatsApp */}
            <button 
              onClick={handleWhatsAppCheckout}
              className="w-full py-4 rounded-xl bg-[#F5C227] hover:bg-[#e0b01c] active:scale-[0.99] text-[#111827] font-black text-xs uppercase tracking-wider shadow-lg shadow-yellow-500/10 hover:shadow-yellow-500/20 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Hacer pedido por WhatsApp</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            {/* Botón Secundario: Seguir viendo calzado / Volver a la tienda */}
            <button 
              onClick={toggleDrawer}
              className="w-full py-3 rounded-xl border border-gray-200 hover:border-gray-300 bg-gray-50 hover:bg-gray-100 active:scale-[0.99] text-gray-700 hover:text-gray-900 font-bold text-xs uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Seguir viendo calzado</span>
            </button>

            {/* Garantía y Seguridad */}
            <div className="flex items-center justify-center gap-2 text-[11px] text-gray-400 font-medium">
              <ShieldCheck className="w-4 h-4 text-green-600" />
              <span>Atención directa y personalizada con la tienda física</span>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
