const jwt = require('jsonwebtoken');
const config = require('./config');

function firmarToken(usuario) {
  return jwt.sign({ sub: usuario.id, rol: usuario.rol, nombre: usuario.nombre }, config.jwtSecret, {
    expiresIn: '8h',
  });
}

// Exige un token válido en la cabecera Authorization: Bearer <token>
function requireAuth(req, res, next) {
  const [tipo, token] = (req.headers.authorization || '').split(' ');
  if (tipo !== 'Bearer' || !token) return res.status(401).json({ error: 'Debe iniciar sesión' });
  try {
    const payload = jwt.verify(token, config.jwtSecret);
    req.usuario = { id: payload.sub, rol: payload.rol, nombre: payload.nombre };
    return next();
  } catch {
    return res.status(401).json({ error: 'Sesión inválida o vencida' });
  }
}

// Autorización por rol: requireRol('inspector', 'admin')
function requireRol(...roles) {
  return (req, res, next) => {
    if (!req.usuario || !roles.includes(req.usuario.rol)) {
      return res.status(403).json({ error: 'No tiene permiso para esta acción' });
    }
    return next();
  };
}

module.exports = { firmarToken, requireAuth, requireRol };
