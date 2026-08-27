import { Router } from 'express';
import { ProveedorController } from './proveedorController.js';

const router = Router();
const controller = new ProveedorController();

// Listar todos: GET /api/proveedores
router.get('/', (req, res) => controller.obtenerTodos(req, res));

// Búsqueda predictiva: GET /api/proveedores/buscar?q=...
router.get('/buscar', (req, res) => controller.buscar(req, res));

// Registrar uno nuevo: POST /api/proveedores
router.post('/', (req, res) => controller.crear(req, res));

// Editar un proveedor: PUT /api/proveedores/:id
router.put('/:id', (req, res) => controller.editar(req, res));

// Eliminar un proveedor: DELETE /api/proveedores/:id
router.delete('/:id', (req, res) => controller.eliminar(req, res));

// Obtener todas las facturas pendientes (con saldo restante > 0): GET /api/proveedores/facturas/pendientes
router.get('/facturas/pendientes', (req, res) => controller.obtenerFacturasPendientes(req, res));

// Obtener facturas de un proveedor: GET /api/proveedores/:id/facturas
router.get('/:id/facturas', (req, res) => controller.obtenerFacturas(req, res));

// Registrar una factura manualmente: POST /api/proveedores/facturas
router.post('/facturas', (req, res) => controller.crearFactura(req, res));

// Editar una factura: PUT /api/proveedores/facturas/:id
router.put('/facturas/:id', (req, res) => controller.editarFactura(req, res));

// Eliminar una factura: DELETE /api/proveedores/facturas/:id
router.delete('/facturas/:id', (req, res) => controller.eliminarFactura(req, res));

// Registrar un abono a una factura: POST /api/proveedores/abonos
router.post('/abonos', (req, res) => controller.registrarAbono(req, res));

export default router;

