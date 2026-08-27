import express from 'express';
import multer from 'multer';
import path from 'path';
import { EcommerceController } from './ecommerceController.js';
import authMiddleware from './authMiddleware.js';

const router = express.Router();
const controller = new EcommerceController();

// Configuración de Multer para almacenar archivos en 'uploads/'
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    // Renombrar archivo para evitar duplicados y espacios
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'producto-' + uniqueSuffix + ext);
  }
});
const upload = multer({ storage });

// Rutas Públicas (para la página web)
router.get('/categorias', (req, res) => controller.getCategorias(req, res));
router.get('/productos', (req, res) => controller.getProductosWeb(req, res));
router.get('/productos/:id', (req, res) => controller.getProductoWeb(req, res));

// Rutas Privadas (para el CMS del POS, protegidas por authMiddleware)
router.get('/admin/productos', authMiddleware, (req, res) => controller.getAdminProductos(req, res));
router.get('/admin/productos/disponibles', authMiddleware, (req, res) => controller.getUnloadedProductos(req, res));
router.delete('/admin/productos/:id_modelo', authMiddleware, (req, res) => controller.removeProductoWeb(req, res));
router.get('/admin/productos/:id_modelo', authMiddleware, (req, res) => controller.getProductoWeb(req, res)); // Re-uso? No, no existe
router.put('/admin/productos/:id_modelo', authMiddleware, (req, res) => controller.updateProductoWeb(req, res));
router.get('/admin/productos/:id_modelo/imagenes', authMiddleware, (req, res) => controller.getProductoImages(req, res));
router.get('/admin/productos/:id_modelo/colores', authMiddleware, (req, res) => controller.getModelColors(req, res));
router.delete('/admin/imagenes/:id_imagen', authMiddleware, (req, res) => controller.deleteImagen(req, res));

// Ruta de subida de archivos (requiere el middleware 'upload.single')
router.post('/admin/productos/:id_modelo/imagenes', authMiddleware, upload.single('imagen'), (req, res) => controller.uploadImagen(req, res));

// ================= CONFIGURACIÓN WEB =================
router.get('/config', (req, res) => controller.getConfig(req, res));
router.put(
  '/admin/config', 
  authMiddleware, 
  upload.fields([{ name: 'hero_img', maxCount: 1 }, { name: 'promo_img', maxCount: 1 }]), 
  (req, res) => controller.updateConfig(req, res)
);

export default router;
