import React, { useState, useEffect } from 'react';
import POSPanel from './components/POSPanel';
import InvoiceTicket from './components/InvoiceTicket';
import InventoryGrid from './components/InventoryGrid';
import SuppliersList from './components/SuppliersList';
import FacturacionPanel from './components/FacturacionPanel';
import DashboardPanel from './components/DashboardPanel';
import GastosPanel from './components/GastosPanel';
import LocalizadorPanel from './components/LocalizadorPanel';
import UsuariosPanel from './components/UsuariosPanel';
import EcommercePanel from './components/EcommercePanel';
import { ShoppingBag, Box, Truck, FileText, LayoutDashboard, Wallet, LogOut, Search, ShieldAlert } from 'lucide-react';
import { useAuth } from './context/AuthContext';
import LoginScreen from './components/LoginScreen';

export default function App() {
  const { user, isAuthenticated, logout } = useAuth();
  const [currentView, setCurrentView] = useState('DASHBOARD'); // 'DASHBOARD', 'POS', 'INVENTARIO', 'PROVEEDORES'
  const [ticketItems, setTicketItems] = useState([]);
  const [facturacionTab, setFacturacionTab] = useState('LOCAL');
  const [facturacionDate, setFacturacionDate] = useState(null);
  const [proveedoresShowPending, setProveedoresShowPending] = useState(false);

  // Redirección condicional según rol al iniciar sesión
  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.rol === 'EMPLEADO') {
        setCurrentView('POS');
      } else {
        setCurrentView('DASHBOARD');
      }
    }
  }, [isAuthenticated, user?.rol]);

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  // Agregar calzado al ticket de venta
  const handleAddToTicket = (newItem) => {
    setTicketItems((prevItems) => {
      // Buscar si existe un item con el mismo id_variante Y el mismo precio (y mismo isReturn si aplica)
      const existingItemIndex = prevItems.findIndex(
        (item) => item.id_variante === newItem.id_variante && item.precio === newItem.precio && item.isReturn === newItem.isReturn
      );

      if (existingItemIndex > -1) {
        const updatedItems = [...prevItems];
        const existingItem = updatedItems[existingItemIndex];
        const newQty = existingItem.cantidad + newItem.cantidad; // Si es devolución, sumará un negativo

        // Validar que no supere el stock disponible (solo si no es devolución)
        if (newItem.isReturn || newQty <= newItem.stockDisponible) {
          updatedItems[existingItemIndex] = {
            ...existingItem,
            cantidad: newQty,
          };
        } else {
          updatedItems[existingItemIndex] = {
            ...existingItem,
            cantidad: newItem.stockDisponible,
          };
        }
        return updatedItems;
      }

      // Si no existe, creamos un nuevo item con uniqueId único
      const uniqueId = `${newItem.id_variante}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      return [...prevItems, { ...newItem, uniqueId }];
    });
  };

  // Remover item del ticket
  const handleRemoveItem = (uniqueId) => {
    setTicketItems((prevItems) =>
      prevItems.filter((item) => item.uniqueId !== uniqueId)
    );
  };

  // Actualizar precio de un ítem en el ticket
  const handleUpdateItemPrice = (uniqueId, newPrice) => {
    setTicketItems((prevItems) =>
      prevItems.map((item) =>
        item.uniqueId === uniqueId ? { ...item, precio: newPrice } : item
      )
    );
  };

  // Incrementar la cantidad de un ítem en el ticket (o hacer más negativo si es devolución)
  const handleIncrementQty = (uniqueId) => {
    setTicketItems((prevItems) =>
      prevItems.map((item) => {
        if (item.uniqueId === uniqueId) {
          const newQty = item.isReturn ? item.cantidad - 1 : item.cantidad + 1;
          if (item.isReturn || newQty <= item.stockDisponible) {
            return { ...item, cantidad: newQty };
          }
        }
        return item;
      })
    );
  };

  // Decrementar la cantidad de un ítem en el ticket (o acercar a 0 si es devolución)
  const handleDecrementQty = (uniqueId) => {
    setTicketItems((prevItems) =>
      prevItems
        .map((item) => {
          if (item.uniqueId === uniqueId) {
            const newQty = item.isReturn ? item.cantidad + 1 : item.cantidad - 1;
            return { ...item, cantidad: newQty };
          }
          return item;
        })
        .filter((item) => item.cantidad !== 0)
    );
  };

  // Separar/Dividir un ítem de cantidad > 1 en dos líneas distintas
  const handleSplitItem = (uniqueId, qtyToSplit = 1, newPrice = null) => {
    setTicketItems((prevItems) => {
      const index = prevItems.findIndex((item) => item.uniqueId === uniqueId);
      if (index === -1) return prevItems;

      const itemToSplit = prevItems[index];
      const splitAmount = Math.max(1, Math.min(itemToSplit.cantidad - 1, qtyToSplit));
      if (itemToSplit.cantidad <= splitAmount) return prevItems;

      // Crear el item restante con cantidad - splitAmount
      const itemRemaining = {
        ...itemToSplit,
        cantidad: itemToSplit.cantidad - splitAmount
      };

      // Crear el item separado con cantidad splitAmount y nuevo uniqueId
      const newUniqueId = `${itemToSplit.id_variante}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      const itemSplit = {
        ...itemToSplit,
        uniqueId: newUniqueId,
        cantidad: splitAmount,
        precio: newPrice !== null ? Number(newPrice) : itemToSplit.precio
      };

      const updatedItems = [...prevItems];
      updatedItems.splice(index, 1, itemRemaining, itemSplit);
      return updatedItems;
    });
  };

  // Actualizar distribución manual de un ítem
  const handleUpdateDistribucion = (uniqueId, newDistribucion) => {
    setTicketItems((prevItems) =>
      prevItems.map((item) => {
        if (item.uniqueId === uniqueId) {
          return { ...item, distribucionManual: newDistribucion };
        }
        return item;
      })
    );
  };

  // Vaciar ticket de venta
  const handleClearTicket = () => {
    setTicketItems([]);
  };

  const getHeaderTitle = () => {
    switch (currentView) {
      case 'DASHBOARD':
        return 'MENÚ PRINCIPAL';
      case 'POS':
        return 'MODULO DE VENTAS';
      case 'FACTURACION':
        return 'FACTURACIÓN Y CUADRE DE CAJA DIARIO';
      case 'LOCALIZADOR':
        return 'LOCALIZADOR GLOBAL DE INVENTARIO';
      case 'INVENTARIO':
        return 'ADMINISTRACIÓN DE INVENTARIO';
      case 'GASTOS':
        return 'REGISTRO Y CONTROL DE GASTOS';
      case 'PROVEEDORES':
        return 'REGISTRO Y CONTROL DE PROVEEDORES';
      case 'USUARIOS':
        return 'SEGURIDAD Y CONTROL DE ACCESOS';
      case 'ECOMMERCE':
        return 'ADMINISTRADOR DE TIENDA VIRTUAL';
      default:
        return 'VARIEDADES TORCOROMA';
    }
  };

  return (
    <div className="min-h-screen flex bg-torcoroma-light font-sans text-torcoroma-dark overflow-hidden">
      {/* Sidebar Fijo a la Izquierda */}
      <aside className="w-[280px] bg-[#f3f3f3] border-r border-gray-200 flex flex-col h-screen sticky top-0 flex-shrink-0 shadow-lg z-10">
        {/* Cabecera / Logotipo Oficial */}
        <div className="flex flex-col items-center justify-center py-6 border-b border-gray-200/80 px-6">
          <div className="w-[170px] h-[170px] flex items-center justify-center hover:scale-[1.03] transition-transform duration-300 select-none">
            <img 
              src="/logo.jpg" 
              alt="Variedades Torcoroma" 
              className="w-full h-full object-contain"
            />
          </div>
        </div>
        
        {/* Menú de Navegación Vertical Compacto */}
        <nav className="flex-grow px-6 pt-6 pb-6 space-y-3.5 overflow-y-auto overflow-x-hidden">
          {user?.rol === 'ADMIN' && (
            <button
              onClick={() => setCurrentView('DASHBOARD')}
              className={`w-full py-3 px-4 rounded-xl flex items-center gap-3 transition-all duration-200 border cursor-pointer ${
                currentView === 'DASHBOARD'
                  ? 'bg-torcoroma-gold text-torcoroma-dark border-torcoroma-gold font-bold shadow-md shadow-yellow-500/10'
                  : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50 hover:text-torcoroma-dark hover:border-gray-300'
              }`}
            >
              <LayoutDashboard className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm font-bold tracking-wide">INICIO</span>
            </button>
          )}

          <button
            onClick={() => setCurrentView('LOCALIZADOR')}
            className={`w-full py-3 px-4 rounded-xl flex items-center gap-3 transition-all duration-200 border cursor-pointer ${
              currentView === 'LOCALIZADOR'
                ? 'bg-torcoroma-gold text-torcoroma-dark border-torcoroma-gold font-bold shadow-md shadow-yellow-500/10'
                : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50 hover:text-torcoroma-dark hover:border-gray-300'
            }`}
          >
            <Search className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm font-bold tracking-wide">LOCALIZADOR</span>
          </button>

          <button
            onClick={() => setCurrentView('POS')}
            className={`w-full py-3 px-4 rounded-xl flex items-center gap-3 transition-all duration-200 border cursor-pointer ${
              currentView === 'POS'
                ? 'bg-torcoroma-gold text-torcoroma-dark border-torcoroma-gold font-bold shadow-md shadow-yellow-500/10'
                : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50 hover:text-torcoroma-dark hover:border-gray-300'
            }`}
          >
            <ShoppingBag className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm font-bold tracking-wide">PUNTO DE VENTA</span>
          </button>

          <button
            onClick={() => setCurrentView('INVENTARIO')}
            className={`w-full py-3 px-4 rounded-xl flex items-center gap-3 transition-all duration-200 border cursor-pointer ${
              currentView === 'INVENTARIO'
                ? 'bg-torcoroma-gold text-torcoroma-dark border-torcoroma-gold font-bold shadow-md shadow-yellow-500/10'
                : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50 hover:text-torcoroma-dark hover:border-gray-300'
            }`}
          >
            <Box className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm font-bold tracking-wide">INVENTARIO</span>
          </button>

          <button
            onClick={() => setCurrentView('GASTOS')}
            className={`w-full py-3 px-4 rounded-xl flex items-center gap-3 transition-all duration-200 border cursor-pointer ${
              currentView === 'GASTOS'
                ? 'bg-torcoroma-gold text-torcoroma-dark border-torcoroma-gold font-bold shadow-md shadow-yellow-500/10'
                : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50 hover:text-torcoroma-dark hover:border-gray-300'
            }`}
          >
            <Wallet className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm font-bold tracking-wide">GASTOS</span>
          </button>

          <button
            onClick={() => {
              setFacturacionTab('LOCAL');
              setFacturacionDate(null);
              setCurrentView('FACTURACION');
            }}
            className={`w-full py-3 px-4 rounded-xl flex items-center gap-3 transition-all duration-200 border cursor-pointer ${
              currentView === 'FACTURACION'
                ? 'bg-torcoroma-gold text-torcoroma-dark border-torcoroma-gold font-bold shadow-md shadow-yellow-500/10'
                : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50 hover:text-torcoroma-dark hover:border-gray-300'
            }`}
          >
            <FileText className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm font-bold tracking-wide">FACTURACIÓN</span>
          </button>

          {user?.rol === 'ADMIN' && (
            <button
              onClick={() => {
                setProveedoresShowPending(false);
                setCurrentView('PROVEEDORES');
              }}
              className={`w-full py-3 px-4 rounded-xl flex items-center gap-3 transition-all duration-200 border cursor-pointer ${
                currentView === 'PROVEEDORES'
                  ? 'bg-torcoroma-gold text-torcoroma-dark border-torcoroma-gold font-bold shadow-md shadow-yellow-500/10'
                  : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50 hover:text-torcoroma-dark hover:border-gray-300'
              }`}
            >
              <Truck className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm font-bold tracking-wide">PROVEEDORES</span>
            </button>
          )}

          {user?.rol === 'ADMIN' && (
            <button
              onClick={() => setCurrentView('USUARIOS')}
              className={`w-full py-3 px-4 rounded-xl flex items-center gap-3 transition-all duration-200 border cursor-pointer ${
                currentView === 'USUARIOS'
                  ? 'bg-torcoroma-gold text-torcoroma-dark border-torcoroma-gold font-bold shadow-md shadow-yellow-500/10'
                  : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50 hover:text-torcoroma-dark hover:border-gray-300'
              }`}
            >
              <ShieldAlert className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm font-bold tracking-wide">SEGURIDAD</span>
            </button>
          )}
        </nav>

        {/* Footer del Sidebar */}
        <div className="p-4 border-t border-gray-200 text-center text-[10px] text-gray-400 font-medium bg-[#f3f3f3]">
          © {new Date().getFullYear()} Torcoroma Cúcuta
        </div>
      </aside>

      {/* Contenedor del Contenido Principal a la Derecha */}
      <main className="flex-grow h-screen overflow-y-auto flex flex-col">
          {/* Encabezado contextual superior */}
          <div className="bg-white border-b border-gray-200 py-5 px-8 flex items-center justify-between flex-shrink-0">
            <h2 className="text-lg font-bold tracking-tight text-torcoroma-dark">
              {getHeaderTitle()}
            </h2>
            <div className="flex items-center gap-3 select-none">
              <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-xl">
                <div className="w-5 h-5 rounded-full bg-torcoroma-gold flex items-center justify-center text-[10px] font-black text-torcoroma-dark">
                  {user?.username ? user.username.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="text-left">
                  <span className="text-xs font-black text-gray-900 block leading-tight">
                    {user?.username}
                  </span>
                  <span className={`text-[9px] font-extrabold uppercase tracking-wider block ${
                    user?.rol === 'ADMIN' ? 'text-yellow-600' : 'text-blue-600'
                  }`}>
                    {user?.rol === 'ADMIN' ? '👑 Administrador' : '👤 Personal POS'}
                  </span>
                </div>
              </div>
              <button
                onClick={logout}
                className="flex items-center gap-1.5 text-xs bg-red-50 hover:bg-red-100 text-red-700 font-bold px-3 py-1.5 rounded-xl transition-colors border border-red-200 active:scale-95 shadow-sm cursor-pointer"
                title="Cerrar Sesión"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Salir</span>
              </button>
            </div>
          </div>

          {/* Área del cuerpo de la aplicación */}
          <div className="flex-grow p-8 overflow-y-auto">
            {currentView === 'DASHBOARD' ? (
              <div className="max-w-7xl mx-auto">
                <DashboardPanel onNavigate={(view, extra, date) => {
                  setCurrentView(view);
                  if (view === 'FACTURACION') {
                    setFacturacionTab(extra || 'LOCAL');
                    setFacturacionDate(date || null);
                  }
                  if (view === 'PROVEEDORES') setProveedoresShowPending(extra);
                }} />
              </div>
            ) : currentView === 'POS' ? (
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 h-full max-w-7xl mx-auto items-start">
                {/* Buscador y Tallas */}
                <div className="xl:col-span-7 2xl:col-span-8 min-h-[500px]">
                  <POSPanel 
                    onAddToTicket={handleAddToTicket} 
                    selectedLocationId={2} 
                    ticketItems={ticketItems}
                    onDecrementQty={handleDecrementQty}
                  />
                </div>

                {/* Tirilla */}
                <div className="xl:col-span-5 2xl:col-span-4 min-h-[500px]">
                  <InvoiceTicket
                    ticketItems={ticketItems}
                    onRemoveItem={handleRemoveItem}
                    onClearTicket={handleClearTicket}
                    onChangeItemPrice={handleUpdateItemPrice}
                    onIncrementQty={handleIncrementQty}
                    onDecrementQty={handleDecrementQty}
                    onSplitItem={handleSplitItem}
                    onUpdateDistribucion={handleUpdateDistribucion}
                    userRole={user?.rol}
                  />
                </div>
              </div>
            ) : currentView === 'FACTURACION' ? (
              <div className="max-w-7xl mx-auto">
                <FacturacionPanel userRole={user?.rol} initialTab={facturacionTab} initialDate={facturacionDate} />
              </div>
            ) : currentView === 'INVENTARIO' ? (
              <div className="max-w-7xl mx-auto">
                <InventoryGrid />
              </div>
            ) : currentView === 'GASTOS' ? (
              <div className="max-w-7xl mx-auto">
                <GastosPanel />
              </div>
            ) : currentView === 'LOCALIZADOR' ? (
              <div className="h-full w-full mx-auto">
                <LocalizadorPanel />
              </div>
            ) : currentView === 'PROVEEDORES' && user?.rol === 'ADMIN' ? (
              <div className="max-w-7xl mx-auto">
                <SuppliersList initialShowPending={proveedoresShowPending} />
              </div>
            ) : currentView === 'USUARIOS' && user?.rol === 'ADMIN' ? (
              <div className="max-w-7xl mx-auto">
                <UsuariosPanel onShowMessage={(msg) => alert(msg)} />
              </div>
            ) : currentView === 'ECOMMERCE' && user?.rol === 'ADMIN' ? (
              <div className="max-w-7xl mx-auto xl:h-full">
                <EcommercePanel />
              </div>
            ) : (
              <div className="max-w-7xl mx-auto text-center py-20 text-gray-500 font-bold bg-white rounded-2xl shadow-sm border border-gray-150">
                🔒 Acceso restringido. Esta sección es exclusiva para el Administrador.
              </div>
            )}
        </div>
      </main>
    </div>
  );
}
