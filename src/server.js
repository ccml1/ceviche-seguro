const config = require('./config');
const { crearApp } = require('./app');
const { migrate } = require('../db/migrate');

// Primero se abre el puerto (App Service da el arranque por bueno y /health informa el estado de la BD);
// luego se aplica el esquema (idempotente) con reintentos, por si la BD tarda en responder.
async function migrarConReintentos(intentos = 6, esperaMs = 10000) {
  for (let i = 1; i <= intentos; i += 1) {
    try {
      await migrate({ seed: config.seedDemo });
      console.log(`Esquema aplicado${config.seedDemo ? ' con datos demo' : ''}.`);
      return;
    } catch (err) {
      console.error(`Migración fallida (intento ${i}/${intentos}): ${err.code || ''} ${err.message}`);
      if (i < intentos) await new Promise((r) => setTimeout(r, esperaMs));
    }
  }
  console.error('No se pudo aplicar el esquema: revisa DATABASE_URL, la integración VNet y que la BD esté encendida.');
}

crearApp().listen(config.port, () => {
  console.log(`Ceviche Seguro escuchando en el puerto ${config.port}`);
  if (config.runMigrations) migrarConReintentos();
});
