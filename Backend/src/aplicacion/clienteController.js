import pool from '../config/db.js';

export class ClienteController {
  // Buscar cliente por número de documento: GET /api/clientes/buscar?documento=...
  async buscarCliente(req, res) {
    try {
      const { documento } = req.query;
      if (!documento) {
        return res.status(400).json({ error: 'El parámetro documento es requerido.' });
      }

      const query = 'SELECT * FROM cliente_dian WHERE numero_documento = $1';
      const { rows } = await pool.query(query, [documento.trim()]);

      if (rows.length === 0) {
        return res.status(404).json({ error: 'Cliente no encontrado' });
      }

      res.json(rows[0]);
    } catch (error) {
      console.error('Error en buscarCliente:', error);
      res.status(500).json({ error: 'Error al buscar el cliente en la base de datos.' });
    }
  }

  // Registrar o actualizar un cliente (Upsert): POST /api/clientes
  async crearOActualizarCliente(req, res) {
    try {
      const { 
        tipo_persona, 
        tipo_documento, 
        numero_documento, 
        nombre_completo, 
        correo, 
        telefono, 
        direccion 
      } = req.body;

      if (!tipo_persona || !tipo_documento || !numero_documento || !nombre_completo || !correo) {
        return res.status(400).json({ error: 'Todos los campos obligatorios del cliente deben estar presentes.' });
      }

      const query = `
        INSERT INTO cliente_dian (tipo_persona, tipo_documento, numero_documento, nombre_completo, correo, telefono, direccion)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (numero_documento)
        DO UPDATE SET
          tipo_persona = EXCLUDED.tipo_persona,
          tipo_documento = EXCLUDED.tipo_documento,
          nombre_completo = EXCLUDED.nombre_completo,
          correo = EXCLUDED.correo,
          telefono = EXCLUDED.telefono,
          direccion = EXCLUDED.direccion
        RETURNING *;
      `;

      const { rows } = await pool.query(query, [
        tipo_persona.toUpperCase().trim(),
        tipo_documento.toUpperCase().trim(),
        numero_documento.trim(),
        nombre_completo.toUpperCase().trim(),
        correo.trim(),
        telefono ? telefono.trim() : null,
        direccion ? direccion.trim() : null
      ]);

      res.status(200).json(rows[0]);
    } catch (error) {
      console.error('Error en crearOActualizarCliente:', error);
      res.status(500).json({ error: 'Error al registrar o actualizar el cliente en la base de datos.' });
    }
  }
}
