import pool from './src/config/db.js';

async function run() {
  try {
    await pool.query('ALTER TABLE venta_detalle ADD COLUMN IF NOT EXISTS devuelto BOOLEAN DEFAULT FALSE;');
    console.log('Columna devuelto añadida correctamente a venta_detalle.');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
run();
