-- Script de creación de tablas para E-Commerce

CREATE TABLE IF NOT EXISTS ecommerce_categoria (
  id_categoria SERIAL PRIMARY KEY,
  nombre VARCHAR(50) UNIQUE NOT NULL,
  slug VARCHAR(50) UNIQUE NOT NULL
);

-- Insertar categorías por defecto
INSERT INTO ecommerce_categoria (nombre, slug) VALUES 
('Hombre', 'hombre'),
('Mujer', 'mujer'),
('Niño', 'nino')
ON CONFLICT (nombre) DO NOTHING;

CREATE TABLE IF NOT EXISTS ecommerce_producto_web (
  id_modelo INT NOT NULL REFERENCES modelo(id_modelo) ON DELETE CASCADE,
  color_nombre VARCHAR(100) NOT NULL DEFAULT '',
  id_categoria INT REFERENCES ecommerce_categoria(id_categoria) ON DELETE SET NULL,
  titulo_web VARCHAR(100) NOT NULL,
  descripcion TEXT,
  precio_web NUMERIC(12, 2) DEFAULT 0.00,
  precio_oferta DECIMAL(10,2),
  destacado BOOLEAN DEFAULT FALSE,
  activo_web BOOLEAN DEFAULT FALSE,
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_modelo, color_nombre)
);

CREATE TABLE IF NOT EXISTS ecommerce_imagen (
  id_imagen SERIAL PRIMARY KEY,
  id_modelo INT NOT NULL REFERENCES modelo(id_modelo) ON DELETE CASCADE,
  ruta_imagen VARCHAR(255) NOT NULL,
  orden INT DEFAULT 0,
  es_principal BOOLEAN DEFAULT FALSE,
  fecha_subida TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
