import pool from '../config/db.js';

export class DashboardController {
  async obtenerResumen(req, res) {
    try {
      // Definimos las promesas de las 6 consultas SQL concurrentes
      const kpisHoyPromise = pool.query(`
        SELECT 
          (
            SELECT COALESCE(SUM(v.total_venta), 0)
            FROM venta_cabecera v
            WHERE DATE(v.fecha_venta AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota') = DATE(CURRENT_TIMESTAMP AT TIME ZONE 'America/Bogota')
          ) - (
            SELECT COALESCE(SUM(g.monto), 0)
            FROM gasto_diario g
            WHERE DATE(g.fecha AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota') = DATE(CURRENT_TIMESTAMP AT TIME ZONE 'America/Bogota')
              AND g.concepto LIKE 'DEVOLUCIÓN EFECTIVO%'
          ) AS total_ingresos,
          (
            SELECT COALESCE(SUM(vd.cantidad), 0)
            FROM venta_cabecera v
            JOIN venta_detalle vd ON v.id_venta = vd.id_venta
            WHERE DATE(v.fecha_venta AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota') = DATE(CURRENT_TIMESTAMP AT TIME ZONE 'America/Bogota')
              AND vd.cantidad > 0 
              AND (vd.devuelto = FALSE OR vd.devuelto IS NULL)
          ) AS total_zapatos,
          (
            SELECT COALESCE(SUM(v.total_venta), 0)
            FROM venta_cabecera v
            WHERE DATE(v.fecha_venta AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota') = DATE(CURRENT_TIMESTAMP AT TIME ZONE 'America/Bogota')
              AND v.metodo_pago = 'EFECTIVO'
          ) AS total_efectivo_ventas,
          (
            SELECT COALESCE(SUM(g.monto), 0)
            FROM gasto_diario g
            WHERE DATE(g.fecha AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota') = DATE(CURRENT_TIMESTAMP AT TIME ZONE 'America/Bogota')
          ) AS total_gastos
      `);

      const deudaProveedoresPromise = pool.query(`
        SELECT COALESCE(SUM(GREATEST(0, f.total_costo - COALESCE(abonos.total_abonos, 0))), 0) AS total_deuda
        FROM factura_proveedor f
        LEFT JOIN (
          SELECT id_factura, SUM(monto) AS total_abonos
          FROM abono_proveedor
          GROUP BY id_factura
        ) abonos ON f.id_factura = abonos.id_factura
      `);

      const tramitesDianPromise = pool.query(`
        SELECT COUNT(*)::int AS count_pendientes
        FROM venta_cabecera
        WHERE estado_dian = 'PENDIENTE'
      `);

      const ventasSemanaPromise = pool.query(`
        SELECT 
          d.fecha::date AS fecha,
          (
            SELECT COALESCE(SUM(v.total_venta), 0)
            FROM venta_cabecera v
            WHERE DATE(v.fecha_venta AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota') = d.fecha
          ) - (
            SELECT COALESCE(SUM(g.monto), 0)
            FROM gasto_diario g
            WHERE DATE(g.fecha AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota') = d.fecha
              AND g.concepto LIKE 'DEVOLUCIÓN EFECTIVO%'
          ) AS total
        FROM (
          SELECT (DATE(CURRENT_TIMESTAMP AT TIME ZONE 'America/Bogota') - i)::date AS fecha
          FROM generate_series(0, 6) i
        ) d
        ORDER BY d.fecha ASC
      `);

      const topModelosPromise = pool.query(`
        SELECT 
          m.nombre AS nombre,
          COALESCE(SUM(vd.cantidad), 0)::int AS cantidad_vendida
        FROM venta_detalle vd
        JOIN variante_zapato vz ON vd.id_variante = vz.id_variante
        JOIN modelo m ON vz.id_modelo = m.id_modelo
        GROUP BY m.id_modelo, m.nombre
        ORDER BY cantidad_vendida DESC
        LIMIT 3
      `);

      const stockCriticoPromise = pool.query(`
        SELECT 
          m.id_modelo,
          m.nombre AS modelo_nombre,
          vz.color,
          COUNT(CASE WHEN ist.cantidad > 0 THEN 1 END)::int AS tallas_en_stock,
          COALESCE(ac.tallas_minimas, 5)::int AS tallas_minimas,
          COALESCE(ac.excluido, FALSE) AS excluido
        FROM modelo m
        JOIN variante_zapato vz ON m.id_modelo = vz.id_modelo
        LEFT JOIN inventario_stock ist ON vz.id_variante = ist.id_variante AND ist.id_ubicacion = 2
        LEFT JOIN alerta_configuracion ac ON m.id_modelo = ac.id_modelo AND vz.color = ac.color
        GROUP BY m.id_modelo, m.nombre, vz.color, ac.tallas_minimas, ac.excluido
        HAVING COUNT(CASE WHEN ist.cantidad > 0 THEN 1 END) < COALESCE(ac.tallas_minimas, 5)
           AND COALESCE(ac.excluido, FALSE) = FALSE
        ORDER BY tallas_en_stock ASC, m.nombre ASC
      `);

      const configsPromise = pool.query(`
        SELECT 
          ac.id_modelo,
          m.nombre AS modelo_nombre,
          ac.color,
          ac.tallas_minimas,
          ac.excluido
        FROM alerta_configuracion ac
        JOIN modelo m ON ac.id_modelo = m.id_modelo
        ORDER BY m.nombre ASC, ac.color ASC
      `);

      // Ejecución paralela de las 7 consultas
      const [
        kpisHoyRes,
        deudaProveedoresRes,
        tramitesDianRes,
        ventasSemanaRes,
        topModelosRes,
        stockCriticoRes,
        configsRes
      ] = await Promise.all([
        kpisHoyPromise,
        deudaProveedoresPromise,
        tramitesDianPromise,
        ventasSemanaPromise,
        topModelosPromise,
        stockCriticoPromise,
        configsPromise
      ]);

      // Formatear resultados
      const kpis_hoy = {
        ingresos: Number(kpisHoyRes.rows[0].total_ingresos),
        pares_vendidos: Number(kpisHoyRes.rows[0].total_zapatos)
      };

      const total_efectivo = Number(kpisHoyRes.rows[0].total_efectivo_ventas) - Number(kpisHoyRes.rows[0].total_gastos);

      const deuda_proveedores = Number(deudaProveedoresRes.rows[0].total_deuda);
      const tramites_dian = Number(tramitesDianRes.rows[0].count_pendientes);

      // Mapear ventas semanales y formatear fechas para gráfica
      const ventas_semana = ventasSemanaRes.rows.map(row => {
        const dateObj = new Date(row.fecha);
        const day = String(dateObj.getDate()).padStart(2, '0');
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const year = dateObj.getFullYear();
        return {
          fecha: `${day}/${month}`,
          fecha_completa: `${year}-${month}-${day}`,
          total: Number(row.total)
        };
      });

      const top_modelos = topModelosRes.rows.map(row => ({
        nombre: row.nombre,
        cantidad_vendida: Number(row.cantidad_vendida)
      }));

      const stock_critico = stockCriticoRes.rows.map((row, idx) => ({
        id_stock: idx + 1,
        id_modelo: row.id_modelo,
        modelo_nombre: row.modelo_nombre,
        color: row.color,
        tallas_en_stock: Number(row.tallas_en_stock),
        tallas_minimas: Number(row.tallas_minimas)
      }));

      const alertas_configuradas = configsRes.rows.map(row => ({
        id_modelo: row.id_modelo,
        modelo_nombre: row.modelo_nombre,
        color: row.color,
        tallas_minimas: Number(row.tallas_minimas),
        excluido: Boolean(row.excluido)
      }));

      // Responder con el JSON consolidado
      res.json({
        kpis_hoy,
        total_efectivo,
        deuda_proveedores,
        tramites_dian,
        ventas_semana,
        top_modelos,
        stock_critico,
        alertas_configuradas
      });
    } catch (error) {
      console.error('Error al obtener resumen de dashboard:', error);
      res.status(500).json({ error: 'Error al calcular los datos del dashboard.' });
    }
  }

