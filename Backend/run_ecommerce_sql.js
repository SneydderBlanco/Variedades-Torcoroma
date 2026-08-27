import fs from 'fs';
import path from 'path';
import pool from './src/config/db.js';

async function runSQL() {
  try {
    const sqlPath = path.resolve('ecommerce_setup.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    await pool.query(sql);
    console.log('Tablas de E-Commerce creadas exitosamente.');
    process.exit(0);
  } catch (err) {
    console.error('Error al ejecutar SQL:', err);
    process.exit(1);
  }
}

runSQL();
