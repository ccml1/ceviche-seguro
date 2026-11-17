// Pruebas de integración (bottom-up): API + PostgreSQL real.
// Requieren DATABASE_URL apuntando a una base de pruebas (en GitHub Actions la crea un contenedor postgres).
const request = require('supertest');

const conBD = process.env.DATABASE_URL ? describe : describe.skip;

conBD('API Ceviche Seguro', () => {
  let app;
  let db;
  let tokenVendedora;
  let tokenInspector;
  let puestoId;

  async function login(email) {
    const res = await request(app).post('/api/auth/login').send({ email, password: 'Demo1234!' });
    expect(res.status).toBe(200);
    return res.body.token;
  }

  beforeAll(async () => {
    db = require('../../src/db');
    await db.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
    await require('../../db/migrate').migrate({ seed: true });
    app = require('../../src/app').crearApp();
    tokenVendedora = await login('vendedora@demo.pe');
    tokenInspector = await login('inspector@demo.pe');
  });

  afterAll(async () => { await db.pool.end(); });

  test('GET /health responde ok con base de datos', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.db).toBe('ok');
  });

  test('consulta pública lista puestos con sello y producto declarado', async () => {
    const res = await request(app).get('/api/puestos');
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(3);
    const rosa = res.body.find((p) => p.nombre_comercial === 'Cevichería La Pota de Rosa');
    expect(rosa.sello.color).toBe('verde');
    expect(rosa.producto_declarado).toBe('pota');
    const rey = res.body.find((p) => p.nombre_comercial === 'El Rey del Ceviche');
    expect(rey.sello.color).toBe('amarillo');
    expect(rey.sello.motivos).toContain('Producto no rotulado con veracidad');
    const lucho = res.body.find((p) => p.nombre_comercial === 'Ceviche Al Paso Don Lucho');
    expect(lucho.sello.color).toBe('rojo');
  });

  test('filtra puestos por sello', async () => {
    const res = await request(app).get('/api/puestos?sello=verde');
    expect(res.body.every((p) => p.sello.color === 'verde')).toBe(true);
  });

  test('login con contraseña incorrecta devuelve 401', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'vendedora@demo.pe', password: 'x' });
    expect(res.status).toBe(401);
  });

  test('registrar puesto sin sesión devuelve 401', async () => {
    const res = await request(app).post('/api/puestos').send({});
    expect(res.status).toBe(401);
  });

  test('la vendedora registra un puesto nuevo en estado pendiente', async () => {
    const distritos = await request(app).get('/api/distritos');
    const res = await request(app)
      .post('/api/puestos')
      .set('Authorization', `Bearer ${tokenVendedora}`)
      .send({
        nombre_comercial: 'Ceviche Rosa Sucursal Callao',
        tipo: 'carretilla',
        direccion_referencia: 'Av. Sáenz Peña cdra. 2',
        distrito_id: distritos.body.find((d) => d.nombre === 'Callao').id,
        producto_declarado: 'pota',
      });
    expect(res.status).toBe(201);
    expect(res.body.estado).toBe('pendiente');
    puestoId = res.body.id;
  });

  test('la vendedora registra licencia y carnet con archivo adjunto', async () => {
    for (const [tipo, numero] of [['licencia_municipal', 'LM-CAL-0100'], ['carnet_sanidad', 'CS-0100']]) {
      const res = await request(app)
        .post(`/api/puestos/${puestoId}/licencias`)
        .set('Authorization', `Bearer ${tokenVendedora}`)
        .field('tipo', tipo).field('numero', numero)
        .field('fecha_emision', '2026-11-01').field('fecha_vencimiento', '2027-11-01')
        .attach('archivo', Buffer.from('%PDF-1.4 prueba'), { filename: 'carnet.pdf', contentType: 'application/pdf' });
      expect(res.status).toBe(201);
      expect(res.body.archivo).toMatch(/\.pdf$/);
    }
  });

  test('control de frío a 6 °C genera alerta', async () => {
    const res = await request(app)
      .post(`/api/puestos/${puestoId}/controles-frio`)
      .set('Authorization', `Bearer ${tokenVendedora}`)
      .send({ temperatura_c: 6, tiene_hielo: false });
    expect(res.status).toBe(201);
    expect(res.body.enRango).toBe(false);
    expect(res.body.alerta).toMatch(/por encima/);
  });

  test('una vendedora no puede registrar inspecciones (403)', async () => {
    const res = await request(app)
      .post(`/api/puestos/${puestoId}/inspecciones`)
      .set('Authorization', `Bearer ${tokenVendedora}`)
      .send({ temperatura_c: 3, higiene_ok: true, rotulado_veraz: true, resultado: 'aprobado' });
    expect(res.status).toBe(403);
  });

  test('no se aprueba un puesto que vende pota como otro pescado (400)', async () => {
    const res = await request(app)
      .post(`/api/puestos/${puestoId}/inspecciones`)
      .set('Authorization', `Bearer ${tokenInspector}`)
      .send({ temperatura_c: 3, higiene_ok: true, rotulado_veraz: false, resultado: 'aprobado' });
    expect(res.status).toBe(400);
  });

  test('inspección aprobada + control en rango deja el sello en verde', async () => {
    const insp = await request(app)
      .post(`/api/puestos/${puestoId}/inspecciones`)
      .set('Authorization', `Bearer ${tokenInspector}`)
      .send({ temperatura_c: 3, higiene_ok: true, rotulado_veraz: true, resultado: 'aprobado' });
    expect(insp.status).toBe(201);
    await request(app)
      .post(`/api/puestos/${puestoId}/controles-frio`)
      .set('Authorization', `Bearer ${tokenVendedora}`)
      .send({ temperatura_c: 2, tiene_hielo: true });
    const res = await request(app).get(`/api/puestos/${puestoId}`);
    expect(res.body.estado).toBe('verificado');
    expect(res.body.sello.color).toBe('verde');
  });

  test('un consumidor reporta y el inspector cierra el reporte', async () => {
    const creado = await request(app).post('/api/reportes')
      .send({ puesto_id: puestoId, tipo: 'malestar', descripcion: 'Me sentí mal después de comer.' });
    expect(creado.status).toBe(201);
    const bandeja = await request(app).get('/api/reportes?estado=abierto').set('Authorization', `Bearer ${tokenInspector}`);
    expect(bandeja.body.some((r) => r.id === creado.body.id)).toBe(true);
    const cerrado = await request(app).patch(`/api/reportes/${creado.body.id}`)
      .set('Authorization', `Bearer ${tokenInspector}`).send({ estado: 'cerrado' });
    expect(cerrado.body.estado).toBe('cerrado');
  });

  test('el inspector descarga el archivo privado de la licencia', async () => {
    const puesto = await request(app).get(`/api/puestos/${puestoId}`);
    expect(puesto.body.licencias.length).toBe(2);
    const { rows } = await db.query('SELECT archivo FROM licencias WHERE puesto_id = $1 LIMIT 1', [puestoId]);
    const res = await request(app).get(`/api/archivos/${rows[0].archivo}`).set('Authorization', `Bearer ${tokenInspector}`);
    expect(res.status).toBe(200);
  });
});
