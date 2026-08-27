import pool from '../config/db.js';
import { ModeloEntity } from '../dominio/modeloEntity.js';

export class ModeloRepository {
  // Búsqueda predictiva de modelos por nombre
  async buscarPorNombre(termino) {
    const query = `
      SELECT id_modelo, nombre, precio_compra, precio_minimo_venta, es_externo, id_proveedor_aliado 
      FROM modelo 
      WHERE nombre ILIKE $1
      ORDER BY nombre ASC
      LIMIT 10;
    `;
    const values = [`%${termino}%`];
    const { rows } = await pool.query(query, values);
    
    // Mapeamos a la entidad del dominio para asegurar integridad
    return rows.map(row => new ModeloEntity({
      id_modelo: row.id_modelo,
      nombre: row.nombre,
      precio_compra: row.precio_compra,
      precio_minimo_venta: row.precio_minimo_venta,
      es_externo: row.es_externo,
      id_proveedor_aliado: row.id_proveedor_aliado
    }));
  }

  // Obtener modelo por ID
  async obtenerPorId(id) {
    const query = `
      SELECT id_modelo, nombre, precio_compra, precio_minimo_venta, es_externo, id_proveedor_aliado 
      FROM modelo 
      WHERE id_modelo = $1;
    `;
    const { rows } = await pool.query(query, [id]);
    
    if (rows.length === 0) return null;
    
    return new ModeloEntity({
      id_modelo: rows[0].id_modelo,
      nombre: rows[0].nombre,
      precio_compra: rows[0].precio_compra,
      precio_minimo_venta: rows[0].precio_minimo_venta,
      es_externo: rows[0].es_externo,
      id_proveedor_aliado: rows[0].id_proveedor_aliado
    });
  }

  // Crear un nuevo modelo
  async crearModelo({ nombre, precio_compra = 0, precio_minimo_venta = 0, es_externo = false, id_proveedor_aliado = null }) {
    const query = `
      INSERT INTO modelo (nombre, precio_compra, precio_minimo_venta, es_externo, id_proveedor_aliado)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id_modelo, nombre, precio_compra, precio_minimo_venta, es_externo, id_proveedor_aliado;
    `;
    const values = [nombre.toUpperCase().trim(), precio_compra, precio_minimo_venta, es_externo, id_proveedor_aliado || null];
    const { rows } = await pool.query(query, values);
    
    return new ModeloEntity({
      id_modelo: rows[0].id_modelo,
      nombre: rows[0].nombre,
      precio_compra: rows[0].precio_compra,
      precio_minimo_venta: rows[0].precio_minimo_venta,
      es_externo: rows[0].es_externo,
      id_proveedor_aliado: rows[0].id_proveedor_aliado
    });
  }

  async obtenerMatriz(ubicacionId) {
    const query = `
      SELECT 
        m.id_modelo,
        m.nombre AS modelo_nombre,
        m.id_proveedor_aliado AS proveedor,
        v.id_variante,
        v.color,
        v.talla,
        (COALESCE(s.cantidad, 0) + COALESCE(sp.total_permitidos, 0))::INT AS cantidad
      FROM modelo m
      LEFT JOIN variante_zapato v ON m.id_modelo = v.id_modelo
      LEFT JOIN inventario_stock s ON v.id_variante = s.id_variante AND s.id_ubicacion = $1
      LEFT JOIN (
        SELECT id_variante, SUM(cantidad) AS total_permitidos
        FROM stock_permitidos
        GROUP BY id_variante
      ) sp ON v.id_variante = sp.id_variante
      ORDER BY m.nombre ASC, v.color ASC, v.talla ASC;
    `;
    const { rows } = await pool.query(query, [ubicacionId]);
    return rows;
  }
}
