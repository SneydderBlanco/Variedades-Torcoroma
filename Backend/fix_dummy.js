import pool from './src/config/db.js';

async function fixDummy() {
  try {
    await pool.query(`
      INSERT INTO modelo (id_modelo, nombre, id_proveedor_aliado, precio_compra, precio_minimo_venta, es_externo)
      VALUES (999999, 'PASE RÁPIDO / DISTRIBUCIÓN MANUAL', NULL, 0, 0, false)
      ON CONFLICT (id_modelo) DO NOTHING;

      INSERT INTO variante_zapato (id_variante, id_modelo, color, talla)
      VALUES (999999, 999999, 'N/A', 'ÚNICA')
      ON CONFLICT (id_variante) DO NOTHING;
    `);
    console.log('Dummy model restored!');
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

fixDummy();
