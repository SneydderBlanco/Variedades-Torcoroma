import pg from 'pg';
import 'dotenv/config';

const { Pool } = pg;

const poolConfig = {
  // Si existe DATABASE_URL (ej: Neon Serverless), se usa directamente
  connectionString: process.env.DATABASE_URL,
};

// Si no hay un connectionString completo, se construye con los datos individuales
if (!poolConfig.connectionString) {
  poolConfig.user = process.env.DB_USER || 'postgres';
  poolConfig.password = process.env.DB_PASSWORD || 'admin';
  poolConfig.host = process.env.DB_HOST || 'localhost';
  poolConfig.port = parseInt(process.env.DB_PORT || '5432', 10);
  poolConfig.database = process.env.DB_DATABASE || 'torcoroma';
}

// Configuración de SSL preparada para Neon Serverless
// En producción, descomentar las siguientes líneas para habilitar SSL:
/*
poolConfig.ssl = {
  rejectUnauthorized: false
};
*/

const pool = new Pool(poolConfig);

pool.on('connect', () => {
  console.log('Conexión de base de datos establecida.');
});

pool.on('error', (err) => {
  console.error('Error inesperado en la conexión a la base de datos:', err);
});

export default pool;
