import pool from '../config/db.js';

export class GastoController {
  async registrarGasto(req, res) {
    try {
      const { concepto, monto } = req.body;

      if (!concepto || concepto.trim() === '') {
        return res.status(400).json({ error: 'El concepto del gasto es requerido.' });
      }

      const parsedMonto = Number(monto);
      if (isNaN(parsedMonto) || parsedMonto < 0) {
        return res.status(400).json({ error: 'El monto del gasto debe ser un número no negativo.' });
      }

      const query = `
        INSERT INTO gasto_diario (concepto, monto)
        VALUES ($1, $2)
        RETURNING id_gasto, concepto, monto::float AS monto, fecha
      `;
      const result = await pool.query(query, [concepto.trim(), parsedMonto]);

      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('Error al registrar gasto:', error);
      res.status(500).json({ error: 'Error interno del servidor al registrar el gasto.' });
    }
  }

  async obtenerGastosHoy(req, res) {
    try {
      // Obtener fecha objetivo (YYYY-MM-DD), por defecto hoy en hora de Colombia (America/Bogota, UTC-5)
      const targetDate = req.query.fecha || new Date(new Date().getTime() - 5 * 3600 * 1000).toISOString().split('T')[0];

      const query = `
        SELECT 
          id_gasto, 
          concepto, 
          monto::float AS monto, 
          fecha
        FROM gasto_diario
        WHERE DATE(fecha AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota') = $1
        ORDER BY fecha DESC, id_gasto DESC
      `;
      const result = await pool.query(query, [targetDate]);

      res.json(result.rows);
    } catch (error) {
      console.error('Error al obtener gastos:', error);
      res.status(500).json({ error: 'Error interno del servidor al consultar los gastos.' });
    }
  }

  async actualizarGasto(req, res) {
    try {
      const { id } = req.params;
      const { concepto, monto } = req.body;

      if (!concepto || concepto.trim() === '') {
        return res.status(400).json({ error: 'El concepto del gasto es requerido.' });
      }

      const parsedMonto = Number(monto);
      if (isNaN(parsedMonto) || parsedMonto < 0) {
        return res.status(400).json({ error: 'El monto del gasto debe ser un número no negativo.' });
      }

      const query = `
        UPDATE gasto_diario 
        SET concepto = $1, monto = $2 
        WHERE id_gasto = $3 
        RETURNING id_gasto, concepto, monto::float AS monto, fecha
      `;
      const result = await pool.query(query, [concepto.trim(), parsedMonto, id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'El gasto especificado no existe.' });
      }

      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error al actualizar gasto:', error);
      res.status(500).json({ error: 'Error interno del servidor al actualizar el gasto.' });
    }
  }

  async eliminarGasto(req, res) {
    try {
      const { id } = req.params;

      const query = `
        DELETE FROM gasto_diario 
        WHERE id_gasto = $1
        RETURNING id_gasto
      `;
      const result = await pool.query(query, [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'El gasto especificado no existe.' });
      }

      res.json({ message: 'Gasto eliminado correctamente.', id_gasto: id });
    } catch (error) {
      console.error('Error al eliminar gasto:', error);
      res.status(500).json({ error: 'Error interno del servidor al eliminar el gasto.' });
    }
  }
}
