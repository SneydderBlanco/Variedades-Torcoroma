import pool from './src/config/db.js';

async function runMigration() {
  try {
    console.log('Iniciando migración de Historial de Ventas...');
    
    // Crear tabla venta_cabecera
    await pool.query(`
      CREATE TABLE IF NOT EXISTS venta_cabecera (
          id_venta SERIAL PRIMARY KEY,
          ticket_numero VARCHAR(50) UNIQUE NOT NULL,
          fecha_venta TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          metodo_pago VARCHAR(20) NOT NULL CHECK (metodo_pago IN ('EFECTIVO', 'TRANSFERENCIA', 'TARJETA')),
          total_venta NUMERIC(12,2) NOT NULL CHECK (total_venta >= 0),
          vendedor VARCHAR(50) DEFAULT 'Empleado',
          id_ubicacion INT DEFAULT 2 REFERENCES ubicacion(id_ubicacion) ON DELETE SET DEFAULT
      );
    `);
    
    // Crear tabla venta_detalle
    await pool.query(`
      CREATE TABLE IF NOT EXISTS venta_detalle (
          id_detalle SERIAL PRIMARY KEY,
          id_venta INT REFERENCES venta_cabecera(id_venta) ON DELETE CASCADE,
          id_variante INT REFERENCES variante_zapato(id_variante) ON DELETE CASCADE,
          cantidad INT NOT NULL CHECK (cantidad > 0),
          precio_venta_unitario NUMERIC(12,2) NOT NULL CHECK (precio_venta_unitario >= 0),
          descuento_aplicado NUMERIC(12,2) DEFAULT 0.00
      );
    `);
    
    console.log('Tablas venta_cabecera y venta_detalle creadas con éxito!');
    process.exit(0);
  } catch (error) {
    console.error('Error al correr la migración:', error);
    process.exit(1);
  }
}

runMigration();
