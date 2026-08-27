import { ProveedorRepository } from '../persistencia/proveedorRepository.js';
import { FacturaProveedorRepository } from '../persistencia/facturaProveedorRepository.js';

const proveedorRepo = new ProveedorRepository();
const facturaRepo = new FacturaProveedorRepository();

export class ProveedorController {
  // Listar todos los proveedores
  async obtenerTodos(req, res) {
    try {
      const proveedores = await proveedorRepo.obtenerTodos();
      res.json(proveedores);
    } catch (error) {
      console.error('Error en obtenerTodos proveedores:', error);
      res.status(500).json({ error: 'Error al obtener proveedores.' });
    }
  }

  // Buscar proveedores por filtro predictivo
  async buscar(req, res) {
    try {
      const termino = req.query.q || '';
      const proveedores = await proveedorRepo.buscarPorNombre(termino);
      res.json(proveedores);
    } catch (error) {
      console.error('Error en buscar proveedores:', error);
      res.status(500).json({ error: 'Error al buscar proveedores.' });
    }
  }

  // Registrar un nuevo proveedor
  async crear(req, res) {
    try {
      const { nombre, telefono, contacto, es_externo } = req.body;
      if (!nombre || nombre.trim() === '') {
        return res.status(400).json({ error: 'El nombre del proveedor es requerido.' });
      }

      // Validar duplicado
      const existente = await proveedorRepo.obtenerPorNombre(nombre);
      if (existente) {
        return res.status(400).json({ error: 'Ya existe un proveedor registrado con este nombre.' });
      }

      const nuevo = await proveedorRepo.crear({ nombre, telefono, contacto, es_externo });
      res.status(201).json(nuevo);
    } catch (error) {
      console.error('Error en crear proveedor:', error);
      res.status(500).json({ error: 'Error al registrar el proveedor.' });
    }
  }

  // Obtener facturas de un proveedor
  async obtenerFacturas(req, res) {
    try {
      const { id } = req.params;
      const idProveedor = parseInt(id, 10);
      if (isNaN(idProveedor)) {
        return res.status(400).json({ error: 'ID de proveedor inválido.' });
      }

      const facturas = await facturaRepo.listarPorProveedor(idProveedor);
      res.json(facturas);
    } catch (error) {
      console.error('Error en obtenerFacturas:', error);
      res.status(500).json({ error: 'Error al obtener facturas del proveedor.' });
    }
  }

  // Crear una factura manualmente
  async crearFactura(req, res) {
    try {
      const { id_proveedor, numero_factura, total_costo, descripcion, cantidad_zapatos, valor_unitario } = req.body;
      if (!id_proveedor || total_costo === undefined) {
        return res.status(400).json({ error: 'id_proveedor y total_costo son requeridos.' });
      }

      const total = Number(total_costo);
      if (isNaN(total) || total < 0) {
        return res.status(400).json({ error: 'El costo total debe ser un número no negativo.' });
      }

      const factura = await facturaRepo.crear({ 
        id_proveedor, 
        numero_factura, 
        total_costo: total,
        descripcion,
        cantidad_zapatos: cantidad_zapatos ? Number(cantidad_zapatos) : 0,
        valor_unitario: valor_unitario ? Number(valor_unitario) : 0
      });
      res.status(201).json(factura);
    } catch (error) {
      console.error('Error en crearFactura:', error);
      res.status(500).json({ error: 'Error al registrar la factura.' });
    }
  }

  // Registrar un abono a una factura
  async registrarAbono(req, res) {
    try {
      const { id_factura, monto, origen_dinero } = req.body;
      if (!id_factura || monto === undefined || !origen_dinero) {
        return res.status(400).json({ error: 'id_factura, monto y origen_dinero son requeridos.' });
      }

      const montoNum = Number(monto);
      if (isNaN(montoNum) || montoNum <= 0) {
        return res.status(400).json({ error: 'El monto del abono debe ser mayor a cero.' });
      }

      if (!['EFECTIVO_CAJA', 'BOLSILLO_JEFE'].includes(origen_dinero)) {
        return res.status(400).json({ error: 'El origen del dinero debe ser EFECTIVO_CAJA o BOLSILLO_JEFE.' });
      }

      // Validar que la factura exista
      const factura = await facturaRepo.obtenerPorId(id_factura);
      if (!factura) {
        return res.status(404).json({ error: 'La factura especificada no existe.' });
      }

      // Verificar que el abono no exceda el saldo restante
      if (montoNum > factura.saldo_restante) {
        return res.status(400).json({
          error: `El monto del abono ($${montoNum}) excede el saldo restante de la factura ($${factura.saldo_restante}).`
        });
      }

      const abono = await facturaRepo.registrarAbono({ id_factura, monto: montoNum, origen_dinero });

      // Si es EFECTIVO_CAJA, loggear o reportar para el cuadre diario
      if (origen_dinero === 'EFECTIVO_CAJA') {
        console.log(`[CUADRE CAJA] Abono de proveedor registrado desde Efectivo de Caja: -$${montoNum} (Factura ID: ${id_factura})`);
      }

      res.status(201).json({
        message: 'Abono registrado con éxito.',
        abono
      });
    } catch (error) {
      console.error('Error en registrarAbono:', error);
      res.status(500).json({ error: 'Error al registrar el abono.' });
    }
  }

