import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import pool from './src/config/db.js';
import authRoutes from './src/aplicacion/authRoutes.js';
import authMiddleware from './src/aplicacion/authMiddleware.js';
import posRoutes from './src/aplicacion/posRoutes.js';
import proveedorRoutes from './src/aplicacion/proveedorRoutes.js';
import clienteRoutes from './src/aplicacion/clienteRoutes.js';
import dashboardRoutes from './src/aplicacion/dashboardRoutes.js';
import gastoRoutes from './src/aplicacion/gastoRoutes.js';
import usuarioRoutes from './src/aplicacion/usuarioRoutes.js';
import ecommerceRoutes from './src/aplicacion/ecommerceRoutes.js';
import { POSController } from './src/aplicacion/posController.js';

const app = express();
const PORT = process.env.PORT || 4000;
const posController = new POSController();

// Middlewares
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// Log de peticiones
app.use((req, res, next) => {
  console.log(`[REQUEST] ${req.method} ${req.url} - Body:`, JSON.stringify(req.body));
  next();
});

// Registro de rutas
app.use('/api/auth', authRoutes); // Endpoint público de autenticación

app.use('/api/pos', authMiddleware, posRoutes);
app.use('/api/proveedores', authMiddleware, proveedorRoutes);
app.use('/api/clientes', authMiddleware, clienteRoutes);
app.use('/api/dashboard', authMiddleware, dashboardRoutes);
app.use('/api/gastos', authMiddleware, gastoRoutes);
app.use('/api/usuarios', authMiddleware, usuarioRoutes);
app.use('/api/ecommerce', ecommerceRoutes);
app.post('/api/ventas', authMiddleware, (req, res) => posController.registrarVenta(req, res));

// Ruta raíz
app.get('/', (req, res) => {
  res.send('API de Variedades Torcoroma - Backend de Administración Interna');
});

// Endpoint de estado y salud
app.get('/api/status', async (req, res) => {
  try {
    // Realizamos una consulta básica para corroborar la conectividad
    const result = await pool.query('SELECT NOW()');
    res.json({
      status: 'online',
      message: 'Servidor de Variedades Torcoroma en funcionamiento.',
      database: {
        connection: 'ok',
        time: result.rows[0].now
      }
    });
  } catch (error) {
    res.json({
      status: 'online',
      message: 'Servidor en funcionamiento, pero sin conexión activa a la base de datos.',
      database: {
        connection: 'failed',
        error: error.message
      }
    });
  }
});

// Auto-migración al inicio para asegurar columnas requeridas en PostgreSQL/Neon
const ensureDatabaseColumns = async () => {
  try {
    await pool.query(`
      ALTER TABLE ecommerce_producto_web 
      ADD COLUMN IF NOT EXISTS precio_web NUMERIC(12, 2) DEFAULT 0.00;
    `);
    console.log('✅ Base de datos: Columna precio_web asegurada en ecommerce_producto_web.');
  } catch (err) {
    console.error('⚠️ Error al asegurar columna precio_web:', err.message);
  }
};
ensureDatabaseColumns();

// Endpoint de versión
app.get('/api/version', (req, res) => {
  res.json({
    version: '1.1.0',
    features: ['precio_web_support', 'auto_migration'],
    timestamp: new Date().toISOString()
  });
});

// Inicialización del servidor
app.listen(PORT, () => {
  console.log(`=== Servidor de Variedades Torcoroma ===`);
  console.log(`Escuchando en http://localhost:${PORT}`);
});
