import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey_torcoroma';

export default function authMiddleware(req, res, next) {
  // Permitir preflights de CORS
  if (req.method === 'OPTIONS') {
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Acceso denegado. No se proporcionó un token de autenticación.' });
  }

  // Extraer token
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({ error: 'Formato de token de autenticación inválido (debe ser Bearer <token>).' });
  }

  const token = parts[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // Adjuntar payload (id, username, rol) al request
    next();
  } catch (error) {
    console.error('Error al verificar JWT:', error.message);
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'El token ha expirado. Por favor, inicie sesión de nuevo.' });
    }
    return res.status(401).json({ error: 'Token de autenticación inválido.' });
  }
}
