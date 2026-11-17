-- Datos de prueba (idempotente). Los usuarios se crean en migrate.js porque la contraseña se cifra con bcrypt.

INSERT INTO distritos (nombre) VALUES
  ('Chorrillos'), ('San Juan de Miraflores'), ('Villa El Salvador'), ('Callao'), ('Comas')
ON CONFLICT (nombre) DO NOTHING;

-- Tres puestos de ejemplo de la vendedora demo, solo si todavía no existen
INSERT INTO puestos (vendedor_id, distrito_id, nombre_comercial, tipo, direccion_referencia,
                     latitud, longitud, producto_declarado, estado)
SELECT u.id, d.id, v.nombre, v.tipo, v.dir, v.lat, v.lon, v.producto, v.estado
FROM (VALUES
  ('Cevichería La Pota de Rosa', 'carretilla',  'Av. Huaylas cdra. 3, frente al mercado', 'Chorrillos',
   -12.1702, -77.0185, 'pota', 'verificado'),
  ('El Rey del Ceviche',         'puesto_fijo', 'Mercado Ciudad de Dios, puesto 45',     'San Juan de Miraflores',
   -12.1580, -76.9710, 'mixto', 'observado'),
  ('Ceviche Al Paso Don Lucho',  'ambulante',   'Paradero Av. Pachacútec y Av. Central', 'Villa El Salvador',
   -12.2130, -76.9370, 'pota', 'pendiente')
) AS v(nombre, tipo, dir, distrito, lat, lon, producto, estado)
JOIN distritos d ON d.nombre = v.distrito
JOIN usuarios u ON u.email = 'vendedora@demo.pe'
WHERE NOT EXISTS (SELECT 1 FROM puestos p WHERE p.nombre_comercial = v.nombre);

INSERT INTO licencias (puesto_id, tipo, numero, fecha_emision, fecha_vencimiento)
SELECT p.id, l.tipo, l.numero, (current_date - 60), (current_date + l.dias)
FROM (VALUES
  ('Cevichería La Pota de Rosa', 'licencia_municipal', 'LM-CHO-0001', 300),
  ('Cevichería La Pota de Rosa', 'carnet_sanidad',     'CS-0001',     300),
  ('El Rey del Ceviche',         'licencia_municipal', 'LM-SJM-0002', 300),
  ('El Rey del Ceviche',         'carnet_sanidad',     'CS-0002',     120)
) AS l(nombre, tipo, numero, dias)
JOIN puestos p ON p.nombre_comercial = l.nombre
ON CONFLICT (tipo, numero) DO NOTHING;

INSERT INTO inspecciones (puesto_id, inspector_id, fecha, temperatura_c, higiene_ok, rotulado_veraz, resultado, observaciones)
SELECT p.id, u.id, now() - (i.dias || ' days')::interval, i.temp, i.higiene, i.rotulado, i.resultado, i.obs
FROM (VALUES
  ('Cevichería La Pota de Rosa', 10, 3.0, true,  true,  'aprobado',  'Conservadora con hielo, rotula "ceviche de pota".'),
  ('El Rey del Ceviche',         20, 7.5, true,  false, 'observado', 'Ofrece la pota como "pescado del día". Temperatura alta.')
) AS i(nombre, dias, temp, higiene, rotulado, resultado, obs)
JOIN puestos p ON p.nombre_comercial = i.nombre
JOIN usuarios u ON u.email = 'inspector@demo.pe'
WHERE NOT EXISTS (SELECT 1 FROM inspecciones x WHERE x.puesto_id = p.id);

INSERT INTO controles_frio (puesto_id, registrado_por, temperatura_c, tiene_hielo, observacion, hora_registro)
SELECT p.id, p.vendedor_id, c.temp, c.hielo, c.obs, now() - (c.horas || ' hours')::interval
FROM (VALUES
  ('Cevichería La Pota de Rosa', 2.5, true,  'Pota recibida en caja con hielo', 3),
  ('El Rey del Ceviche',         6.0, false, 'Se acabó el hielo a mediodía',    5)
) AS c(nombre, temp, hielo, obs, horas)
JOIN puestos p ON p.nombre_comercial = c.nombre
WHERE NOT EXISTS (SELECT 1 FROM controles_frio x WHERE x.puesto_id = p.id);

INSERT INTO reportes (puesto_id, tipo, descripcion)
SELECT p.id, 'producto_no_declarado', 'Me vendieron ceviche "de pescado" pero era pota.'
FROM puestos p
WHERE p.nombre_comercial = 'El Rey del Ceviche'
  AND NOT EXISTS (SELECT 1 FROM reportes r WHERE r.puesto_id = p.id);
