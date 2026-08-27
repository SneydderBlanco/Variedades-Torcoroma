import pool from '../config/db.js';

export async function registrarMovimientoKardex({ 
  client = pool, 
  id_variante, 
  id_ubicacion, 
  tipo_movimiento, 
  cantidad, 
  usuario = 'Sistema', 
  detalle = '' 
}) {
  const query = `
    INSERT INTO kardex_inventario (id_variante, id_ubicacion, tipo_movimiento, cantidad, usuario, detalle)
    VALUES ($1, $2, $3, $4, $5, $6)
  `;
  await client.query(query, [id_variante, id_ubicacion, tipo_movimiento, cantidad, usuario, detalle]);
}
