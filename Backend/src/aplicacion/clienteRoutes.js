import { Router } from 'express';
import { ClienteController } from './clienteController.js';

const router = Router();
const clienteController = new ClienteController();

// Buscar cliente: GET /api/clientes/buscar?documento=...
router.get('/buscar', (req, res) => clienteController.buscarCliente(req, res));

// Registrar o actualizar cliente (Upsert): POST /api/clientes
router.post('/', (req, res) => clienteController.crearOActualizarCliente(req, res));

export default router;
