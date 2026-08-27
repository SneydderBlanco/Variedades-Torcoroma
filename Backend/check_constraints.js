import pool from './src/config/db.js';

async function main() {
  try {
    const res = await pool.query(`
      SELECT conname, pg_get_constraintdef(c.oid)
      FROM pg_constraint c
      JOIN pg_class t ON c.conrelid = t.oid
      WHERE t.relname IN ('venta_detalle', 'historico_ventas', 'venta_cabecera')
      AND contype = 'c';
    `);
    console.log(res.rows);
  } catch (error) {
    console.error(error);
  }
  process.exit(0);
}

main();