  // Editar factura (modificar número y costo total)
  async editarFactura(req, res) {
    try {
      const { id } = req.params;
      const { numero_factura, total_costo, descripcion, cantidad_zapatos, valor_unitario } = req.body;
      const idFactura = parseInt(id, 10);

      if (isNaN(idFactura)) {
        return res.status(400).json({ error: 'ID de factura inválido.' });
      }

      if (total_costo === undefined) {
        return res.status(400).json({ error: 'total_costo es requerido.' });
      }

      const total = Number(total_costo);
      if (isNaN(total) || total < 0) {
        return res.status(400).json({ error: 'El costo total debe ser un número no negativo.' });
      }

      // Validar existencia de factura y sumatoria de abonos
      const factura = await facturaRepo.obtenerPorId(idFactura);
      if (!factura) {
        return res.status(404).json({ error: 'La factura especificada no existe.' });
      }

      if (total < factura.suma_abonos) {
        return res.status(400).json({
          error: `El costo total no puede ser inferior a los abonos realizados ($${factura.suma_abonos}).`
        });
      }

      const actualizada = await facturaRepo.actualizar({
        id_factura: idFactura,
        numero_factura,
        total_costo: total,
        descripcion,
        cantidad_zapatos: cantidad_zapatos ? Number(cantidad_zapatos) : 0,
        valor_unitario: valor_unitario ? Number(valor_unitario) : 0
      });

      res.json(actualizada);
    } catch (error) {
      console.error('Error en editarFactura:', error);
      res.status(500).json({ error: 'Error al actualizar la factura.' });
    }
  }

  // Eliminar factura y sus abonos
  async eliminarFactura(req, res) {
    try {
      const { id } = req.params;
      const idFactura = parseInt(id, 10);

      if (isNaN(idFactura)) {
        return res.status(400).json({ error: 'ID de factura inválido.' });
      }

      const eliminada = await facturaRepo.eliminar(idFactura);
      if (!eliminada) {
        return res.status(404).json({ error: 'La factura especificada no existe.' });
      }

      res.json({ message: 'Factura y abonos asociados eliminados con éxito.' });
    } catch (error) {
      console.error('Error en eliminarFactura:', error);
      res.status(500).json({ error: 'Error al eliminar la factura.' });
    }
  }

  // Editar proveedor
  async editar(req, res) {
    try {
      const { id } = req.params;
      const { nombre, telefono } = req.body;
      const idProveedor = parseInt(id, 10);

      if (isNaN(idProveedor)) {
        return res.status(400).json({ error: 'ID de proveedor inválido.' });
      }

      if (!nombre || nombre.trim() === '') {
        return res.status(400).json({ error: 'El nombre del proveedor es requerido.' });
      }

      // Validar duplicado si el nombre cambia
      const existente = await proveedorRepo.obtenerPorNombre(nombre);
      if (existente && existente.id_proveedor !== idProveedor) {
        return res.status(400).json({ error: 'Ya existe otro proveedor registrado con este nombre.' });
      }

      const actualizado = await proveedorRepo.actualizar(idProveedor, { nombre, telefono });
      if (!actualizado) {
        return res.status(404).json({ error: 'El proveedor especificado no existe.' });
      }

      res.json(actualizado);
    } catch (error) {
      console.error('Error en editar proveedor:', error);
      res.status(500).json({ error: 'Error al actualizar el proveedor.' });
    }
  }

  // Eliminar proveedor
  async eliminar(req, res) {
    try {
      const { id } = req.params;
      const idProveedor = parseInt(id, 10);

      if (isNaN(idProveedor)) {
        return res.status(400).json({ error: 'ID de proveedor inválido.' });
      }

      // Validar si tiene facturas registradas
      const facturas = await facturaRepo.listarPorProveedor(idProveedor);
      if (facturas.length > 0) {
        return res.status(400).json({
          error: 'No se puede eliminar el proveedor porque tiene facturas o deudas asociadas. Elimine las facturas primero.'
        });
      }

      const eliminado = await proveedorRepo.eliminar(idProveedor);
      if (!eliminado) {
        return res.status(404).json({ error: 'El proveedor especificado no existe.' });
      }

      res.json({ message: 'Proveedor eliminado con éxito.' });
    } catch (error) {
      console.error('Error en eliminar proveedor:', error);
      res.status(500).json({ error: 'Error al eliminar el proveedor.' });
    }
  }

  // Obtener todas las facturas pendientes (con saldo_restante > 0)
  async obtenerFacturasPendientes(req, res) {
    try {
      const facturas = await facturaRepo.listarTodasConSaldo();
      const pendientes = facturas.filter(f => f.saldo_restante > 0);
      res.json(pendientes);
    } catch (error) {
      console.error('Error en obtenerFacturasPendientes:', error);
      res.status(500).json({ error: 'Error al obtener las facturas pendientes.' });
    }
  }
}


