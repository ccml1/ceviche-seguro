const path = require('node:path');
const express = require('express');
const helmet = require('helmet');
const multer = require('multer');
const db = require('./db');

function crearApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(express.json({ limit: '100kb' }));

  // Sonda de salud: la usa el health check de App Service y la prueba de humo del pipeline
  app.get('/health', async (_req, res) => {
    try {
      await db.query('SELECT 1');
      res.json({ status: 'ok', db: 'ok', version: process.env.APP_VERSION || 'local' });
    } catch {
      res.status(503).json({ status: 'error', db: 'sin conexión' });
    }
  });

  app.use('/api', require('./routes/auth'));
  app.use('/api', require('./routes/puestos'));
  app.use('/api', require('./routes/reportes'));
  app.use('/api', (_req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));

  // Frontend estático (HTML + JS) servido por el mismo App Service
  app.use(express.static(path.join(__dirname, '..', 'public')));

  // Manejo centralizado de errores
  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    if (err.status === 400 || err instanceof multer.MulterError) {
      return res.status(400).json({ error: err.message });
    }
    if (err.code === '23505') return res.status(409).json({ error: 'Registro duplicado' });
    if (err.code === '23503' || err.code === '23514' || err.code === '22P02' || err.code === '22007') {
      return res.status(400).json({ error: 'Datos inválidos' });
    }
    console.error(err);
    return res.status(500).json({ error: 'Error interno' });
  });

  return app;
}

module.exports = { crearApp };
