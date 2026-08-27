import pool from './src/config/db.js';

async function run() {
  try {
    await pool.query("INSERT INTO modelo (id_modelo, nombre, precio_compra, precio_minimo_venta, es_externo) VALUES (999999, 'PASE RÁPIDO', 0, 0, false) ON CONFLICT (id_modelo) DO NOTHING");
    await pool.query("INSERT INTO variante_zapato (id_variante, id_modelo, color, talla) VALUES (999999, 999999, 'GENÉRICO', 'ÚNICA') ON CONFLICT (id_variante) DO NOTHING");
    await pool.query("INSERT INTO inventario_stock (id_stock, id_variante, id_ubicacion, cantidad) VALUES (999999, 999999, 2, 999999) ON CONFLICT (id_stock) DO UPDATE SET cantidad = 999999");
    console.log('Comodín PASE RÁPIDO insertado correctamente.');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

run();
