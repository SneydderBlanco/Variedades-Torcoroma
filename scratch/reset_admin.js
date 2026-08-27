import pg from 'pg';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: '../Backend/.env' });

const { Pool } = pg;
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_DATABASE || 'torcoroma',
  password: process.env.DB_PASSWORD || 'admin',
  port: process.env.DB_PORT || 5432,
});

async function run() {
  const { rows } = await pool.query('SELECT * FROM usuarios');
  console.log('Usuarios actuales:', rows.map(u => u.username));
  
  const adminUser = rows.find(u => u.rol === 'ADMIN' || u.username === 'admin');
  if (adminUser) {
    const newPassword = 'admin';
    const hash = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE usuarios SET password_hash = $1 WHERE id_usuario = $2', [hash, adminUser.id_usuario]);
    console.log(`Contraseña para ${adminUser.username} actualizada a: ${newPassword}`);
  } else {
    console.log('No se encontró usuario administrador.');
  }
  process.exit(0);
}
run();
