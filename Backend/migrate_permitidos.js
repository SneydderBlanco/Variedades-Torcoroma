import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();
const { Pool } = pg;

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_DATABASE || 'torcoroma',
  password: process.env.DB_PASSWORD || 'admin',
  port: process.env.DB_PORT || 5432,
});

async function runMigration() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    console.log('Creando tabla locales_permitidos...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS locales_permitidos (
        id_local SERIAL PRIMARY KEY,
        nombre_local VARCHAR(255) NOT NULL UNIQUE
      );
    `);

    console.log('Creando tabla stock_permitidos...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS stock_permitidos (
        id_registro SERIAL PRIMARY KEY,
        id_local INT REFERENCES locales_permitidos(id_local) ON DELETE CASCADE,
        id_variante INT REFERENCES variante_zapato(id_variante) ON DELETE CASCADE,
        cantidad INT NOT NULL DEFAULT 1 CHECK (cantidad >= 0),
        CONSTRAINT uq_local_variante UNIQUE(id_local, id_variante)
      );
    `);

    await client.query('COMMIT');
    console.log('Migración completada exitosamente.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error durante la migración:', error);
  } finally {
    client.release();
    pool.end();
  }
}

runMigration();
