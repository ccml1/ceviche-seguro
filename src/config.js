// Configuración centralizada: todo sale de variables de entorno (12-factor).
// En Azure App Service se definen como "App settings"; nunca se suben secretos al repositorio.
const config = {
  port: Number(process.env.PORT) || 3000,
  databaseUrl: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/cevicheseguro',
  dbSsl: process.env.DB_SSL === 'true',
  jwtSecret: process.env.JWT_SECRET || 'solo-para-desarrollo-local',
  runMigrations: process.env.RUN_MIGRATIONS !== 'false',
  seedDemo: process.env.SEED_DEMO === 'true',
  storageConnection: process.env.AZURE_STORAGE_CONNECTION_STRING || '',
  storageContainer: process.env.AZURE_STORAGE_CONTAINER || 'licencias',
  // Reglas sanitarias configurables por la municipalidad
  reglas: {
    tempMaxC: Number(process.env.TEMP_MAX_C) || 4,
    diasVigenciaInspeccion: Number(process.env.DIAS_VIGENCIA_INSPECCION) || 90,
    horasVigenciaControl: Number(process.env.HORAS_VIGENCIA_CONTROL) || 24,
  },
};

module.exports = config;
