const express = require('express');
const multer = require('multer');
const db = require('../db');
const config = require('../config');
const storage = require('../storage');
const { requireAuth, requireRol } = require('../auth');
const { calcularSello, evaluarControlFrio, validarInspeccion, ESTADO_POR_RESULTADO } = require('../domain/sello');
const { requerido, enLista, numero, booleano, entero, ErrorValidacion } = require('../validar');

const router = express.Router();
const subida = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, archivo, cb) => cb(null, /^(image\/(png|jpeg)|application\/pdf)$/.test(archivo.mimetype)),
});

// Consulta con lo último de cada puesto (inspección, control de frío, licencias y reportes abiertos)
const SQL_PUESTOS = `
  SELECT p.id, p.nombre_comercial, p.tipo, p.direccion_referencia, p.latitud, p.longitud,
         p.producto_declarado, p.estado, p.vendedor_id, d.nombre AS distrito,
         (SELECT row_to_json(i) FROM (SELECT fecha, resultado, rotulado_veraz, temperatura_c
            FROM inspecciones WHERE puesto_id = p.id ORDER BY fecha DESC LIMIT 1) i) AS ultima_inspeccion,
         (SELECT row_to_json(c) FROM (SELECT temperatura_c, tiene_hielo, hora_registro
            FROM controles_frio WHERE puesto_id = p.id ORDER BY hora_registro DESC LIMIT 1) c) AS ultimo_control,
         COALESCE((SELECT json_agg(json_build_object('tipo', l.tipo, 'numero', l.numero,
            'fecha_vencimiento', l.fecha_vencimiento)) FROM licencias l WHERE l.puesto_id = p.id), '[]') AS licencias,
         (SELECT count(*) FROM reportes r WHERE r.puesto_id = p.id AND r.estado <> 'cerrado')::int AS reportes_abiertos
  FROM puestos p JOIN distritos d ON d.id = p.distrito_id`;

function conSello(puesto) {
  return { ...puesto, sello: calcularSello(puesto, new Date(), config.reglas) };
}

async function puestoPropio(req) {
  const id = entero(req.params.id, 'id');
  const { rows } = await db.query('SELECT id, vendedor_id FROM puestos WHERE id = $1', [id]);
  if (!rows[0]) return { error: 404 };
  if (req.usuario.rol === 'vendedor' && rows[0].vendedor_id !== req.usuario.id) return { error: 403 };
  return { id };
}

// Catálogo de distritos para los formularios
router.get('/distritos', async (_req, res) => {
  const { rows } = await db.query('SELECT id, nombre FROM distritos ORDER BY nombre');
  res.json(rows);
});

// PÚBLICO: el consumidor busca puestos y ve su sello sanitario y el producto declarado
router.get('/puestos', async (req, res) => {
  const filtros = [];
  const params = [];
  if (req.query.distrito) { params.push(req.query.distrito); filtros.push(`d.nombre = $${params.length}`); }
  if (req.query.producto) { params.push(req.query.producto); filtros.push(`p.producto_declarado = $${params.length}`); }
  const where = filtros.length ? ` WHERE ${filtros.join(' AND ')}` : '';
  const { rows } = await db.query(`${SQL_PUESTOS}${where} ORDER BY p.nombre_comercial`, params);
  let puestos = rows.map(conSello);
  if (req.query.sello) puestos = puestos.filter((p) => p.sello.color === req.query.sello);
  res.json(puestos);
});

router.get('/puestos/mios', requireAuth, requireRol('vendedor'), async (req, res) => {
  const { rows } = await db.query(`${SQL_PUESTOS} WHERE p.vendedor_id = $1 ORDER BY p.id`, [req.usuario.id]);
  res.json(rows.map(conSello));
});

router.get('/puestos/:id', async (req, res) => {
  const id = entero(req.params.id, 'id');
  const { rows } = await db.query(`${SQL_PUESTOS} WHERE p.id = $1`, [id]);
  if (!rows[0]) return res.status(404).json({ error: 'Puesto no encontrado' });
  return res.json(conSello(rows[0]));
});

