import React from 'react';
import { X, Minus, Plus, ShoppingBag } from 'lucide-react';
import { useCart } from '../context/CartContext';
import './CartDrawer.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export default function CartDrawer() {
  const { isDrawerOpen, toggleDrawer, cart, removeFromCart, updateQuantity, cartTotal } = useCart();

  const handleWhatsAppCheckout = () => {
    // 1. Número de WhatsApp de Torcoroma
    const phone = "573224613457"; 
    
    // 2. Construir el mensaje
    let message = `¡Hola Torcoroma! 👋 Quiero hacer este pedido:\n\n`;
    
    cart.forEach((item, index) => {
      message += `${index + 1}. *${item.nombre}*\n`;
      message += `   Color: ${item.color} | Talla: ${item.talla}\n`;
      message += `   Cantidad: ${item.cantidad} x $${Number(item.precio).toLocaleString('es-CO')}\n`;
      message += `   Subtotal: $${Number(item.precio * item.cantidad).toLocaleString('es-CO')}\n\n`;
    });
    
    message += `*TOTAL A PAGAR: $${Number(cartTotal).toLocaleString('es-CO')}*\n\n`;
    message += `¿Me ayudan con los medios de pago y el envío?`;

    // 3. Crear el link y redirigir
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${phone}?text=${encodedMessage}`;
    
    window.open(whatsappUrl, '_blank');
  };

  return (
    <>
      <div className={`cart-overlay ${isDrawerOpen ? 'open' : ''}`} onClick={toggleDrawer}></div>
      <div className={`cart-drawer ${isDrawerOpen ? 'open' : ''}`}>
        <div className="cart-header">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-6 h-6" />
            <h2>Tu Carrito</h2>
          </div>
          <button className="close-btn" onClick={toggleDrawer}>
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="cart-items">
          {cart.length === 0 ? (
            <div className="empty-cart">
              <ShoppingBag className="w-16 h-16 text-gray-300 mb-4" />
              <p>Tu carrito está vacío</p>
              <button className="btn btn-outline mt-4" onClick={toggleDrawer}>
                Explorar Catálogo
              </button>
            </div>
          ) : (
            cart.map((item, index) => (
              <div key={`${item.id_modelo}-${item.color}-${item.talla}`} className="cart-item">
                <div className="cart-item-img">
                  {item.imagen ? (
                    <img src={`${API_URL}${item.imagen}`} alt={item.nombre} />
                  ) : (
                    <div className="img-placeholder">Sin Foto</div>
                  )}
                </div>
                <div className="cart-item-info">
                  <h4>{item.nombre}</h4>
                  <p className="item-variant">{item.color} | Talla {item.talla}</p>
                  <p className="item-price">${Number(item.precio).toLocaleString('es-CO')}</p>
                  
                  <div className="item-actions">
                    <div className="qty-controls">
                      <button 
                        onClick={() => updateQuantity(index, item.cantidad - 1)}
                        disabled={item.cantidad <= 1}
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span>{item.cantidad}</span>
                      <button 
                        onClick={() => updateQuantity(index, item.cantidad + 1)}
                        disabled={item.cantidad >= item.maxStock}
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    <button className="remove-btn" onClick={() => removeFromCart(index)}>
                      Eliminar
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {cart.length > 0 && (
          <div className="cart-footer">
            <div className="cart-total">
              <span>Total</span>
              <span>${Number(cartTotal).toLocaleString('es-CO')}</span>
            </div>
            <button className="btn btn-primary btn-checkout" onClick={handleWhatsAppCheckout}>
              Finalizar Compra
            </button>
          </div>
        )}
      </div>
    </>
  );
}
