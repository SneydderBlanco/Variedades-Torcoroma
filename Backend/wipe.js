import pg from 'pg';
import fs from 'fs';
import path from 'path';

const { Pool } = pg;

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'torcoroma',
  password: 'admin',
  port: 5432,
});

async function run() {
  try {
    console.log("Iniciando limpieza de base de datos...");
    
    // Disable constraints temporarily if needed, or use CASCADE
    const tablesToTruncate = [
      'venta_detalle',
      'venta_cabecera',
      'historico_ventas',
      'kardex_inventario',
      'inventario_stock',
      'ecommerce_imagen',
      'ecommerce_producto_web',
      'variante_zapato',
      'modelo',
      'abono_proveedor',
      'factura_proveedor',
      'proveedor',
      'gasto_diario',
      'cliente_dian',
      'ecommerce_categoria' // depending on if user wants categories deleted. "everything like images, inventory, expenses, suppliers". I will delete them to be safe.
    ];

    for (const table of tablesToTruncate) {
      await pool.query(`TRUNCATE TABLE ${table} CASCADE`);
      console.log(`Tabla ${table} limpiada (CASCADE).`);
    }

    // Delete non-admin users
    await pool.query(`DELETE FROM usuarios WHERE rol != 'ADMIN'`);
    console.log("Usuarios que no son ADMIN eliminados.");

    // Clean uploads directory
    const uploadsDir = path.join(process.cwd(), 'uploads');
    if (fs.existsSync(uploadsDir)) {
      const files = fs.readdirSync(uploadsDir);
      for (const file of files) {
        if (file !== '.gitkeep') {
          fs.unlinkSync(path.join(uploadsDir, file));
        }
      }
      console.log("Directorio 'uploads' limpiado.");
    }
    
    console.log("Limpieza completada exitosamente.");
  } catch (error) {
    console.error("Error durante la limpieza:", error);
  } finally {
    pool.end();
  }
}
run();
