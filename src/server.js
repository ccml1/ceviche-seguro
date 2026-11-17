const config = require('./config');
const { crearApp } = require('./app');
const { migrate } = require('../db/migrate');

async function iniciar() {
  // En cada arranque se aplica el esquema (idempotente). Los datos demo solo si SEED_DEMO=true.
  if (config.runMigrations) {
    await migrate({ seed: config.seedDemo });
    console.log(`Esquema aplicado${config.seedDemo ? ' con datos demo' : ''}.`);
  }
  crearApp().listen(config.port, () => console.log(`Ceviche Seguro escuchando en el puerto ${config.port}`));
}

iniciar().catch((err) => {
  console.error('No se pudo iniciar la aplicación:', err);
  process.exit(1);
});
