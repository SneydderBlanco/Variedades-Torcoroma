import pool from './src/config/db.js';
import bcrypt from 'bcryptjs';

async function migrate() {
  try {
    console.log('Iniciando migración de la tabla de usuarios con nuevas credenciales...');

    // 1. Crear tabla usuarios si no existe
    await pool.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id_usuario SERIAL PRIMARY KEY,
        username VARCHAR(100) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        rol VARCHAR(50) NOT NULL CHECK (rol IN ('ADMIN', 'EMPLEADO'))
      );
    `);
    console.log('Tabla "usuarios" creada o ya existente.');

    // 2. Limpiar usuarios anteriores para asegurar que solo existan los nuevos
    await pool.query('TRUNCATE TABLE usuarios CASCADE;');
    console.log('Tabla "usuarios" limpiada.');

    // 3. Generar hashes de contraseñas
    const saltRounds = 10;
    const adminHash = await bcrypt.hash('Jairo13491212', saltRounds);
    const empleadoHash = await bcrypt.hash('Torcoroma2026', saltRounds);

    // 4. Insertar ADMIN
    await pool.query(
      'INSERT INTO usuarios (username, password_hash, rol) VALUES ($1, $2, $3)',
      ['ADMIN', adminHash, 'ADMIN']
    );
    console.log('Usuario "ADMIN" (ADMIN) insertado con éxito.');

    // 5. Insertar EMPLEADO
    await pool.query(
      'INSERT INTO usuarios (username, password_hash, rol) VALUES ($1, $2, $3)',
      ['EMPLEADO', empleadoHash, 'EMPLEADO']
    );
    console.log('Usuario "EMPLEADO" (EMPLEADO) insertado con éxito.');

    console.log('Migración de usuarios completada con éxito.');
    process.exit(0);
  } catch (error) {
    console.error('Error durante la migración de usuarios:', error);
    process.exit(1);
  }
}

migrate();
