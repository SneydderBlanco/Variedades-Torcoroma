import pool from '../config/db.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey_torcoroma';

export class AuthController {
  async login(req, res) {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ error: 'Usuario y contraseña son requeridos.' });
      }

      // Buscar usuario en base de datos
      const result = await pool.query('SELECT * FROM usuarios WHERE username = $1', [username]);
      if (result.rowCount === 0) {
        return res.status(401).json({ error: 'Credenciales inválidas.' });
      }

      const user = result.rows[0];

      // Verificar la contraseña
      const passwordMatch = await bcrypt.compare(password, user.password_hash);
      if (!passwordMatch) {
        return res.status(401).json({ error: 'Credenciales inválidas.' });
      }

      // Firmar token JWT (expira en 24 horas)
      const token = jwt.sign(
        { id: user.id_usuario, username: user.username, rol: user.rol },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      // Responder con token y detalles de usuario
      return res.json({
        token,
        user: {
          username: user.username,
          rol: user.rol,
        },
      });
    } catch (error) {
      console.error('Error durante el login:', error);
      return res.status(500).json({ error: 'Error interno del servidor en la autenticación.' });
    }
  }
}
