import pool from '../config/db.js';
import { VarianteEntity } from '../dominio/varianteEntity.js';

export class VarianteRepository {
  // Obtener colores existentes para un modelo
  async obtenerColoresPorModelo(modeloId) {
    const query = `
      SELECT DISTINCT color 
      FROM variante_zapato 
      WHERE id_modelo = $1
      ORDER BY color ASC;
    `;
    const { rows } = await pool.query(query, [modeloId]);
    return rows.map(row => row.color);
  }

  // Obtener tallas y stock real disponible (opcionalmente filtrado por ubicación)
  async obtenerTallasYStock(modeloId, color, ubicacionId = null) {
    const query = `
      SELECT 
        v.id_variante,
        v.talla,
        COALESCE(SUM(
          CASE 
            WHEN $3::int IS NULL THEN s.cantidad
            WHEN s.id_ubicacion = $3::int THEN s.cantidad
            ELSE 0 
          END
        ), 0)::int as stock_local,
        (
          SELECT json_agg(json_build_object('id_local', sp.id_local, 'nombre_local', lp.nombre_local, 'cantidad', sp.cantidad))
          FROM stock_permitidos sp
          JOIN locales_permitidos lp ON sp.id_local = lp.id_local
          WHERE sp.id_variante = v.id_variante AND sp.cantidad > 0
        ) as externos
      FROM variante_zapato v
      LEFT JOIN inventario_stock s ON v.id_variante = s.id_variante
      WHERE v.id_modelo = $1 AND v.color = $2
      GROUP BY v.id_variante, v.talla
      ORDER BY v.talla ASC;
    `;
    
    const { rows } = await pool.query(query, [modeloId, color, ubicacionId]);
    
    // Mapeamos a un formato estructurado y limpio para retornar al controlador
    return rows.map(row => {
      const externos = row.externos || [];
      const stockExterno = externos.reduce((acc, curr) => acc + curr.cantidad, 0);
      return {
        id_variante: row.id_variante,
        talla: row.talla,
        stock_local: row.stock_local,
        stock: row.stock_local + stockExterno,
        externos: externos
      };
    });
  }

  // Obtener una variante específica
  async obtenerVariante(modeloId, color, talla) {
    const query = `
      SELECT id_variante, id_modelo, color, talla 
      FROM variante_zapato 
      WHERE id_modelo = $1 AND UPPER(color) = UPPER($2) AND talla = $3;
    `;
    const { rows } = await pool.query(query, [modeloId, color, talla]);
    if (rows.length === 0) return null;
    return rows[0];
  }

  // Crear una nueva variante
  async crearVariante(modeloId, color, talla) {
    const query = `
      INSERT INTO variante_zapato (id_modelo, color, talla)
      VALUES ($1, $2, $3)
      ON CONFLICT (id_modelo, color, talla) 
      DO UPDATE SET color = EXCLUDED.color -- No-op para retornar el ID existente
      RETURNING id_variante, id_modelo, color, talla;
    `;
    const { rows } = await pool.query(query, [modeloId, color.toUpperCase().trim(), talla]);
    return rows[0];
  }

  // Guardar/Actualizar stock físico
  async guardarStock(varianteId, ubicacionId, cantidad) {
    const query = `
      INSERT INTO inventario_stock (id_variante, id_ubicacion, cantidad)
      VALUES ($1, $2, $3)
      ON CONFLICT (id_variante, id_ubicacion)
      DO UPDATE SET cantidad = EXCLUDED.cantidad
      RETURNING id_stock, id_variante, id_ubicacion, cantidad;
    `;
    const { rows } = await pool.query(query, [varianteId, ubicacionId, cantidad]);
    return rows[0];
  }
}
