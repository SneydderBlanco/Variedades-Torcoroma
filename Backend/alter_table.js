import pool from './src/config/db.js';

async function migrate() {
  try {
    console.log('Iniciando migración de la base de datos...');
    
    // Agregar columnas a factura_proveedor si no existen
    await pool.query(`
      ALTER TABLE factura_proveedor 
      ADD COLUMN IF NOT EXISTS descripcion TEXT,
      ADD COLUMN IF NOT EXISTS cantidad_zapatos INT DEFAULT 0,
      ADD COLUMN IF NOT EXISTS valor_unitario NUMERIC(12, 2) DEFAULT 0.00;
    `);
    
    console.log('Migración completada con éxito. Las columnas descripcion, cantidad_zapatos y valor_unitario han sido agregadas.');
    process.exit(0);
  } catch (error) {
    console.error('Error durante la migración:', error);
    process.exit(1);
  }
}

migrate();
