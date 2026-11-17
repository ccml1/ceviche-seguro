const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { firmarToken, requireAuth, requireRol } = require('../auth');
const { requerido, enLista, ErrorValidacion } = require('../validar');

const router = express.Router();

// Inicio de sesión para vendedores, inspectores y administradores
router.post('/auth/login', async (req, res) => {
  requerido(req.body, ['email', 'password']);
  const { rows } = await db.query('SELECT * FROM usuarios WHERE email = $1', [req.body.email.toLowerCase()]);
  const usuario = rows[0];
  if (!usuario || !(await bcrypt.compare(req.body.password, usuario.password_hash))) {
    return res.status(401).json({ error: 'Correo o contraseña incorrectos' });
  }
  return res.json({
    token: firmarToken(usuario),
    usuario: { id: usuario.id, nombre: usuario.nombre, rol: usuario.rol },
  });
});

// Un vendedor puede registrarse por su cuenta (queda con rol vendedor)
router.post('/auth/registro', async (req, res) => {
  requerido(req.body, ['nombre', 'email', 'password']);
  if (String(req.body.password).length < 8) throw new ErrorValidacion('La contraseña debe tener al menos 8 caracteres');
  const hash = await bcrypt.hash(req.body.password, 10);
  const { rows } = await db.query(
    `INSERT INTO usuarios (nombre, email, password_hash, rol) VALUES ($1, $2, $3, 'vendedor')
     ON CONFLICT (email) DO NOTHING RETURNING id, nombre, rol`,
    [req.body.nombre, req.body.email.toLowerCase(), hash],
  );
  if (!rows[0]) return res.status(409).json({ error: 'El correo ya está registrado' });
  return res.status(201).json({ token: firmarToken(rows[0]), usuario: rows[0] });
});

// El administrador crea cuentas de inspectores u otros administradores
router.post('/usuarios', requireAuth, requireRol('admin'), async (req, res) => {
  requerido(req.body, ['nombre', 'email', 'password', 'rol']);
  enLista(req.body.rol, ['admin', 'inspector', 'vendedor'], 'rol');
  const hash = await bcrypt.hash(req.body.password, 10);
  const { rows } = await db.query(
    `INSERT INTO usuarios (nombre, email, password_hash, rol) VALUES ($1, $2, $3, $4)
     ON CONFLICT (email) DO NOTHING RETURNING id, nombre, email, rol`,
    [req.body.nombre, req.body.email.toLowerCase(), hash, req.body.rol],
  );
  if (!rows[0]) return res.status(409).json({ error: 'El correo ya está registrado' });
  return res.status(201).json(rows[0]);
});

module.exports = router;
