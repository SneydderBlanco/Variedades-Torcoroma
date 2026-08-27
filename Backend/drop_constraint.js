import pool from './src/config/db.js';

async function main() {
  try {
    await pool.query('ALTER TABLE historico_ventas DROP CONSTRAINT historico_ventas_cantidad_check');
    console.log('Constraint historico_ventas_cantidad_check dropped successfully');
  } catch (error) {
    if (error.code === '42704') {
      console.log('Constraint does not exist, skipping.');
    } else {
      console.error('Error dropping constraint:', error);
    }
  }
  process.exit(0);
}

main();
