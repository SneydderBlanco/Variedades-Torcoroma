import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShoppingBag, Search, Menu, X } from 'lucide-react';
import { useCart } from '../context/CartContext';
import './Navbar.css';

export default function Navbar() {
  const { itemsCount, toggleDrawer } = useCart();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  
  const isHomePage = location.pathname === '/';

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Si no es la página de inicio, forzamos el estilo "scrolled" (fondo blanco, letras oscuras)
  const navbarClass = `navbar ${(scrolled || !isHomePage) ? 'scrolled' : ''}`;

  return (
    <nav className={navbarClass}>
      <div className="container nav-container">
        <Link to="/" className="nav-logo">
          TORCOROMA
        </Link>

        <nav className={`nav-links ${menuOpen ? 'open' : ''}`}>
          <Link to="/" onClick={() => setMenuOpen(false)}>Novedades</Link>
          <Link to="/catalogo/hombre" onClick={() => setMenuOpen(false)}>Hombre</Link>
          <Link to="/catalogo/mujer" onClick={() => setMenuOpen(false)}>Mujer</Link>
          <Link to="/catalogo/nino" onClick={() => setMenuOpen(false)}>Niño</Link>
        </nav>

        <div className="nav-icons">
          <button className="icon-btn"><Search className="w-5 h-5" /></button>
          <button className="icon-btn cart-btn" onClick={toggleDrawer}>
            <ShoppingBag className="w-5 h-5" />
            {itemsCount > 0 && <span className="cart-badge">{itemsCount}</span>}
          </button>
          <button className="icon-btn mobile-menu-btn" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>
    </nav>
  );
}
