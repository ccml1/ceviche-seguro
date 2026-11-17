// Aplica el esquema y, si se pide, carga los datos de demostración.
// Uso: node db/migrate.js            -> esquema + datos demo
//      require('./migrate').migrate({ seed: false })
const fs = require('node:fs');
const path = require('node:path');
const bcrypt = require('bcryptjs');
const { pool } = require('../src/db');

const USUARIOS_DEMO = [
  { nombre: 'Admin Municipal', email: 'admin@demo.pe', rol: 'admin' },
  { nombre: 'Inspector Sanitario', email: 'inspector@demo.pe', rol: 'inspector' },
  { nombre: 'Rosa Quispe', email: 'vendedora@demo.pe', rol: 'vendedor' },
];

async function migrate({ seed = true } = {}) {
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await pool.query(schema);
  if (!seed) return;

  const clave = process.env.DEMO_PASSWORD || 'Demo1234!';
  const hash = await bcrypt.hash(clave, 10);
  for (const u of USUARIOS_DEMO) {
    await pool.query(
      `INSERT INTO usuarios (nombre, email, password_hash, rol) VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO NOTHING`,
      [u.nombre, u.email, hash, u.rol],
    );
  }
  const seedSql = fs.readFileSync(path.join(__dirname, 'seed.sql'), 'utf8');
  await pool.query(seedSql);
}

module.exports = { migrate };

if (require.main === module) {
  migrate({ seed: true })
    .then(() => { console.log('Migración y datos demo aplicados.'); return pool.end(); })
    .catch((err) => { console.error(err); process.exit(1); });
}
