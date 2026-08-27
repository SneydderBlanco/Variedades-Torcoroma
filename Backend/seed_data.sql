-- Script de Datos de Prueba (Seed Data) - Variedades Torcoroma
-- Ejecuta este script en pgAdmin 4 para llenar la base de datos local de calzado.

-- 1. Insertar Modelos de Zapatos
INSERT INTO modelo (id_modelo, nombre, precio_compra, precio_minimo_venta, es_externo, id_proveedor_aliado)
VALUES 
(1, 'Guayo Golazo', 45000.00, 65000.00, FALSE, NULL),
(2, 'Tacon Elegancia', 55000.00, 85000.00, FALSE, NULL),
(3, 'Sandalia Playera', 20000.00, 35000.00, TRUE, 'Zapateria Vecina - Don Juan')
ON CONFLICT (id_modelo) DO UPDATE 
SET nombre = EXCLUDED.nombre,
    precio_compra = EXCLUDED.precio_compra,
    precio_minimo_venta = EXCLUDED.precio_minimo_venta,
    es_externo = EXCLUDED.es_externo,
    id_proveedor_aliado = EXCLUDED.id_proveedor_aliado;

-- Ajustar la secuencia del ID del modelo por si se insertan manualmente después
SELECT setval('modelo_id_modelo_seq', COALESCE((SELECT MAX(id_modelo) FROM modelo), 1));

-- 2. Insertar Ubicaciones (Asegurando 'Bodega' y 'Local Principal')
INSERT INTO ubicacion (id_ubicacion, nombre_lugar)
VALUES 
(1, 'Bodega'),
(2, 'Local Principal')
ON CONFLICT (id_ubicacion) DO NOTHING;

SELECT setval('ubicacion_id_ubicacion_seq', COALESCE((SELECT MAX(id_ubicacion) FROM ubicacion), 1));

-- 3. Insertar Variantes de Zapato (Combinaciones de Modelo, Color y Talla)
INSERT INTO variante_zapato (id_variante, id_modelo, color, talla)
VALUES 
-- Variantes de Guayo Golazo (Modelo 1)
(1, 1, 'Negro', '38'),
(2, 1, 'Negro', '39'),
(3, 1, 'Negro', '40'),
(4, 1, 'Azul', '39'),
(5, 1, 'Azul', '40'),

-- Variantes de Tacón Elegancia (Modelo 2)
(6, 2, 'Rojo', '35'),
(7, 2, 'Rojo', '36'),
(8, 2, 'Rojo', '37'),
(9, 2, 'Beige', '36'),
(10, 2, 'Beige', '37'),

-- Variantes de Sandalia Playera (Modelo 3 - Externo)
(11, 3, 'Blanco', '37'),
(12, 3, 'Blanco', '38')
ON CONFLICT (id_variante) DO UPDATE 
SET id_modelo = EXCLUDED.id_modelo,
    color = EXCLUDED.color,
    talla = EXCLUDED.talla;

-- Ajustar secuencia de variantes
SELECT setval('variante_zapato_id_variante_seq', COALESCE((SELECT MAX(id_variante) FROM variante_zapato), 1));

-- 4. Insertar Stock en Inventario
INSERT INTO inventario_stock (id_stock, id_variante, id_ubicacion, cantidad)
VALUES 
-- Stock de Guayo Golazo Negro 38 (Variante 1)
(1, 1, 1, 10), -- 10 unidades en Bodega
(2, 1, 2, 5),  -- 5 unidades en Local Principal

-- Stock de Guayo Golazo Negro 39 (Variante 2)
(3, 2, 1, 8),
(4, 2, 2, 3),

-- Stock de Guayo Golazo Negro 40 (Variante 3)
(5, 3, 1, 5),
(6, 3, 2, 0), -- Sin stock en Local Principal

-- Stock de Guayo Golazo Azul 39 (Variante 4)
(7, 4, 1, 15),
(8, 4, 2, 8),

-- Stock de Tacón Elegancia Rojo 36 (Variante 7)
(9, 7, 1, 3),
(10, 7, 2, 2),

-- Stock de Sandalia Playera Blanco 37 (Variante 11)
(11, 11, 2, 6) -- 6 unidades directo en Local Principal
ON CONFLICT (id_stock) DO UPDATE 
SET id_variante = EXCLUDED.id_variante,
    id_ubicacion = EXCLUDED.id_ubicacion,
    cantidad = EXCLUDED.cantidad;

-- Ajustar secuencia de stock
SELECT setval('inventario_stock_id_stock_seq', COALESCE((SELECT MAX(id_stock) FROM inventario_stock), 1));
