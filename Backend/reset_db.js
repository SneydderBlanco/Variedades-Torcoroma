import pool from './src/config/db.js';

async function resetDB() {
  try {
    console.log('Iniciando limpieza total de la base de datos...');
    
    // TRUNCATE vacía las tablas y reinicia los contadores (IDs).
    // CASCADE asegura que todas las tablas dependientes (ej. variantes, stock, detalles de venta) también se vacíen.
    await pool.query(`
      TRUNCATE TABLE 
        modelo, 
        proveedor, 
        venta_cabecera, 
        cliente_dian, 
        kardex_inventario, 
        historico_ventas,
        gasto_diario
      RESTART IDENTITY CASCADE;
    `);

    console.log('¡Limpieza completada! El sistema está en blanco (conservando solo usuarios y sucursales).');
    process.exit(0);
  } catch (error) {
    console.error('Error al limpiar la base de datos:', error);
    process.exit(1);
  }
}

resetDB();
