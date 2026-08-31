import pool from '../config/db.js';

export class EcommerceController {
  
  async getCategorias(req, res) {
    try {
      const result = await pool.query('SELECT * FROM ecommerce_categoria ORDER BY nombre ASC');
      res.json(result.rows);
    } catch (error) {
      console.error('Error al obtener categorías:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  async getProductosWeb(req, res) {
    try {
      const query = `
        SELECT 
          m.id_modelo, m.nombre AS modelo_nombre, ew.color_nombre,
          ew.id_categoria, c.nombre AS categoria_nombre,
          ew.titulo_web, ew.descripcion, ew.precio_oferta, ew.destacado
        FROM ecommerce_producto_web ew
        JOIN modelo m ON ew.id_modelo = m.id_modelo
        LEFT JOIN ecommerce_categoria c ON ew.id_categoria = c.id_categoria
        WHERE ew.activo_web = true AND m.id_modelo != 999999
        ORDER BY ew.destacado DESC, m.nombre ASC, ew.color_nombre ASC
      `;
      const result = await pool.query(query);

      // Adjuntar la primera imagen de cada producto
      const imgsQuery = await pool.query('SELECT id_modelo, color_nombre, ruta_imagen FROM ecommerce_imagen ORDER BY orden ASC');
      
      const productos = result.rows.map(prod => {
        // Find image for this exact model and color, fallback to model-only image
        const img = imgsQuery.rows.find(i => i.id_modelo === prod.id_modelo && i.color_nombre === prod.color_nombre) || 
                    imgsQuery.rows.find(i => i.id_modelo === prod.id_modelo);
        return {
          ...prod,
          imagen_principal: img ? img.ruta_imagen : null
        };
      });

      res.json(productos);
    } catch (error) {
      console.error('Error al obtener productos web:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  async getProductoWeb(req, res) {
    try {
      const id_modelo = req.params.id;
      const color = req.query.color || '';
      
      // 1. Obtener datos base
      const query = `
        SELECT 
          m.id_modelo, m.nombre AS modelo_nombre, ew.precio_web AS precio_venta, ew.color_nombre,
          ew.id_categoria, c.nombre AS categoria_nombre,
          ew.titulo_web, ew.descripcion, ew.precio_oferta, ew.destacado
        FROM ecommerce_producto_web ew
        JOIN modelo m ON ew.id_modelo = m.id_modelo
        LEFT JOIN ecommerce_categoria c ON ew.id_categoria = c.id_categoria
        WHERE ew.activo_web = true AND m.id_modelo = $1 AND ew.color_nombre = $2
      `;
      const result = await pool.query(query, [id_modelo, color]);
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Producto no encontrado o inactivo para este color' });
      }

      const producto = result.rows[0];

      // 2. Obtener imágenes con su color asociado (solo del color de la publicación)
      const imgQuery = await pool.query('SELECT id_imagen, ruta_imagen, color_nombre FROM ecommerce_imagen WHERE id_modelo = $1 AND (color_nombre = $2 OR color_nombre IS NULL) ORDER BY orden ASC', [id_modelo, color]);
      producto.imagenes = imgQuery.rows;

      // 3. Obtener stock en vivo (solo para el color de la publicación)
      const stockQuery = `
        SELECT v.color AS nombre_color, v.talla, SUM(i.cantidad) AS cantidad
        FROM variante_zapato v
        JOIN inventario_stock i ON v.id_variante = i.id_variante
        WHERE v.id_modelo = $1 AND v.color = $2
        GROUP BY v.color, v.talla
        HAVING SUM(i.cantidad) > 0
        ORDER BY v.color, v.talla
      `;
      const stockResult = await pool.query(stockQuery, [id_modelo, color]);
      
      // Formatear stock
      const stockPorColor = {};
      for (let row of stockResult.rows) {
        if (!stockPorColor[row.nombre_color]) stockPorColor[row.nombre_color] = {};
        stockPorColor[row.nombre_color][row.talla] = Number(row.cantidad);
      }
      producto.stock = stockPorColor;

      res.json(producto);
    } catch (error) {
      console.error('Error al obtener detalle de producto web:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  async getAdminProductos(req, res) {
    try {
      // Devolver modelos y sus colores que ya tengan un perfil creado en la web
      const query = `
        SELECT 
          m.id_modelo, m.nombre AS modelo_nombre, ew.color_nombre,
          ew.id_categoria, c.nombre AS categoria_nombre,
          ew.titulo_web, ew.descripcion, ew.precio_web, ew.precio_oferta, ew.destacado, ew.activo_web,
          (SELECT COUNT(*) FROM ecommerce_imagen ei WHERE ei.id_modelo = m.id_modelo AND (ei.color_nombre = ew.color_nombre OR ei.color_nombre IS NULL)) AS cant_imagenes
        FROM ecommerce_producto_web ew
        JOIN modelo m ON ew.id_modelo = m.id_modelo
        LEFT JOIN ecommerce_categoria c ON ew.id_categoria = c.id_categoria
        WHERE m.id_modelo != 999999
        ORDER BY m.nombre ASC, ew.color_nombre ASC
      `;
      const result = await pool.query(query);
      res.json(result.rows);
    } catch (error) {
      console.error('Error al obtener productos admin web:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  async getUnloadedProductos(req, res) {
    try {
      // Combinaciones de Modelo + Color que NO están en la tabla ecommerce_producto_web
      const query = `
        SELECT DISTINCT m.id_modelo, m.nombre AS modelo_nombre, v.color, p.nombre AS proveedor_nombre
        FROM modelo m
        JOIN variante_zapato v ON m.id_modelo = v.id_modelo
        LEFT JOIN proveedor p ON m.id_proveedor_aliado = p.id_proveedor::varchar
        WHERE m.id_modelo != 999999 
        AND NOT EXISTS (
          SELECT 1 FROM ecommerce_producto_web ew 
          WHERE ew.id_modelo = m.id_modelo AND ew.color_nombre = v.color
        )
        ORDER BY m.nombre ASC, v.color ASC
      `;
      const result = await pool.query(query);
      res.json(result.rows);
    } catch (error) {
      console.error('Error al obtener productos no cargados:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  async removeProductoWeb(req, res) {
    try {
      const { id_modelo } = req.params;
      const { color } = req.query;
      await pool.query('DELETE FROM ecommerce_producto_web WHERE id_modelo = $1 AND color_nombre = $2', [id_modelo, color]);
      res.json({ message: 'Producto quitado del gestor web' });
    } catch (error) {
      console.error('Error al eliminar producto web:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  async getProductoImages(req, res) {
    try {
      const { id_modelo } = req.params;
      const { color } = req.query;
      let query, params;
      if (color) {
        query = 'SELECT * FROM ecommerce_imagen WHERE id_modelo = $1 AND (color_nombre = $2 OR color_nombre IS NULL) ORDER BY orden ASC';
        params = [id_modelo, color];
      } else {
        query = 'SELECT * FROM ecommerce_imagen WHERE id_modelo = $1 ORDER BY orden ASC';
        params = [id_modelo];
      }
      const result = await pool.query(query, params);
      res.json(result.rows);
    } catch (error) {
      res.status(500).json({ error: 'Error al cargar imágenes' });
    }
  }

  async getModelColors(req, res) {
    try {
      const { id_modelo } = req.params;
      const query = `
        SELECT DISTINCT v.color AS color
        FROM variante_zapato v
        WHERE v.id_modelo = $1
        ORDER BY v.color ASC
      `;
      const result = await pool.query(query, [id_modelo]);
      res.json(result.rows.map(row => row.color));
    } catch (error) {
      console.error('Error al obtener colores del modelo:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  async updateProductoWeb(req, res) {
    try {
      const { id_modelo } = req.params;
      const { color, id_categoria, titulo_web, descripcion, precio_web, precio_oferta, destacado, activo_web } = req.body;
      
      const query = `
        INSERT INTO ecommerce_producto_web 
          (id_modelo, color_nombre, id_categoria, titulo_web, descripcion, precio_web, precio_oferta, destacado, activo_web)
        VALUES 
          ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (id_modelo, color_nombre) 
        DO UPDATE SET 
          id_categoria = EXCLUDED.id_categoria,
          titulo_web = EXCLUDED.titulo_web,
          descripcion = EXCLUDED.descripcion,
          precio_oferta = EXCLUDED.precio_oferta,
          destacado = EXCLUDED.destacado,
          activo_web = EXCLUDED.activo_web
      `;
      
      await pool.query(query, [
        id_modelo, 
        color,
        id_categoria || null, 
        titulo_web || '', 
        descripcion || '', 
        precio_oferta || null, 
        destacado || false, 
        activo_web || false
      ]);
      
      res.json({ message: 'Producto web actualizado' });
    } catch (error) {
      console.error('Error al actualizar producto web:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  async uploadImagen(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No se subió ninguna imagen' });
      }
      const { id_modelo } = req.params;
      const { color } = req.body;
      
      // La ruta ahora es la URL completa que nos da Cloudinary
      const ruta_imagen = req.file.path;
      
      await pool.query(
        `INSERT INTO ecommerce_imagen (id_modelo, ruta_imagen, color_nombre) VALUES ($1, $2, $3)`,
        [id_modelo, ruta_imagen, color || null]
      );
      
      res.json({ message: 'Imagen subida correctamente', ruta_imagen, color_nombre: color });
    } catch (error) {
      console.error('Error subiendo imagen:', error);
      res.status(500).json({ error: 'Error subiendo imagen' });
    }
  }

  async deleteImagen(req, res) {
    try {
      const { id_imagen } = req.params;
      // Idealmente, también borramos el archivo físico usando fs.unlink, pero lo omitimos por simplicidad ahora
      await pool.query('DELETE FROM ecommerce_imagen WHERE id_imagen = $1', [id_imagen]);
      res.json({ message: 'Imagen eliminada' });
    } catch (error) {
      res.status(500).json({ error: 'Error al eliminar imagen' });
    }
  }

  // ================= CONFIGURACIÓN WEB =================
  async getConfig(req, res) {
    try {
      const result = await pool.query('SELECT * FROM configuracion_web WHERE id = 1');
      if (result.rows.length === 0) return res.status(404).json({ error: 'Configuración no encontrada' });
      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error al obtener config:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  async updateConfig(req, res) {
    try {
      const { hero_subtitle, hero_title, hero_text, promo_title, promo_text } = req.body;
      
      let updateQuery = `
        UPDATE configuracion_web 
        SET hero_subtitle = $1, hero_title = $2, hero_text = $3, promo_title = $4, promo_text = $5
      `;
      let params = [hero_subtitle, hero_title, hero_text, promo_title, promo_text];
      let paramCount = 6;

      if (req.files) {
        if (req.files.hero_img && req.files.hero_img.length > 0) {
          updateQuery += `, hero_img = $${paramCount}`;
          params.push(req.files.hero_img[0].path);
          paramCount++;
        }
        if (req.files.promo_img && req.files.promo_img.length > 0) {
          updateQuery += `, promo_img = $${paramCount}`;
          params.push(req.files.promo_img[0].path);
          paramCount++;
        }
      }

      updateQuery += ` WHERE id = 1 RETURNING *`;
      const result = await pool.query(updateQuery, params);
      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error al actualizar config:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

}
