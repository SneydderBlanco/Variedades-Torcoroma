import pool from '../config/db.js';
import bcrypt from 'bcryptjs';

export class UsuarioController {
  
  // Obtener todos los usuarios (sin enviar el hash de la contraseña)
  async getUsuarios(req, res) {
    try {
      const result = await pool.query('SELECT id_usuario, username, rol FROM usuarios ORDER BY id_usuario ASC');
      res.json(result.rows);
    } catch (error) {
      console.error('Error al obtener usuarios:', error);
      res.status(500).json({ error: 'Error del servidor al obtener usuarios' });
    }
  }

  // Crear un nuevo usuario
  async createUsuario(req, res) {
    try {
      const { username, password, rol } = req.body;
      if (!username || !password || !rol) {
        return res.status(400).json({ error: 'Todos los campos son obligatorios' });
      }

      // Verificar si ya existe
      const existe = await pool.query('SELECT id_usuario FROM usuarios WHERE username = $1', [username]);
      if (existe.rowCount > 0) {
        return res.status(400).json({ error: 'El nombre de usuario ya está en uso' });
      }

      const salt = await bcrypt.genSalt(10);
      const password_hash = await bcrypt.hash(password, salt);

      const result = await pool.query(
        'INSERT INTO usuarios (username, password_hash, rol) VALUES ($1, $2, $3) RETURNING id_usuario, username, rol',
        [username, password_hash, rol]
      );
      
      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('Error al crear usuario:', error);
      res.status(500).json({ error: 'Error del servidor al crear usuario' });
    }
  }

  // Actualizar contraseña de un usuario
  async updatePassword(req, res) {
    try {
      const { id } = req.params;
      const { newPassword } = req.body;

      if (!newPassword) {
        return res.status(400).json({ error: 'La nueva contraseña es obligatoria' });
      }

      const salt = await bcrypt.genSalt(10);
      const password_hash = await bcrypt.hash(newPassword, salt);

      const result = await pool.query(
        'UPDATE usuarios SET password_hash = $1 WHERE id_usuario = $2 RETURNING id_usuario, username, rol',
        [password_hash, id]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      res.json({ message: 'Contraseña actualizada correctamente', user: result.rows[0] });
    } catch (error) {
      console.error('Error al actualizar contraseña:', error);
      res.status(500).json({ error: 'Error del servidor al actualizar contraseña' });
    }
  }

  // Eliminar usuario
  async deleteUsuario(req, res) {
    try {
      const { id } = req.params;
      
      // Evitar que el usuario se elimine a sí mismo
      if (parseInt(id, 10) === req.user?.id) {
        return res.status(400).json({ error: 'No puedes eliminar tu propio usuario' });
      }

      const result = await pool.query('DELETE FROM usuarios WHERE id_usuario = $1 RETURNING id_usuario', [id]);
      
      if (result.rowCount === 0) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      res.json({ message: 'Usuario eliminado correctamente' });
    } catch (error) {
      console.error('Error al eliminar usuario:', error);
      res.status(500).json({ error: 'Error del servidor al eliminar usuario' });
    }
  }
}
