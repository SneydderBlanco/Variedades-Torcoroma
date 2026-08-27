import pool from './src/config/db.js';

async function run() {
  try {
    await pool.query(`ALTER TABLE ecommerce_imagen ADD COLUMN IF NOT EXISTS color_nombre VARCHAR(100);`);
    console.log("Columna color_nombre agregada exitosamente.");
    process.exit(0);
  } catch (error) {
    console.error("Error al modificar tabla:", error);
    process.exit(1);
  }
}

run();
