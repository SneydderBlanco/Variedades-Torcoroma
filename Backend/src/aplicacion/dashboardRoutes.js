import { Router } from 'express';
import { DashboardController } from './dashboardController.js';

const router = Router();
const dashboardController = new DashboardController();

// GET /api/dashboard/resumen
router.get('/resumen', (req, res) => dashboardController.obtenerResumen(req, res));

// POST /api/dashboard/alertas/config
router.post('/alertas/config', (req, res) => dashboardController.guardarConfiguracionAlerta(req, res));

export default router;