  async guardarConfiguracionAlerta(req, res) {
    try {
      const { id_modelo, color, tallas_minimas, excluido, restablecer } = req.body;

      if (!id_modelo || !color) {
        return res.status(400).json({ error: 'Modelo y color son requeridos.' });
      }

      if (restablecer) {
        await pool.query(`
          DELETE FROM alerta_configuracion
          WHERE id_modelo = $1 AND color = $2
        `, [id_modelo, color]);
        return res.json({ success: true, message: 'Configuración restablecida a valores por defecto.' });
      }

      await pool.query(`
        INSERT INTO alerta_configuracion (id_modelo, color, tallas_minimas, excluido)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (id_modelo, color)
        DO UPDATE SET 
          tallas_minimas = COALESCE(EXCLUDED.tallas_minimas, alerta_configuracion.tallas_minimas), 
          excluido = COALESCE(EXCLUDED.excluido, alerta_configuracion.excluido)
      `, [id_modelo, color, tallas_minimas !== undefined ? Number(tallas_minimas) : 5, excluido !== undefined ? Boolean(excluido) : false]);

      return res.json({ success: true, message: 'Configuración de alerta actualizada correctamente.' });
    } catch (error) {
      console.error('Error al guardar configuración de alerta:', error);
      return res.status(500).json({ error: 'Error al actualizar la configuración de la alerta.' });
    }
  }
}
