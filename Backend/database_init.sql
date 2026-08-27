-- Script de Inicialización de Base de Datos - Variedades Torcoroma
-- Este script maqueta la matriz de inventario con sus restricciones correspondientes.

-- 1. Tabla de Modelos
CREATE TABLE IF NOT EXISTS modelo (
    id_modelo SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL UNIQUE,
    precio_compra NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    precio_minimo_venta NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    es_externo BOOLEAN NOT NULL DEFAULT FALSE,
    id_proveedor_aliado VARCHAR(100) DEFAULT NULL
);

-- 2. Tabla de Variantes (Combinación de Modelo, Color y Talla)
CREATE TABLE IF NOT EXISTS variante_zapato (
    id_variante SERIAL PRIMARY KEY,
    id_modelo INT NOT NULL,
    color VARCHAR(100) NOT NULL,
    talla VARCHAR(50) NOT NULL,
    FOREIGN KEY (id_modelo) REFERENCES modelo(id_modelo) ON DELETE CASCADE,
    CONSTRAINT uq_modelo_color_talla UNIQUE (id_modelo, color, talla)
);

-- 3. Tabla de Ubicaciones físicas
CREATE TABLE IF NOT EXISTS ubicacion (
    id_ubicacion SERIAL PRIMARY KEY,
    nombre_lugar VARCHAR(150) NOT NULL UNIQUE
);

-- Inserta ubicaciones por defecto si no existen
INSERT INTO ubicacion (nombre_lugar) 
VALUES ('Bodega'), ('Local Principal')
ON CONFLICT (nombre_lugar) DO NOTHING;

-- 4. Tabla de Stock en Inventario (Cantidad de variantes por ubicación)
CREATE TABLE IF NOT EXISTS inventario_stock (
    id_stock SERIAL PRIMARY KEY,
    id_variante INT NOT NULL,
    id_ubicacion INT NOT NULL,
    cantidad INT NOT NULL DEFAULT 0 CHECK (cantidad >= 0),
    FOREIGN KEY (id_variante) REFERENCES variante_zapato(id_variante) ON DELETE CASCADE,
    FOREIGN KEY (id_ubicacion) REFERENCES ubicacion(id_ubicacion) ON DELETE CASCADE,
    CONSTRAINT uq_variante_ubicacion UNIQUE (id_variante, id_ubicacion)
);

-- 5. Tabla de Proveedores y Aliados (Droppear si existe previamente para asegurar estructura limpia)
DROP TABLE IF EXISTS proveedor CASCADE;
CREATE TABLE proveedor (
    id_proveedor SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL UNIQUE,
    telefono VARCHAR(150) DEFAULT NULL,
    es_externo BOOLEAN NOT NULL DEFAULT FALSE
);

-- 6. Tabla de Factura Proveedor (Cuentas por pagar)
CREATE TABLE IF NOT EXISTS factura_proveedor (
    id_factura SERIAL PRIMARY KEY,
    id_proveedor INT NOT NULL,
    numero_factura VARCHAR(100) DEFAULT NULL,
    total_costo NUMERIC(12, 2) NOT NULL CHECK (total_costo >= 0),
    fecha_emision TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    descripcion TEXT,
    cantidad_zapatos INT DEFAULT 0,
    valor_unitario NUMERIC(12, 2) DEFAULT 0.00,
    FOREIGN KEY (id_proveedor) REFERENCES proveedor(id_proveedor) ON DELETE RESTRICT
);

-- 7. Tabla de Abono Proveedor (Historial de abonos)
CREATE TABLE IF NOT EXISTS abono_proveedor (
    id_abono SERIAL PRIMARY KEY,
    id_factura INT NOT NULL,
    monto NUMERIC(12, 2) NOT NULL CHECK (monto > 0),
    origen_dinero VARCHAR(50) NOT NULL CHECK (origen_dinero IN ('EFECTIVO_CAJA', 'BOLSILLO_JEFE')),
    fecha_abono TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_factura) REFERENCES factura_proveedor(id_factura) ON DELETE CASCADE
);

-- 8. Tabla de Historial de Ventas (Para el cuadre de caja diario)
CREATE TABLE IF NOT EXISTS historico_ventas (
    id_venta SERIAL PRIMARY KEY,
    ticket_numero VARCHAR(50) NOT NULL,
    id_variante INT NOT NULL REFERENCES variante_zapato(id_variante) ON DELETE CASCADE,
    cantidad INT NOT NULL CHECK (cantidad > 0),
    precio_venta_final NUMERIC(12, 2) NOT NULL CHECK (precio_venta_final >= 0),
    metodo_pago VARCHAR(50) NOT NULL CHECK (metodo_pago IN ('EFECTIVO', 'TRANSFERENCIA', 'TARJETA')),
    descuento_aplicado NUMERIC(12, 2) DEFAULT 0.00,
    fecha_venta TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
