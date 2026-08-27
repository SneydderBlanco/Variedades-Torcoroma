import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_DATABASE,
});

async function migrate() {
  try {
    console.log('Creando tabla kardex_inventario...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS kardex_inventario (
          id_movimiento SERIAL PRIMARY KEY,
          id_variante INT NOT NULL REFERENCES variante_zapato(id_variante) ON DELETE CASCADE,
          id_ubicacion INT NOT NULL REFERENCES ubicacion(id_ubicacion) ON DELETE CASCADE,
          tipo_movimiento VARCHAR(50) NOT NULL CHECK (tipo_movimiento IN ('INGRESO_MANUAL', 'AJUSTE', 'VENTA', 'ANULACION_VENTA', 'TRASLADO_PERMITIDO', 'DEVOLUCION_PERMITIDO', 'CAMBIO_DEVOLUCION')),
          cantidad INT NOT NULL, -- Puede ser positivo (ingreso) o negativo (salida)
          stock_resultante INT, -- Optional: El stock que quedó después del movimiento
          usuario VARCHAR(100),
          detalle TEXT,
          fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Añadimos a database_init.sql virtualmente.
    console.log('Migración completada exitosamente.');
  } catch (err) {
    console.error('Error durante la migración:', err);
  } finally {
    await pool.end();
  }
}

migrate();
