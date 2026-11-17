const express = require('express');
const db = require('../db');
const { requireAuth, requireRol } = require('../auth');
const { requerido, enLista, entero } = require('../validar');

const router = express.Router();
const TIPOS = ['producto_no_declarado', 'malestar', 'sin_licencia', 'higiene'];

// PÚBLICO: cualquier consumidor puede reportar un puesto (sin crear cuenta)
router.post('/reportes', async (req, res) => {
  requerido(req.body, ['puesto_id', 'tipo', 'descripcion']);
  enLista(req.body.tipo, TIPOS, 'tipo');
  const puestoId = entero(req.body.puesto_id, 'puesto_id');
  const existe = await db.query('SELECT 1 FROM puestos WHERE id = $1', [puestoId]);
  if (!existe.rows[0]) return res.status(404).json({ error: 'Puesto no encontrado' });
  const { rows } = await db.query(
    'INSERT INTO reportes (puesto_id, tipo, descripcion) VALUES ($1, $2, $3) RETURNING *',
    [puestoId, req.body.tipo, String(req.body.descripcion).slice(0, 500)],
  );
  return res.status(201).json(rows[0]);
});

// INSPECTOR / ADMIN: bandeja de reportes, primero los abiertos
router.get('/reportes', requireAuth, requireRol('inspector', 'admin'), async (req, res) => {
  const params = [];
  let where = '';
  if (req.query.estado) { params.push(req.query.estado); where = 'WHERE r.estado = $1'; }
  const { rows } = await db.query(
    `SELECT r.*, p.nombre_comercial, d.nombre AS distrito
     FROM reportes r JOIN puestos p ON p.id = r.puesto_id JOIN distritos d ON d.id = p.distrito_id
     ${where}
     ORDER BY (r.estado = 'abierto') DESC, r.creado_en DESC`,
    params,
  );
  res.json(rows);
});

// INSPECTOR / ADMIN: cambia el estado del reporte
router.patch('/reportes/:id', requireAuth, requireRol('inspector', 'admin'), async (req, res) => {
  requerido(req.body, ['estado']);
  enLista(req.body.estado, ['abierto', 'en_revision', 'cerrado'], 'estado');
  const { rows } = await db.query(
    'UPDATE reportes SET estado = $1, atendido_por = $2 WHERE id = $3 RETURNING *',
    [req.body.estado, req.usuario.id, entero(req.params.id, 'id')],
  );
  if (!rows[0]) return res.status(404).json({ error: 'Reporte no encontrado' });
  return res.json(rows[0]);
});

module.exports = router;
