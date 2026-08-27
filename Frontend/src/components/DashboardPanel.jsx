import React, { useState, useEffect } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { DollarSign, ShoppingBag, Wallet, AlertCircle, Award, AlertTriangle, Banknote, Settings, BellOff, X, Bell, Trash2, Globe, ArrowRight } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export default function DashboardPanel({ onNavigate }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Estados para la administración de las alertas de stock
  const [editingAlert, setEditingAlert] = useState(null);
  const [tempMinTallas, setTempMinTallas] = useState(5);
  const [successConfigMsg, setSuccessConfigMsg] = useState('');
  const [showManageModal, setShowManageModal] = useState(false);

  const handleOpenConfigModal = (item) => {
    setEditingAlert(item);
    setTempMinTallas(item.tallas_minimas);
  };

  const handleSaveConfig = async (exclude = false) => {
    if (!editingAlert) return;
    try {
      const res = await fetch(`${API_URL}/api/dashboard/alertas/config`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id_modelo: editingAlert.id_modelo,
          color: editingAlert.color,
          tallas_minimas: tempMinTallas,
          excluido: exclude
        })
      });
      if (res.ok) {
        setSuccessConfigMsg(exclude ? 'Alerta silenciada.' : 'Límite de alerta actualizado.');
        setEditingAlert(null);
        
        // Recargar datos del dashboard
        const refreshRes = await fetch(`${API_URL}/api/dashboard/resumen`);
        if (refreshRes.ok) {
          const json = await refreshRes.json();
          setData(json);
        }
        setTimeout(() => setSuccessConfigMsg(''), 3000);
      } else {
        alert('Error al actualizar la configuración de la alerta.');
      }
    } catch (err) {
      console.error(err);
      alert('Error de red al actualizar la alerta.');
    }
  };

  const handleMuteAlert = async (item) => {
    const confirmar = window.confirm(`¿Estás seguro de silenciar las alertas para ${item.modelo_nombre} (${item.color})?`);
    if (!confirmar) return;
    try {
      const res = await fetch(`${API_URL}/api/dashboard/alertas/config`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id_modelo: item.id_modelo,
          color: item.color,
          excluido: true
        })
      });
      if (res.ok) {
        setSuccessConfigMsg(`Alerta para ${item.modelo_nombre} silenciada.`);
        
        // Recargar datos del dashboard
        const refreshRes = await fetch(`${API_URL}/api/dashboard/resumen`);
        if (refreshRes.ok) {
          const json = await refreshRes.json();
          setData(json);
        }
        setTimeout(() => setSuccessConfigMsg(''), 3000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleExclusion = async (item) => {
    try {
      const res = await fetch(`${API_URL}/api/dashboard/alertas/config`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id_modelo: item.id_modelo,
          color: item.color,
          tallas_minimas: item.tallas_minimas,
          excluido: !item.excluido
        })
      });
      if (res.ok) {
        setSuccessConfigMsg(item.excluido ? `Alerta para ${item.modelo_nombre} reactivada.` : `Alerta para ${item.modelo_nombre} silenciada.`);
        
        // Recargar datos
        const refreshRes = await fetch(`${API_URL}/api/dashboard/resumen`);
        if (refreshRes.ok) {
          const json = await refreshRes.json();
          setData(json);
        }
        setTimeout(() => setSuccessConfigMsg(''), 3000);
      }
    } catch (err) {
      console.error(err);
      alert('Error al actualizar el estado de la alerta.');
    }
  };

  const handleResetConfig = async (item) => {
    const confirmar = window.confirm(`¿Estás seguro de restablecer ${item.modelo_nombre} (${item.color}) a la configuración por defecto?`);
    if (!confirmar) return;
    try {
      const res = await fetch(`${API_URL}/api/dashboard/alertas/config`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id_modelo: item.id_modelo,
          color: item.color,
          restablecer: true
        })
      });
      if (res.ok) {
        setSuccessConfigMsg(`Configuración por defecto restablecida para ${item.modelo_nombre}.`);
        
        // Recargar datos
        const refreshRes = await fetch(`${API_URL}/api/dashboard/resumen`);
        if (refreshRes.ok) {
          const json = await refreshRes.json();
          setData(json);
        }
        setTimeout(() => setSuccessConfigMsg(''), 3000);
      }
    } catch (err) {
      console.error(err);
      alert('Error al restablecer la configuración.');
    }
  };

  useEffect(() => {
    const fetchResumen = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_URL}/api/dashboard/resumen`);
        if (res.ok) {
          const json = await res.json();
          setData(json);
        } else {
          throw new Error('Error al obtener los datos del dashboard.');
        }
      } catch (err) {
        console.error(err);
        setError('No se pudo establecer conexión con el servidor.');
      } finally {
        setLoading(false);
      }
    };

    fetchResumen();
  }, []);

  if (error) {
    return (
      <div className="bg-red-50 text-red-800 rounded-2xl p-6 border border-red-100 flex flex-col items-center justify-center gap-4 max-w-lg mx-auto mt-10">
        <AlertTriangle className="w-12 h-12 text-red-500" />
        <h3 className="font-extrabold text-lg">Error de Conexión</h3>
        <p className="text-sm text-center font-medium leading-relaxed">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-2 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded-xl transition text-xs shadow-md cursor-pointer"
        >
          Reintentar Cargar
        </button>
      </div>
    );
  }

  // --- RENDERING SKELETONS DURING LOADING ---
  if (loading) {
    return (
      <div className="space-y-8 animate-pulse">
        {/* KPI Cards Skeletons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="bg-white border border-gray-150 rounded-2xl p-5 h-28 flex items-center justify-between">
              <div className="space-y-3 flex-grow">
                <div className="h-3 bg-gray-200 rounded w-24"></div>
                <div className="h-6 bg-gray-200 rounded w-32"></div>
              </div>
              <div className="w-12 h-12 bg-gray-200 rounded-xl"></div>
            </div>
          ))}
        </div>

        {/* Central Grid Skeletons */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 bg-white border border-gray-150 rounded-2xl p-6 h-96 flex flex-col justify-between">
            <div className="h-4 bg-gray-200 rounded w-40 mb-4"></div>
            <div className="h-64 bg-gray-100 rounded-xl w-full"></div>
          </div>
          <div className="lg:col-span-4 bg-white border border-gray-150 rounded-2xl p-6 h-96 flex flex-col justify-between">
            <div className="h-4 bg-gray-200 rounded w-48 mb-6"></div>
            <div className="space-y-4 flex-grow">
              {[1, 2, 3].map((idx) => (
                <div key={idx} className="h-16 bg-gray-50 rounded-xl border border-gray-100 p-3 flex items-center gap-3">
                  <div className="w-6 h-6 bg-gray-200 rounded-full"></div>
                  <div className="flex-grow space-y-2">
                    <div className="h-3 bg-gray-200 rounded w-28"></div>
                    <div className="h-2.5 bg-gray-200 rounded w-16"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Stock Alerts Skeleton */}
        <div className="bg-white border border-gray-150 rounded-2xl p-6 space-y-4">
          <div className="h-4 bg-gray-200 rounded w-48"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-gray-50 rounded-xl border border-gray-100"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // --- RENDERING ACTUAL DATA ---
  const { kpis_hoy, total_efectivo, deuda_proveedores, tramites_dian, ventas_semana, top_modelos, stock_critico } = data;

  return (
    <div className="space-y-8 pb-10">
      {/* 0. Banner Especial: Tienda Virtual */}
      <div 
        onClick={() => onNavigate && onNavigate('ECOMMERCE')}
        className="relative overflow-hidden bg-gradient-to-r from-torcoroma-dark to-gray-900 rounded-2xl p-6 md:p-8 shadow-xl cursor-pointer group transition-all duration-300 hover:shadow-2xl hover:scale-[1.01]"
      >
        {/* Elementos decorativos de fondo */}
        <div className="absolute -right-10 -top-10 text-white/5 transform rotate-12 transition-transform duration-500 group-hover:rotate-45 group-hover:scale-110">
          <Globe className="w-64 h-64" />
        </div>
        <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-torcoroma-gold/20 rounded-full blur-3xl"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="bg-torcoroma-gold text-torcoroma-dark p-4 rounded-2xl shadow-lg shadow-torcoroma-gold/20">
              <Globe className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white tracking-wide uppercase flex items-center gap-2">
                Tienda Virtual <span className="bg-torcoroma-gold text-torcoroma-dark text-[10px] px-2 py-0.5 rounded-full font-black animate-pulse">NUEVO</span>
              </h2>
              <p className="text-gray-400 text-sm font-medium mt-1">
                Administra los productos de tu página web, sube fotos y crea promociones al instante.
              </p>
            </div>
          </div>
          <button className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 px-6 py-3 rounded-xl font-bold text-sm uppercase transition-all backdrop-blur-sm group-hover:bg-torcoroma-gold group-hover:text-torcoroma-dark group-hover:border-torcoroma-gold">
            Gestor Web <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </button>
        </div>
      </div>

      {/* 1. Tarjetas Superiores (KPIs) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
        
        {/* KPI 1: Ventas Hoy */}
        <div className="bg-white border border-gray-150 rounded-2xl p-5 shadow-sm hover:shadow-md transition duration-300 flex items-center justify-between border-l-4 border-[#F5C227]">
          <div>
            <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest block">Ingresos Hoy</span>
            <span className="text-xl font-black text-gray-900 font-mono mt-1 block">
              ${kpis_hoy.ingresos.toLocaleString('es-CO')}
            </span>
          </div>
          <div className="p-3 bg-yellow-50 text-[#F5C227] rounded-xl">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        {/* KPI 2: Efectivo en Caja */}
        <div className="bg-white border border-gray-150 rounded-2xl p-5 shadow-sm hover:shadow-md transition duration-300 flex items-center justify-between border-l-4 border-emerald-500">
          <div>
            <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest block">Efectivo en Caja</span>
            <span className="text-xl font-black text-gray-900 font-mono mt-1 block">
              ${total_efectivo.toLocaleString('es-CO')}
            </span>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <Banknote className="w-6 h-6" />
          </div>
        </div>

        {/* KPI 3: Zapatos Vendidos Hoy */}
        <div 
          onClick={() => onNavigate && onNavigate('FACTURACION', 'LOCAL')}
          className="bg-white border border-gray-150 rounded-2xl p-5 shadow-sm hover:shadow-md transition duration-300 flex items-center justify-between border-l-4 border-teal-500 cursor-pointer hover:scale-[1.01] hover:border-teal-400 select-none"
        >
          <div>
            <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest block">Zapatos Vendidos Hoy</span>
            <span className="text-xl font-black text-gray-900 font-mono mt-1 block">
              {kpis_hoy.pares_vendidos} par{kpis_hoy.pares_vendidos === 1 ? '' : 'es'}
            </span>
          </div>
          <div className="p-3 bg-teal-50 text-teal-600 rounded-xl">
            <ShoppingBag className="w-6 h-6" />
          </div>
        </div>

        {/* KPI 4: Deuda Proveedores */}
        <div 
          onClick={() => onNavigate && onNavigate('PROVEEDORES', true)}
          className="bg-white border border-gray-150 rounded-2xl p-5 shadow-sm hover:shadow-md transition duration-300 flex items-center justify-between border-l-4 border-red-500 cursor-pointer hover:scale-[1.01] hover:border-red-400 select-none"
        >
          <div>
            <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest block">Deuda a Proveedores</span>
            <span className="text-xl font-black text-gray-900 font-mono mt-1 block">
              ${deuda_proveedores.toLocaleString('es-CO')}
            </span>
          </div>
          <div className="p-3 bg-red-50 text-red-600 rounded-xl">
            <Wallet className="w-6 h-6" />
          </div>
        </div>

        {/* KPI 5: Trámites DIAN Pendientes */}
        <div 
          onClick={() => onNavigate && onNavigate('FACTURACION', 'DIAN')}
          className="bg-white border border-gray-150 rounded-2xl p-5 shadow-sm hover:shadow-md transition duration-300 flex items-center justify-between border-l-4 border-amber-500 cursor-pointer hover:scale-[1.01] hover:border-amber-400 select-none"
        >
          <div>
            <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest block">Facturas DIAN Pendientes</span>
            <span className="text-xl font-black text-gray-900 font-mono mt-1 block">
              {tramites_dian} trámite{tramites_dian === 1 ? '' : 's'}
            </span>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <AlertCircle className="w-6 h-6" />
          </div>
        </div>

      </div>

      {/* 2. Bloque Central: Gráfica y Top Modelos */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Gráfica de Ventas de la Semana */}
        <div className="lg:col-span-8 bg-white border border-gray-150 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div className="mb-4">
            <h3 className="font-extrabold text-sm text-torcoroma-dark uppercase tracking-wider">Ingresos de los Últimos 7 Días</h3>
            <p className="text-xs text-gray-400 mt-0.5 font-medium">Monitoreo del desempeño comercial del negocio.</p>
          </div>
          
          <div className="w-full h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ventas_semana} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis 
                  dataKey="fecha" 
                  tick={{ fill: '#111827', fontSize: 10, fontWeight: 'bold' }} 
                  axisLine={{ stroke: '#D1D5DB' }}
                  tickLine={false}
                />
                <YAxis 
                  tick={{ fill: '#111827', fontSize: 10, fontWeight: 'bold' }} 
                  axisLine={{ stroke: '#D1D5DB' }}
                  tickLine={false}
                  tickFormatter={(val) => `$${val >= 1000 ? (val / 1000) + 'k' : val}`}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(245, 194, 39, 0.05)' }}
                  contentStyle={{
                    backgroundColor: '#111827',
                    border: 'none',
                    borderRadius: '12px',
                    fontSize: '11px',
                    color: '#fff',
                    fontFamily: 'monospace',
                    fontWeight: 'bold',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                  }}
                  formatter={(val) => [`$${Number(val).toLocaleString('es-CO')}`, 'Ingresos']}
                />
                <Bar 
                  dataKey="total" 
                  fill="#F5C227" 
                  radius={[6, 6, 0, 0]} 
                  maxBarSize={45}
                  className="cursor-pointer"
                  onClick={(entry) => {
                    const dateStr = entry?.fecha_completa || entry?.payload?.fecha_completa;
                    if (dateStr) {
                      onNavigate && onNavigate('FACTURACION', 'LOCAL', dateStr);
                    }
                  }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top 3 Modelos */}
        <div className="lg:col-span-4 bg-white border border-gray-150 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div className="mb-6">
            <h3 className="font-extrabold text-sm text-torcoroma-dark uppercase tracking-wider">Top 3 Calzados Más Vendidos</h3>
            <p className="text-xs text-gray-400 mt-0.5 font-medium">Modelos más populares históricamente.</p>
          </div>

          <div className="space-y-4 flex-grow flex flex-col justify-center">
            {top_modelos.length === 0 ? (
              <p className="text-center text-xs text-gray-400 italic">No hay ventas históricas registradas.</p>
            ) : (
              top_modelos.map((m, idx) => {
                const colors = ['bg-[#ffd535] text-amber-950', 'bg-slate-200 text-slate-800', 'bg-[#dcb023]/25 text-[#735811]'];
                return (
                  <div key={m.nombre} className="flex items-center gap-4 bg-gray-50 border border-gray-100 rounded-xl p-3.5 shadow-xs hover:scale-[1.01] transition-transform">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm ${colors[idx] || 'bg-gray-100'}`}>
                      {idx + 1}
                    </div>
                    <div className="flex-grow">
                      <span className="font-bold text-gray-900 text-xs block uppercase leading-tight">{m.nombre}</span>
                      <span className="text-[10px] text-gray-400 font-extrabold uppercase mt-1 inline-block">
                        {m.cantidad_vendida} par{m.cantidad_vendida === 1 ? '' : 'es'} vendidos
                      </span>
                    </div>
                    <Award className={`w-5 h-5 ${idx === 0 ? 'text-[#F5C227]' : 'text-gray-300'}`} />
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      {/* 3. Base: Tabla de Stock Crítico */}
      <div className="bg-white border border-gray-150 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
          <div>
            <h3 className="font-extrabold text-sm text-torcoroma-dark uppercase tracking-wider">Alertas de Stock Crítico</h3>
            <p className="text-xs text-gray-400 mt-0.5 font-medium">Modelos con menos de 5 tallas (o límite personalizado) disponibles en stock.</p>
          </div>
          <button
            onClick={() => setShowManageModal(true)}
            className="flex items-center justify-center gap-1.5 self-start sm:self-auto bg-gray-50 hover:bg-gray-100 text-gray-700 font-extrabold text-xs uppercase px-4 py-2.5 rounded-xl border border-gray-300 transition cursor-pointer active:scale-95 shadow-xs"
          >
            <Settings className="w-3.5 h-3.5" />
            Gestionar Silenciados
          </button>
        </div>

        {successConfigMsg && (
          <div className="bg-emerald-50 text-emerald-800 rounded-xl p-3 border border-emerald-100 text-xs font-bold mb-4">
            ✓ {successConfigMsg}
          </div>
        )}

        {stock_critico.length === 0 ? (
          <div className="text-center py-8 text-xs text-emerald-600 font-bold bg-emerald-50/50 border border-dashed border-emerald-100 rounded-xl">
            ✓ Todo el calzado se encuentra con stock saludable en Local Principal.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50 text-torcoroma-dark font-extrabold border-b border-gray-200 text-left">
                  <th className="p-3 w-16">#</th>
                  <th className="p-3">MODELO DE CALZADO</th>
                  <th className="p-3 w-36">COLOR</th>
                  <th className="p-3 w-32 text-center">TALLAS DISP.</th>
                  <th className="p-3 w-32 text-center">LÍMITE ALERTA</th>
                  <th className="p-3 w-32 text-center">ESTADO</th>
                  <th className="p-3 w-32 text-center">ACCIONES</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-150">
                {stock_critico.map((item) => {
                  const isAgotado = item.tallas_en_stock === 0;
                  return (
                    <tr 
                      key={`${item.id_modelo}-${item.color}`} 
                      className={`transition ${
                        isAgotado 
                          ? 'bg-red-50 text-red-950 border-l-4 border-red-500' 
                          : 'bg-yellow-50 text-yellow-950 border-l-4 border-[#F5C227]'
                      }`}
                    >
                      <td className="p-3 font-mono font-bold">#{item.id_stock}</td>
                      <td className="p-3 font-bold uppercase">{item.modelo_nombre}</td>
                      <td className="p-3 font-semibold uppercase text-gray-600">{item.color}</td>
                      <td className="p-3 text-center font-bold font-mono">{item.tallas_en_stock}</td>
                      <td className="p-3 text-center font-bold font-mono">{item.tallas_minimas}</td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase inline-block border ${
                          isAgotado 
                            ? 'bg-red-100 text-red-800 border-red-200' 
                            : 'bg-yellow-100 text-yellow-800 border-yellow-250'
                        }`}>
                          {isAgotado ? '❌ AGOTADO' : '⚠ BAJO STOCK'}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleOpenConfigModal(item)}
                            className="p-1.5 bg-white text-gray-600 hover:text-torcoroma-dark hover:bg-gray-100 rounded-lg border border-gray-250 transition shadow-xs cursor-pointer active:scale-95 flex items-center justify-center"
                            title="Ajustar Límite"
                          >
                            <Settings className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleMuteAlert(item)}
                            className="p-1.5 bg-white text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg border border-red-250 transition shadow-xs cursor-pointer active:scale-95 flex items-center justify-center"
                            title="Silenciar Alerta"
                          >
                            <BellOff className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: Configuración de Alerta */}
      {editingAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl relative max-w-sm w-full border border-gray-100 overflow-hidden font-sans">
            <div className="bg-torcoroma-dark text-white p-4 flex items-center justify-between">
              <h3 className="font-extrabold text-sm tracking-wider uppercase">Configurar Alerta</h3>
              <button 
                onClick={() => setEditingAlert(null)}
                className="text-gray-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="text-center">
                <span className="text-[10px] text-gray-400 font-black uppercase tracking-wide">Calzado Seleccionado</span>
                <h4 className="font-extrabold text-gray-900 text-sm uppercase mt-1 leading-snug">
                  {editingAlert.modelo_nombre}
                </h4>
                <span className="text-xs text-gray-500 font-bold uppercase block mt-1">
                  Color: {editingAlert.color}
                </span>
              </div>

              <div className="space-y-1.5 pt-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">
                  Alertar si quedan menos de:
                </label>
                <div className="flex items-center gap-2 bg-gray-50 border border-gray-300 rounded-xl px-3 py-2">
                  <input
                    type="number"
                    min="1"
                    max="24"
                    value={tempMinTallas}
                    onChange={(e) => setTempMinTallas(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="flex-grow font-black font-mono text-gray-800 bg-transparent border-none outline-none text-center animate-none"
                  />
                  <span className="text-xs font-bold text-gray-500 uppercase">Tallas en stock</span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-150 flex gap-2">
              <button
                onClick={() => handleSaveConfig(false)}
                className="flex-grow bg-[#F5C227] hover:bg-[#e0b01c] active:scale-95 text-torcoroma-dark font-black text-xs uppercase py-3 rounded-xl border border-[#e5bf2f] transition cursor-pointer shadow-sm text-center"
              >
                Guardar Límite
              </button>
              <button
                onClick={() => setEditingAlert(null)}
                className="flex-grow bg-white hover:bg-gray-100 text-gray-650 active:scale-95 font-bold text-xs uppercase py-3 rounded-xl border border-gray-300 transition cursor-pointer text-center"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Gestionar Alertas Personalizadas */}
      {showManageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl relative max-w-2xl w-full border border-gray-100 overflow-hidden font-sans flex flex-col max-h-[85vh]">
            <div className="bg-torcoroma-dark text-white p-4 flex items-center justify-between">
              <h3 className="font-extrabold text-sm tracking-wider uppercase">Gestionar Alertas Personalizadas</h3>
              <button 
                onClick={() => setShowManageModal(false)}
                className="text-gray-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-4 flex-grow">
              <p className="text-xs text-gray-500 font-medium">
                Aquí puedes ver todos los calzados que tienen límites personalizados o que han sido silenciados. Puedes reactivarlos o restablecerlos a la regla por defecto (menos de 5 tallas).
              </p>

              {(!data.alertas_configuradas || data.alertas_configuradas.length === 0) ? (
                <div className="text-center py-8 text-xs text-gray-400 italic bg-gray-50 rounded-xl border border-dashed border-gray-200">
                  No hay configuraciones personalizadas en este momento. Todos los calzados se rigen por la regla por defecto.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-gray-250">
                  <table className="w-full border-collapse text-xs text-left">
                    <thead>
                      <tr className="bg-gray-50 text-torcoroma-dark font-extrabold border-b border-gray-250">
                        <th className="p-3">Calzado / Color</th>
                        <th className="p-3 text-center">Límite</th>
                        <th className="p-3 text-center">Estado</th>
                        <th className="p-3 text-center">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-150">
                      {data.alertas_configuradas.map((item) => (
                        <tr key={`${item.id_modelo}-${item.color}`} className="hover:bg-gray-50/50">
                          <td className="p-3">
                            <span className="font-bold text-gray-900 uppercase block leading-tight">{item.modelo_nombre}</span>
                            <span className="text-[10px] text-gray-400 font-extrabold uppercase">{item.color}</span>
                          </td>
                          <td className="p-3 text-center font-bold font-mono">
                            {item.tallas_minimas} tallas
                          </td>
                          <td className="p-3 text-center">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase inline-block border ${
                              item.excluido 
                                ? 'bg-red-50 text-red-750 border-red-200' 
                                : 'bg-emerald-50 text-emerald-750 border-emerald-200'
                            }`}>
                              {item.excluido ? '🔇 Silenciado' : '🔔 Activo'}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => handleToggleExclusion(item)}
                                className={`p-1.5 rounded-lg border transition shadow-xs cursor-pointer active:scale-95 flex items-center justify-center ${
                                  item.excluido
                                    ? 'bg-emerald-50 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-100 border-emerald-250'
                                    : 'bg-red-50 text-red-500 hover:text-red-750 hover:bg-red-100 border-red-250'
                                }`}
                                title={item.excluido ? 'Reactivar Alerta' : 'Silenciar Alerta'}
                              >
                                {item.excluido ? <Bell className="w-3.5 h-3.5" /> : <BellOff className="w-3.5 h-3.5" />}
                              </button>
                              <button
                                onClick={() => handleResetConfig(item)}
                                className="p-1.5 bg-white text-gray-500 hover:text-red-650 hover:bg-gray-100 rounded-lg border border-gray-300 transition shadow-xs cursor-pointer active:scale-95 flex items-center justify-center"
                                title="Restablecer por Defecto"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-150 flex justify-end">
              <button
                onClick={() => setShowManageModal(false)}
                className="bg-white hover:bg-gray-100 text-gray-700 font-extrabold text-xs uppercase py-2.5 px-6 rounded-xl border border-gray-300 transition cursor-pointer text-center active:scale-95"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
