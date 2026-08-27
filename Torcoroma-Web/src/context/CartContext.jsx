import React, { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext();

export function CartProvider({ children }) {
  const [cart, setCart] = useState(() => {
    const saved = localStorage.getItem('torcoroma_cart');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('torcoroma_cart', JSON.stringify(cart));
  }, [cart]);

  const addToCart = (product, selectedColor, selectedTalla) => {
    setCart(prev => {
      const existingItemIndex = prev.findIndex(
        item => item.id_modelo === product.id_modelo && 
                item.color === selectedColor && 
                item.talla === selectedTalla
      );

      if (existingItemIndex >= 0) {
        // Increment quantity if it already exists
        const newCart = [...prev];
        const stockAvailable = product.stock[selectedColor][selectedTalla];
        if (newCart[existingItemIndex].cantidad < stockAvailable) {
          newCart[existingItemIndex].cantidad += 1;
        }
        return newCart;
      } else {
        // Add new item
        return [...prev, {
          id_modelo: product.id_modelo,
          nombre: product.titulo_web || product.modelo_nombre,
          precio: product.precio_oferta || product.precio_venta,
          imagen: product.imagenes && product.imagenes.length > 0 ? product.imagenes[0] : null,
          color: selectedColor,
          talla: selectedTalla,
          cantidad: 1,
          maxStock: product.stock[selectedColor][selectedTalla]
        }];
      }
    });
    setIsDrawerOpen(true); // Open drawer when item is added
  };

  const removeFromCart = (index) => {
    setCart(prev => prev.filter((_, i) => i !== index));
  };

  const updateQuantity = (index, newQuantity) => {
    setCart(prev => {
      const newCart = [...prev];
      if (newQuantity > 0 && newQuantity <= newCart[index].maxStock) {
        newCart[index].cantidad = newQuantity;
      }
      return newCart;
    });
  };

  const clearCart = () => setCart([]);

  const toggleDrawer = () => setIsDrawerOpen(!isDrawerOpen);

  const cartTotal = cart.reduce((total, item) => total + (item.precio * item.cantidad), 0);
  const itemsCount = cart.reduce((count, item) => count + item.cantidad, 0);

  return (
    <CartContext.Provider value={{ 
      cart, addToCart, removeFromCart, updateQuantity, clearCart, 
      isDrawerOpen, toggleDrawer, setIsDrawerOpen,
      cartTotal, itemsCount 
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}
