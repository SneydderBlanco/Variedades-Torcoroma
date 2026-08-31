import pool from './src/config/db.js';

async function runMigration() {
  try {
    console.log('Iniciando migración de base de datos para módulo DIAN...');

    // 1. Crear tabla cliente_dian
    await pool.query(`
      CREATE TABLE IF NOT EXISTS cliente_dian (
          id_cliente SERIAL PRIMARY KEY,
          tipo_persona VARCHAR(50) NOT NULL CHECK (tipo_persona IN ('NATURAL', 'JURIDICA')),
          tipo_documento VARCHAR(50) NOT NULL,
          numero_documento VARCHAR(100) UNIQUE NOT NULL,
          nombre_completo VARCHAR(255) NOT NULL,
          correo VARCHAR(255) NOT NULL,
          telefono VARCHAR(100),
          direccion TEXT
      );
    `);
    console.log('Tabla cliente_dian creada o ya existente.');

    // 2. Modificar venta_cabecera para agregar columnas de DIAN
    await pool.query(`
      ALTER TABLE venta_cabecera 
      ADD COLUMN IF NOT EXISTS id_cliente INT REFERENCES cliente_dian(id_cliente) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS requiere_dian BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS estado_dian VARCHAR(50) DEFAULT 'NO_REQUERIDO';
    `);
    console.log('Columnas de DIAN agregadas a venta_cabecera (o ya existentes).');

    console.log('¡Migración DIAN completada con éxito!');
    process.exit(0);
  } catch (error) {
    console.error('Error al ejecutar la migración DIAN:', error);
    process.exit(1);
  }
}

runMigration();
