import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Catalogo from './pages/Catalogo';
import Producto from './pages/Producto';
import CartDrawer from './components/CartDrawer';
import { CartProvider } from './context/CartContext';
import './App.css';

function App() {
  return (
    <CartProvider>
      <BrowserRouter>
        <div className="app-container">
          <Navbar />
          <CartDrawer />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/catalogo" element={<Catalogo />} />
            <Route path="/catalogo/:categoria" element={<Catalogo />} />
            <Route path="/producto/:id" element={<Producto />} />
          </Routes>
        </main>
        <footer style={{ textAlign: 'center', padding: '2rem', marginTop: '2rem', backgroundColor: '#111827', color: '#fff' }}>
          <p>© {new Date().getFullYear()} Tiendas Torcoroma. Todos los derechos reservados.</p>
        </footer>
      </div>
      </BrowserRouter>
    </CartProvider>
  );
}

export default App;
