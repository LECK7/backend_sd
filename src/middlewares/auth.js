import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

/**
 * Middleware: requireAuth
 * Verifica que el token JWT sea válido y añade req.user
 */
export const requireAuth = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader) return res.status(401).json({ error: 'No se proporcionó token' });

    const token = authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Token inválido' });

    console.log('🪪 Token recibido en backend:', token);

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    console.error('❌ Error verificando token:', err.message);
    res.status(401).json({ error: 'Token inválido o expirado' });
  }
};

/**
 * Middleware: requireRole
 * Verifica que el usuario tenga uno de los roles permitidos
 * @param {Array<string>} rolesPermitidos
 */
export const requireRole = (rolesPermitidos = []) => {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Usuario no autenticado' });
    if (!rolesPermitidos.includes(req.user.rol)) {
      return res.status(403).json({ error: 'No tienes permisos para esta ruta' });
    }
    next();
  };
};
