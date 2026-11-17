-- Ceviche Seguro — esquema relacional normalizado (3FN)
-- Idempotente: se puede ejecutar en cada despliegue sin perder datos.

CREATE TABLE IF NOT EXISTS usuarios (
  id            SERIAL PRIMARY KEY,
  nombre        VARCHAR(120) NOT NULL,
  email         VARCHAR(160) NOT NULL UNIQUE,
  password_hash VARCHAR(100) NOT NULL,
  rol           VARCHAR(20)  NOT NULL CHECK (rol IN ('admin', 'inspector', 'vendedor')),
  creado_en     TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS distritos (
  id     SERIAL PRIMARY KEY,
  nombre VARCHAR(80) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS puestos (
  id                   SERIAL PRIMARY KEY,
  vendedor_id          INT          NOT NULL REFERENCES usuarios(id),
  distrito_id          INT          NOT NULL REFERENCES distritos(id),
  nombre_comercial     VARCHAR(120) NOT NULL,
  tipo                 VARCHAR(20)  NOT NULL CHECK (tipo IN ('carretilla', 'puesto_fijo', 'ambulante')),
  direccion_referencia VARCHAR(200) NOT NULL,
  latitud              NUMERIC(9,6),
  longitud             NUMERIC(9,6),
  producto_declarado   VARCHAR(20)  NOT NULL CHECK (producto_declarado IN ('pota', 'pescado', 'mixto')),
  estado               VARCHAR(20)  NOT NULL DEFAULT 'pendiente'
                       CHECK (estado IN ('pendiente', 'verificado', 'observado', 'suspendido')),
  creado_en            TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS licencias (
  id                SERIAL PRIMARY KEY,
  puesto_id         INT         NOT NULL REFERENCES puestos(id) ON DELETE CASCADE,
  tipo              VARCHAR(30) NOT NULL CHECK (tipo IN ('licencia_municipal', 'carnet_sanidad')),
  numero            VARCHAR(40) NOT NULL,
  fecha_emision     DATE        NOT NULL,
  fecha_vencimiento DATE        NOT NULL,
  archivo           VARCHAR(200),
  CHECK (fecha_vencimiento > fecha_emision),
  UNIQUE (tipo, numero)
);

CREATE TABLE IF NOT EXISTS controles_frio (
  id             SERIAL PRIMARY KEY,
  puesto_id      INT          NOT NULL REFERENCES puestos(id) ON DELETE CASCADE,
  registrado_por INT          NOT NULL REFERENCES usuarios(id),
  temperatura_c  NUMERIC(4,1) NOT NULL CHECK (temperatura_c BETWEEN -30 AND 60),
  tiene_hielo    BOOLEAN      NOT NULL,
  observacion    VARCHAR(300),
  hora_registro  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS inspecciones (
  id             SERIAL PRIMARY KEY,
  puesto_id      INT          NOT NULL REFERENCES puestos(id) ON DELETE CASCADE,
  inspector_id   INT          NOT NULL REFERENCES usuarios(id),
  fecha          TIMESTAMPTZ  NOT NULL DEFAULT now(),
  temperatura_c  NUMERIC(4,1) NOT NULL,
  higiene_ok     BOOLEAN      NOT NULL,
  rotulado_veraz BOOLEAN      NOT NULL,
  resultado      VARCHAR(20)  NOT NULL CHECK (resultado IN ('aprobado', 'observado', 'clausurado')),
  observaciones  VARCHAR(500)
);

CREATE TABLE IF NOT EXISTS reportes (
  id           SERIAL PRIMARY KEY,
  puesto_id    INT          NOT NULL REFERENCES puestos(id) ON DELETE CASCADE,
  tipo         VARCHAR(30)  NOT NULL
               CHECK (tipo IN ('producto_no_declarado', 'malestar', 'sin_licencia', 'higiene')),
  descripcion  VARCHAR(500) NOT NULL,
  estado       VARCHAR(20)  NOT NULL DEFAULT 'abierto' CHECK (estado IN ('abierto', 'en_revision', 'cerrado')),
  atendido_por INT REFERENCES usuarios(id),
  creado_en    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_puestos_distrito ON puestos (distrito_id);
CREATE INDEX IF NOT EXISTS idx_controles_puesto_hora ON controles_frio (puesto_id, hora_registro DESC);
CREATE INDEX IF NOT EXISTS idx_inspecciones_puesto_fecha ON inspecciones (puesto_id, fecha DESC);
CREATE INDEX IF NOT EXISTS idx_reportes_puesto_estado ON reportes (puesto_id, estado);
