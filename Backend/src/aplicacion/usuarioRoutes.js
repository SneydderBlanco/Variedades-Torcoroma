import express from 'express';
import { UsuarioController } from './usuarioController.js';

const router = express.Router();
const usuarioController = new UsuarioController();

// Todas estas rutas deben estar protegidas por authMiddleware y opcionalmente un checkAdmin
router.get('/', (req, res) => usuarioController.getUsuarios(req, res));
router.post('/', (req, res) => usuarioController.createUsuario(req, res));
router.put('/:id/password', (req, res) => usuarioController.updatePassword(req, res));
router.delete('/:id', (req, res) => usuarioController.deleteUsuario(req, res));

export default router;
