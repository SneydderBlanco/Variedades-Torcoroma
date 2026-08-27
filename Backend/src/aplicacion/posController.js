import { ModeloRepository } from '../persistencia/modeloRepository.js';
import { VarianteRepository } from '../persistencia/varianteRepository.js';
import { ProveedorRepository } from '../persistencia/proveedorRepository.js';
import pool from '../config/db.js';
import { registrarMovimientoKardex } from './kardexService.js';

const modeloRepo = new ModeloRepository();
const varianteRepo = new VarianteRepository();
const proveedorRepo = new ProveedorRepository();

export class POSController {
  // 1. Búsqueda predictiva de modelos o matriz completa: GET /api/pos/modelos?q=... o GET /api/pos/modelos?matrix=true&ubicacionId=...
  async buscarModelos(req, res) {
    try {
      const { q, matrix, ubicacionId } = req.query;

      // Si se pide la matriz o no se pasa q
      if (matrix === 'true' || (!q && !req.query.hasOwnProperty('q'))) {
        const idUbicacion = parseInt(ubicacionId || 2, 10);
        const rows = await modeloRepo.obtenerMatriz(idUbicacion);

        const modelsMap = {};
        for (const row of rows) {
          const { id_modelo, modelo_nombre, proveedor, color, talla, cantidad } = row;
          if (!modelsMap[id_modelo]) {
            modelsMap[id_modelo] = {
              id_modelo,
              nombre: modelo_nombre,
              proveedor: proveedor || 'S/P',
              colores: []
            };
          }

          if (color) {
            let colorObj = modelsMap[id_modelo].colores.find(c => c.nombre_color === color);
            if (!colorObj) {
              colorObj = {
                nombre_color: color,
                tallas: {}
              };
              // Rellenar todas las tallas del rango por defecto con 0
              for (let s = 21; s <= 44; s++) {
                colorObj.tallas[String(s)] = 0;
              }
              modelsMap[id_modelo].colores.push(colorObj);
            }
            if (talla) {
              colorObj.tallas[talla] = cantidad;
            }
          }
        }
        return res.json(Object.values(modelsMap));
      }

      const termino = q || '';
      const modelos = await modeloRepo.buscarPorNombre(termino);
      res.json(modelos);
    } catch (error) {
      console.error('Error en buscarModelos:', error);
      res.status(500).json({ error: 'Error al procesar la solicitud de modelos.' });
    }
  }

  // 2. Obtener colores de un modelo: GET /api/pos/colores?modeloId=...
  async obtenerColores(req, res) {
    try {
      const { modeloId } = req.query;
      
      if (!modeloId) {
        return res.status(400).json({ error: 'El parámetro modeloId es requerido.' });
      }

      const id = parseInt(modeloId, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'El modeloId debe ser un número válido.' });
      }

      // Validar si el modelo existe en la base de datos
      const modelo = await modeloRepo.obtenerPorId(id);
      if (!modelo) {
        return res.status(404).json({ error: 'El modelo especificado no existe.' });
      }

