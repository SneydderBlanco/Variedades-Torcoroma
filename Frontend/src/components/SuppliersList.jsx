import React, { useState, useEffect } from 'react';
import { Truck, Plus, RefreshCw, UserPlus, Phone, DollarSign, Calendar, PlusCircle, CreditCard, Banknote, Landmark, X, FileText, AlertTriangle, Edit, Trash2, ChevronDown } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

// Función para dar formato de pesos colombianos con apostrofe en millones
const formatCOP = (val) => {
  if (val === undefined || val === null || val === '') return '';
  // Quitar todo lo que no sea número para reformatear
  const num = Math.round(Number(String(val).replace(/[^0-9]/g, '')));
  if (isNaN(num)) return '';
  
  let str = num.toString();
  str = str.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  
  const parts = str.split('.');
  if (parts.length === 3) {
    return `${parts[0]}'${parts[1]}.${parts[2]}`;
  } else if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}'${parts[2]}.${parts[3]}`;
  }
  return str;
};

// Formatear input a medida que el usuario escribe
const formatInputOnTheFly = (value) => {
  if (!value) return '';
  const digits = value.replace(/\D/g, '');
  return formatCOP(digits);
};

export default function SuppliersList({ initialShowPending = false }) {
  const [suppliers, setSuppliers] = useState([]);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingInvoices, setLoadingInvoices] = useState(false);

  // Formulario Proveedor
  const [newSupplierName, setNewSupplierName] = useState('');
  const [newSupplierPhone, setNewSupplierPhone] = useState('');
  const [isExternal, setIsExternal] = useState(false);
  const [savingSupplier, setSavingSupplier] = useState(false);

  // Modales
  const [showAbonoModal, setShowAbonoModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [abonoAmount, setAbonoAmount] = useState('');
  const [moneySource, setMoneySource] = useState('EFECTIVO_CAJA');
  const [savingAbono, setSavingAbono] = useState(false);

  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceTotal, setInvoiceTotal] = useState('');
  const [invoiceDescription, setInvoiceDescription] = useState('');
  const [invoiceQty, setInvoiceQty] = useState('');
  const [invoiceUnitPrice, setInvoiceUnitPrice] = useState('');
  const [savingInvoice, setSavingInvoice] = useState(false);

  const [supplierTypeTab, setSupplierTypeTab] = useState('PROVEEDORES'); // 'PROVEEDORES' o 'ALIADOS'

  // Modal Editar Factura
  const [showEditInvoiceModal, setShowEditInvoiceModal] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [editInvoiceNumber, setEditInvoiceNumber] = useState('');
  const [editInvoiceTotal, setEditInvoiceTotal] = useState('');
  const [editInvoiceDescription, setEditInvoiceDescription] = useState('');
  const [editInvoiceQty, setEditInvoiceQty] = useState('');
  const [editInvoiceUnitPrice, setEditInvoiceUnitPrice] = useState('');
  const [savingEditInvoice, setSavingEditInvoice] = useState(false);

  // Modal Eliminar Factura
  const [showDeleteInvoiceModal, setShowDeleteInvoiceModal] = useState(false);
  const [deletingInvoice, setDeletingInvoice] = useState(null);
  const [deletingInvoiceProgress, setDeletingInvoiceProgress] = useState(false);

  // Menú de Acciones y Modales para Proveedores
  const [activeMenuSupplierId, setActiveMenuSupplierId] = useState(null);
  const [activeMenuInvoiceId, setActiveMenuInvoiceId] = useState(null);

  // Modal Editar Proveedor
  const [showEditSupplierModal, setShowEditSupplierModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [editSupplierName, setEditSupplierName] = useState('');
  const [editSupplierPhone, setEditSupplierPhone] = useState('');
  const [savingEditSupplier, setSavingEditSupplier] = useState(false);

  // Modal Eliminar Proveedor
  const [showDeleteSupplierModal, setShowDeleteSupplierModal] = useState(false);
  const [deletingSupplier, setDeletingSupplier] = useState(null);
  const [savingDeleteSupplier, setSavingDeleteSupplier] = useState(false);

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [showPendingInvoicesView, setShowPendingInvoicesView] = useState(initialShowPending);
  const [pendingInvoices, setPendingInvoices] = useState([]);
  const [loadingPending, setLoadingPending] = useState(false);

  const fetchPendingInvoices = async () => {
    setLoadingPending(true);
    try {
      const res = await fetch(`${API_URL}/api/proveedores/facturas/pendientes`);
      if (res.ok) {
        const data = await res.json();
        setPendingInvoices(data);
      }
    } catch (err) {
      console.error('Error fetching pending invoices:', err);
    } finally {
      setLoadingPending(false);
    }
  };

  useEffect(() => {
    setShowPendingInvoicesView(initialShowPending);
  }, [initialShowPending]);

  useEffect(() => {
    if (showPendingInvoicesView) {
      fetchPendingInvoices();
    }
  }, [showPendingInvoicesView]);


  // Cargar proveedores desde la base de datos
  const fetchSuppliers = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch(`${API_URL}/api/proveedores`);
      if (res.ok) {
        const data = await res.json();
        setSuppliers(data);
        // Si hay un proveedor seleccionado, actualizar su referencia
        if (selectedSupplier) {
          const updated = data.find(s => s.id_proveedor === selectedSupplier.id_proveedor);
          if (updated) setSelectedSupplier(updated);
        }
      } else {
        throw new Error('Error al listar proveedores');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('No se pudieron cargar los proveedores de la base de datos.');
    } finally {
      setLoading(false);
    }
  };

  // Cargar facturas del proveedor seleccionado
  const fetchInvoices = async (idProveedor) => {
    setLoadingInvoices(true);
    try {
      const res = await fetch(`${API_URL}/api/proveedores/${idProveedor}/facturas`);
      if (res.ok) {
        const data = await res.json();
        setInvoices(data);
      }
    } catch (err) {
      console.error('Error fetching invoices:', err);
    } finally {
      setLoadingInvoices(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  useEffect(() => {
    if (selectedSupplier) {
      fetchInvoices(selectedSupplier.id_proveedor);
    } else {
      setInvoices([]);
    }
  }, [selectedSupplier]);

  useEffect(() => {
    function closeMenu() {
      setActiveMenuSupplierId(null);
      setActiveMenuInvoiceId(null);
    }
    document.addEventListener('click', closeMenu);
    return () => document.removeEventListener('click', closeMenu);
  }, []);

  // Calcular total automáticamente al cambiar cantidad o valor unitario
  useEffect(() => {
    const qty = Number(invoiceQty) || 0;
    const price = Number(invoiceUnitPrice) || 0;
    if (qty > 0 && price > 0) {
      setInvoiceTotal(formatCOP(qty * price));
    }
  }, [invoiceQty, invoiceUnitPrice]);

  useEffect(() => {
    const qty = Number(editInvoiceQty) || 0;
    const price = Number(editInvoiceUnitPrice) || 0;
    if (qty > 0 && price > 0) {
      setEditInvoiceTotal(formatCOP(qty * price));
    }
  }, [editInvoiceQty, editInvoiceUnitPrice]);

  // Registrar un proveedor nuevo
  const handleCreateSupplier = async (e) => {
    e.preventDefault();
    if (!newSupplierName.trim()) return;

    setSavingSupplier(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch(`${API_URL}/api/proveedores`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          nombre: newSupplierName.toUpperCase().trim(),
          telefono: newSupplierPhone.trim(),
          es_externo: isExternal
        })
      });

      const data = await res.json();

      if (res.ok) {
        setSuccessMsg(`¡Proveedor "${data.nombre}" registrado con éxito!`);
        setNewSupplierName('');
        setNewSupplierPhone('');
        setIsExternal(false);
        fetchSuppliers();
        setTimeout(() => setSuccessMsg(''), 4000);
      } else {
        setErrorMsg(data.error || 'Error al registrar el proveedor.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Error de red al intentar registrar el proveedor.');
    } finally {
      setSavingSupplier(false);
    }
  };

  // Registrar abono
  const handleCreateAbono = async (e) => {
    e.preventDefault();
    if (!selectedInvoice || !abonoAmount || Number(abonoAmount) <= 0) return;

    setSavingAbono(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch(`${API_URL}/api/proveedores/abonos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id_factura: selectedInvoice.id_factura,
          monto: Number(abonoAmount),
          origen_dinero: moneySource
        })
      });

      const data = await res.json();

      if (res.ok) {
        setSuccessMsg('Abono registrado con éxito.');
        setShowAbonoModal(false);
        setAbonoAmount('');
        setMoneySource('EFECTIVO_CAJA');
        setSelectedInvoice(null);
        // Recargar datos
        fetchSuppliers();
        if (selectedSupplier) {
          fetchInvoices(selectedSupplier.id_proveedor);
        }
        if (showPendingInvoicesView) {
          fetchPendingInvoices();
        }
        setTimeout(() => setSuccessMsg(''), 4000);
      } else {
        setErrorMsg(data.error || 'Error al registrar el abono.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Error de red al registrar el abono.');
    } finally {
      setSavingAbono(false);
    }
  };

  // Registrar factura manualmente
  const handleCreateInvoice = async (e) => {
    e.preventDefault();
    if (!selectedSupplier || !invoiceTotal || Number(invoiceTotal) < 0) return;

    setSavingInvoice(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch(`${API_URL}/api/proveedores/facturas`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id_proveedor: selectedSupplier.id_proveedor,
          numero_factura: invoiceNumber.trim() || null,
          total_costo: Number(invoiceTotal),
          descripcion: invoiceDescription.trim() || null,
          cantidad_zapatos: invoiceQty ? Number(invoiceQty) : 0,
          valor_unitario: invoiceUnitPrice ? Number(invoiceUnitPrice) : 0
        })
      });

      const data = await res.json();

      if (res.ok) {
        setSuccessMsg(`Factura "${data.numero_factura || 'Manual'}" creada con éxito.`);
        setShowInvoiceModal(false);
        setInvoiceNumber('');
        setInvoiceTotal('');
        setInvoiceDescription('');
        setInvoiceQty('');
        setInvoiceUnitPrice('');
        fetchInvoices(selectedSupplier.id_proveedor);
        setTimeout(() => setSuccessMsg(''), 4000);
      } else {
        setErrorMsg(data.error || 'Error al registrar la factura.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Error de red al registrar la factura.');
    } finally {
      setSavingInvoice(false);
    }
  };

  // Abrir modal de edición de factura
  const handleOpenEditInvoice = (inv) => {
    setEditingInvoice(inv);
    setEditInvoiceNumber(inv.numero_factura || '');
    setEditInvoiceTotal(String(inv.total_costo));
    setEditInvoiceDescription(inv.descripcion || '');
    setEditInvoiceQty(inv.cantidad_zapatos ? String(inv.cantidad_zapatos) : '');
    setEditInvoiceUnitPrice(inv.valor_unitario ? String(inv.valor_unitario) : '');
    setShowEditInvoiceModal(true);
  };

  // Enviar edición de factura
  const handleEditInvoiceSubmit = async (e) => {
    e.preventDefault();
    if (!editingInvoice) return;

    const newTotal = Number(editInvoiceTotal);
    if (isNaN(newTotal) || newTotal < 0) {
      setErrorMsg('El costo total debe ser un número no negativo.');
      return;
    }

    if (newTotal < editingInvoice.suma_abonos) {
      setErrorMsg(`El nuevo costo total ($${newTotal}) no puede ser menor al total ya abonado ($${editingInvoice.suma_abonos}).`);
      return;
    }

    setSavingEditInvoice(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch(`${API_URL}/api/proveedores/facturas/${editingInvoice.id_factura}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          numero_factura: editInvoiceNumber.trim() || null,
          total_costo: newTotal,
          descripcion: editInvoiceDescription.trim() || null,
          cantidad_zapatos: editInvoiceQty ? Number(editInvoiceQty) : 0,
          valor_unitario: editInvoiceUnitPrice ? Number(editInvoiceUnitPrice) : 0
        })
      });

      const data = await res.json();

      if (res.ok) {
        setSuccessMsg('Factura actualizada con éxito.');
        setShowEditInvoiceModal(false);
        setEditingInvoice(null);
        setEditInvoiceDescription('');
        setEditInvoiceQty('');
        setEditInvoiceUnitPrice('');
        if (selectedSupplier) {
          fetchInvoices(selectedSupplier.id_proveedor);
        }
        fetchSuppliers(); // para actualizar saldos totales
        if (showPendingInvoicesView) {
          fetchPendingInvoices();
        }
        setTimeout(() => setSuccessMsg(''), 4000);
      } else {
        setErrorMsg(data.error || 'Error al actualizar la factura.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Error de red al intentar actualizar la factura.');
    } finally {
      setSavingEditInvoice(false);
    }
  };

  // Abrir modal de confirmación para eliminar factura
  const handleOpenDeleteInvoice = (inv) => {
    setDeletingInvoice(inv);
    setShowDeleteInvoiceModal(true);
  };

  // Enviar eliminación de factura
  const handleDeleteInvoiceSubmit = async () => {
    if (!deletingInvoice) return;

    setDeletingInvoiceProgress(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch(`${API_URL}/api/proveedores/facturas/${deletingInvoice.id_factura}`, {
        method: 'DELETE'
      });

      const data = await res.json();

      if (res.ok) {
        setSuccessMsg('Factura eliminada con éxito.');
        setShowDeleteInvoiceModal(false);
        setDeletingInvoice(null);
        if (selectedSupplier) {
          fetchInvoices(selectedSupplier.id_proveedor);
        }
        fetchSuppliers(); // para actualizar saldos totales
        if (showPendingInvoicesView) {
          fetchPendingInvoices();
        }
        setTimeout(() => setSuccessMsg(''), 4000);
      } else {
        setErrorMsg(data.error || 'Error al eliminar la factura.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Error de red al intentar eliminar la factura.');
    } finally {
      setDeletingInvoiceProgress(false);
    }
  };

  // Abrir modal de edición de proveedor
  const handleOpenEditSupplier = (sup) => {
    setEditingSupplier(sup);
    setEditSupplierName(sup.nombre);
    setEditSupplierPhone(sup.telefono || '');
    setShowEditSupplierModal(true);
  };

  // Enviar edición de proveedor
  const handleEditSupplierSubmit = async (e) => {
    e.preventDefault();
    if (!editingSupplier || !editSupplierName.trim()) return;

    setSavingEditSupplier(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch(`${API_URL}/api/proveedores/${editingSupplier.id_proveedor}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          nombre: editSupplierName.toUpperCase().trim(),
          telefono: editSupplierPhone.trim() || null
        })
      });

      const data = await res.json();

      if (res.ok) {
        setSuccessMsg(`Proveedor "${data.nombre}" actualizado con éxito.`);
        setShowEditSupplierModal(false);
        setEditingSupplier(null);
        fetchSuppliers();
        setTimeout(() => setSuccessMsg(''), 4000);
      } else {
        setErrorMsg(data.error || 'Error al actualizar el proveedor.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Error de red al intentar actualizar el proveedor.');
    } finally {
      setSavingEditSupplier(false);
    }
  };

  // Abrir modal de confirmación para eliminar proveedor
  const handleOpenDeleteSupplier = (sup) => {
    setDeletingSupplier(sup);
    setShowDeleteSupplierModal(true);
  };

  // Enviar eliminación de proveedor
  const handleDeleteSupplierSubmit = async () => {
    if (!deletingSupplier) return;

    setSavingDeleteSupplier(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch(`${API_URL}/api/proveedores/${deletingSupplier.id_proveedor}`, {
        method: 'DELETE'
      });

      const data = await res.json();

      if (res.ok) {
        setSuccessMsg('Proveedor eliminado con éxito.');
        setShowDeleteSupplierModal(false);
        setDeletingSupplier(null);
        setSelectedSupplier(null); // Deseleccionar si estaba activo
        fetchSuppliers();
        setTimeout(() => setSuccessMsg(''), 4000);
      } else {
        setErrorMsg(data.error || 'Error al eliminar el proveedor.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Error de red al intentar eliminar el proveedor.');
    } finally {
      setSavingDeleteSupplier(false);
    }
  };
  // Cálculos consolidados del proveedor seleccionado
  const totalBilled = invoices.reduce((acc, inv) => acc + inv.total_costo, 0);
  const totalPaid = invoices.reduce((acc, inv) => acc + inv.suma_abonos, 0);
  const totalPending = invoices.reduce((acc, inv) => acc + inv.saldo_restante, 0);
  const progressPercent = totalBilled > 0 ? Math.round((totalPaid / totalBilled) * 100) : 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Selector de Vista Principal */}
      <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200 w-fit select-none">
        <button
          type="button"
          onClick={() => setShowPendingInvoicesView(false)}
          className={`px-4 py-2 rounded-lg text-xs font-black transition-all cursor-pointer active:scale-95 ${
            !showPendingInvoicesView
              ? 'bg-torcoroma-gold text-torcoroma-dark shadow-sm'
              : 'bg-transparent text-gray-500 hover:text-torcoroma-dark'
          }`}
        >
          GESTIÓN DE PROVEEDORES
        </button>
        <button
          type="button"
          onClick={() => setShowPendingInvoicesView(true)}
          className={`px-4 py-2 rounded-lg text-xs font-black transition-all cursor-pointer active:scale-95 ${
            showPendingInvoicesView
              ? 'bg-torcoroma-gold text-torcoroma-dark shadow-sm'
              : 'bg-transparent text-gray-500 hover:text-torcoroma-dark'
          }`}
        >
          FACTURAS PENDIENTES DE PAGO
        </button>
      </div>

      {/* Alertas generales */}
      <div>
        {errorMsg && (
          <div className="bg-red-50 text-red-800 rounded-xl p-3.5 border border-red-100 text-xs font-semibold mb-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="bg-emerald-50 text-emerald-800 rounded-xl p-3.5 border border-emerald-100 text-xs font-semibold mb-4 flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            {successMsg}
          </div>
        )}
      </div>

      {showPendingInvoicesView ? (
        <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100 space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div>
              <h3 className="text-sm font-bold text-torcoroma-dark uppercase tracking-wider">Facturas Pendientes de Pago</h3>
              <p className="text-[10px] text-gray-500 font-semibold mt-0.5">Listado consolidado de todas las cuentas por pagar pendientes en el sistema.</p>
            </div>
            <button
              onClick={fetchPendingInvoices}
              disabled={loadingPending}
              className="p-2 border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-600 transition cursor-pointer"
              title="Recargar"
            >
              <RefreshCw className={`w-4 h-4 ${loadingPending ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {loadingPending && pendingInvoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-500 gap-3">
              <RefreshCw className="animate-spin w-8 h-8 text-torcoroma-gold" />
              <span className="font-bold text-xs uppercase tracking-wider">Cargando facturas pendientes...</span>
            </div>
          ) : pendingInvoices.length === 0 ? (
            <div className="text-center py-20 bg-gray-50 border border-dashed border-gray-200 rounded-xl text-gray-400 italic text-xs">
              ✓ No hay facturas pendientes de pago en este momento.
            </div>
          ) : (
            <div className="rounded-xl border border-gray-200">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-gray-550 font-bold uppercase">
                    <th className="p-3.5">PROVEEDOR</th>
                    <th className="p-3.5">N° FACTURA</th>
                    <th className="p-3.5">FECHA EMISIÓN</th>
                    <th className="p-3.5">DESCRIPCIÓN</th>
                    <th className="p-3.5 text-right">TOTAL COSTO</th>
                    <th className="p-3.5 text-right">TOTAL ABONADO</th>
                    <th className="p-3.5 text-right">SALDO PENDIENTE</th>
                    <th className="p-3.5 text-center">ACCIONES</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {pendingInvoices.map((inv) => (
                    <tr key={inv.id_factura} className="hover:bg-gray-50/50 transition">
                      <td className="p-3.5 font-black text-torcoroma-dark uppercase tracking-wide">
                        {inv.proveedor_nombre}
                      </td>
                      <td className="p-3.5 font-bold text-gray-900 uppercase">
                        {inv.numero_factura || 'Compra Manual'}
                      </td>
                      <td className="p-3.5 text-gray-600 font-semibold">
                        {new Date(inv.fecha_emision).toLocaleDateString()}
                      </td>
                      <td className="p-3.5 text-gray-500 max-w-[200px] truncate font-semibold" title={inv.descripcion}>
                        {inv.descripcion || 'Sin descripción'}
                      </td>
                      <td className="p-3.5 text-right font-bold text-torcoroma-dark">
                        ${inv.total_costo.toLocaleString('es-CO')}
                      </td>
                      <td className="p-3.5 text-right font-semibold text-emerald-600">
                        ${inv.suma_abonos.toLocaleString('es-CO')}
                      </td>
                      <td className="p-3.5 text-right font-black text-red-650">
                        ${inv.saldo_restante.toLocaleString('es-CO')}
                      </td>
                      <td className="p-3.5 text-center relative" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center">
                          <button
                            type="button"
                            onClick={() => setActiveMenuInvoiceId(activeMenuInvoiceId === inv.id_factura ? null : inv.id_factura)}
                            className="p-1.5 text-gray-500 hover:text-torcoroma-dark rounded-xl hover:bg-gray-100 transition cursor-pointer inline-flex items-center justify-center border border-gray-250 bg-white active:scale-95"
                            title="Acciones"
                          >
                            <ChevronDown className="w-4 h-4" />
                          </button>
                          {activeMenuInvoiceId === inv.id_factura && (
                            <div className="absolute right-2 mt-1 w-28 bg-white border border-gray-200 rounded-xl shadow-2xl z-30 divide-y divide-gray-100 overflow-hidden text-left">
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveMenuInvoiceId(null);
                                  setSelectedInvoice(inv);
                                  setAbonoAmount(String(inv.saldo_restante));
                                  setShowAbonoModal(true);
                                }}
                                className="w-full px-3 py-2.5 hover:bg-yellow-50/50 text-xs font-bold text-torcoroma-dark flex items-center gap-1.5 cursor-pointer transition-all"
                              >
                                <PlusCircle className="w-3.5 h-3.5 text-torcoroma-gold" />
                                Abonar
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveMenuInvoiceId(null);
                                  handleOpenEditInvoice(inv);
                                }}
                                className="w-full px-3 py-2.5 hover:bg-yellow-50/50 text-xs font-bold text-torcoroma-dark flex items-center gap-1.5 cursor-pointer transition-all"
                              >
                                <Edit className="w-3.5 h-3.5 text-torcoroma-gold" />
                                Editar
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveMenuInvoiceId(null);
                                  handleOpenDeleteInvoice(inv);
                                }}
                                className="w-full px-3 py-2.5 hover:bg-red-50 text-xs font-bold text-red-600 flex items-center gap-1.5 cursor-pointer transition-all"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-red-505" />
                                Eliminar
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
          {/* Columna Izquierda: Listado e Registro */}
          <div className="xl:col-span-7 space-y-8">
            {/* Formulario de registro */}
            <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
              <h3 className="text-sm font-bold text-torcoroma-dark uppercase tracking-wider mb-4 pb-3 border-b border-gray-100 flex items-center gap-2">
                <UserPlus className="w-4.5 h-4.5 text-torcoroma-gold" />
                Registrar Proveedor
              </h3>

              <form onSubmit={handleCreateSupplier} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                    Nombre del Proveedor *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="EJ. DON JUAN / DISTRIBUIDORA"
                    className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-torcoroma-gold focus:border-torcoroma-gold outline-none transition text-xs font-bold text-torcoroma-dark uppercase"
                    value={newSupplierName}
                    onChange={(e) => setNewSupplierName(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                    Teléfono de Contacto
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. 3224613457"
                    className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-torcoroma-gold focus:border-torcoroma-gold outline-none transition text-xs font-semibold text-torcoroma-dark"
                    value={newSupplierPhone}
                    onChange={(e) => setNewSupplierPhone(e.target.value)}
                  />
                </div>

                <div className="sm:col-span-2 flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={savingSupplier || !newSupplierName.trim()}
                    className="w-full sm:w-auto bg-torcoroma-gold text-white font-bold py-2.5 px-6 rounded-xl hover:bg-yellow-600 active:scale-[0.98] transition-all text-xs uppercase tracking-wider shadow-md shadow-yellow-500/10 cursor-pointer"
                  >
                    {savingSupplier ? 'Guardando...' : 'Guardar Proveedor'}
                  </button>
                </div>
              </form>
            </div>

            {/* Tabla elegante */}
            <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
              <div className="flex items-center justify-between mb-6 pb-3 border-b border-gray-100">
                <div>
                  <h3 className="text-sm font-bold text-torcoroma-dark uppercase tracking-wider">Proveedores de Mercancía</h3>
                  <p className="text-[10px] text-gray-500 font-semibold mt-0.5">Selecciona un proveedor de la tabla para ver sus estados de cuenta y facturas.</p>
                </div>
                <button
                  onClick={fetchSuppliers}
                  disabled={loading}
                  className="p-2 border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-600 transition cursor-pointer"
                  title="Recargar"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {loading && suppliers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-500 gap-3">
                  <RefreshCw className="animate-spin w-8 h-8 text-torcoroma-gold" />
                  <span className="font-bold text-xs uppercase tracking-wider">Cargando proveedores...</span>
                </div>
              ) : suppliers.filter(sup => !sup.es_externo).length === 0 ? (
                <div className="text-center py-20 text-gray-400 italic text-sm">
                  No hay proveedores registrados todavía.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 font-bold uppercase">
                        <th className="p-3.5 w-12">ID</th>
                        <th className="p-3.5">NOMBRE COMPLETO</th>
                        <th className="p-3.5">TELÉFONO</th>
                        <th className="p-3.5 text-center">TIPO</th>
                        <th className="p-3.5 text-center">ACCIÓN</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {suppliers
                        .filter(sup => !sup.es_externo)
                        .map((sup) => {
                          const isSelected = selectedSupplier?.id_proveedor === sup.id_proveedor;
                          return (
                            <tr
                              key={sup.id_proveedor}
                              onClick={() => setSelectedSupplier(sup)}
                              className={`hover:bg-gray-50/70 transition cursor-pointer ${
                                isSelected ? 'bg-yellow-50/30 font-bold border-l-4 border-l-torcoroma-gold' : ''
                              }`}
                            >
                              <td className="p-3.5 font-mono text-[10px] text-gray-400">#{sup.id_proveedor}</td>
                              <td className="p-3.5 font-bold text-torcoroma-dark uppercase tracking-wide">{sup.nombre}</td>
                              <td className="p-3.5 text-gray-600 font-semibold flex items-center gap-1">
                                <Phone className="w-3 h-3 text-torcoroma-gold" />
                                {sup.telefono || 'SIN TELÉFONO'}
                              </td>
                              <td className="p-3.5 text-center">
                                <span className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold border bg-emerald-50 text-emerald-800 border-emerald-200">
                                  PROPIO
                                </span>
                              </td>
                              <td className="p-3.5 text-center relative" onClick={(e) => e.stopPropagation()}>
                                <button
                                  type="button"
                                  onClick={() => setActiveMenuSupplierId(activeMenuSupplierId === sup.id_proveedor ? null : sup.id_proveedor)}
                                  className="p-1.5 text-gray-400 hover:text-torcoroma-gold rounded-lg hover:bg-gray-50 transition cursor-pointer inline-flex items-center justify-center"
                                  title="Acciones"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                {activeMenuSupplierId === sup.id_proveedor && (
                                  <div className="absolute right-2 mt-1 w-28 bg-white border border-gray-200 rounded-xl shadow-2xl z-30 divide-y divide-gray-100 overflow-hidden text-left">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveMenuSupplierId(null);
                                        handleOpenEditSupplier(sup);
                                      }}
                                      className="w-full px-3 py-2 hover:bg-yellow-50/50 text-xs font-bold text-torcoroma-dark flex items-center gap-1.5 cursor-pointer transition-all"
                                    >
                                      <Edit className="w-3.5 h-3.5 text-torcoroma-gold" />
                                      Editar
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveMenuSupplierId(null);
                                        handleOpenDeleteSupplier(sup);
                                      }}
                                      className="w-full px-3 py-2 hover:bg-red-55 text-xs font-bold text-red-600 flex items-center gap-1.5 cursor-pointer transition-all"
                                    >
                                      <Trash2 className="w-3.5 h-3.5 text-red-500" />
                                      Eliminar
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Columna Derecha: Detalle de Cuentas, Facturas y Abonos */}
          <div className="xl:col-span-5">
            {selectedSupplier ? (
              <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100 space-y-6">
                {/* Header del Proveedor */}
                <div className="border-b border-gray-100 pb-4">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Estado de Cuenta</span>
                  <h3 className="text-base font-black text-torcoroma-dark uppercase mt-0.5 flex justify-between items-center">
                    {selectedSupplier.nombre}
                    <button
                      onClick={() => setShowInvoiceModal(true)}
                      className="bg-gray-100 hover:bg-gray-200 text-torcoroma-dark px-3 py-1.5 rounded-lg text-[10px] font-bold transition flex items-center gap-1 cursor-pointer border border-gray-200"
                    >
                      <Plus className="w-3 h-3" /> Factura
                    </button>
                  </h3>
                  <p className="text-xs text-gray-505 font-semibold mt-1">
                    Tipo: <span className="font-bold text-torcoroma-gold">{selectedSupplier.es_externo ? 'Consignación (Vecino)' : 'Mercancía Propia'}</span>
                  </p>
                </div>

                {/* Tarjeta de Saldos */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-gray-50 border border-gray-150 p-3 rounded-xl text-center">
                    <span className="text-[9px] font-bold text-gray-400 uppercase block">Total Facturado</span>
                    <span className="text-xs font-black text-torcoroma-dark block mt-1">
                      ${totalBilled.toLocaleString('es-CO')}
                    </span>
                  </div>
                  <div className="bg-emerald-50/40 border border-emerald-100 p-3 rounded-xl text-center">
                    <span className="text-[9px] font-bold text-emerald-600 uppercase block">Total Abonos</span>
                    <span className="text-xs font-black text-emerald-800 block mt-1">
                      ${totalPaid.toLocaleString('es-CO')}
                    </span>
                  </div>
                  <div className="bg-yellow-50/40 border border-yellow-100 p-3 rounded-xl text-center">
                    <span className="text-[9px] font-bold text-yellow-600 uppercase block">Saldo Pendiente</span>
                    <span className="text-xs font-black text-torcoroma-gold block mt-1">
                      ${totalPending.toLocaleString('es-CO')}
                    </span>
                  </div>
                </div>

                {/* Barra de progreso de amortización */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Progreso de Pago</span>
                    <span className="text-xs font-bold text-torcoroma-dark">{progressPercent}% Pagado</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden border border-gray-200">
                    <div
                      className="bg-emerald-55 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, progressPercent)}%` }}
                    />
                  </div>
                </div>

                {/* Listado de Facturas (Cuentas por pagar) */}
                <div>
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Facturas y Deudas</h4>

                  {loadingInvoices ? (
                    <div className="flex items-center justify-center py-8 text-gray-455 text-xs font-semibold gap-1.5">
                      <RefreshCw className="animate-spin w-4 h-4 text-torcoroma-gold" /> Cargando deudas...
                    </div>
                  ) : invoices.length === 0 ? (
                    <div className="text-center py-10 bg-gray-55 border border-dashed border-gray-200 rounded-xl text-gray-400 italic text-xs">
                      Sin facturas pendientes para este proveedor.
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                      {invoices.map((inv) => {
                        const isPaid = inv.saldo_restante === 0;
                        return (
                          <div
                            key={inv.id_factura}
                            className={`p-3.5 rounded-xl border transition-all ${
                              isPaid
                                ? 'bg-emerald-55/20 border-emerald-100 opacity-75'
                                : 'bg-white border-gray-200 hover:border-gray-305'
                            }`}
                          >
                            <div className="flex justify-between items-start">
                              <div className="flex-1 min-w-0 pr-2">
                                <span className="font-bold text-xs text-torcoroma-dark block uppercase tracking-wide">
                                  Fac: {inv.numero_factura || 'Compra Manual'}
                                </span>
                                <span className="text-[10px] text-gray-400 font-semibold mt-0.5 flex items-center gap-1">
                                  <Calendar className="w-3 h-3 text-gray-400" />
                                  {new Date(inv.fecha_emision).toLocaleDateString()}
                                </span>
                                {inv.descripcion && (
                                  <p className="text-[11px] text-gray-655 mt-2 bg-gray-50/80 p-2 rounded-lg border border-gray-100 font-semibold whitespace-pre-wrap leading-relaxed">
                                    {inv.descripcion}
                                  </p>
                                )}
                                {inv.cantidad_zapatos > 0 && (
                                  <span className="text-[10px] text-gray-550 mt-2 block font-bold">
                                    Detalle: <span className="text-torcoroma-dark">{inv.cantidad_zapatos} uds.</span> x <span className="text-torcoroma-dark">${Number(inv.valor_unitario).toLocaleString('es-CO')}</span>
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                  isPaid
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                    : 'bg-yellow-100 text-yellow-800 border border-yellow-250'
                                }`}>
                                  {isPaid ? 'LIQUIDADO' : 'PENDIENTE'}
                                </span>
                                <button
                                  onClick={() => handleOpenEditInvoice(inv)}
                                  className="p-1 text-gray-400 hover:text-torcoroma-gold transition cursor-pointer"
                                  title="Editar Factura"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleOpenDeleteInvoice(inv)}
                                  className="p-1 text-gray-400 hover:text-red-655 transition cursor-pointer"
                                  title="Eliminar Factura"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            <div className="grid grid-cols-3 gap-2 mt-3.5 border-t border-gray-100 pt-3 text-center">
                              <div>
                                <span className="text-[8px] font-bold text-gray-400 uppercase block">Total</span>
                                <span className="text-xs font-bold text-torcoroma-dark block mt-0.5">${inv.total_costo.toLocaleString('es-CO')}</span>
                              </div>
                              <div>
                                <span className="text-[8px] font-bold text-gray-455 uppercase block">Abonado</span>
                                <span className="text-xs font-bold text-emerald-600 block mt-0.5">${inv.suma_abonos.toLocaleString('es-CO')}</span>
                              </div>
                              <div>
                                <span className="text-[8px] font-bold text-gray-455 uppercase block">Saldo</span>
                                <span className="text-xs font-bold text-torcoroma-gold block mt-0.5">${inv.saldo_restante.toLocaleString('es-CO')}</span>
                              </div>
                            </div>

                            {!isPaid && (
                              <div className="mt-3 flex justify-end">
                                <button
                                  onClick={() => {
                                    setSelectedInvoice(inv);
                                    setAbonoAmount(String(inv.saldo_restante)); // Pre-llenar con el saldo restante
                                    setShowAbonoModal(true);
                                  }}
                                  className="bg-torcoroma-gold text-white font-bold px-3 py-1.5 rounded-lg hover:bg-yellow-600 active:scale-[0.98] transition-all text-[10px] uppercase tracking-wider shadow-sm cursor-pointer"
                                >
                                  [+] Registrar Abono
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100 text-center py-24">
                <Truck className="w-12 h-12 text-gray-355 mx-auto mb-3" />
                <h4 className="text-sm font-bold text-torcoroma-dark uppercase tracking-wider">Sin Proveedor Seleccionado</h4>
                <p className="text-xs text-gray-450 mt-1 max-w-xs mx-auto">Selecciona un proveedor de la lista de la izquierda para gestionar sus facturas, balances y abonos.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Registrar Abono */}
      {showAbonoModal && selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-gray-100 overflow-hidden">
            <div className="bg-torcoroma-dark text-white p-5 flex items-center justify-between rounded-t-2xl">
              <h3 className="font-black text-sm md:text-base tracking-wide uppercase">Registrar Abono</h3>
              <button
                onClick={() => {
                  setShowAbonoModal(false);
                  setSelectedInvoice(null);
                  setAbonoAmount('');
                }}
                className="text-gray-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAbono} className="p-5 space-y-4">
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Factura</span>
                <span className="font-bold text-sm text-torcoroma-dark">{selectedInvoice.numero_factura || 'Abono Automático'}</span>
                <p className="text-[10px] text-gray-550 mt-0.5">Saldo Restante: <strong className="text-torcoroma-gold">${selectedInvoice.saldo_restante.toLocaleString('es-CO')}</strong></p>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                  Monto del Abono ($ COP) *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  max={selectedInvoice.saldo_restante}
                  className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-torcoroma-gold focus:border-torcoroma-gold outline-none transition text-sm font-bold text-torcoroma-dark"
                  value={abonoAmount}
                  onChange={(e) => setAbonoAmount(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                  Origen de los Fondos
                </label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => setMoneySource('EFECTIVO_CAJA')}
                    className={`p-2.5 rounded-xl border flex items-center justify-center gap-1.5 transition text-[10px] font-bold cursor-pointer uppercase ${
                      moneySource === 'EFECTIVO_CAJA'
                        ? 'border-torcoroma-gold bg-yellow-50 text-torcoroma-gold'
                        : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    <Banknote className="w-4 h-4" />
                    EFECTIVO CAJA
                  </button>
                  <button
                    type="button"
                    onClick={() => setMoneySource('BOLSILLO_JEFE')}
                    className={`p-2.5 rounded-xl border flex items-center justify-center gap-1.5 transition text-[10px] font-bold cursor-pointer uppercase ${
                      moneySource === 'BOLSILLO_JEFE'
                        ? 'border-torcoroma-gold bg-yellow-50 text-torcoroma-gold'
                        : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    <Landmark className="w-4 h-4" />
                    BOLSILLO JEFE
                  </button>
                </div>
              </div>

              <div className="flex gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowAbonoModal(false);
                    setSelectedInvoice(null);
                    setAbonoAmount('');
                  }}
                  className="w-1/2 py-2.5 border border-gray-300 rounded-xl text-gray-700 font-bold hover:bg-gray-50 transition text-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingAbono || !abonoAmount || Number(abonoAmount) <= 0 || Number(abonoAmount) > selectedInvoice.saldo_restante}
                  className="w-1/2 py-2.5 bg-torcoroma-gold text-white font-bold rounded-xl hover:bg-yellow-600 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed transition text-xs cursor-pointer shadow-md"
                >
                  {savingAbono ? 'Guardando...' : 'Aplicar Abono'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Registrar Compra (Factura Manual) */}
      {showInvoiceModal && selectedSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-gray-100 overflow-hidden">
            <div className="bg-torcoroma-dark text-white p-5 flex items-center justify-between rounded-t-2xl">
              <h3 className="font-black text-sm md:text-base tracking-wide uppercase">Registrar Factura a {selectedSupplier.nombre}</h3>
              <button
                onClick={() => {
                  setShowInvoiceModal(false);
                  setInvoiceNumber('');
                  setInvoiceTotal('');
                  setInvoiceDescription('');
                  setInvoiceQty('');
                  setInvoiceUnitPrice('');
                }}
                className="text-gray-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateInvoice} className="p-5 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                  Número de Factura
                </label>
                <input
                  type="text"
                  placeholder="Ej. FAC-12345 (Opcional)"
                  className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-torcoroma-gold focus:border-torcoroma-gold outline-none transition text-xs font-semibold text-torcoroma-dark"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                  Descripción
                </label>
                <textarea
                  placeholder="Ej. Compra de calzado deportivo de cuero, lote de fin de mes..."
                  className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-torcoroma-gold focus:border-torcoroma-gold outline-none transition text-xs font-semibold text-torcoroma-dark min-h-[70px]"
                  value={invoiceDescription}
                  onChange={(e) => setInvoiceDescription(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-12 gap-3">
                <div className="col-span-4">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                    Cant. *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="Ej. 10"
                    className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-torcoroma-gold focus:border-torcoroma-gold outline-none transition text-xs font-bold text-torcoroma-dark"
                    value={invoiceQty}
                    onChange={(e) => setInvoiceQty(e.target.value)}
                  />
                </div>
                <div className="col-span-8">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                    Valor Unitario ($ COP) *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    placeholder="Ej. 15000"
                    className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-torcoroma-gold focus:border-torcoroma-gold outline-none transition text-xs font-bold text-torcoroma-dark"
                    value={invoiceUnitPrice}
                    onChange={(e) => setInvoiceUnitPrice(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                  Costo Total de la Compra ($ COP) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. 150.000"
                  className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-torcoroma-gold focus:border-torcoroma-gold outline-none transition text-xs font-bold text-torcoroma-dark bg-yellow-50/10"
                  value={invoiceTotal}
                  onChange={(e) => setInvoiceTotal(formatInputOnTheFly(e.target.value))}
                />
                {invoiceQty && invoiceUnitPrice && (
                  <div className="mt-3.5 p-3.5 bg-yellow-50/45 border border-yellow-100 rounded-2xl flex flex-col gap-1.5 shadow-sm border-l-4 border-l-torcoroma-gold animate-fadeIn">
                    <span className="text-[9px] font-black text-torcoroma-gold tracking-widest uppercase flex items-center gap-1">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-torcoroma-gold"></span>
                      CÁLCULO AUTOMÁTICO
                    </span>
                    <div className="flex items-center justify-between text-xs font-bold text-torcoroma-dark select-none">
                      <span>{invoiceQty} uds.</span>
                      <span className="text-gray-400 font-normal text-[10px]">×</span>
                      <span>${formatCOP(invoiceUnitPrice)}</span>
                      <span className="text-gray-455 font-normal text-[10px]">=</span>
                      <span className="text-torcoroma-gold font-black text-sm">${formatCOP(Number(invoiceQty) * Number(invoiceUnitPrice))}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowInvoiceModal(false);
                    setInvoiceNumber('');
                    setInvoiceTotal('');
                    setInvoiceDescription('');
                    setInvoiceQty('');
                    setInvoiceUnitPrice('');
                  }}
                  className="w-1/2 py-2.5 border border-gray-300 rounded-xl text-gray-700 font-bold hover:bg-gray-50 transition text-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingInvoice || !invoiceTotal || Number(invoiceTotal) < 0}
                  className="w-1/2 py-2.5 bg-torcoroma-gold text-white font-bold rounded-xl hover:bg-yellow-600 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed transition text-xs cursor-pointer shadow-md"
                >
                  {savingInvoice ? 'Guardando...' : 'Crear Factura'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar Factura */}
      {showEditInvoiceModal && editingInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-gray-100 overflow-hidden">
            <div className="bg-torcoroma-dark text-white p-5 flex items-center justify-between rounded-t-2xl">
              <h3 className="font-black text-sm md:text-base tracking-wide uppercase">Editar Factura</h3>
              <button
                onClick={() => {
                  setShowEditInvoiceModal(false);
                  setEditingInvoice(null);
                  setEditInvoiceNumber('');
                  setEditInvoiceTotal('');
                  setEditInvoiceDescription('');
                  setEditInvoiceQty('');
                  setEditInvoiceUnitPrice('');
                }}
                className="text-gray-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditInvoiceSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                  Número de Factura
                </label>
                <input
                  type="text"
                  placeholder="Ej. FAC-12345 (Opcional)"
                  className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-torcoroma-gold focus:border-torcoroma-gold outline-none transition text-xs font-semibold text-torcoroma-dark"
                  value={editInvoiceNumber}
                  onChange={(e) => setEditInvoiceNumber(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                  Descripción
                </label>
                <textarea
                  placeholder="Ej. Compra de calzado deportivo de cuero, lote de fin de mes..."
                  className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-torcoroma-gold focus:border-torcoroma-gold outline-none transition text-xs font-semibold text-torcoroma-dark min-h-[70px]"
                  value={editInvoiceDescription}
                  onChange={(e) => setEditInvoiceDescription(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-12 gap-3">
                <div className="col-span-4">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                    Cant. *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="Ej. 10"
                    className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-torcoroma-gold focus:border-torcoroma-gold outline-none transition text-xs font-bold text-torcoroma-dark"
                    value={editInvoiceQty}
                    onChange={(e) => setEditInvoiceQty(e.target.value)}
                  />
                </div>
                <div className="col-span-8">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                    Valor Unitario ($ COP) *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    placeholder="Ej. 15000"
                    className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-torcoroma-gold focus:border-torcoroma-gold outline-none transition text-xs font-bold text-torcoroma-dark"
                    value={editInvoiceUnitPrice}
                    onChange={(e) => setEditInvoiceUnitPrice(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                  Costo Total de la Factura ($ COP) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. 150.000"
                  className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-torcoroma-gold focus:border-torcoroma-gold outline-none transition text-xs font-bold text-torcoroma-dark bg-yellow-50/10"
                  value={editInvoiceTotal}
                  onChange={(e) => setEditInvoiceTotal(formatInputOnTheFly(e.target.value))}
                />
                {editInvoiceQty && editInvoiceUnitPrice && (
                  <div className="mt-3.5 p-3.5 bg-yellow-50/45 border border-yellow-100 rounded-2xl flex flex-col gap-1.5 shadow-sm border-l-4 border-l-torcoroma-gold animate-fadeIn">
                    <span className="text-[9px] font-black text-torcoroma-gold tracking-widest uppercase flex items-center gap-1">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-torcoroma-gold"></span>
                      CÁLCULO AUTOMÁTICO
                    </span>
                    <div className="flex items-center justify-between text-xs font-bold text-torcoroma-dark select-none">
                      <span>{editInvoiceQty} uds.</span>
                      <span className="text-gray-400 font-normal text-[10px]">×</span>
                      <span>${formatCOP(editInvoiceUnitPrice)}</span>
                      <span className="text-gray-455 font-normal text-[10px]">=</span>
                      <span className="text-torcoroma-gold font-black text-sm">${formatCOP(Number(editInvoiceQty) * Number(editInvoiceUnitPrice))}</span>
                    </div>
                  </div>
                )}
                <p className="text-[10px] text-gray-550 mt-1.5">
                  Monto abonado actualmente: <strong className="text-emerald-700">${editingInvoice.suma_abonos.toLocaleString('es-CO')}</strong>. El costo total no puede ser inferior a este valor.
                </p>
              </div>

              <div className="flex gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditInvoiceModal(false);
                    setEditingInvoice(null);
                    setEditInvoiceNumber('');
                    setEditInvoiceTotal('');
                    setEditInvoiceDescription('');
                    setEditInvoiceQty('');
                    setEditInvoiceUnitPrice('');
                  }}
                  className="w-1/2 py-2.5 border border-gray-300 rounded-xl text-gray-700 font-bold hover:bg-gray-50 transition text-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingEditInvoice || !editInvoiceTotal || Number(editInvoiceTotal) < 0}
                  className="w-1/2 py-2.5 bg-torcoroma-gold text-white font-bold rounded-xl hover:bg-yellow-600 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed transition text-xs cursor-pointer shadow-md"
                >
                  {savingEditInvoice ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Confirmar Eliminar Factura */}
      {showDeleteInvoiceModal && deletingInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full border border-gray-100 overflow-hidden p-6 text-center">
            <div className="w-14 h-14 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-100 shadow-md">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <h3 className="text-sm font-black text-torcoroma-dark uppercase tracking-wide">¿ELIMINAR FACTURA?</h3>
            <p className="text-xs text-gray-500 mt-2 leading-relaxed">
              Estás a punto de eliminar la factura <strong className="text-torcoroma-dark">"{deletingInvoice.numero_factura || 'Compra Manual'}"</strong>. Esta acción eliminará permanentemente la factura y **todos sus abonos aplicados** en la base de datos de forma irreversible.
            </p>

            <div className="flex gap-2.5 pt-5 mt-5 border-t border-gray-100">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteInvoiceModal(false);
                  setDeletingInvoice(null);
                }}
                className="w-1/2 py-2.5 border border-gray-300 rounded-xl text-gray-700 font-bold hover:bg-gray-50 transition text-xs cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteInvoiceSubmit}
                disabled={deletingInvoiceProgress}
                className="w-1/2 py-2.5 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition text-xs cursor-pointer shadow-md shadow-red-500/10"
              >
                {deletingInvoiceProgress ? 'Eliminando...' : 'Sí, Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Editar Proveedor */}
      {showEditSupplierModal && editingSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-gray-100 overflow-hidden">
            <div className="bg-torcoroma-dark text-white p-5 flex items-center justify-between rounded-t-2xl">
              <h3 className="font-black text-sm md:text-base tracking-wide uppercase">Editar Proveedor</h3>
              <button
                onClick={() => {
                  setShowEditSupplierModal(false);
                  setEditingSupplier(null);
                  setEditSupplierName('');
                  setEditSupplierPhone('');
                }}
                className="text-gray-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSupplierSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                  Nombre del Proveedor *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. DISTRIBUIDORA"
                  className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-torcoroma-gold focus:border-torcoroma-gold outline-none transition text-xs font-bold text-torcoroma-dark uppercase"
                  value={editSupplierName}
                  onChange={(e) => setEditSupplierName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                  Teléfono de Contacto
                </label>
                <input
                  type="text"
                  placeholder="Ej. 3224613457"
                  className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-torcoroma-gold focus:border-torcoroma-gold outline-none transition text-xs font-semibold text-torcoroma-dark"
                  value={editSupplierPhone}
                  onChange={(e) => setEditSupplierPhone(e.target.value)}
                />
              </div>

              <div className="flex gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditSupplierModal(false);
                    setEditingSupplier(null);
                    setEditSupplierName('');
                    setEditSupplierPhone('');
                  }}
                  className="w-1/2 py-2.5 border border-gray-300 rounded-xl text-gray-700 font-bold hover:bg-gray-50 transition text-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingEditSupplier || !editSupplierName.trim()}
                  className="w-1/2 py-2.5 bg-torcoroma-gold text-white font-bold rounded-xl hover:bg-yellow-600 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed transition text-xs cursor-pointer shadow-md"
                >
                  {savingEditSupplier ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Confirmar Eliminar Proveedor */}
      {showDeleteSupplierModal && deletingSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full border border-gray-100 overflow-hidden p-6 text-center">
            <div className="w-14 h-14 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-100 shadow-md">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <h3 className="text-sm font-black text-torcoroma-dark uppercase tracking-wide">¿ELIMINAR PROVEEDOR?</h3>
            <p className="text-xs text-gray-500 mt-2 leading-relaxed">
              Estás a punto de eliminar al proveedor <strong className="text-torcoroma-dark">"{deletingSupplier.nombre}"</strong>. Esta acción es permanente e irreversible en la base de datos.
            </p>
            <p className="text-[10px] text-gray-450 mt-1 leading-relaxed italic">
              Nota: Solo se puede eliminar si el proveedor no tiene facturas registradas en el sistema.
            </p>

            <div className="flex gap-2.5 pt-5 mt-5 border-t border-gray-100">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteSupplierModal(false);
                  setDeletingSupplier(null);
                }}
                className="w-1/2 py-2.5 border border-gray-300 rounded-xl text-gray-700 font-bold hover:bg-gray-50 transition text-xs cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteSupplierSubmit}
                disabled={savingDeleteSupplier}
                className="w-1/2 py-2.5 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition text-xs cursor-pointer shadow-md shadow-red-500/10"
              >
                {savingDeleteSupplier ? 'Eliminando...' : 'Sí, Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
