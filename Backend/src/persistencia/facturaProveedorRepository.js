import pool from '../config/db.js';
import { FacturaProveedorEntity } from '../dominio/facturaProveedorEntity.js';

export class FacturaProveedorRepository {
  // Registrar una nueva factura (cuenta por pagar)
  async crear({ id_proveedor, numero_factura, total_costo, descripcion, cantidad_zapatos, valor_unitario }) {
    const query = `
      INSERT INTO factura_proveedor (id_proveedor, numero_factura, total_costo, descripcion, cantidad_zapatos, valor_unitario)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id_factura, id_proveedor, numero_factura, total_costo, fecha_emision, descripcion, cantidad_zapatos, valor_unitario;
    `;
    const { rows } = await pool.query(query, [
      id_proveedor,
      numero_factura || null,
      total_costo,
      descripcion || null,
      cantidad_zapatos || 0,
      valor_unitario || 0
    ]);
    return new FacturaProveedorEntity({
      id_factura: rows[0].id_factura,
      id_proveedor: rows[0].id_proveedor,
      numero_factura: rows[0].numero_factura,
      total_costo: rows[0].total_costo,
      fecha_emision: rows[0].fecha_emision,
      descripcion: rows[0].descripcion,
      cantidad_zapatos: rows[0].cantidad_zapatos,
      valor_unitario: rows[0].valor_unitario,
      suma_abonos: 0
    });
  }

  // Listar facturas de un proveedor con su saldo restante y abonos acumulados
  async listarPorProveedor(id_proveedor) {
    const query = `
      SELECT 
        f.id_factura, 
        f.id_proveedor, 
        f.numero_factura, 
        f.total_costo, 
        f.fecha_emision,
        f.descripcion,
        f.cantidad_zapatos,
        f.valor_unitario,
        COALESCE(SUM(a.monto), 0) AS suma_abonos
      FROM factura_proveedor f
      LEFT JOIN abono_proveedor a ON f.id_factura = a.id_factura
      WHERE f.id_proveedor = $1
      GROUP BY f.id_factura, f.id_proveedor, f.numero_factura, f.total_costo, f.fecha_emision, f.descripcion, f.cantidad_zapatos, f.valor_unitario
      ORDER BY f.fecha_emision DESC;
    `;
    const { rows } = await pool.query(query, [id_proveedor]);
    return rows.map(row => new FacturaProveedorEntity({
      id_factura: row.id_factura,
      id_proveedor: row.id_proveedor,
      numero_factura: row.numero_factura,
      total_costo: row.total_costo,
      fecha_emision: row.fecha_emision,
      descripcion: row.descripcion,
      cantidad_zapatos: row.cantidad_zapatos,
      valor_unitario: row.valor_unitario,
      suma_abonos: row.suma_abonos
    }));
  }

  // Registrar un abono a una factura
  async registrarAbono({ id_factura, monto, origen_dinero }) {
    const query = `
      INSERT INTO abono_proveedor (id_factura, monto, origen_dinero)
      VALUES ($1, $2, $3)
      RETURNING id_abono, id_factura, monto, origen_dinero, fecha_abono;
    `;
    const { rows } = await pool.query(query, [id_factura, monto, origen_dinero]);
    return rows[0];
  }

  // Obtener una factura específica con sus abonos acumulados
  async obtenerPorId(id_factura) {
    const query = `
      SELECT 
        f.id_factura, 
        f.id_proveedor, 
        f.numero_factura, 
        f.total_costo, 
        f.fecha_emision,
        f.descripcion,
        f.cantidad_zapatos,
        f.valor_unitario,
        COALESCE(SUM(a.monto), 0) AS suma_abonos
      FROM factura_proveedor f
      LEFT JOIN abono_proveedor a ON f.id_factura = a.id_factura
      WHERE f.id_factura = $1
      GROUP BY f.id_factura, f.id_proveedor, f.numero_factura, f.total_costo, f.fecha_emision, f.descripcion, f.cantidad_zapatos, f.valor_unitario;
    `;
    const { rows } = await pool.query(query, [id_factura]);
    if (rows.length === 0) return null;
    return new FacturaProveedorEntity({
      id_factura: rows[0].id_factura,
      id_proveedor: rows[0].id_proveedor,
      numero_factura: rows[0].numero_factura,
      total_costo: rows[0].total_costo,
      fecha_emision: rows[0].fecha_emision,
      descripcion: rows[0].descripcion,
      cantidad_zapatos: rows[0].cantidad_zapatos,
      valor_unitario: rows[0].valor_unitario,
      suma_abonos: rows[0].suma_abonos
    });
  }

  // Listar los abonos realizados a una factura
  async listarAbonosPorFactura(id_factura) {
    const query = `
      SELECT id_abono, id_factura, monto, origen_dinero, fecha_abono
      FROM abono_proveedor
      WHERE id_factura = $1
      ORDER BY fecha_abono DESC;
    `;
    const { rows } = await pool.query(query, [id_factura]);
    return rows;
  }

  // Actualizar una factura
  async actualizar({ id_factura, numero_factura, total_costo, descripcion, cantidad_zapatos, valor_unitario }) {
    const query = `
      UPDATE factura_proveedor
      SET numero_factura = $2, total_costo = $3, descripcion = $4, cantidad_zapatos = $5, valor_unitario = $6
      WHERE id_factura = $1
      RETURNING id_factura, id_proveedor, numero_factura, total_costo, fecha_emision, descripcion, cantidad_zapatos, valor_unitario;
    `;
    const { rows } = await pool.query(query, [
      id_factura, 
      numero_factura || null, 
      total_costo,
      descripcion || null,
      cantidad_zapatos || 0,
      valor_unitario || 0
    ]);
    if (rows.length === 0) return null;
    
    // Devolver la entidad completa agregándole la suma de abonos correspondiente
    return this.obtenerPorId(id_factura);
  }

  // Eliminar una factura
  async eliminar(id_factura) {
    const query = `
      DELETE FROM factura_proveedor
      WHERE id_factura = $1
      RETURNING id_factura;
    `;
    const { rows } = await pool.query(query, [id_factura]);
    return rows.length > 0;
  }

  // Listar todas las facturas con saldo de todos los proveedores
  async listarTodasConSaldo() {
    const query = `
      SELECT 
        f.id_factura, 
        f.id_proveedor, 
        f.numero_factura, 
        f.total_costo::float AS total_costo, 
        f.fecha_emision,
        f.descripcion,
        f.cantidad_zapatos,
        f.valor_unitario::float AS valor_unitario,
        p.nombre AS proveedor_nombre,
        COALESCE(SUM(a.monto), 0)::float AS suma_abonos
      FROM factura_proveedor f
      JOIN proveedor p ON f.id_proveedor = p.id_proveedor
      LEFT JOIN abono_proveedor a ON f.id_factura = a.id_factura
      GROUP BY f.id_factura, f.id_proveedor, f.numero_factura, f.total_costo, f.fecha_emision, f.descripcion, f.cantidad_zapatos, f.valor_unitario, p.nombre
      ORDER BY f.fecha_emision DESC;
    `;
    const { rows } = await pool.query(query);
    return rows.map(row => ({
      ...row,
      saldo_restante: row.total_costo - row.suma_abonos
    }));
  }
}

