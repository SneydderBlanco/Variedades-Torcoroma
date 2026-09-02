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
      const existingIndex = prev.findIndex(
        item => item.id_modelo === product.id_modelo && 
                item.color === selectedColor && 
                item.talla === selectedTalla
      );

      // Calcular stock máximo disponible
      const maxStock = (product.stock && product.stock[selectedColor] && product.stock[selectedColor][selectedTalla]) 
        ? Number(product.stock[selectedColor][selectedTalla]) 
        : 99;

      if (existingIndex >= 0) {
        // Si ya existe, incrementar cantidad respetando el inventario
        const newCart = [...prev];
        if (newCart[existingIndex].cantidad < maxStock) {
          newCart[existingIndex].cantidad += 1;
        }
        return newCart;
      } else {
        // Extraer imagen correcta (soporta string directo o objeto Cloudinary)
        let imgPath = '';
        if (product.imagenes && product.imagenes.length > 0) {
          imgPath = typeof product.imagenes[0] === 'object' 
            ? product.imagenes[0].ruta_imagen 
            : product.imagenes[0];
        } else if (product.imagen_principal) {
          imgPath = product.imagen_principal;
        }

        // Determinar precio efectivo
        const finalPrice = Number(product.precio_oferta || product.precio_venta || product.precio_web || 0);

        return [...prev, {
          id_modelo: product.id_modelo,
          nombre: product.titulo_web || product.modelo_nombre,
          precio: finalPrice,
          imagen: imgPath,
          color: selectedColor,
          talla: selectedTalla,
          cantidad: 1,
          maxStock
        }];
      }
    });
    setIsDrawerOpen(true);
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