// VENDEDOR: registra su puesto (queda pendiente hasta la inspección)
router.post('/puestos', requireAuth, requireRol('vendedor'), async (req, res) => {
  const b = req.body;
  requerido(b, ['nombre_comercial', 'tipo', 'direccion_referencia', 'distrito_id', 'producto_declarado']);
  enLista(b.tipo, ['carretilla', 'puesto_fijo', 'ambulante'], 'tipo');
  enLista(b.producto_declarado, ['pota', 'pescado', 'mixto'], 'producto_declarado');
  const { rows } = await db.query(
    `INSERT INTO puestos (vendedor_id, distrito_id, nombre_comercial, tipo, direccion_referencia,
                          latitud, longitud, producto_declarado)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [req.usuario.id, entero(b.distrito_id, 'distrito_id'), b.nombre_comercial, b.tipo, b.direccion_referencia,
      b.latitud ?? null, b.longitud ?? null, b.producto_declarado],
  );
  res.status(201).json(rows[0]);
});

// VENDEDOR: registra licencia municipal o carnet de sanidad (con foto opcional)
router.post('/puestos/:id/licencias', requireAuth, requireRol('vendedor'), subida.single('archivo'), async (req, res) => {
  const propio = await puestoPropio(req);
  if (propio.error) return res.status(propio.error).json({ error: 'Puesto no disponible' });
  const b = req.body;
  requerido(b, ['tipo', 'numero', 'fecha_emision', 'fecha_vencimiento']);
  enLista(b.tipo, ['licencia_municipal', 'carnet_sanidad'], 'tipo');
  const archivo = req.file ? await storage.guardar(req.file) : null;
  const { rows } = await db.query(
    `INSERT INTO licencias (puesto_id, tipo, numero, fecha_emision, fecha_vencimiento, archivo)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [propio.id, b.tipo, b.numero, b.fecha_emision, b.fecha_vencimiento, archivo],
  );
  return res.status(201).json(rows[0]);
});

// VENDEDOR: control diario de cadena de frío; responde con alerta si supera el máximo
router.post('/puestos/:id/controles-frio', requireAuth, requireRol('vendedor'), async (req, res) => {
  const propio = await puestoPropio(req);
  if (propio.error) return res.status(propio.error).json({ error: 'Puesto no disponible' });
  requerido(req.body, ['temperatura_c', 'tiene_hielo']);
  const temperatura = numero(req.body.temperatura_c, 'temperatura_c');
  const { rows } = await db.query(
    `INSERT INTO controles_frio (puesto_id, registrado_por, temperatura_c, tiene_hielo, observacion)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [propio.id, req.usuario.id, temperatura, booleano(req.body.tiene_hielo, 'tiene_hielo'), req.body.observacion || null],
  );
  return res.status(201).json({ control: rows[0], ...evaluarControlFrio(temperatura, config.reglas.tempMaxC) });
});

// INSPECTOR: registra la inspección y actualiza el estado del puesto en una transacción
router.post('/puestos/:id/inspecciones', requireAuth, requireRol('inspector', 'admin'), async (req, res) => {
  const id = entero(req.params.id, 'id');
  const b = req.body;
  requerido(b, ['temperatura_c', 'higiene_ok', 'rotulado_veraz', 'resultado']);
  enLista(b.resultado, ['aprobado', 'observado', 'clausurado'], 'resultado');
  const datos = {
    resultado: b.resultado,
    higiene_ok: booleano(b.higiene_ok, 'higiene_ok'),
    rotulado_veraz: booleano(b.rotulado_veraz, 'rotulado_veraz'),
  };
  const error = validarInspeccion(datos);
  if (error) throw new ErrorValidacion(error);

  const cliente = await db.pool.connect();
  try {
    await cliente.query('BEGIN');
    const existe = await cliente.query('SELECT id FROM puestos WHERE id = $1 FOR UPDATE', [id]);
    if (!existe.rows[0]) {
      await cliente.query('ROLLBACK');
      return res.status(404).json({ error: 'Puesto no encontrado' });
    }
    const { rows } = await cliente.query(
      `INSERT INTO inspecciones (puesto_id, inspector_id, temperatura_c, higiene_ok, rotulado_veraz, resultado, observaciones)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [id, req.usuario.id, numero(b.temperatura_c, 'temperatura_c'), datos.higiene_ok, datos.rotulado_veraz,
        datos.resultado, b.observaciones || null],
    );
    await cliente.query('UPDATE puestos SET estado = $1 WHERE id = $2', [ESTADO_POR_RESULTADO[datos.resultado], id]);
    await cliente.query('COMMIT');
    return res.status(201).json(rows[0]);
  } catch (err) {
    await cliente.query('ROLLBACK');
    throw err;
  } finally {
    cliente.release();
  }
});

// INSPECTOR / ADMIN: descarga el archivo de una licencia (el contenedor de Blob Storage es privado)
router.get('/archivos/:nombre', requireAuth, requireRol('inspector', 'admin'), async (req, res) => {
  const contenido = await storage.leer(req.params.nombre);
  res.type(req.params.nombre.split('.').pop() || 'application/octet-stream').send(contenido);
});

module.exports = router;