      const colores = await varianteRepo.obtenerColoresPorModelo(id);
      res.json(colores);
    } catch (error) {
      console.error('Error en obtenerColores:', error);
      res.status(500).json({ error: 'Error al obtener los colores del modelo.' });
    }
  }

  // 3. Obtener tallas y stock disponible: GET /api/pos/tallas?modeloId=...&color=...&ubicacionId=...
  async obtenerTallas(req, res) {
    try {
      const { modeloId, color, ubicacionId } = req.query;

      if (!modeloId || !color) {
        return res.status(400).json({ error: 'Los parámetros modeloId y color son requeridos.' });
      }

      const idModel = parseInt(modeloId, 10);
      if (isNaN(idModel)) {
        return res.status(400).json({ error: 'El modeloId debe ser un número válido.' });
      }

      let idUbicacion = null;
      if (ubicacionId) {
        idUbicacion = parseInt(ubicacionId, 10);
        if (isNaN(idUbicacion)) {
          return res.status(400).json({ error: 'El ubicacionId debe ser un número válido.' });
        }
      }

      // Validar si el modelo existe
      const modelo = await modeloRepo.obtenerPorId(idModel);
      if (!modelo) {
        return res.status(404).json({ error: 'El modelo especificado no existe.' });
      }

      const tallasConStock = await varianteRepo.obtenerTallasYStock(idModel, color, idUbicacion);
      res.json(tallasConStock);
    } catch (error) {
      console.error('Error en obtenerTallas:', error);
      res.status(500).json({ error: 'Error al obtener las tallas y el stock.' });
    }
  }

  // 4. Crear un nuevo modelo: POST /api/pos/modelos
  async crearModelo(req, res) {
    try {
      const { nombre, precio_compra, precio_minimo_venta, es_externo, id_proveedor_aliado } = req.body;
      
      if (!nombre || nombre.trim() === '') {
        return res.status(400).json({ error: 'El nombre del modelo es requerido.' });
      }

      // Validar proveedor si se suministra
      if (id_proveedor_aliado && id_proveedor_aliado.trim() !== '') {
        const proveedorExiste = await proveedorRepo.obtenerPorNombre(id_proveedor_aliado);
        if (!proveedorExiste) {
          return res.status(400).json({ error: `El proveedor "${id_proveedor_aliado}" no está registrado. Debe registrarlo primero.` });
        }
      } else if (es_externo) {
        return res.status(400).json({ error: 'Los calzados en consignación (externos) requieren un proveedor aliado registrado.' });
      }

      // Crear el modelo
      const nuevoModelo = await modeloRepo.crearModelo({
        nombre: nombre.toUpperCase(),
        precio_compra: precio_compra || 0,
        precio_minimo_venta: precio_minimo_venta || 0,
        es_externo: !!es_externo,
        id_proveedor_aliado: id_proveedor_aliado ? id_proveedor_aliado.toUpperCase().trim() : null
      });

      // Crear variante inicial "TODO BLANCO" para las tallas 21 a 44
      const colorInicial = 'TODO BLANCO';
      for (let size = 21; size <= 44; size++) {
        const tallaStr = String(size);
        const variante = await varianteRepo.crearVariante(nuevoModelo.id_modelo, colorInicial, tallaStr);
        // Inicializar stock en 0 para ambas ubicaciones (1 = PERMITIDOS, 2 = INVENTARIO LOCAL)
        await varianteRepo.guardarStock(variante.id_variante, 1, 0);
        await varianteRepo.guardarStock(variante.id_variante, 2, 0);
      }

      res.status(201).json(nuevoModelo);
    } catch (error) {
      console.error('Error al crear modelo:', error);
      res.status(500).json({ error: 'Error al registrar el modelo en la base de datos.' });
    }
  }

  // 5. Añadir un color a un modelo: POST /api/pos/colores
  async crearColor(req, res) {
    try {
      const { modeloId, color } = req.body;
      if (!modeloId || !color) {
        return res.status(400).json({ error: 'El modeloId y el color son requeridos.' });
      }

      const id = parseInt(modeloId, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'El modeloId debe ser un número válido.' });
      }

      const modelo = await modeloRepo.obtenerPorId(id);
      if (!modelo) {
        return res.status(404).json({ error: 'El modelo especificado no existe.' });
      }

      // Crear variante para todas las tallas del 21 al 44 con stock inicial en 0
      for (let size = 21; size <= 44; size++) {
        const tallaStr = String(size);
        const variante = await varianteRepo.crearVariante(id, color, tallaStr);
        await varianteRepo.guardarStock(variante.id_variante, 1, 0);
        await varianteRepo.guardarStock(variante.id_variante, 2, 0);
      }

      res.status(201).json({ message: 'Color añadido correctamente con stock inicializado en cero.' });
    } catch (error) {
      console.error('Error al añadir color:', error);
      res.status(500).json({ error: 'Error al registrar el color en la base de datos.' });
    }
  }

  // 6. Guardar stock masivo: PUT /api/pos/stock
  async guardarStock(req, res) {
    try {
      const { modeloId, color, tallas, ubicacionId } = req.body;
      if (!modeloId || !color || !tallas || !ubicacionId) {
        return res.status(400).json({ error: 'modeloId, color, tallas y ubicacionId son requeridos.' });
      }

      const idModel = parseInt(modeloId, 10);
      const idUbicacion = parseInt(ubicacionId, 10);
      if (isNaN(idModel) || isNaN(idUbicacion)) {
        return res.status(400).json({ error: 'IDs numéricos inválidos.' });
      }

      // Guardar stock iterando cada talla y su cantidad
      for (const [talla, cantidad] of Object.entries(tallas)) {
        const variante = await varianteRepo.crearVariante(idModel, color, talla);
        const cantidadInt = parseInt(cantidad, 10);
        let stockFisico = isNaN(cantidadInt) ? 0 : cantidadInt;

        // Si estamos guardando en el local principal (2), debemos restar lo que está en permitidos
        if (idUbicacion === 2) {
          const { rows: permitidosRows } = await pool.query(
            'SELECT SUM(cantidad) AS total_permitidos FROM stock_permitidos WHERE id_variante = $1',
            [variante.id_variante]
          );
          const totalPermitidos = parseInt(permitidosRows[0].total_permitidos || 0, 10);
          stockFisico = stockFisico - totalPermitidos;
          
          if (stockFisico < 0) {
            return res.status(400).json({ error: `El stock total asignado a la talla ${talla} (${cantidadInt}) no puede ser menor a la cantidad ya distribuida en locales permitidos (${totalPermitidos}).` });
          }
        }

        // Obtener stock viejo para kardex
        const { rows: oldStockRows } = await pool.query('SELECT cantidad FROM inventario_stock WHERE id_variante = $1 AND id_ubicacion = $2', [variante.id_variante, idUbicacion]);
        const oldStock = oldStockRows.length > 0 ? oldStockRows[0].cantidad : 0;

        await varianteRepo.guardarStock(variante.id_variante, idUbicacion, stockFisico);

        // Registrar en Kardex si hubo cambio
        const diff = stockFisico - oldStock;
        if (diff !== 0) {
          await registrarMovimientoKardex({
            id_variante: variante.id_variante,
            id_ubicacion: idUbicacion,
            tipo_movimiento: 'AJUSTE',
            cantidad: diff,
            usuario: 'Admin',
            detalle: `Ajuste manual de matriz. Viejo: ${oldStock}, Nuevo: ${stockFisico}`
          });
        }
      }

      res.json({ message: 'Inventario actualizado correctamente en la base de datos.' });
    } catch (error) {
      console.error('Error al actualizar stock:', error);
      res.status(500).json({ error: 'Error al guardar el stock en la base de datos.' });
    }
  }

  // 4.1 Editar un modelo existente: PUT /api/pos/modelos
  async editarModelo(req, res) {
    try {
      const { modeloId, nuevoNombre } = req.body;
      if (!modeloId || !nuevoNombre || nuevoNombre.trim() === '') {
        return res.status(400).json({ error: 'El modeloId y el nuevo nombre son requeridos.' });
      }

      const id = parseInt(modeloId, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'El modeloId debe ser un número válido.' });
      }

      // Verificar si ya existe otro modelo con el mismo nombre
      const { rows: existentes } = await pool.query(
        'SELECT id_modelo FROM modelo WHERE UPPER(nombre) = UPPER($1) AND id_modelo != $2',
        [nuevoNombre.toUpperCase().trim(), id]
      );
      if (existentes.length > 0) {
        return res.status(400).json({ error: 'Ya existe otro modelo con ese nombre.' });
      }

      await pool.query(
        'UPDATE modelo SET nombre = $1 WHERE id_modelo = $2',
        [nuevoNombre.toUpperCase().trim(), id]
      );

      res.json({ message: 'Modelo actualizado con éxito.' });
    } catch (error) {
      console.error('Error al editar modelo:', error);
      res.status(500).json({ error: 'Error al actualizar el modelo en la base de datos.' });
    }
  }

  // 4.2 Eliminar un modelo: DELETE /api/pos/modelos
  async eliminarModelo(req, res) {
    try {
      const { modeloId } = req.body;
      if (!modeloId) {
        return res.status(400).json({ error: 'El modeloId es requerido.' });
      }

      const id = parseInt(modeloId, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'El modeloId debe ser un número válido.' });
      }

      await pool.query('DELETE FROM modelo WHERE id_modelo = $1', [id]);

      res.json({ message: 'Modelo eliminado con éxito.' });
    } catch (error) {
      console.error('Error al eliminar modelo:', error);
      res.status(500).json({ error: 'Error al eliminar el modelo de la base de datos.' });
    }
  }

  // 5.1 Renombrar un color de un modelo: PUT /api/pos/colores
  async renombrarColor(req, res) {
    try {
      const { modeloId, oldColor, newColor } = req.body;
      if (!modeloId || !oldColor || !newColor) {
        return res.status(400).json({ error: 'modeloId, oldColor y newColor son requeridos.' });
      }

      const id = parseInt(modeloId, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'El modeloId debe ser un número válido.' });
      }

      // Verificar si el nuevo color ya existe en el modelo
      const existeNuevo = await varianteRepo.obtenerColoresPorModelo(id);
      if (existeNuevo.map(c => c.toUpperCase()).includes(newColor.toUpperCase().trim())) {
        return res.status(400).json({ error: 'El color de destino ya existe en este modelo.' });
      }

      await pool.query(
        `UPDATE variante_zapato
         SET color = $3
         WHERE id_modelo = $1 AND UPPER(color) = UPPER($2);`,
        [id, oldColor.trim(), newColor.toUpperCase().trim()]
      );

      res.json({ message: 'Color renombrado exitosamente.' });
    } catch (error) {
      console.error('Error al renombrar color:', error);
      res.status(500).json({ error: 'Error al renombrar el color en la base de datos.' });
    }
  }

  // 5.2 Eliminar un color de un modelo: DELETE /api/pos/colores
  async eliminarColor(req, res) {
    try {
      const { modeloId, color } = req.body;
      if (!modeloId || !color) {
        return res.status(400).json({ error: 'El modeloId y el color son requeridos.' });
      }

      const id = parseInt(modeloId, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'El modeloId debe ser un número válido.' });
      }

      await pool.query(
        `DELETE FROM variante_zapato
         WHERE id_modelo = $1 AND UPPER(color) = UPPER($2);`,
        [id, color.trim()]
      );

      res.json({ message: 'Color eliminado exitosamente.' });
    } catch (error) {
      console.error('Error al eliminar color:', error);
      res.status(500).json({ error: 'Error al eliminar el color de la base de datos.' });
    }
  }

  // 7. Registrar venta y generar cuentas por pagar si es calzado ajeno: POST /api/pos/ventas
  async registrarVenta(req, res) {
    const client = await pool.connect();
    try {
      const { items, paymentMethod, ubicacionId, isAdmin, vendedor, requiere_dian, clienteDian } = req.body;
      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'La lista de ítems de la venta es requerida.' });
      }

      const idUbicacion = parseInt(ubicacionId || 2, 10); // 2 = Local Principal por defecto
      const currentPaymentMethod = (paymentMethod || 'EFECTIVO').toUpperCase().trim();
      const currentVendedor = vendedor || (isAdmin ? 'Chris (Dueño)' : 'Empleado');

      if (!['EFECTIVO', 'TRANSFERENCIA', 'TARJETA'].includes(currentPaymentMethod)) {
        return res.status(400).json({ error: 'Método de pago inválido. Debe ser EFECTIVO, TRANSFERENCIA o TARJETA.' });
      }

      // Generar número de ticket único para agrupar esta venta
      const ticket_numero = 'TKT-' + Date.now().toString().slice(-6) + '-' + Math.floor(1000 + Math.random() * 9000);

      await client.query('BEGIN');

      let idCliente = null;
      let requiereDian = !!requiere_dian;
      let estadoDian = 'NO_REQUERIDO';

      if (requiereDian && clienteDian) {
        estadoDian = 'PENDIENTE';
        const upsertQuery = `
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
          RETURNING id_cliente;
        `;
        const upsertRes = await client.query(upsertQuery, [
          clienteDian.tipo_persona.toUpperCase().trim(),
          clienteDian.tipo_documento.toUpperCase().trim(),
          clienteDian.numero_documento.trim(),
          clienteDian.nombre_completo.toUpperCase().trim(),
          clienteDian.correo.trim(),
          clienteDian.telefono ? clienteDian.telefono.trim() : null,
          clienteDian.direccion ? clienteDian.direccion.trim() : null
        ]);
        idCliente = upsertRes.rows[0].id_cliente;
      }

      // 1. Validar ítems y calcular total
      let totalVenta = 0;
      const validatedItems = [];

      for (const item of items) {
        const { id_variante, cantidad, distribucionManual, ticket_original } = item;
        const qty = parseInt(cantidad, 10);
        if (isNaN(qty) || qty === 0) {
          throw new Error('La cantidad vendida no puede ser cero.');
        }

        // Obtener la variante para asegurar que exista y sacar datos
        const { rows: varRows } = await client.query(
          `SELECT id_modelo, color, talla FROM variante_zapato WHERE id_variante = $1`,
          [id_variante]
        );
        if (varRows.length === 0) {
          throw new Error(`La variante con ID ${id_variante} no existe.`);
        }
        const { id_modelo, color, talla } = varRows[0];

        // Consultar detalles de modelo para trigger automático de aliados y validación
        const { rows: modelRows } = await client.query(
          `SELECT nombre, es_externo, precio_compra, precio_minimo_venta, id_proveedor_aliado 
           FROM modelo WHERE id_modelo = $1`,
          [id_modelo]
        );

        if (modelRows.length === 0) {
          throw new Error(`El modelo con ID ${id_modelo} no existe.`);
        }

        const model = modelRows[0];
        const itemPrice = Number(item.precio_venta_final !== undefined ? item.precio_venta_final : (item.precio !== undefined ? item.precio : model.precio_minimo_venta));

        // Calcular descuento
        const precioMinimo = Number(model.precio_minimo_venta);
        const descuentoUnitario = Math.max(0, precioMinimo - itemPrice);
        const descuentoTotal = descuentoUnitario * qty;

        // Validar precio en Backend también (protección extra)
        if (itemPrice < precioMinimo && !isAdmin) {
          throw new Error(`Precio no autorizado. El precio de venta final ($${itemPrice}) para el modelo ${model.nombre} es menor al mínimo permitido ($${precioMinimo}).`);
        }

        totalVenta += itemPrice * qty;

        validatedItems.push({
          id_variante,
          id_modelo,
          qty,
          itemPrice,
          descuentoTotal,
          model,
          color,
          talla,
          distribucionManual,
          ticket_original
        });
      }

      // 2. Registrar en venta_cabecera
      const headerRes = await client.query(
        `INSERT INTO venta_cabecera (ticket_numero, metodo_pago, total_venta, vendedor, id_ubicacion, id_cliente, requiere_dian, estado_dian)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id_venta`,
        [ticket_numero, currentPaymentMethod, totalVenta, currentVendedor, idUbicacion, idCliente, requiereDian, estadoDian]
      );
      const id_venta = headerRes.rows[0].id_venta;

      // 3. Registrar detalles y actualizar stock
      for (const valItem of validatedItems) {
        const { id_variante, qty, itemPrice, descuentoTotal, model, color, talla, distribucionManual } = valItem;

        // Obtener y validar el stock disponible en la ubicación
        const { rows: stockRows } = await client.query(
          `SELECT cantidad FROM inventario_stock 
           WHERE id_variante = $1 AND id_ubicacion = $2`,
          [id_variante, idUbicacion]
        );

        const currentStock = stockRows.length > 0 ? stockRows[0].cantidad : 0;
        
        if (id_variante === 999999) {
          // Es un PASE RÁPIDO, no rebajamos inventario ni validamos stock.
        } else if (qty > 0) {
          if (distribucionManual && Array.isArray(distribucionManual)) {
            // DISTRIBUCIÓN MANUAL
            let totalDistribuido = 0;
            for (const d of distribucionManual) {
              if (d.cantidad <= 0) continue;
              if (d.id_local === 'local') {
                await client.query(
                  `UPDATE inventario_stock SET cantidad = cantidad - $3 WHERE id_variante = $1 AND id_ubicacion = $2`,
                  [id_variante, idUbicacion, d.cantidad]
                );
              } else {
                await client.query(
                  `UPDATE stock_permitidos SET cantidad = cantidad - $1 WHERE id_local = $2 AND id_variante = $3`,
                  [d.cantidad, d.id_local, id_variante]
                );
                await registrarMovimientoKardex({
                  client,
                  id_variante,
                  id_ubicacion: idUbicacion,
                  tipo_movimiento: 'AJUSTE',
                  cantidad: d.cantidad,
                  usuario: currentVendedor,
                  detalle: `Retorno manual de ${d.nombre_local} para Ticket ${ticket_numero}`
                });
              }
              totalDistribuido += d.cantidad;
            }
            if (totalDistribuido !== qty) {
              throw new Error(`La distribución manual para la variante ID ${id_variante} no coincide con la cantidad total (${totalDistribuido} vs ${qty}).`);
            }
          } else {
            // DISTRIBUCIÓN AUTOMÁTICA
            if (qty <= currentStock) {
              // Normal sale, local stock covers it
              await client.query(
                `UPDATE inventario_stock SET cantidad = cantidad - $3 WHERE id_variante = $1 AND id_ubicacion = $2`,
                [id_variante, idUbicacion, qty]
              );
            } else {
              // External stock needed
              const neededFromPermitidos = qty - currentStock;
              
              if (currentStock > 0) {
                await client.query(
                  `UPDATE inventario_stock SET cantidad = 0 WHERE id_variante = $1 AND id_ubicacion = $2`,
                  [id_variante, idUbicacion]
                );
              }

              const { rows: permitidos } = await client.query(
                `SELECT sp.id_local, sp.cantidad, lp.nombre_local FROM stock_permitidos sp
                 JOIN locales_permitidos lp ON sp.id_local = lp.id_local
                 WHERE sp.id_variante = $1 AND sp.cantidad > 0 
                 ORDER BY sp.id_local ASC`,
                [id_variante]
              );

              let remainingToTake = neededFromPermitidos;
              for (const perm of permitidos) {
                if (remainingToTake <= 0) break;
                const take = Math.min(remainingToTake, perm.cantidad);
                
                await client.query(
                  `UPDATE stock_permitidos SET cantidad = cantidad - $1 WHERE id_local = $2 AND id_variante = $3`,
                  [take, perm.id_local, id_variante]
                );
                
                // Kardex de entrada por retorno de permitido (automático)
                await registrarMovimientoKardex({
                  client,
                  id_variante,
                  id_ubicacion: idUbicacion,
                  tipo_movimiento: 'AJUSTE',
                  cantidad: take,
                  usuario: currentVendedor,
                  detalle: `Retorno auto de ${perm.nombre_local} para Ticket ${ticket_numero}`
                });

                remainingToTake -= take;
              }

              if (remainingToTake > 0) {
                throw new Error(`Stock total insuficiente para la variante ID ${id_variante}. Faltan ${remainingToTake} pares.`);
              }
            }
          }
        } else if (qty < 0) {
          // Return / Exchange (Negative qty)
          await client.query(
            `UPDATE inventario_stock SET cantidad = cantidad - $3 WHERE id_variante = $1 AND id_ubicacion = $2`,
            [id_variante, idUbicacion, qty]
          );
        }

        // Registrar en venta_detalle
        await client.query(
          `INSERT INTO venta_detalle (id_venta, id_variante, cantidad, precio_venta_unitario, descuento_aplicado)
           VALUES ($1, $2, $3, $4, $5)`,
          [id_venta, id_variante, qty, itemPrice, descuentoTotal]
        );

        if (qty < 0 && valItem.ticket_original) {
          // Es un cambio local de una venta anterior, marcamos el zapato devuelto en la factura original
          await client.query(
            `UPDATE venta_detalle SET devuelto = TRUE WHERE id_variante = $1 AND id_venta = (SELECT id_venta FROM venta_cabecera WHERE ticket_numero = $2 LIMIT 1)`,
            [id_variante, valItem.ticket_original]
          );
        }

        // Registrar en historico_ventas por compatibilidad
        await client.query(
          `INSERT INTO historico_ventas (ticket_numero, id_variante, cantidad, precio_venta_final, metodo_pago, descuento_aplicado)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [ticket_numero, id_variante, qty, itemPrice, currentPaymentMethod, descuentoTotal]
        );

        // Registrar en kardex
        await registrarMovimientoKardex({
          client,
          id_variante,
          id_ubicacion: idUbicacion,
          tipo_movimiento: qty > 0 ? 'VENTA' : 'CAMBIO_DEVOLUCION',
          cantidad: -qty, // Negativo para venta, Positivo para devolución
          usuario: currentVendedor,
          detalle: `Ticket: ${ticket_numero}`
        });

        // Trigger lógico: Si es un modelo externo, creamos una factura por pagar (cuenta por pagar)
        if (model.es_externo && model.id_proveedor_aliado) {
          // Buscar el id_proveedor por nombre
          const { rows: provRows } = await client.query(
            `SELECT id_proveedor FROM proveedor WHERE UPPER(nombre) = UPPER($1)`,
            [model.id_proveedor_aliado.trim()]
          );

          if (provRows.length > 0) {
            const idProveedor = provRows[0].id_proveedor;
            const totalCostoFactura = Number(model.precio_compra) * qty;
            const numFactura = `VTA-${model.nombre.substring(0, 10).toUpperCase().replace(/\s+/g, '')}-${Date.now().toString().slice(-6)}`;
            const descripcionFactura = `Venta automática POS de ${qty} par(es) - Modelo: ${model.nombre} (${color} / Talla ${talla})`;

            await client.query(
              `INSERT INTO factura_proveedor (id_proveedor, numero_factura, total_costo, descripcion, cantidad_zapatos, valor_unitario)
               VALUES ($1, $2, $3, $4, $5, $6)`,
              [idProveedor, numFactura, totalCostoFactura, descripcionFactura, qty, Number(model.precio_compra)]
            );
          }
        }
      }

      await client.query('COMMIT');
      res.json({ message: 'Venta registrada con éxito.', ticket_numero });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error en registrarVenta:', error);
      res.status(500).json({ error: error.message || 'Error inesperado al registrar la venta.' });
    } finally {
      client.release();
    }
  }

  // 8.1 Buscar ventas pasadas para devolución
  async buscarVentas(req, res) {
    try {
      const { q } = req.query;
      if (!q || q.trim() === '') {
        return res.json([]);
      }
      
      const searchStr = `%${q.trim().toUpperCase()}%`;
      
      // Buscar por ticket, modelo, o nombre de cliente
      const query = `
        SELECT 
          vc.id_venta,
          vc.ticket_numero,
          vc.fecha_venta,
          vc.metodo_pago,
          vc.total_venta,
          vc.vendedor,
          c.nombre_completo AS cliente_nombre,
          vd.id_detalle,
          vd.id_variante,
          vd.cantidad,
          vd.precio_venta_unitario,
          vd.descuento_aplicado,
          vz.color,
          vz.talla,
          m.nombre as modelo_nombre
        FROM venta_cabecera vc
        JOIN venta_detalle vd ON vc.id_venta = vd.id_venta
        JOIN variante_zapato vz ON vd.id_variante = vz.id_variante
        JOIN modelo m ON vz.id_modelo = m.id_modelo
        LEFT JOIN cliente_dian c ON vc.id_cliente = c.id_cliente
        WHERE 
          vd.cantidad > 0 AND (vd.devuelto = FALSE OR vd.devuelto IS NULL) AND (
            UPPER(vc.ticket_numero) LIKE $1 OR
            UPPER(m.nombre) LIKE $1 OR
            UPPER(c.nombre_completo) LIKE $1 OR
            UPPER(vz.color) LIKE $1 OR
            vz.talla LIKE $1
          )
        ORDER BY vc.fecha_venta DESC
        LIMIT 50
      `;
      const { rows } = await pool.query(query, [searchStr]);
      
      // Agrupar por id_venta para retornar estructura de ticket
      const ventasMap = {};
      for (const row of rows) {
        if (!ventasMap[row.id_venta]) {
          ventasMap[row.id_venta] = {
            id_venta: row.id_venta,
            ticket_numero: row.ticket_numero,
            fecha_venta: row.fecha_venta,
            metodo_pago: row.metodo_pago,
            total_venta: row.total_venta,
            vendedor: row.vendedor,
            cliente_nombre: row.cliente_nombre,
            detalles: []
          };
        }
        ventasMap[row.id_venta].detalles.push({
          id_detalle: row.id_detalle,
          id_variante: row.id_variante,
          cantidad: row.cantidad,
          precio_venta_unitario: row.precio_venta_unitario,
          descuento_aplicado: row.descuento_aplicado,
          modelo_nombre: row.modelo_nombre,
          color: row.color,
          talla: row.talla
        });
      }
      
      res.json(Object.values(ventasMap));
    } catch (error) {
      console.error('Error en buscarVentas:', error);
      res.status(500).json({ error: 'Error al buscar ventas' });
    }
  }

  // 8.2 Devolución de Dinero
  async devolucionDinero(req, res) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { ticket_numero, id_variante, cantidad, monto, vendedor, modelo_nombre, color, talla } = req.body;

      // 1. Aumentar el stock en el mostrador (id_ubicacion = 2)
      await client.query(
        `UPDATE inventario_stock SET cantidad = cantidad + $1 WHERE id_variante = $2 AND id_ubicacion = 2`, 
        [cantidad, id_variante]
      );

      // 1.5 Marcar el zapato como devuelto en la factura original
      await client.query(
        `UPDATE venta_detalle SET devuelto = TRUE WHERE id_variante = $1 AND id_venta = (SELECT id_venta FROM venta_cabecera WHERE ticket_numero = $2 LIMIT 1)`,
        [id_variante, ticket_numero]
      );

      // 2. Registrar en Kardex
      const { registrarMovimientoKardex } = await import('./kardexService.js');
      await registrarMovimientoKardex({
        client,
        id_variante,
        id_ubicacion: 2,
        tipo_movimiento: 'CAMBIO_DEVOLUCION',
        cantidad: cantidad, // positivo porque entra
        usuario: vendedor || 'SISTEMA',
        detalle: `Devolución de dinero - Ticket: ${ticket_numero}`
      });

      // 3. Registrar como Gasto Diario para cuadrar caja
      const concepto = `DEVOLUCIÓN EFECTIVO - Ticket: ${ticket_numero} - ${modelo_nombre} (${color} T${talla})`;
      await client.query(
        `INSERT INTO gasto_diario (concepto, monto) VALUES ($1, $2)`, 
        [concepto, monto]
      );

      await client.query('COMMIT');
      res.json({ message: 'Devolución de dinero procesada exitosamente.' });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error en devolucionDinero:', error);
      res.status(500).json({ error: 'Error al procesar la devolución de dinero' });
    } finally {
      client.release();
    }
  }

  // 8. Obtener historial de ventas: GET /api/pos/ventas/historial?fecha=YYYY-MM-DD o ?dianPendientes=true
  async obtenerHistorialVentas(req, res) {
    try {
      const { fecha, dianPendientes } = req.query;

      let salesQuery;
      let queryParams;
      let targetDateStr = null;

      if (dianPendientes === 'true') {
        salesQuery = `
          SELECT 
            vc.id_venta,
            vc.ticket_numero,
            vc.fecha_venta,
            vc.metodo_pago,
            vc.total_venta,
            vc.vendedor,
            vc.id_ubicacion,
            vc.requiere_dian,
            vc.estado_dian,
            vc.id_cliente,
            vd.id_detalle,
            vd.id_variante,
            vd.cantidad,
            vd.precio_venta_unitario,
            vd.descuento_aplicado,
            vz.color,
            vz.talla,
            m.nombre as modelo_nombre,
            m.precio_minimo_venta,
            c.tipo_persona AS cliente_tipo_persona,
            c.tipo_documento AS cliente_tipo_documento,
            c.numero_documento AS cliente_numero_documento,
            c.nombre_completo AS cliente_nombre_completo,
            c.correo AS cliente_correo,
            c.telefono AS cliente_telefono,
            c.direccion AS cliente_direccion
          FROM venta_cabecera vc
          LEFT JOIN venta_detalle vd ON vc.id_venta = vd.id_venta
          LEFT JOIN variante_zapato vz ON vd.id_variante = vz.id_variante
          LEFT JOIN modelo m ON vz.id_modelo = m.id_modelo
          LEFT JOIN cliente_dian c ON vc.id_cliente = c.id_cliente
          WHERE vc.requiere_dian = true AND vc.estado_dian = 'PENDIENTE'
          ORDER BY vc.fecha_venta DESC, vc.id_venta DESC
        `;
        queryParams = [];
      } else {
        targetDateStr = fecha;
        if (!targetDateStr) {
          const offset = -5; // America/Bogota
          const d = new Date(new Date().getTime() + offset * 3600 * 1000);
          targetDateStr = d.toISOString().split('T')[0];
        }

        salesQuery = `
          SELECT 
            vc.id_venta,
            vc.ticket_numero,
            vc.fecha_venta,
            vc.metodo_pago,
            vc.total_venta,
            vc.vendedor,
            vc.id_ubicacion,
            vc.requiere_dian,
            vc.estado_dian,
            vc.id_cliente,
            vd.id_detalle,
            vd.id_variante,
            vd.cantidad,
            vd.precio_venta_unitario,
            vd.descuento_aplicado,
            vz.color,
            vz.talla,
            m.nombre as modelo_nombre,
            m.precio_minimo_venta,
            c.tipo_persona AS cliente_tipo_persona,
            c.tipo_documento AS cliente_tipo_documento,
            c.numero_documento AS cliente_numero_documento,
            c.nombre_completo AS cliente_nombre_completo,
            c.correo AS cliente_correo,
            c.telefono AS cliente_telefono,
            c.direccion AS cliente_direccion
          FROM venta_cabecera vc
          LEFT JOIN venta_detalle vd ON vc.id_venta = vd.id_venta
          LEFT JOIN variante_zapato vz ON vd.id_variante = vz.id_variante
          LEFT JOIN modelo m ON vz.id_modelo = m.id_modelo
          LEFT JOIN cliente_dian c ON vc.id_cliente = c.id_cliente
          WHERE DATE(vc.fecha_venta AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota') = $1
          ORDER BY vc.fecha_venta DESC, vc.id_venta DESC
        `;
        queryParams = [targetDateStr];
      }

      const { rows } = await pool.query(salesQuery, queryParams);

      const salesMap = {};
      for (const row of rows) {
        if (!row.id_venta) continue;
        if (!salesMap[row.id_venta]) {
          salesMap[row.id_venta] = {
            id_venta: row.id_venta,
            ticket_numero: row.ticket_numero,
            fecha_venta: row.fecha_venta,
            metodo_pago: row.metodo_pago,
            total_venta: Number(row.total_venta),
            vendedor: row.vendedor,
            id_ubicacion: row.id_ubicacion,
            requiere_dian: row.requiere_dian,
            estado_dian: row.estado_dian,
            id_cliente: row.id_cliente,
            cliente_dian: row.id_cliente ? {
              tipo_persona: row.cliente_tipo_persona,
              tipo_documento: row.cliente_tipo_documento,
              numero_documento: row.cliente_numero_documento,
              nombre_completo: row.cliente_nombre_completo,
              correo: row.cliente_correo,
              telefono: row.cliente_telefono,
              direccion: row.cliente_direccion
            } : null,
            detalles: []
          };
        }

        if (row.id_detalle) {
          salesMap[row.id_venta].detalles.push({
            id_detalle: row.id_detalle,
            id_variante: row.id_variante,
            cantidad: row.cantidad,
            precio_venta_unitario: Number(row.precio_venta_unitario),
            descuento_aplicado: Number(row.descuento_aplicado),
            color: row.color,
            talla: row.talla,
            modelo_nombre: row.modelo_nombre,
            precio_minimo_venta: Number(row.precio_minimo_venta)
          });
        }
      }

      const ventas = Object.values(salesMap);

      if (dianPendientes === 'true') {
        return res.json({
          fecha: null,
          totales: { efectivo: 0, transferencia: 0, tarjeta: 0, total: 0 },
          ventas
        });
      }

      // Calcular totales por método de pago para el día y gastos del día
      const totalsQuery = `
        SELECT 
          metodo_pago,
          SUM(total_venta) as total
        FROM venta_cabecera
        WHERE DATE(fecha_venta AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota') = $1
        GROUP BY metodo_pago
      `;
      
      const gastosQuery = `
        SELECT COALESCE(SUM(monto), 0) AS total_gastos
        FROM gasto_diario
        WHERE DATE(fecha AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota') = $1
      `;

      const [totalsRes, gastosRes] = await Promise.all([
        pool.query(totalsQuery, [targetDateStr]),
        pool.query(gastosQuery, [targetDateStr])
      ]);

      const totales = {
        efectivo: 0,
        transferencia: 0,
        tarjeta: 0,
        total: 0
      };

      for (const tRow of totalsRes.rows) {
        const met = tRow.metodo_pago.toLowerCase();
        const amt = Number(tRow.total);
        if (met === 'efectivo') totales.efectivo = amt;
        else if (met === 'transferencia') totales.transferencia = amt;
        else if (met === 'tarjeta') totales.tarjeta = amt;
      }

      const totalGastos = Number(gastosRes.rows[0].total_gastos);
      // Restar gastos del efectivo
      totales.efectivo = totales.efectivo - totalGastos;
      totales.total = totales.efectivo + totales.transferencia + totales.tarjeta;

      res.json({
        fecha: targetDateStr,
        totales,
        ventas
      });
    } catch (error) {
      console.error('Error en obtenerHistorialVentas:', error);
      res.status(500).json({ error: 'Error al obtener el historial de ventas.' });
    }
  }

  // 9. Anular una venta y retornar stock: POST /api/pos/ventas/anular/:id
  async anularVenta(req, res) {
    const { id } = req.params;
    const idVenta = parseInt(id, 10);

    if (isNaN(idVenta)) {
      return res.status(400).json({ error: 'El ID de venta debe ser un número válido.' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Obtener la cabecera para saber la ubicación y número de ticket
      const { rows: headerRows } = await client.query(
        'SELECT id_ubicacion, ticket_numero FROM venta_cabecera WHERE id_venta = $1',
        [idVenta]
      );
      if (headerRows.length === 0) {
        throw new Error('La venta especificada no existe.');
      }
      const { id_ubicacion, ticket_numero } = headerRows[0];

      // 2. Obtener los detalles de la venta (variantes y cantidades)
      const { rows: detailRows } = await client.query(
        'SELECT id_variante, cantidad FROM venta_detalle WHERE id_venta = $1',
        [idVenta]
      );

      // 3. Devolver el stock a inventario_stock
      for (const detail of detailRows) {
        const { id_variante, cantidad } = detail;
        await client.query(
          `UPDATE inventario_stock 
           SET cantidad = cantidad + $3 
           WHERE id_variante = $1 AND id_ubicacion = $2`,
          [id_variante, id_ubicacion, cantidad]
        );

        // Kardex
        await registrarMovimientoKardex({
          client,
          id_variante,
          id_ubicacion: id_ubicacion,
          tipo_movimiento: 'ANULACION_VENTA',
          cantidad: cantidad, // Devuelve el stock (positivo)
          usuario: 'Admin',
          detalle: `Anulación Ticket: ${ticket_numero}`
        });
      }

      // 4. Eliminar la venta de venta_cabecera (elimina detalles en cascada)
      await client.query(
        'DELETE FROM venta_cabecera WHERE id_venta = $1',
        [idVenta]
      );

      // También eliminar de historico_ventas por compatibilidad
      await client.query(
        'DELETE FROM historico_ventas WHERE ticket_numero = $1',
        [ticket_numero]
      );

      await client.query('COMMIT');
      res.json({ message: 'Venta anulada con éxito y stock devuelto al inventario.', ticket_numero });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error en anularVenta:', error);
      res.status(500).json({ error: error.message || 'Error al intentar anular la venta.' });
    } finally {
      client.release();
    }
  }

  // --- CRUD LOCALES PERMITIDOS ---

  async obtenerLocales(req, res) {
    try {
      const { rows } = await pool.query('SELECT * FROM locales_permitidos ORDER BY nombre_local ASC');
      res.json(rows);
    } catch (error) {
      console.error('Error al obtener locales:', error);
      res.status(500).json({ error: 'Error al obtener locales permitidos.' });
    }
  }

  async crearLocal(req, res) {
    try {
      const { nombre_local } = req.body;
      if (!nombre_local || nombre_local.trim() === '') {
        return res.status(400).json({ error: 'El nombre del local es requerido.' });
      }
      const { rows } = await pool.query(
        'INSERT INTO locales_permitidos (nombre_local) VALUES ($1) RETURNING *',
        [nombre_local.trim()]
      );
      res.status(201).json(rows[0]);
    } catch (error) {
      console.error('Error al crear local:', error);
      if (error.code === '23505') { // unique violation
        return res.status(400).json({ error: 'Ya existe un local con ese nombre.' });
      }
      res.status(500).json({ error: 'Error al crear local permitido.' });
    }
  }

  async eliminarLocal(req, res) {
    const client = await pool.connect();
    try {
      const { id } = req.params;
      const idLocal = parseInt(id, 10);
      if (isNaN(idLocal)) return res.status(400).json({ error: 'ID inválido.' });

      await client.query('BEGIN');

      // 1. Obtener todo el stock asignado a este local
      const { rows: stock } = await client.query(
        'SELECT id_variante, cantidad FROM stock_permitidos WHERE id_local = $1',
        [idLocal]
      );

      // 2. Reembolsar al inventario principal (id_ubicacion = 2)
      for (const item of stock) {
        await client.query(
          `UPDATE inventario_stock 
           SET cantidad = cantidad + $2 
           WHERE id_variante = $1 AND id_ubicacion = 2`,
          [item.id_variante, item.cantidad]
        );
      }

      // 3. Eliminar el local (esto eliminará stock_permitidos en cascada si hay FK, o lo borramos explícito por seguridad)
      await client.query('DELETE FROM stock_permitidos WHERE id_local = $1', [idLocal]);
      await client.query('DELETE FROM locales_permitidos WHERE id_local = $1', [idLocal]);

      await client.query('COMMIT');
      res.json({ message: 'Local eliminado y stock reembolsado exitosamente.' });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error al eliminar local:', error);
      res.status(500).json({ error: 'Error al eliminar local permitido.' });
    } finally {
      client.release();
    }
  }

  async renombrarLocal(req, res) {
    try {
      const { id } = req.params;
      const { nombre_local } = req.body;
      const idLocal = parseInt(id, 10);
      if (isNaN(idLocal)) return res.status(400).json({ error: 'ID inválido.' });
      if (!nombre_local || nombre_local.trim() === '') {
        return res.status(400).json({ error: 'El nombre del local es requerido.' });
      }

      const { rows } = await pool.query(
        'UPDATE locales_permitidos SET nombre_local = $1 WHERE id_local = $2 RETURNING *',
        [nombre_local.trim(), idLocal]
      );

      if (rows.length === 0) {
        return res.status(404).json({ error: 'Local no encontrado.' });
      }

      res.json(rows[0]);
    } catch (error) {
      console.error('Error al renombrar local:', error);
      if (error.code === '23505') {
        return res.status(400).json({ error: 'Ya existe un local con ese nombre.' });
      }
      res.status(500).json({ error: 'Error al renombrar local permitido.' });
    }
  }

  async obtenerStockPermitidos(req, res) {
    try {
      const query = `
        SELECT 
          lp.id_local, lp.nombre_local,
          m.id_modelo, m.nombre AS modelo_nombre,
          v.id_variante, v.color, v.talla,
          sp.cantidad
        FROM locales_permitidos lp
        LEFT JOIN stock_permitidos sp ON lp.id_local = sp.id_local
        LEFT JOIN variante_zapato v ON sp.id_variante = v.id_variante
        LEFT JOIN modelo m ON v.id_modelo = m.id_modelo
        ORDER BY lp.nombre_local ASC, m.nombre ASC, v.color ASC, v.talla ASC
      `;
      const { rows } = await pool.query(query);
      
      const localesMap = {};
      for (const row of rows) {
        if (!localesMap[row.id_local]) {
          localesMap[row.id_local] = {
            id_local: row.id_local,
            nombre_local: row.nombre_local,
            modelos: {}
          };
        }
        if (row.id_modelo) {
          if (!localesMap[row.id_local].modelos[row.id_modelo]) {
            localesMap[row.id_local].modelos[row.id_modelo] = {
              id_modelo: row.id_modelo,
              modelo_nombre: row.modelo_nombre,
              colores: {}
            };
          }
          if (row.color) {
            if (!localesMap[row.id_local].modelos[row.id_modelo].colores[row.color]) {
              localesMap[row.id_local].modelos[row.id_modelo].colores[row.color] = [];
            }
            if (row.talla) {
              localesMap[row.id_local].modelos[row.id_modelo].colores[row.color].push({
                id_variante: row.id_variante,
                talla: row.talla,
                cantidad: row.cantidad
              });
            }
          }
        }
      }
      res.json(Object.values(localesMap));
    } catch (error) {
      console.error('Error al obtener stock permitidos:', error);
      res.status(500).json({ error: 'Error al obtener stock de permitidos.' });
    }
  }

  async guardarStockPermitido(req, res) {
    const client = await pool.connect();
    try {
      const { id_local, modeloId, color, talla, cantidad } = req.body;
      if (!id_local || !modeloId || !color || !talla || cantidad === undefined) {
        return res.status(400).json({ error: 'Faltan parámetros requeridos.' });
      }

      const qty = parseInt(cantidad, 10);
      if (qty < 0) return res.status(400).json({ error: 'La cantidad no puede ser negativa.' });

      await client.query('BEGIN');

      const variante = await varianteRepo.crearVariante(modeloId, color, talla);
      const idVariante = variante.id_variante;

      if (qty === 0) {
        await client.query(
          'DELETE FROM stock_permitidos WHERE id_local = $1 AND id_variante = $2',
          [id_local, idVariante]
        );
      } else {
        await client.query(
          `INSERT INTO stock_permitidos (id_local, id_variante, cantidad)
           VALUES ($1, $2, $3)
           ON CONFLICT (id_local, id_variante)
           DO UPDATE SET cantidad = EXCLUDED.cantidad`,
          [id_local, idVariante, qty]
        );
      }

      await client.query('COMMIT');
      res.json({ message: 'Stock de permitido actualizado.' });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error al guardar stock permitido:', error);
      res.status(500).json({ error: 'Error al guardar stock permitido.' });
    } finally {
      client.release();
    }
  }

  // 10. Cambiar estado DIAN de una venta: PUT /api/pos/ventas/estado-dian/:id
  async cambiarEstadoDian(req, res) {
    const { id } = req.params;
    const { estado_dian } = req.body;
    const idVenta = parseInt(id, 10);

    if (isNaN(idVenta)) {
      return res.status(400).json({ error: 'El ID de venta debe ser un número válido.' });
    }

    if (!estado_dian || !['PENDIENTE', 'EMITIDO', 'NO_REQUERIDO'].includes(estado_dian.toUpperCase().trim())) {
      return res.status(400).json({ error: 'El estado_dian enviado es inválido.' });
    }

    try {
      const query = `
        UPDATE venta_cabecera 
        SET estado_dian = $1 
        WHERE id_venta = $2 
        RETURNING *;
      `;
      const { rows } = await pool.query(query, [estado_dian.toUpperCase().trim(), idVenta]);

      if (rows.length === 0) {
        return res.status(404).json({ error: 'La venta especificada no existe.' });
      }

      res.json({ message: 'Estado DIAN actualizado correctamente.', venta: rows[0] });
    } catch (error) {
      console.error('Error en cambiarEstadoDian:', error);
      res.status(500).json({ error: 'Error al actualizar el estado DIAN de la venta.' });
    }
  }

  // 11. Localizador de inventario global: GET /api/inventario/localizador
  async localizarVariante(req, res) {
    try {
      const { modeloId, color, talla } = req.query;
      if (!modeloId || !color || !talla) {
        return res.status(400).json({ error: 'modeloId, color y talla son requeridos.' });
      }

      const idModel = parseInt(modeloId, 10);
      if (isNaN(idModel)) {
        return res.status(400).json({ error: 'modeloId inválido.' });
      }

      // 1. Obtener ID de la variante
      const { rows: varRows } = await pool.query(
        'SELECT id_variante FROM variante_zapato WHERE id_modelo = $1 AND UPPER(color) = UPPER($2) AND talla = $3',
        [idModel, color.trim(), talla.trim()]
      );

      if (varRows.length === 0) {
        return res.json({
          mostrador_principal: 0,
          locales_permitidos: [],
          total_global: 0
        });
      }

      const idVariante = varRows[0].id_variante;

      // 2. Obtener stock en mostrador (id_ubicacion = 2)
      const { rows: stockMostrador } = await pool.query(
        'SELECT cantidad FROM inventario_stock WHERE id_variante = $1 AND id_ubicacion = 2',
        [idVariante]
      );
      const mostrador = stockMostrador.length > 0 ? parseInt(stockMostrador[0].cantidad, 10) : 0;

      // 3. Obtener stock en locales permitidos
      const { rows: stockPermitidos } = await pool.query(
        `SELECT lp.nombre_local, sp.cantidad 
         FROM stock_permitidos sp
         JOIN locales_permitidos lp ON sp.id_local = lp.id_local
         WHERE sp.id_variante = $1 AND sp.cantidad > 0`,
        [idVariante]
      );

      let totalPermitidos = 0;
      const locales = stockPermitidos.map(row => {
        const cant = parseInt(row.cantidad, 10);
        totalPermitidos += cant;
        return {
          nombre_local: row.nombre_local,
          cantidad: cant
        };
      });

      res.json({
        mostrador_principal: mostrador,
        locales_permitidos: locales,
        total_global: mostrador + totalPermitidos
      });

    } catch (error) {
      console.error('Error en localizarVariante:', error);
      res.status(500).json({ error: 'Error al consultar el localizador de inventario.' });
    }
  }

  // 14. Obtener Kardex: GET /api/pos/kardex
  async obtenerKardex(req, res) {
    try {
      const { modeloId, fechaInicio, fechaFin } = req.query;
      let query = `
        SELECT k.id_movimiento, k.tipo_movimiento, k.cantidad, k.usuario, k.detalle, k.fecha,
               v.color, v.talla, m.nombre as modelo, u.nombre_lugar as ubicacion
        FROM kardex_inventario k
        JOIN variante_zapato v ON k.id_variante = v.id_variante
        JOIN modelo m ON v.id_modelo = m.id_modelo
        JOIN ubicacion u ON k.id_ubicacion = u.id_ubicacion
        WHERE 1=1
      `;
      const queryParams = [];

      if (modeloId) {
        queryParams.push(modeloId);
        query += ` AND m.id_modelo = $${queryParams.length}`;
      }

      if (fechaInicio && fechaFin) {
        queryParams.push(fechaInicio);
        query += ` AND k.fecha >= $${queryParams.length}`;
        queryParams.push(fechaFin + ' 23:59:59');
        query += ` AND k.fecha <= $${queryParams.length}`;
      }

      query += ` ORDER BY k.fecha DESC LIMIT 500`;

      const { rows } = await pool.query(query, queryParams);
      res.json(rows);
    } catch (error) {
      console.error('Error obtenerKardex:', error);
      res.status(500).json({ error: 'Error al obtener Kardex' });
    }
  }
}
