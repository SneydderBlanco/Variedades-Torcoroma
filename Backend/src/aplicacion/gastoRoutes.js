import { Router } from 'express';
import { GastoController } from './gastoController.js';

const router = Router();
const gastoController = new GastoController();

// POST /api/gastos - Registrar un egreso
router.post('/', (req, res) => gastoController.registrarGasto(req, res));

// GET /api/gastos/hoy - Listar gastos del día
router.get('/hoy', (req, res) => gastoController.obtenerGastosHoy(req, res));

// PUT /api/gastos/:id - Actualizar un gasto
router.put('/:id', (req, res) => gastoController.actualizarGasto(req, res));

// DELETE /api/gastos/:id - Eliminar un gasto
router.delete('/:id', (req, res) => gastoController.eliminarGasto(req, res));

export default router;
