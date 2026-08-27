import React, { useState, useEffect } from 'react';
import { Trash2, CreditCard, Banknote, Landmark, Printer, CheckCircle } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export default function InvoiceTicket({ 
  ticketItems = [], 
  onRemoveItem, 
  onClearTicket, 
  onChangeItemPrice, 
  onIncrementQty, 
  onDecrementQty, 
  onSplitItem,
  onUpdateDistribucion,
  userRole = 'ADMIN' 
}) {
  const [paymentMethod, setPaymentMethod] = useState('EFECTIVO');
  const [saleRegistered, setSaleRegistered] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Estados para el cálculo de vueltos (Efectivo)
  const [showCheckoutConfirm, setShowCheckoutConfirm] = useState(false);
  const [receivedAmount, setReceivedAmount] = useState('');

  // Estados para facturación DIAN
  const [requiereDian, setRequiereDian] = useState(false);
  const [showDianModal, setShowDianModal] = useState(false);
  const [dianTipoPersona, setDianTipoPersona] = useState('NATURAL');
  const [dianTipoDocumento, setDianTipoDocumento] = useState('CC');
  const [dianDocumento, setDianDocumento] = useState('');
  const [dianNombre, setDianNombre] = useState('');
  const [dianCorreo, setDianCorreo] = useState('');
  const [dianTelefono, setDianTelefono] = useState('');
  const [dianDireccion, setDianDireccion] = useState('');

  // Estabilizar el número y la fecha del ticket para que no cambien en cada render
  const [ticketNumber, setTicketNumber] = useState(() => Math.floor(Math.random() * 900000) + 100000);
  const [ticketDate, setTicketDate] = useState(() => new Date());

  // Estados de autorización para el empleado
  const [authKey, setAuthKey] = useState('');
  const [showAuthForm, setShowAuthForm] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [authError, setAuthError] = useState('');

  const [openMenuUniqueId, setOpenMenuUniqueId] = useState(null);
  const [splitQty, setSplitQty] = useState(1);
  const [splitPrice, setSplitPrice] = useState(0);

  // Estado del menú desplegable de distribución manual (Permitidos)
  const [openDistributionMenuId, setOpenDistributionMenuId] = useState(null);

  // Escuchar clics fuera para cerrar el menú desplegable automáticamente
  useEffect(() => {
    const handleOutsideClick = () => {
      setOpenMenuUniqueId(null);
    };
    if (openMenuUniqueId) {
      // Usar setTimeout para registrar el event listener en el siguiente tick
      // Esto evita que el click actual que abrió el menú se capture inmediatamente y lo cierre
      const timer = setTimeout(() => {
        document.addEventListener('click', handleOutsideClick);
      }, 0);
      return () => {
        clearTimeout(timer);
        document.removeEventListener('click', handleOutsideClick);
      };
    }
    if (openDistributionMenuId) {
      const handleOutsideClickDist = () => {
        setOpenDistributionMenuId(null);
      };
      const timer = setTimeout(() => {
        document.addEventListener('click', handleOutsideClickDist);
      }, 0);
      return () => {
        clearTimeout(timer);
        document.removeEventListener('click', handleOutsideClickDist);
      };
    }
  }, [openMenuUniqueId, openDistributionMenuId]);

  useEffect(() => {
    if (ticketItems.length === 0) {
      setTicketNumber(Math.floor(Math.random() * 900000) + 100000);
      setTicketDate(new Date());
    }
  }, [ticketItems.length]);

  // Infracciones de precio mínimo
  const violations = ticketItems.filter(item => item.precio < item.precio_minimo_venta);
  const hasViolations = violations.length > 0;

  // Si no hay infracciones de precio mínimo, reseteamos los estados de autorización
  useEffect(() => {
    if (!hasViolations) {
      setIsAuthorized(false);
      setShowAuthForm(false);
      setAuthKey('');
      setAuthError('');
    }
  }, [hasViolations]);

  const calculateTotal = () => {
    return ticketItems.reduce((acc, item) => acc + item.precio * item.cantidad, 0);
  };

  const totalDiscount = violations.reduce((acc, item) => acc + (item.precio_minimo_venta - item.precio) * item.cantidad, 0);

  const handleRegisterSale = async () => {
    const isBlocked = hasViolations && userRole === 'EMPLEADO';
    if (ticketItems.length === 0 || isBlocked) return;

    setLoading(true);
    setErrorMsg('');
    try {
      const bypassCheck = userRole === 'ADMIN';
      const res = await fetch(`${API_URL}/api/pos/ventas`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          items: ticketItems.map(item => ({
            id_modelo: item.id_modelo,
            id_variante: item.id_variante,
            talla: item.talla,
            precio: Number(item.precio),
            cantidad: item.cantidad,
            precio_venta_final: Number(item.precio),
            isReturn: item.isReturn,
            ticket_original: item.ticket_original,
            distribucionManual: item.distribucionManual
          })),
          paymentMethod,
          ubicacionId: 2, // Local Principal
          isAdmin: bypassCheck,
          requiere_dian: requiereDian,
          clienteDian: requiereDian ? {
            tipo_persona: dianTipoPersona,
            tipo_documento: dianTipoDocumento,
            numero_documento: dianDocumento.trim(),
            nombre_completo: dianNombre.trim(),
            correo: dianCorreo.trim(),
            telefono: dianTelefono.trim(),
            direccion: dianDireccion.trim()
          } : null
        })
      });

      const data = await res.json();
      if (res.ok) {
        setSaleRegistered(true);
        setShowCheckoutConfirm(false);
        setReceivedAmount('');
        setTimeout(() => {
          setSaleRegistered(false);
          onClearTicket();
          setIsAuthorized(false);
          setShowAuthForm(false);
          setRequiereDian(false);
          setDianTipoPersona('NATURAL');
          setDianTipoDocumento('CC');
          setDianDocumento('');
          setDianNombre('');
          setDianCorreo('');
          setDianTelefono('');
          setDianDireccion('');
        }, 2000);
      } else {
        setErrorMsg(data.error || 'Error al registrar la venta.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Error de red al registrar la venta.');
    } finally {
      setLoading(false);
    }
  };

  const totalAmount = calculateTotal();
  const isButtonDisabled = loading || (hasViolations && userRole === 'EMPLEADO');

  const getSuggestions = (total) => {
    const list = [total];
    const next10k = Math.ceil(total / 10000) * 10000;
    if (next10k > total) list.push(next10k);
    const next20k = Math.ceil(total / 20000) * 20000;
    if (next20k > total) list.push(next20k);
    const next50k = Math.ceil(total / 50000) * 50000;
    if (next50k > total) list.push(next50k);
    const next100k = Math.ceil(total / 100000) * 100000;
    if (next100k > total) list.push(next100k);
    return [...new Set(list)].sort((a, b) => a - b).slice(0, 4);
  };

  const handleAmountChange = (val) => {
    const cleanVal = val.replace(/\D/g, '');
    if (cleanVal === '') {
      setReceivedAmount('');
      return;
    }
    const numVal = Number(cleanVal);
    setReceivedAmount(numVal.toLocaleString('es-CO'));
  };

  const handleInitiateRegister = () => {
    if (ticketItems.length === 0 || isButtonDisabled) return;
    if (paymentMethod === 'EFECTIVO') {
      setReceivedAmount('');
      setShowCheckoutConfirm(true);
    } else {
      handleRegisterSale();
    }
  };

  const handleConfirmRegister = async () => {
    const receivedVal = Number(receivedAmount.replace(/\D/g, '')) || 0;
    if (receivedVal < totalAmount) return;
    await handleRegisterSale();
  };

  const handleBuscarClienteDian = async () => {
    const doc = dianDocumento.trim();
    if (!doc) return;
    try {
      const res = await fetch(`${API_URL}/api/clientes/buscar?documento=${encodeURIComponent(doc)}`);
      if (res.ok) {
        const client = await res.json();
        if (client) {
          setDianTipoPersona(client.tipo_persona || 'NATURAL');
          setDianTipoDocumento(client.tipo_documento || 'CC');
          setDianNombre(client.nombre_completo || '');
          setDianCorreo(client.correo || '');
          setDianTelefono(client.telefono || '');
          setDianDireccion(client.direccion || '');
        }
      }
    } catch (err) {
      console.error('Error al buscar cliente DIAN:', err);
    }
  };

  const handleDianCheckboxChange = (checked) => {
    if (checked) {
      setShowDianModal(true);
    } else {
      setRequiereDian(false);
      setDianTipoPersona('NATURAL');
      setDianTipoDocumento('CC');
      setDianDocumento('');
      setDianNombre('');
      setDianCorreo('');
      setDianTelefono('');
      setDianDireccion('');
    }
  };

  const handleSaveDianData = () => {
    if (!dianDocumento.trim() || !dianNombre.trim() || !dianCorreo.trim()) {
      alert('Por favor complete los campos obligatorios (*) de Identificación, Nombre y Correo.');
      return;
    }
    setRequiereDian(true);
    setShowDianModal(false);
  };

  const handleCancelDianData = () => {
    if (!dianDocumento.trim() || !dianNombre.trim() || !dianCorreo.trim()) {
      setRequiereDian(false);
    }
    setShowDianModal(false);
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100 flex flex-col h-full justify-between">
      <div>
        {/* Cabecera del panel */}
        <div className="flex items-center gap-2 mb-4">
          <div className="p-1.5 bg-torcoroma-gold/10 text-torcoroma-gold rounded-lg">
            <Printer className="w-4 h-4" />
          </div>
          <h2 className="text-sm font-extrabold text-torcoroma-dark tracking-wide">
            Tirilla de Venta Digital
          </h2>
        </div>

        {/* Contenedor del Ticket con aspecto de papel térmico */}
        <div className="relative border border-gray-200/80 rounded-xl p-6 bg-gradient-to-b from-[#FCFBF9] to-[#F5F3EB] text-gray-800 shadow-md font-mono text-sm overflow-hidden select-none">
          
          {/* Sawtooth / Jagged Edge Top */}
          <div className="absolute top-0 left-0 right-0 h-1.5 overflow-hidden flex" style={{ top: '-1px' }}>
            <svg className="w-full h-full text-white fill-current" viewBox="0 0 120 8" preserveAspectRatio="none">
              <path d="M0,0 L4,5 L8,0 L12,5 L16,0 L20,5 L24,0 L28,5 L32,0 L36,5 L40,0 L44,5 L48,0 L52,5 L56,0 L60,5 L64,0 L68,5 L72,0 L76,5 L80,0 L84,5 L88,0 L92,5 L96,0 L100,5 L104,0 L108,5 L112,0 L116,5 L120,0 L120,8 L0,8 Z" />
            </svg>
          </div>

          {/* Cabecera del negocio */}
          <div className="text-center border-b border-dashed border-gray-300 pb-4 mb-4 mt-2">
            <h3 className="font-extrabold text-base tracking-wider text-torcoroma-dark font-sans">
              VARIEDADES TORCOROMA
            </h3>
            <p className="text-[11px] text-gray-500 font-sans font-medium">Nit: 13.456.789-0</p>
            <p className="text-[11px] text-gray-500 font-sans leading-tight mt-0.5">Calle 10 # 5-20, Centro - Cúcuta</p>
            <div className="mt-3 space-y-0.5 border-t border-gray-200/50 pt-2 text-[11px] text-gray-500 font-sans">
              <p className="flex justify-between px-2">
                <span>N° Ticket:</span>
                <span className="font-mono font-bold text-gray-700">{ticketNumber}</span>
              </p>
              <p className="flex justify-between px-2">
                <span>Fecha:</span>
                <span className="font-mono text-gray-700">
                  {ticketDate.toLocaleString('es-CO', {
                    year: 'numeric',
                    month: 'numeric',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                  })}
                </span>
              </p>
            </div>
          </div>

          {/* Listado de Productos */}
          {ticketItems.length === 0 ? (
            <div className="text-center py-10 text-gray-400 italic font-sans text-xs">
              Ticket vacío.<br />Agrega calzado desde el catálogo.
            </div>
          ) : (
            <div className="space-y-4 max-h-72 overflow-y-auto pr-1 scrollbar-thin">
              {ticketItems.map((item) => {
                const isUnderLimit = item.precio < item.precio_minimo_venta;
                return (
                  <div key={item.uniqueId} className="group flex flex-col gap-1.5 border-b border-dashed border-gray-200/80 pb-3">
                    
                    {/* Fila 1: Nombre y botón eliminar */}
                    <div className="flex justify-between items-start gap-2">
                      <span className="font-sans font-extrabold text-gray-900 uppercase tracking-tight text-xs flex-grow pr-1 leading-snug">
                        {item.nombre}
                      </span>
                      <button
                        onClick={() => onRemoveItem(item.uniqueId)}
                        className="text-gray-400 hover:text-red-600 hover:bg-red-50 p-1 rounded transition-all cursor-pointer flex-shrink-0"
                        title="Eliminar calzado"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Fila 2: Atributos y edición de precio */}
                    <div className="flex items-center justify-between gap-1.5 flex-nowrap">
                      {/* Variante */}
                      <div className="flex flex-col items-start gap-1 min-w-0 flex-1">
                        <span 
                          className="font-sans text-gray-500 text-[10px] font-bold bg-white/60 border border-gray-200 px-1.5 py-0.5 rounded shadow-sm truncate max-w-full" 
                          title={`${item.color} • T${item.talla}`}
                        >
                          {item.color} • T{item.talla}
                        </span>
                        
                        {/* Tomado de Permitidos */}
                        {(() => {
                          if (!item.externos || item.externos.length === 0) return null;
                          
                          // Calcular distribución para mostrar en el badge
                          let currentDistrib = item.distribucionManual;
                          if (!currentDistrib) {
                            let localQty = Math.min(item.cantidad, item.stock_local || 0);
                            let extQty = item.cantidad - localQty;
                            currentDistrib = [{ id_local: 'local', nombre_local: 'Local', cantidad: localQty }];
                            if (extQty > 0) {
                                for (const ext of item.externos) {
                                  if (extQty <= 0) break;
                                  const take = Math.min(extQty, ext.cantidad);
                                  currentDistrib.push({ id_local: ext.id_local, nombre_local: ext.nombre_local, cantidad: take });
                                  extQty -= take;
                                }
                            }
                          }

                          let takenLabels = currentDistrib.filter(d => d.cantidad > 0 && d.id_local !== 'local').map(d => `${d.cantidad} de ${d.nombre_local}`);
                          const takenText = takenLabels.join(', ');
                          
                          return (
                            <button 
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenDistributionMenuId(openDistributionMenuId === item.uniqueId ? null : item.uniqueId);
                              }}
                              className="font-sans text-blue-800 text-[9px] font-extrabold bg-blue-100 hover:bg-blue-200 border border-blue-300 px-1.5 py-0.5 rounded shadow-sm mt-0.5 whitespace-normal break-words leading-tight w-full text-left transition-colors cursor-pointer" 
                              title={`Distribuir manualmente`}
                            >
                              {takenText ? `Tomado: ${takenText}` : "Distribuir"} ⚙️
                            </button>
                          );
                        })()}
                      </div>

                      {/* Control de cantidad (- / +) y precio unitario con menú Split */}
                      <div className="flex items-center gap-1.5 font-mono text-[11px] text-gray-500 flex-shrink-0">
                        {/* Selector de cantidad con botones - / + */}
                        <div className="flex items-center border border-gray-300 rounded bg-white shadow-sm overflow-hidden h-6">
                          <button
                            type="button"
                            onClick={() => onDecrementQty(item.uniqueId)}
                            className="px-1.5 h-full bg-gray-50 hover:bg-gray-100 hover:text-torcoroma-dark active:bg-gray-200 transition-colors border-r border-gray-200 font-extrabold cursor-pointer flex items-center justify-center text-xs"
                            title="Restar 1 par"
                          >
                            -
                          </button>
                          <span className={`px-2 font-bold text-xs ${item.isReturn ? 'text-red-600' : 'text-gray-800'}`}>
                            {item.isReturn ? Math.abs(item.cantidad) + ' (Dev)' : item.cantidad}
                          </span>
                          <button
                            type="button"
                            onClick={() => onIncrementQty(item.uniqueId)}
                            className="px-1.5 h-full bg-gray-50 hover:bg-gray-100 hover:text-torcoroma-dark active:bg-gray-200 transition-colors border-l border-gray-200 font-extrabold cursor-pointer flex items-center justify-center text-xs"
                            title="Sumar 1 par"
                          >
                            +
                          </button>
                        </div>

                        <span>x</span>
                        <div className="flex items-center gap-1">
                          <div className="flex items-center bg-white border border-gray-300 rounded px-1.5 py-0.5 focus-within:border-torcoroma-gold focus-within:ring-1 focus-within:ring-torcoroma-gold/30 transition-all shadow-sm">
                            <span className="text-gray-400 mr-0.5">$</span>
                            <input
                              type="text"
                              value={item.precio.toLocaleString('es-CO')}
                              onChange={(e) => {
                                const numericVal = Number(e.target.value.replace(/\D/g, ''));
                                onChangeItemPrice(item.uniqueId, numericVal);
                              }}
                              className={`w-16 text-right font-extrabold outline-none border-none bg-transparent p-0 text-xs ${
                                isUnderLimit ? 'text-red-600' : 'text-gray-800'
                              }`}
                            />
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (openMenuUniqueId === item.uniqueId) {
                                setOpenMenuUniqueId(null);
                              } else {
                                setOpenMenuUniqueId(item.uniqueId);
                                setSplitQty(1);
                                setSplitPrice(item.precio);
                              }
                            }}
                            className="p-1 text-gray-400 hover:text-gray-800 transition-colors flex items-center justify-center cursor-pointer active:scale-90"
                            title="Opciones del item"
                          >
                            <span className="text-[10px] select-none">▼</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Panel de Separar (inline) */}
                    {openMenuUniqueId === item.uniqueId && (
                      <div 
                        onClick={(e) => e.stopPropagation()} 
                        className="mt-2 p-3 bg-yellow-50/50 border border-yellow-200/60 rounded-xl flex flex-col gap-2.5 font-sans"
                      >
                        <div className="text-[11px] font-bold text-yellow-800 flex items-center gap-1 border-b border-yellow-200/50 pb-1.5">
                          <span>Separar calzado</span>
                        </div>
                        
                        {item.cantidad <= 1 ? (
                          <p className="text-[10px] text-gray-400 italic">
                            Se necesitan mínimo 2 pares para separar.
                          </p>
                        ) : (
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[10px] font-bold text-gray-500 uppercase">Pares a separar:</span>
                              <div className="flex items-center border border-gray-300 rounded bg-white shadow-sm overflow-hidden h-6">
                                <button
                                  type="button"
                                  onClick={() => setSplitQty((q) => Math.max(1, q - 1))}
                                  className="px-1.5 h-full bg-gray-50 hover:bg-gray-100 hover:text-torcoroma-dark active:bg-gray-200 transition-colors border-r border-gray-200 font-extrabold cursor-pointer flex items-center justify-center text-xs"
                                >
                                  -
                                </button>
                                <span className="px-2 font-bold text-gray-800 text-xs">
                                  {splitQty}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setSplitQty((q) => Math.min(item.cantidad - 1, q + 1))}
                                  className="px-1.5 h-full bg-gray-50 hover:bg-gray-100 hover:text-torcoroma-dark active:bg-gray-200 transition-colors border-l border-gray-200 font-extrabold cursor-pointer flex items-center justify-center text-xs"
                                >
                                  +
                                </button>
                              </div>
                            </div>

                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[10px] font-bold text-gray-500 uppercase">Precio unitario:</span>
                              <div className="flex items-center bg-white border border-gray-300 rounded px-1.5 py-0.5 focus-within:border-torcoroma-gold focus-within:ring-1 focus-within:ring-torcoroma-gold/30 transition-all shadow-sm">
                                <span className="text-gray-400 mr-0.5 text-xs font-mono">$</span>
                                <input
                                  type="text"
                                  value={splitPrice.toLocaleString('es-CO')}
                                  onChange={(e) => {
                                    const numericVal = Number(e.target.value.replace(/\D/g, ''));
                                    setSplitPrice(numericVal);
                                  }}
                                  className={`w-16 text-right font-extrabold outline-none border-none bg-transparent p-0 text-xs ${
                                    splitPrice < item.precio_minimo_venta ? 'text-red-600' : 'text-gray-800'
                                  }`}
                                />
                              </div>
                            </div>

                            {splitPrice < item.precio_minimo_venta && (
                              <span className="text-[9px] text-red-600 font-bold text-right -mt-1 block">
                                Por debajo del mínimo (${Number(item.precio_minimo_venta).toLocaleString('es-CO')})
                              </span>
                            )}

                            <button
                              type="button"
                              onClick={() => {
                                if (onSplitItem) {
                                  onSplitItem(item.uniqueId, splitQty, splitPrice);
                                }
                                setOpenMenuUniqueId(null);
                              }}
                              className="w-full bg-torcoroma-gold hover:bg-yellow-500 text-torcoroma-dark font-bold py-1.5 rounded-lg active:scale-[0.98] transition-all text-[11px] cursor-pointer shadow-sm text-center"
                            >
                              Separar {splitQty} {splitQty === 1 ? 'par' : 'pares'}
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Panel de Distribución Manual (inline) */}
                    {openDistributionMenuId === item.uniqueId && (
                      <div 
                        onClick={(e) => e.stopPropagation()} 
                        className="mt-2 p-3 bg-blue-50/50 border border-blue-200/60 rounded-xl flex flex-col gap-2.5 font-sans"
                      >
                        <div className="text-[11px] font-bold text-blue-800 flex items-center justify-between border-b border-blue-200/50 pb-1.5">
                          <span>Distribución Manual ({item.cantidad} pares)</span>
                          <button onClick={() => setOpenDistributionMenuId(null)} className="text-gray-400 hover:text-gray-700">✕</button>
                        </div>
                        <div className="flex flex-col gap-2">
                          {(() => {
                            let distrib = item.distribucionManual;
                            if (!distrib) {
                              let localQty = Math.min(item.cantidad, item.stock_local || 0);
                              let extQty = item.cantidad - localQty;
                              distrib = [{ id_local: 'local', nombre_local: 'Local', cantidad: localQty }];
                              if (extQty > 0) {
                                for (const ext of item.externos) {
                                  if (extQty <= 0) break;
                                  const take = Math.min(extQty, ext.cantidad);
                                  distrib.push({ id_local: ext.id_local, nombre_local: ext.nombre_local, cantidad: take });
                                  extQty -= take;
                                }
                              }
                            }

                            const todasLasUbicaciones = [
                              { id_local: 'local', nombre_local: 'Local', stockMax: item.stock_local || 0 },
                              ...(item.externos || []).map(e => ({ id_local: e.id_local, nombre_local: e.nombre_local, stockMax: e.cantidad }))
                            ];

                            const totalDistribuido = distrib.reduce((acc, curr) => acc + curr.cantidad, 0);
                            const faltante = item.cantidad - totalDistribuido;

                            return todasLasUbicaciones.map((loc) => {
                              const asignadoObj = distrib.find(d => d.id_local === loc.id_local);
                              const asignado = asignadoObj ? asignadoObj.cantidad : 0;
                              return (
                                <div key={loc.id_local} className="flex items-center justify-between text-xs">
                                  <span className="text-gray-700">{loc.nombre_local} (Max: {loc.stockMax})</span>
                                  <div className="flex items-center border border-gray-300 rounded bg-white shadow-sm overflow-hidden h-6 w-20">
                                    <button
                                      type="button"
                                      disabled={asignado <= 0}
                                      onClick={() => {
                                        if (asignado > 0) {
                                          const newDistrib = distrib.filter(d => d.id_local !== loc.id_local);
                                          newDistrib.push({ id_local: loc.id_local, nombre_local: loc.nombre_local, cantidad: asignado - 1 });
                                          if (typeof onUpdateDistribucion === 'function') {
                                            onUpdateDistribucion(item.uniqueId, newDistrib);
                                          }
                                        }
                                      }}
                                      className="px-1.5 h-full bg-gray-50 hover:bg-gray-100 disabled:opacity-30 border-r border-gray-200 font-extrabold flex items-center justify-center text-xs flex-1"
                                    >-</button>
                                    <span className="px-2 font-bold">{asignado}</span>
                                    <button
                                      type="button"
                                      disabled={asignado >= loc.stockMax || faltante <= 0}
                                      onClick={() => {
                                        if (asignado < loc.stockMax && faltante > 0) {
                                          const newDistrib = distrib.filter(d => d.id_local !== loc.id_local);
                                          newDistrib.push({ id_local: loc.id_local, nombre_local: loc.nombre_local, cantidad: asignado + 1 });
                                          if (typeof onUpdateDistribucion === 'function') {
                                            onUpdateDistribucion(item.uniqueId, newDistrib);
                                          }
                                        }
                                      }}
                                      className="px-1.5 h-full bg-gray-50 hover:bg-gray-100 disabled:opacity-30 border-l border-gray-200 font-extrabold flex items-center justify-center text-xs flex-1"
                                    >+</button>
                                  </div>
                                </div>
                              );
                            });
                          })()}
                        </div>
                      </div>
                    )}

                    {/* Fila 3: Alerta de precio mínimo y subtotal */}
                    <div className="flex justify-between items-center mt-0.5">
                      <div>
                        {isUnderLimit && (
                          <span className="text-[9px] font-sans font-bold text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded animate-pulse">
                            Mínimo: ${Number(item.precio_minimo_venta).toLocaleString('es-CO')}
                          </span>
                        )}
                      </div>
                      <span className={`text-right font-extrabold text-xs font-mono min-w-[70px] ${isUnderLimit ? 'text-red-600' : 'text-gray-900'}`}>
                        ${(item.precio * item.cantidad).toLocaleString('es-CO')}
                      </span>
                    </div>

                  </div>
                );
              })}
            </div>
          )}

          {/* Totales de Factura */}
          <div className="border-t border-dashed border-gray-300 mt-4 pt-4 space-y-2 text-right">
            <div className="flex justify-between text-[11px] text-gray-500 font-sans font-medium">
              <span>Subtotal:</span>
              <span className="font-mono font-bold">${totalAmount.toLocaleString('es-CO')}</span>
            </div>
            <div className={`flex justify-between items-center text-xs font-bold rounded-xl p-3 font-sans shadow-inner border ${totalAmount < 0 ? 'bg-yellow-50 border-yellow-200 text-yellow-800' : 'bg-torcoroma-gold/10 border-torcoroma-gold/20 text-torcoroma-dark'}`}>
              <span>TOTAL NETO:</span>
              <span className={`text-base font-black font-mono ${totalAmount < 0 ? 'text-yellow-900' : 'text-gray-900'}`}>${totalAmount.toLocaleString('es-CO')}</span>
            </div>
            {totalAmount < 0 && (
              <div className="text-[10px] text-yellow-700 text-center font-bold px-2">
                *El calzado nuevo es más económico. El local se queda con el beneficio de ${Math.abs(totalAmount).toLocaleString('es-CO')}.
              </div>
            )}
          </div>

          {/* Barcode estético al final */}
          <div className="mt-6 flex flex-col items-center opacity-75">
            <svg className="w-44 h-8" viewBox="0 0 100 20" preserveAspectRatio="none">
              <rect x="0" width="2.5" height="20" fill="#374151" />
              <rect x="4" width="1" height="20" fill="#374151" />
              <rect x="6" width="3.5" height="20" fill="#374151" />
              <rect x="11" width="1.5" height="20" fill="#374151" />
              <rect x="14" width="2" height="20" fill="#374151" />
              <rect x="17" width="4" height="20" fill="#374151" />
              <rect x="22.5" width="1" height="20" fill="#374151" />
              <rect x="25" width="3" height="20" fill="#374151" />
              <rect x="29" width="2.5" height="20" fill="#374151" />
              <rect x="32.5" width="1" height="20" fill="#374151" />
              <rect x="35" width="4.5" height="20" fill="#374151" />
              <rect x="41" width="2" height="20" fill="#374151" />
              <rect x="44" width="1" height="20" fill="#374151" />
              <rect x="46" width="3.5" height="20" fill="#374151" />
              <rect x="51" width="2.5" height="20" fill="#374151" />
              <rect x="54.5" width="1" height="20" fill="#374151" />
              <rect x="57" width="4" height="20" fill="#374151" />
              <rect x="62.5" width="2" height="20" fill="#374151" />
              <rect x="65.5" width="1" height="20" fill="#374151" />
              <rect x="68" width="3.5" height="20" fill="#374151" />
              <rect x="73" width="2" height="20" fill="#374151" />
              <rect x="76" width="1" height="20" fill="#374151" />
              <rect x="78" width="4" height="20" fill="#374151" />
              <rect x="83.5" width="2.5" height="20" fill="#374151" />
              <rect x="87" width="1" height="20" fill="#374151" />
              <rect x="89" width="3" height="20" fill="#374151" />
              <rect x="93" width="2.5" height="20" fill="#374151" />
              <rect x="97" width="1" height="20" fill="#374151" />
              <rect x="99" width="1" height="20" fill="#374151" />
            </svg>
            <span className="text-[9px] text-gray-500 font-mono tracking-[0.25em] mt-1.5">*{ticketNumber}*</span>
            <span className="text-[10px] text-gray-400 mt-2 font-sans font-bold tracking-widest">¡GRACIAS POR SU COMPRA!</span>
          </div>

          {/* Sawtooth / Jagged Edge Bottom */}
          <div className="absolute bottom-0 left-0 right-0 h-1.5 overflow-hidden flex" style={{ bottom: '-1px' }}>
            <svg className="w-full h-full text-white fill-current" viewBox="0 0 120 8" preserveAspectRatio="none">
              <path d="M0,8 L4,3 L8,8 L12,3 L16,8 L20,3 L24,8 L28,3 L32,8 L36,3 L40,8 L44,3 L48,8 L52,3 L56,8 L60,3 L64,8 L68,3 L72,8 L76,3 L80,8 L84,3 L88,8 L92,3 L96,8 L100,3 L104,8 L108,3 L112,8 L116,3 L120,8 L120,0 L0,0 Z" />
            </svg>
          </div>

        </div>
      </div>

      {/* Opciones de Pago y Registro */}
      {ticketItems.length > 0 && (
        <div className="mt-6 pt-6 border-t border-gray-100">
          <label className="block text-xs font-bold text-torcoroma-dark uppercase tracking-wider mb-3">
            Método de Pago
          </label>
          <div className="grid grid-cols-3 gap-2 mb-4">
            {[
              { id: 'EFECTIVO', label: 'Efectivo', icon: Banknote },
              { id: 'TRANSFERENCIA', label: 'Transf.', icon: Landmark },
              { id: 'TARJETA', label: 'Tarjeta', icon: CreditCard },
            ].map(({ id, label, icon: Icon }) => {
              const isActive = paymentMethod === id;
              return (
                <button
                  key={id}
                  onClick={() => setPaymentMethod(id)}
                  className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all duration-200 text-xs font-bold cursor-pointer active:scale-[0.97] ${
                    isActive
                      ? 'border-torcoroma-gold bg-torcoroma-gold/10 text-torcoroma-dark shadow-sm ring-1 ring-torcoroma-gold/25'
                      : 'border-gray-200 bg-white text-gray-500 hover:text-torcoroma-dark hover:border-gray-300'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-torcoroma-gold' : 'text-gray-400'}`} />
                  {label}
                </button>
              );
            })}
          </div>

          {/* Información Adicional Transferencia */}
          {paymentMethod === 'TRANSFERENCIA' && (
            <div className="bg-yellow-50 text-yellow-900 rounded-xl p-3 border border-yellow-200 text-xs mb-4 leading-relaxed font-sans shadow-sm">
              <span className="font-extrabold text-yellow-800">Datos de Transferencia Bancaria:</span>
              <p className="mt-0.5">Bancolombia Ahorros: <span className="font-mono font-bold">123-456789-01</span></p>
              <p>Titular: Chris / Variedades Torcoroma</p>
            </div>
          )}

          {/* Toggle Factura Electrónica DIAN */}
          <div className="mt-4 mb-5 pt-4 border-t border-gray-150 font-sans flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={requiereDian}
                  onChange={(e) => handleDianCheckboxChange(e.target.checked)}
                  className="w-4 h-4 rounded text-torcoroma-gold border-gray-300 focus:ring-torcoroma-gold/50 cursor-pointer"
                />
                <span className="text-xs font-bold text-torcoroma-dark uppercase tracking-wider">
                  ¿Factura Electrónica?
                </span>
              </label>

              {requiereDian && (
                <button
                  type="button"
                  onClick={() => setShowDianModal(true)}
                  className="text-[10px] font-bold text-yellow-800 hover:text-yellow-600 underline cursor-pointer"
                >
                  Editar Datos
                </button>
              )}
            </div>

            {requiereDian && dianNombre && (
              <div className="text-[10px] text-emerald-800 font-extrabold flex items-center gap-1.5 bg-emerald-50 border border-emerald-100 rounded-lg px-2.5 py-1.5 shadow-sm">
                <span>✓</span>
                <span className="truncate">Cliente: {dianNombre.toUpperCase()} ({dianDocumento})</span>
              </div>
            )}
          </div>

          {/* Escenario 1: Empleado vende por debajo del mínimo (Bloqueado) */}
          {hasViolations && userRole === 'EMPLEADO' && (
            <div className="bg-red-50 text-red-950 border border-red-300 rounded-xl p-4 text-xs font-semibold mb-4 leading-relaxed font-sans shadow-sm flex items-start gap-2 animate-pulse">
              <span className="text-base">⚠️</span>
              <div>
                <span className="font-extrabold text-red-800 block text-[11px]">VENTA BLOQUEADA</span>
                <p className="mt-0.5 text-gray-700 leading-normal">
                  El precio de algún calzado está por debajo del límite mínimo permitido. Esta operación no está autorizada para su rol de Empleado. Solicite ayuda al Administrador.
                </p>
              </div>
            </div>
          )}

          {/* Escenario 2: Registrador Chris */}
          {hasViolations && userRole === 'ADMIN' && (
            <div className="bg-yellow-50 text-yellow-950 border border-yellow-300 rounded-xl p-4 text-xs font-semibold mb-4 leading-relaxed font-sans shadow-sm flex items-start gap-2">
              <span className="text-base">💡</span>
              <div>
                <span className="font-extrabold text-yellow-800 block text-[11px]">ALERTA DE MARGEN AJUSTADO</span>
                <p className="mt-0.5 text-gray-700 leading-normal">
                  Estás vendiendo <span className="font-extrabold font-mono text-gray-900">${totalDiscount.toLocaleString('es-CO')}</span> por debajo del mínimo. Se registrará esta rebaja automáticamente en los reportes financieros.
                </p>
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="bg-red-50 text-red-800 rounded-xl p-3.5 border border-red-100 text-xs font-bold mb-4 text-center">
              {errorMsg}
            </div>
          )}

          {saleRegistered ? (
            <div className="bg-emerald-50 text-emerald-800 rounded-xl p-4 border border-emerald-200 flex items-center justify-center gap-2 text-center text-sm font-extrabold animate-pulse">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
              VENTA REGISTRADA EXITOSAMENTE
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={handleInitiateRegister}
                disabled={isButtonDisabled}
                className="flex-grow bg-gradient-to-r from-torcoroma-dark to-slate-800 hover:from-slate-800 hover:to-torcoroma-dark text-white font-bold py-4 px-6 rounded-xl shadow-md active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-base cursor-pointer disabled:opacity-55 disabled:cursor-not-allowed"
              >
                <CheckCircle className="w-5 h-5" />
                {loading ? 'Registrando...' : 'Registrar'}
              </button>
              <button
                onClick={onClearTicket}
                disabled={loading}
                className="bg-gray-100 text-gray-500 border border-transparent font-bold py-4 px-4 rounded-xl hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-all cursor-pointer disabled:opacity-55 disabled:cursor-not-allowed"
                title="Limpiar Ticket"
              >
                Vaciar
              </button>
            </div>
          )}
        </div>
      )}

      {/* Modal de Confirmación y Cambio (Vueltos) */}
      {showCheckoutConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 max-w-md w-full overflow-hidden p-6 animate-in fade-in zoom-in-95 duration-200 font-sans">
            {/* Cabecera */}
            <div className="flex items-center gap-3 border-b border-gray-100 pb-4 mb-4">
              <div className="p-2 bg-yellow-50 text-[#F5C227] rounded-xl">
                <Banknote className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-torcoroma-dark tracking-tight">
                  Confirmar Registro de Venta
                </h3>
                <p className="text-xs text-gray-500 font-medium">Método de Pago: Efectivo</p>
              </div>
            </div>

            {/* Total a pagar */}
            <div className="bg-yellow-50/50 border border-yellow-100 rounded-2xl p-4 text-center mb-5">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">
                Total Neto a Recibir
              </span>
              <span className="text-3xl font-black text-gray-900 font-mono">
                ${totalAmount.toLocaleString('es-CO')}
              </span>
            </div>

            {/* Sugerencias de Dinero Rápido */}
            <div className="mb-4">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                Dinero Rápido (Billetes)
              </label>
              <div className="grid grid-cols-2 gap-2">
                {getSuggestions(totalAmount).map((amount, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setReceivedAmount(amount.toLocaleString('es-CO'));
                    }}
                    className="py-2.5 px-3 rounded-xl border border-gray-200 hover:border-torcoroma-gold hover:bg-yellow-50 text-xs font-extrabold text-gray-700 transition-all cursor-pointer active:scale-[0.98]"
                  >
                    {amount === totalAmount ? 'Exacto: ' : ''}${amount.toLocaleString('es-CO')}
                  </button>
                ))}
              </div>
            </div>

            {/* Input Recibido */}
            <div className="mb-5">
              <label htmlFor="receivedAmountInput" className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                Monto Recibido
              </label>
              <div className="relative flex items-center bg-gray-50 border border-gray-300 rounded-xl px-3 py-3 focus-within:border-torcoroma-gold focus-within:ring-2 focus-within:ring-torcoroma-gold/25 transition-all shadow-sm">
                <span className="text-gray-400 font-mono font-bold mr-1 text-lg">$</span>
                <input
                  id="receivedAmountInput"
                  type="text"
                  autoFocus
                  placeholder="0"
                  value={receivedAmount}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  className="w-full bg-transparent outline-none border-none text-lg font-black text-gray-900 font-mono p-0"
                />
              </div>
            </div>

            {/* Vueltos o advertencia */}
            {(() => {
              const receivedVal = Number(receivedAmount.replace(/\D/g, '')) || 0;
              const isInsufficient = receivedVal < totalAmount;
              const vueltos = Math.max(0, receivedVal - totalAmount);

              return (
                <div className="mb-6">
                  {isInsufficient ? (
                    <div className="bg-red-50 text-red-800 rounded-xl p-3 border border-red-100 text-xs font-bold text-center flex items-center justify-center gap-1.5 leading-snug">
                      <span>⚠️</span>
                      <span>Monto recibido es menor al total de la venta (${totalAmount.toLocaleString('es-CO')})</span>
                    </div>
                  ) : (
                    <div className="bg-emerald-50/70 border border-emerald-100 rounded-2xl p-4 flex justify-between items-center shadow-sm">
                      <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                        Vueltos a Entregar:
                      </span>
                      <span className="text-2xl font-black text-emerald-600 font-mono">
                        ${vueltos.toLocaleString('es-CO')}
                      </span>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Botones de acción */}
            <div className="flex gap-3 border-t border-gray-100 pt-4">
              <button
                type="button"
                onClick={() => {
                  setShowCheckoutConfirm(false);
                  setReceivedAmount('');
                }}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold py-3.5 px-4 rounded-xl transition-all cursor-pointer text-center text-sm"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={loading || (Number(receivedAmount.replace(/\D/g, '')) || 0) < totalAmount}
                onClick={handleConfirmRegister}
                className="flex-1 bg-[#F5C227] hover:bg-[#e0b020] text-gray-900 font-extrabold py-3.5 px-4 rounded-xl transition-all cursor-pointer text-center text-sm disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-yellow-500/10"
              >
                {loading ? 'Registrando...' : 'Confirmar Venta'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Formulario DIAN (Aspecto de Tirilla Térmica) */}
      {showDianModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="relative border border-gray-200/80 rounded-xl p-6 bg-gradient-to-b from-[#FCFBF9] to-[#F5F3EB] text-gray-800 shadow-2xl font-mono text-xs w-full max-w-sm overflow-hidden select-none animate-in fade-in zoom-in-95 duration-200">
            
            {/* Sawtooth / Jagged Edge Top */}
            <div className="absolute top-0 left-0 right-0 h-1.5 overflow-hidden flex" style={{ top: '-1px' }}>
              <svg className="w-full h-full text-white fill-current" viewBox="0 0 120 8" preserveAspectRatio="none">
                <path d="M0,0 L4,5 L8,0 L12,5 L16,0 L20,5 L24,0 L28,5 L32,0 L36,5 L40,0 L44,5 L48,0 L52,5 L56,0 L60,5 L64,0 L68,5 L72,0 L76,5 L80,0 L84,5 L88,0 L92,5 L96,0 L100,5 L104,0 L108,5 L112,0 L116,5 L120,0 L120,8 L0,8 Z" />
              </svg>
            </div>

            {/* Cabecera de la tirilla DIAN */}
            <div className="text-center border-b border-dashed border-gray-300 pb-3 mb-4 mt-2 font-sans">
              <h3 className="font-extrabold text-sm tracking-wider text-torcoroma-dark font-sans uppercase">
                VARIEDADES TORCOROMA
              </h3>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-0.5 font-sans">Datos Factura Electrónica</p>
              <div className="mt-1 border-t border-gray-200/50 pt-1 text-[9px] text-gray-400 font-sans italic">
                * Campos obligatorios para reporte DIAN
              </div>
            </div>

            {/* Campos del Formulario */}
            <div className="space-y-2.5 font-sans text-xs">
              
              {/* Fila 1: Tipo Documento (30%) & Identificación (70%) */}
              <div className="grid grid-cols-12 gap-2">
                <div className="col-span-4 flex flex-col gap-1">
                  <label className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Doc *</label>
                  <select
                    value={dianTipoDocumento}
                    onChange={(e) => setDianTipoDocumento(e.target.value)}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-[11px] font-bold bg-white text-gray-800 focus:ring-1 focus:ring-torcoroma-gold outline-none cursor-pointer"
                  >
                    <option value="CC">CC</option>
                    <option value="NIT">NIT</option>
                    <option value="CE">CE</option>
                    <option value="PP">PP</option>
                  </select>
                </div>
                <div className="col-span-8 flex flex-col gap-1">
                  <label className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Identificación *</label>
                  <input
                    type="text"
                    placeholder="Número sin puntos..."
                    value={dianDocumento}
                    onChange={(e) => setDianDocumento(e.target.value)}
                    onBlur={handleBuscarClienteDian}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleBuscarClienteDian();
                      }
                    }}
                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs outline-none focus:border-torcoroma-gold font-sans font-bold"
                  />
                </div>
              </div>

              {/* Fila 2: Nombre o Razón Social (100%) */}
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Nombre / Razón Social *</label>
                <input
                  type="text"
                  placeholder="Nombre completo del cliente..."
                  value={dianNombre}
                  onChange={(e) => setDianNombre(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs outline-none focus:border-torcoroma-gold font-sans font-semibold uppercase"
                />
              </div>

              {/* Fila 3: Tipo Persona (40%) & Teléfono (60%) */}
              <div className="grid grid-cols-12 gap-2">
                <div className="col-span-5 flex flex-col gap-1">
                  <label className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Persona *</label>
                  <select
                    value={dianTipoPersona}
                    onChange={(e) => setDianTipoPersona(e.target.value)}
                    className="w-full px-1.5 py-1.5 border border-gray-300 rounded-lg text-[10px] font-bold bg-white text-gray-800 focus:ring-1 focus:ring-torcoroma-gold outline-none cursor-pointer"
                  >
                    <option value="NATURAL">NATURAL</option>
                    <option value="JURIDICA">JURÍDICA</option>
                  </select>
                </div>
                <div className="col-span-7 flex flex-col gap-1">
                  <label className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Teléfono</label>
                  <input
                    type="text"
                    placeholder="Número..."
                    value={dianTelefono}
                    onChange={(e) => setDianTelefono(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs outline-none focus:border-torcoroma-gold font-sans font-medium"
                  />
                </div>
              </div>

              {/* Fila 4: Correo Electrónico (100%) */}
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Correo Electrónico *</label>
                <input
                  type="email"
                  placeholder="ejemplo@correo.com"
                  value={dianCorreo}
                  onChange={(e) => setDianCorreo(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs outline-none focus:border-torcoroma-gold font-sans font-medium"
                />
              </div>

              {/* Fila 5: Dirección (100%) */}
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Dirección</label>
                <input
                  type="text"
                  placeholder="Dirección física del cliente..."
                  value={dianDireccion}
                  onChange={(e) => setDianDireccion(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs outline-none focus:border-torcoroma-gold font-sans font-medium"
                />
              </div>

            </div>

            {/* Botones de acción */}
            <div className="flex gap-2 border-t border-dashed border-gray-300 mt-5 pt-4 font-sans">
              <button
                type="button"
                onClick={handleCancelDianData}
                className="flex-1 bg-white border border-gray-300 text-gray-500 font-bold py-2 rounded-xl text-xs hover:bg-gray-50 transition cursor-pointer active:scale-[0.98] text-center"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveDianData}
                className="flex-1 bg-[#F5C227] hover:bg-[#e0b020] text-gray-900 font-extrabold py-2 rounded-xl text-xs transition cursor-pointer active:scale-[0.98] text-center shadow-md shadow-yellow-500/10"
              >
                Listo
              </button>
            </div>

            {/* Sawtooth / Jagged Edge Bottom */}
            <div className="absolute bottom-0 left-0 right-0 h-1.5 overflow-hidden flex" style={{ bottom: '-1px' }}>
              <svg className="w-full h-full text-white fill-current" viewBox="0 0 120 8" preserveAspectRatio="none">
                <path d="M0,8 L4,3 L8,8 L12,3 L16,8 L20,3 L24,8 L28,3 L32,8 L36,3 L40,8 L44,3 L48,8 L52,3 L56,8 L60,3 L64,8 L68,3 L72,8 L76,3 L80,8 L84,3 L88,8 L92,3 L96,8 L100,3 L104,8 L108,3 L112,8 L116,3 L120,8 L120,0 L0,0 Z" />
              </svg>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
