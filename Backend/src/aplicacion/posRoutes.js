import { Router } from 'express';
import { POSController } from './posController.js';

const router = Router();
const posController = new POSController();

// 1. Buscar modelos: GET /api/pos/modelos?q=...
router.get('/modelos', (req, res) => posController.buscarModelos(req, res));

// Kardex (Historial de Movimientos)
router.get('/kardex', (req, res) => posController.obtenerKardex(req, res));

// 2. Obtener colores de un modelo: GET /api/pos/colores?modeloId=...
router.get('/colores', (req, res) => posController.obtenerColores(req, res));

// 3. Obtener tallas y stock disponible: GET /api/pos/tallas?modeloId=...&color=...&ubicacionId=...
router.get('/tallas', (req, res) => posController.obtenerTallas(req, res));

// 4. Crear un nuevo modelo: POST /api/pos/modelos
router.post('/modelos', (req, res) => posController.crearModelo(req, res));

// 4.1 Editar un modelo existente: PUT /api/pos/modelos
router.put('/modelos', (req, res) => posController.editarModelo(req, res));

// 4.2 Eliminar un modelo: DELETE /api/pos/modelos
router.delete('/modelos', (req, res) => posController.eliminarModelo(req, res));

// 5. Añadir un color a un modelo: POST /api/pos/colores
router.post('/colores', (req, res) => posController.crearColor(req, res));

// 5.1 Renombrar un color de un modelo: PUT /api/pos/colores
router.put('/colores', (req, res) => posController.renombrarColor(req, res));

// 5.2 Eliminar un color de un modelo: DELETE /api/pos/colores
router.delete('/colores', (req, res) => posController.eliminarColor(req, res));

// 6. Guardar stock masivo: PUT /api/pos/stock
router.put('/stock', (req, res) => posController.guardarStock(req, res));

// 7. Registrar venta: POST /api/pos/ventas
router.post('/ventas', (req, res) => posController.registrarVenta(req, res));

// 8. Obtener historial de ventas: GET /api/pos/ventas/historial
router.get('/ventas/historial', (req, res) => posController.obtenerHistorialVentas(req, res));

// 8.1 Buscar ventas históricas para devoluciones
router.get('/ventas/buscar', (req, res) => posController.buscarVentas(req, res));

// 8.2 Procesar devolución de dinero
router.post('/ventas/devolucion-dinero', (req, res) => posController.devolucionDinero(req, res));

// 9. Anular una venta: POST /api/pos/ventas/anular/:id
router.post('/ventas/anular/:id', (req, res) => posController.anularVenta(req, res));

// 10. Cambiar estado DIAN de una venta: PUT /api/pos/ventas/estado-dian/:id
router.put('/ventas/estado-dian/:id', (req, res) => posController.cambiarEstadoDian(req, res));

// --- Rutas de Locales Permitidos ---
router.get('/locales', (req, res) => posController.obtenerLocales(req, res));
router.post('/locales', (req, res) => posController.crearLocal(req, res));
router.put('/locales/:id', (req, res) => posController.renombrarLocal(req, res));
router.delete('/locales/:id', (req, res) => posController.eliminarLocal(req, res));
router.get('/permitidos/stock', (req, res) => posController.obtenerStockPermitidos(req, res));
router.post('/permitidos/stock', (req, res) => posController.guardarStockPermitido(req, res));

// --- Localizador ---
router.get('/localizador', (req, res) => posController.localizarVariante(req, res));

export default router;
