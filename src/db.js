const { Pool } = require('pg');
const config = require('./config');

// En Azure Database for PostgreSQL la conexión exige TLS (DB_SSL=true).
// Se valida el certificado del servidor (rejectUnauthorized) en lugar de desactivarlo.
const pool = new Pool({
  connectionString: config.databaseUrl,
  ssl: config.dbSsl ? { rejectUnauthorized: true } : false,
  max: 10,
});

// NUMERIC llega como texto desde pg: lo convertimos a número para la API.
const types = require('pg').types;
types.setTypeParser(1700, (v) => (v === null ? null : parseFloat(v)));

module.exports = { pool, query: (text, params) => pool.query(text, params) };
