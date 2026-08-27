import pool from '../config/db.js';
import { ProveedorEntity } from '../dominio/proveedorEntity.js';

export class ProveedorRepository {
  // Obtener todos los proveedores
  async obtenerTodos() {
    const query = `
      SELECT id_proveedor, nombre, telefono, es_externo 
      FROM proveedor 
      ORDER BY nombre ASC;
    `;
    const { rows } = await pool.query(query);
    return rows.map(row => new ProveedorEntity({
      id_proveedor: row.id_proveedor,
      nombre: row.nombre,
      telefono: row.telefono,
      es_externo: row.es_externo
    }));
  }

  // Buscar proveedores por coincidencia (autocompletado)
  async buscarPorNombre(termino) {
    const query = `
      SELECT id_proveedor, nombre, telefono, es_externo 
      FROM proveedor 
      WHERE nombre ILIKE $1 
      ORDER BY nombre ASC 
      LIMIT 10;
    `;
    const { rows } = await pool.query(query, [`%${termino}%`]);
    return rows.map(row => new ProveedorEntity({
      id_proveedor: row.id_proveedor,
      nombre: row.nombre,
      telefono: row.telefono,
      es_externo: row.es_externo
    }));
  }

  // Buscar coincidencia exacta de nombre
  async obtenerPorNombre(nombre) {
    const query = `
      SELECT id_proveedor, nombre, telefono, es_externo 
      FROM proveedor 
      WHERE UPPER(nombre) = UPPER($1);
    `;
    const { rows } = await pool.query(query, [nombre]);
    if (rows.length === 0) return null;
    return new ProveedorEntity({
      id_proveedor: rows[0].id_proveedor,
      nombre: rows[0].nombre,
      telefono: rows[0].telefono,
      es_externo: rows[0].es_externo
    });
  }

  // Crear un nuevo proveedor
  async crear({ nombre, telefono, contacto, es_externo }) {
    const tel = telefono || contacto || null;
    const ext = !!es_externo;
    const query = `
      INSERT INTO proveedor (nombre, telefono, es_externo) 
      VALUES ($1, $2, $3) 
      RETURNING id_proveedor, nombre, telefono, es_externo;
    `;
    const { rows } = await pool.query(query, [nombre.toUpperCase().trim(), tel, ext]);
    return new ProveedorEntity({
      id_proveedor: rows[0].id_proveedor,
      nombre: rows[0].nombre,
      telefono: rows[0].telefono,
      es_externo: rows[0].es_externo
    });
  }

  // Actualizar un proveedor
  async actualizar(id, { nombre, telefono }) {
    const query = `
      UPDATE proveedor
      SET nombre = $2, telefono = $3
      WHERE id_proveedor = $1
      RETURNING id_proveedor, nombre, telefono, es_externo;
    `;
    const { rows } = await pool.query(query, [id, nombre.toUpperCase().trim(), telefono || null]);
    if (rows.length === 0) return null;
    return new ProveedorEntity({
      id_proveedor: rows[0].id_proveedor,
      nombre: rows[0].nombre,
      telefono: rows[0].telefono,
      es_externo: rows[0].es_externo
    });
  }

  // Eliminar un proveedor
  async eliminar(id) {
    const query = `
      DELETE FROM proveedor
      WHERE id_proveedor = $1
      RETURNING id_proveedor;
    `;
    const { rows } = await pool.query(query, [id]);
    return rows.length > 0;
  }
}

