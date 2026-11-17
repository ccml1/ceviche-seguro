// Informe de la PC (Word). Ejecutar desde la raíz:  npm run informe
// Lee diagramas (docs/diagramas), Scrum (docs/scrum/backlog.json), capturas (docs/capturas) y código real del repo.
// Para otro caso: cambia los textos de las constantes de cada sección (intro, etapas, stack, servicios, preguntas...).
const fs = require('fs');
const path = require('path');
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell,
  WidthType, ShadingType, BorderStyle, ImageRun, PageBreak, LevelFormat, Footer, PageNumber,
  TableOfContents, Header, PageOrientation,
} = require('docx');

const P = path.resolve(__dirname, '../..'); // raíz del repositorio
const DIAG = `${P}/docs/diagramas`;
const SCRUM = `${P}/docs/scrum`;
const CAPT = `${P}/docs/capturas`;
const backlog = JSON.parse(fs.readFileSync(`${SCRUM}/backlog.json`, 'utf8'));

const FONT = 'Arial';
const CONTENT_W = 9638; // A4 con márgenes de 2 cm
const AZUL = '1F4E79';
const GRIS = 'F2F2F2';

// ---------- utilidades ----------
function runs(texto, base = {}) {
  // **negrita** y `código`
  const out = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let i = 0; let m;
  while ((m = re.exec(texto))) {
    if (m.index > i) out.push(new TextRun({ text: texto.slice(i, m.index), ...base }));
    const t = m[0];
    if (t.startsWith('**')) out.push(new TextRun({ text: t.slice(2, -2), bold: true, ...base }));
    else out.push(new TextRun({ text: t.slice(1, -1), font: 'Consolas', size: 19, ...base }));
    i = m.index + t.length;
  }
  if (i < texto.length) out.push(new TextRun({ text: texto.slice(i), ...base }));
  return out;
}
const p = (t, o = {}) => new Paragraph({ children: runs(t), spacing: { after: 120, line: 276 }, ...o });
const h1 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(t)] });
const h2 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(t)] });
const h3 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun(t)] });
const li = (t, nivel = 0) => new Paragraph({ numbering: { reference: 'vinetas', level: nivel }, children: runs(t), spacing: { after: 60 } });
const num = (t, ref = 'numeros') => new Paragraph({ numbering: { reference: ref, level: 0 }, children: runs(t), spacing: { after: 60 } });
const salto = () => new Paragraph({ children: [new PageBreak()] });

const borde = { style: BorderStyle.SINGLE, size: 4, color: 'BFBFBF' };
const bordes = { top: borde, bottom: borde, left: borde, right: borde };

function tabla(cabecera, filas, anchos) {
  const total = anchos.reduce((a, b) => a + b, 0);
  const celda = (txt, i, esCab) => new TableCell({
    width: { size: anchos[i], type: WidthType.DXA },
    borders: bordes,
    shading: esCab ? { type: ShadingType.CLEAR, color: 'auto', fill: AZUL } : undefined,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    children: String(txt).split('\n').map((linea) => new Paragraph({
      children: runs(linea, esCab ? { bold: true, color: 'FFFFFF', size: 19 } : { size: 19 }),
      spacing: { after: 20 },
    })),
  });
  return new Table({
    width: { size: total, type: WidthType.DXA },
    columnWidths: anchos,
    rows: [
      new TableRow({ tableHeader: true, children: cabecera.map((c, i) => celda(c, i, true)) }),
      ...filas.map((f) => new TableRow({ children: f.map((c, i) => celda(c, i, false)) })),
    ],
  });
}
const espacio = () => new Paragraph({ children: [], spacing: { after: 80 } });

function pngSize(file) {
  const b = fs.readFileSync(file);
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}
function imagen(file, anchoPx = 640, pie) {
  const { w, h } = pngSize(file);
  const alto = Math.round((anchoPx * h) / w);
  const maxAlto = anchoPx > 700 ? 520 : 820;
  const [fw, fh] = alto > maxAlto ? [Math.round((maxAlto * w) / h), maxAlto] : [anchoPx, alto];
  const out = [new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 80, after: 40 },
    children: [new ImageRun({ type: 'png', data: fs.readFileSync(file), transformation: { width: fw, height: fh } })],
  })];
  if (pie) out.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 160 }, children: [new TextRun({ text: pie, italics: true, size: 18, color: '595959' })] }));
  return out;
}
function captura(texto) {
  // Espacio reservado para evidencia real (Jira, GitHub, Azure)
  const b = { style: BorderStyle.DASHED, size: 8, color: 'C00000' };
  return new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: [CONTENT_W],
    rows: [new TableRow({ children: [new TableCell({
      width: { size: CONTENT_W, type: WidthType.DXA },
      borders: { top: b, bottom: b, left: b, right: b },
      shading: { type: ShadingType.CLEAR, color: 'auto', fill: 'FFF5F5' },
      margins: { top: 500, bottom: 500, left: 200, right: 200 },
      children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `[INSERTAR CAPTURA] ${texto}`, bold: true, color: 'C00000', size: 20 })] })],
    })] })],
  });
}
function codigo(texto, titulo) {
  const out = [];
  if (titulo) out.push(new Paragraph({ spacing: { before: 80, after: 40 }, children: [new TextRun({ text: titulo, bold: true, size: 18, color: '595959' })] }));
  const lineas = texto.replace(/\t/g, '  ').split('\n');
  out.push(new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: [CONTENT_W],
    rows: [new TableRow({ children: [new TableCell({
      width: { size: CONTENT_W, type: WidthType.DXA },
      borders: bordes,
      shading: { type: ShadingType.CLEAR, color: 'auto', fill: GRIS },
      margins: { top: 80, bottom: 80, left: 140, right: 140 },
      children: lineas.map((l) => new Paragraph({ spacing: { after: 0, line: 240 }, children: [new TextRun({ text: l || ' ', font: 'Consolas', size: 16 })] })),
    })] })],
  }));
  out.push(espacio());
  return out;
}
function extracto(file, desde, hasta) {
  return fs.readFileSync(file, 'utf8').split('\n').slice(desde - 1, hasta).join('\n');
}
function lineasDe(file, inicio, fin) {
  const t = fs.readFileSync(file, 'utf8').split('\n');
  const a = t.findIndex((l) => l.includes(inicio));
  const b = t.findIndex((l, i) => i > a && l.includes(fin));
  return t.slice(a, b + 1).join('\n');
}

// ---------- contenido ----------
const H = backlog.historias;
const hu = (id) => H.find((h) => h.id === id);
const ptsSprint = (s) => s.historias.reduce((a, id) => a + hu(id).pts, 0);

const portada = [
  new Paragraph({ spacing: { before: 1800, after: 120 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'PRÁCTICA CALIFICADA 2 — PFC III', bold: true, size: 28, color: '595959' })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 120 }, children: [new TextRun({ text: 'Caso 4: Vendedores de ceviche de pota', size: 26 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 600, after: 120 }, children: [new TextRun({ text: 'Ceviche Seguro', bold: true, size: 56, color: AZUL })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 1200 }, children: [new TextRun({ text: 'Plataforma de formalización, fiscalización y transparencia sanitaria para la venta de ceviche de pota en Lima', italics: true, size: 24 })] }),
  tabla(['Dato', 'Detalle'], [
    ['Curso', 'Proyecto de Fin de Carrera III (PFC III)'],
    ['Docente', 'Kenny Neira'],
    ['Estudiante', '[Nombre completo y código]'],
    ['URL pública de la solución', 'https://[nombre-app].azurewebsites.net'],
    ['Repositorio GitHub', 'https://github.com/[usuario]/ceviche-seguro'],
    ['Tablero Jira', 'https://[sitio].atlassian.net/jira/software/projects/CS/boards/[n]'],
    ['Fecha', '[dd/mm/2026]'],
  ], [3000, 6638]),
  salto(),
];

const indice = [
  new Paragraph({ children: [new TextRun({ text: 'Contenido', bold: true, size: 32, font: FONT })], spacing: { after: 200 } }),
  new TableOfContents('Contenido', { hyperlink: true, headingStyleRange: '1-2' }),
  p('_(Si el índice aparece vacío, en Word: clic derecho sobre él > Actualizar campos.)_'.replace(/_/g, '')),
  salto(),
];

const intro = [
  h1('0. Problema y propuesta de solución'),
  p('En Lima se vende ceviche de pota a bajo precio con **marisco crudo sin cadena de frío garantizada ni control sanitario**, por **vendedores sin licencia**, y en muchos casos **la pota se vende como si fuera otro pescado**. El consumidor no tiene cómo saber, antes de comer, si el puesto es seguro; la municipalidad no tiene un registro único para fiscalizar; y el vendedor que sí quiere formalizarse no tiene cómo demostrarlo.'),
  p('**Ceviche Seguro** es una aplicación web con tres actores principales:'),
  li('**Consumidor (sin cuenta):** busca puestos por distrito y ve un **sello sanitario verde, amarillo o rojo** con los motivos, y el **producto que el puesto declara vender** (pota, pescado o mixto). Puede **reportar** un puesto.'),
  li('**Vendedor:** registra su puesto y el producto que vende, carga su **licencia municipal y carnet de sanidad**, y registra el **control de frío** de su conservadora (el sistema alerta si supera 4 °C).'),
  li('**Inspector municipal:** registra inspecciones (higiene, temperatura y **veracidad del rotulado**). El sistema **impide aprobar** un puesto que vende pota como otro pescado. Atiende los reportes ciudadanos.'),
  p('El sello se calcula con reglas explícitas y probadas: **rojo** si no hay licencia o carnet vigentes, o si el puesto está suspendido o clausurado; **verde** solo si además el puesto está verificado, tiene una inspección aprobada reciente, rotulado veraz y un control de frío de las últimas 24 horas a 4 °C o menos; **amarillo** en cualquier otro caso.'),
  salto(),
];

// P1
const etapas = [
  ['Plan', 'Product Backlog, épicas, sprints y tablero', 'Jira'],
  ['Code', 'Ramas `feature/CS-n` por historia; commits con la clave de Jira', 'Git, GitHub, VS Code / Claude Code'],
  ['Build', '`npm ci` y revisión de sintaxis en cada Pull Request', 'GitHub Actions, npm'],
  ['Test', 'Pruebas unitarias (reglas del sello) e integración (API + PostgreSQL de servicio); cobertura; `npm audit` (DevSecOps)', 'Jest, Supertest, npm audit'],
  ['Release', 'Merge de `develop` a `main` por Pull Request revisado; tag por sprint; artefacto `app.zip`', 'GitHub (PR, tags, artifacts)'],
  ['Deploy', 'Despliegue automático a App Service al hacer push a `main`', 'GitHub Actions + azure/webapps-deploy'],
  ['Operate', 'App Service con health check en `/health`; migraciones idempotentes al arrancar', 'Azure App Service, PostgreSQL Flexible Server'],
  ['Monitor', 'Telemetría, errores y tiempos de respuesta; prueba de humo post despliegue', 'Application Insights'],
];
const stack = [
  ['Frontend', 'HTML, CSS y JavaScript sin framework', 'Carga rápida en celulares de gama baja y datos móviles (el consumidor consulta en la calle, frente al puesto). Cero dependencias que mantener.'],
  ['Backend', 'Node.js 22 LTS + Express 5', 'Un solo lenguaje (JavaScript) en front y back; API REST simple; versión LTS soportada en Azure App Service.'],
  ['Base de datos', 'PostgreSQL 16 (Azure Database for PostgreSQL Flexible Server)', 'Los datos son relacionales y con reglas de integridad: un puesto tiene licencias, controles e inspecciones; una licencia no puede repetirse ni vencer antes de emitirse. Transacciones para que la inspección y el cambio de estado del puesto ocurran juntos.'],
  ['Archivos', 'Azure Blob Storage (contenedor privado)', 'Las licencias y carnets son evidencias legales: se guardan fuera del servidor, sin acceso público, y solo el inspector las descarga.'],
  ['Seguridad', 'JWT + bcrypt, Helmet, roles, `npm audit` en CI', 'Separa lo que puede hacer cada rol (un vendedor no puede aprobarse a sí mismo). La seguridad entra en el pipeline (DevSecOps).'],
  ['Pruebas', 'Jest + Supertest', 'La regla crítica del caso (no aprobar pota mal rotulada, sello por cadena de frío) queda cubierta por pruebas automáticas.'],
  ['CI/CD', 'GitHub Actions', 'Integrado al repositorio; PostgreSQL real como contenedor de servicio en las pruebas; despliegue a Azure con un paso.'],
  ['Nube', 'Microsoft Azure (Azure for Students)', 'Crédito educativo disponible; servicios administrados (PaaS) que evitan administrar servidores; región cercana a Perú para menor latencia.'],
  ['Gestión', 'Jira + GitHub', 'Historias en Jira con clave `CS-n` que se repite en ramas, commits y PR: trazabilidad de la historia al código.'],
];
const p1 = [
  h1('P1. DevOps y stack tecnológico justificado'),
  h2('1.1 ¿Qué es DevOps?'),
  p('DevOps es la **metodología de desarrollo de software que acelera la entrega de aplicaciones y servicios de mayor calidad combinando y automatizando el trabajo de los equipos de desarrollo de software y operaciones de TI**. Es, ante todo, un **enfoque cultural y colaborativo**: une **Desarrollo, QA y Operaciones** para cerrar la "brecha DevOps" (despliegues lentos, caros y riesgosos). El rol que lo sostiene en operación es el **SRE (Site Reliability Engineer)**.'),
  p('Su ciclo es infinito: **Plan → Code → Build → Test → Release → Deploy → Operate → Monitor**. El lado izquierdo es la **integración continua (CI: build, test y merge)** y el derecho la **entrega/despliegue continuo (CD)**: si una prueba no pasa, el cambio no avanza; si pasa, se despliega automáticamente.'),
  h2('1.2 Cómo aplico cada etapa en Ceviche Seguro'),
  tabla(['Etapa', 'Qué hago en este proyecto', 'Herramienta'], etapas, [1300, 5338, 3000]),
  espacio(),
  h2('1.3 Stack justificado'),
  tabla(['Capa', 'Tecnología', 'Justificación'], stack, [1400, 2600, 5638]),
  espacio(),
  h2('1.4 Vínculo con el problema'),
  li('**El sello sanitario debe ser confiable.** Si una regla falla (por ejemplo, aprobar un puesto que vende pota como pescado), el consumidor se intoxica o es engañado. Por eso las reglas están en funciones puras con pruebas unitarias, y **el pipeline bloquea cualquier cambio que las rompa**.'),
  li('**Las reglas cambian por ordenanza.** El límite de temperatura (4 °C), la vigencia de una inspección (90 días) o la del control de frío (24 horas) están parametrizados; con CI/CD un cambio de regla llega a producción en minutos y probado.'),
  li('**El problema está en la calle, todos los días.** El monitoreo (Application Insights y `/health`) detecta caídas en horas de venta; App Service permite escalar instancias si un operativo municipal o una noticia dispara las consultas.'),
  li('**Datos sensibles y evidencias legales.** La base de datos no tiene IP pública (solo es accesible desde la red virtual) y los archivos de licencias son privados. `npm audit` en el pipeline aplica DevSecOps: la seguridad no existe; se trata de hacerla más difícil de vulnerar.'),
  salto(),
];

// P2
const servicios = [
  ['Distribución / CDN / WAF', 'Azure Front Door Standard', 'Punto de entrada global con TLS y caché; el WAF filtra ataques antes de llegar a la aplicación. Opcional por costo: se activa para la demostración.'],
  ['Balanceador de carga', 'Balanceador integrado de Azure App Service', 'Reparte el tráfico entre las instancias del plan; al escalar a más instancias no se cambia nada en la aplicación.'],
  ['Cómputo', 'Azure App Service (plan Linux B1) — Web App Node 22 LTS', 'PaaS: no administro servidores; HTTPS obligatorio, health check `/health`, despliegue desde GitHub Actions.'],
  ['Base de datos administrada', 'Azure Database for PostgreSQL Flexible Server (Burstable B1ms, v16)', 'Copias de seguridad y parches administrados; acceso privado por VNet, sin IP pública; se puede detener para ahorrar crédito.'],
  ['Almacenamiento', 'Azure Blob Storage (Standard LRS, contenedor privado)', 'Licencias y carnets en PDF o imagen; sin acceso público; TLS 1.2 mínimo.'],
  ['Red', 'Azure Virtual Network 10.10.0.0/16 con subredes `snet-app` (integración de App Service) y `snet-db` (PostgreSQL)', 'Aísla la base de datos: solo la aplicación, desde su subred delegada, llega al puerto 5432.'],
  ['Monitoreo', 'Application Insights', 'Telemetría, errores y tiempos de respuesta (etapa Monitor de DevOps).'],
  ['CI/CD', 'GitHub Actions', 'Build, pruebas, auditoría y despliegue automático.'],
  ['Región', 'La región permitida más cercana a Perú (por ejemplo Brazil South si la política de la suscripción la habilita)', 'Menor latencia para usuarios en Lima. Azure for Students limita las regiones por suscripción.'],
];
const p2 = [
  h1('P2. Diagramas'),
  h2('2.1 Diagrama UML de casos de uso'),
  ...imagen(`${DIAG}/casos-uso.png`, 640, 'Figura 1. Casos de uso de Ceviche Seguro'),
  p('**Actores:** Consumidor (sin cuenta), Vendedor, Inspector municipal y Administrador (el Administrador hereda los casos del Inspector, por eso la generalización). **«include»:** ver el sello y registrar una inspección siempre ejecutan el cálculo del sello. **«extend»:** la alerta de temperatura solo ocurre cuando el control de frío supera 4 °C.'),
  h2('2.2 Arquitectura lógica'),
  ...imagen(`${DIAG}/logica.png`, 640, 'Figura 2. Arquitectura lógica (componentes y cómo se comunican)'),
  p('Muestra **los componentes y cómo se comunican**: la aplicación web consume la API REST por HTTPS/JSON; la API valida el rol con JWT; los módulos de puestos, frío e inspecciones alimentan al **motor del sello**; todo persiste en PostgreSQL y los archivos van al almacén de archivos. La lógica no cambia aunque cambie el proveedor de nube.'),
  salto(),
  h2('2.3 Arquitectura física en la nube (Microsoft Azure)'),
  ...imagen(`${DIAG}/fisica-azure.png`, 560, 'Figura 3. Arquitectura física en Azure con servicios reales'),
  tabla(['Elemento', 'Servicio real de Azure', 'Función y justificación'], servicios, [1900, 3300, 4438]),
  espacio(),
  salto(),
];

// P3
const filasBacklog = H.map((h) => [h.id, backlog.epicas[h.epica], `Como ${h.rol}, quiero ${h.quiero}, para ${h.para}.`, String(h.pts), h.moscow, h.sprint ? `S${h.sprint}` : '—']);
const huDetalle = [];
H.filter((h) => h.sprint).forEach((h) => {
  huDetalle.push(new Paragraph({ spacing: { before: 160, after: 60 }, keepNext: true, children: [new TextRun({ text: `${h.id} · ${h.pts} pts · ${h.moscow} · Sprint ${h.sprint}`, bold: true, color: AZUL })] }));
  huDetalle.push(p(`**Como** ${h.rol}, **quiero** ${h.quiero}, **para** ${h.para}.`, { keepNext: true }));
  h.ca.forEach((c) => huDetalle.push(li(c.replace(/^(Dad[oa]s?) /, '**$1** ').replace(', cuando ', ', **cuando** ').replace(', entonces ', ', **entonces** '))));
});
const filasSprints = backlog.sprints.map((s) => [`Sprint ${s.n}`, s.objetivo + (s.nota ? `\n${s.nota}` : ''), s.historias.join(', '), `${ptsSprint(s)} / ${backlog.velocidad_planificada}`]);
const tareas = backlog.sprint1_tareas.map(([id, t, hrs]) => [id, t, `${hrs} h`, 'To Do']);
const ceremonias = [
  ['Sprint Planning', 'Primer día del sprint (2 h)', 'Product Owner, Scrum Master, equipo', 'Sprint Goal y Sprint Backlog: historias del backlog priorizado hasta la velocidad, divididas en tareas. Estimación con planning poker.'],
  ['Daily Scrum', 'Todos los días, 15 min, misma hora', 'Equipo (SM facilita)', '¿Qué hice ayer? ¿Qué haré hoy? ¿Qué me bloquea? Se mueve el tablero y se actualiza el burndown.'],
  ['Sprint Review', 'Último día (1 h)', 'Equipo, PO e interesados (municipalidad, vendedores)', 'Demo del incremento en la URL pública; cada historia se marca cumplida o no según sus criterios; lo no cumplido vuelve al backlog. Se refina el backlog.'],
  ['Sprint Retrospective', 'Después de la Review (45 min)', 'Equipo y SM', 'Feedback sándwich: lo bueno, lo malo o no hecho, y un compromiso de mejora para el siguiente sprint. Es la ceremonia más importante: ahí mejora el equipo.'],
];
const dod = [
  'Código en una rama `feature/CS-n` con commits descriptivos que llevan la clave de la historia.',
  'Pull Request hacia `develop` revisado y aprobado por otra persona.',
  'Pipeline de CI en verde: build, pruebas unitarias e integración, y `npm audit` sin vulnerabilidades altas.',
  'Todos los criterios de aceptación de la historia verificados (cumplido / no cumplido).',
  'Cobertura de pruebas del módulo nuevo o modificado de al menos 70 %.',
  'Desplegado en la URL pública y probado ahí (no solo en local).',
  'Historia movida a Done en Jira, con el enlace al PR.',
];
const p3 = [
  h1('P3. Gestión ágil con Scrum'),
  h2('3.1 Roles'),
  tabla(['Rol', 'Responsable', 'Responsabilidad en este proyecto'], [
    ['Product Owner', '[Nombre]', 'Representa a la municipalidad y al consumidor; prioriza el backlog (MoSCoW) y acepta las historias en la Review.'],
    ['Scrum Master', '[Nombre]', 'Facilita las ceremonias, quita bloqueos (por ejemplo, accesos a Azure) y cuida que se cumpla la DoD.'],
    ['Equipo de desarrollo', '[Nombres]', 'Diseña, programa, prueba y despliega; estima con planning poker.'],
  ], [2000, 2000, 5638]),
  espacio(),
  h2('3.2 Visión y Product Backlog'),
  p(`**Visión:** ${backlog.vision}`),
  p(`**Épicas:** ${Object.entries(backlog.epicas).map(([k, v]) => `${k} ${v}`).join(' · ')}. El backlog está priorizado con **MoSCoW** (Must, Should, Could, Won't) y estimado en **story points**.`),
  tabla(['ID', 'Épica', 'Historia de usuario', 'Pts', 'MoSCoW', 'Sprint'], filasBacklog, [700, 1500, 4838, 550, 1250, 800]),
  espacio(),
  h2('3.3 Historias de usuario con criterios de aceptación'),
  p('Formato: **Como** [usuario], **quiero** [acción], **para** [beneficio]. Criterios en formato **Dado / cuando / entonces**, verificables como cumplido o no cumplido.'),
  ...huDetalle,
  h2('3.4 Estimación: story points y planning poker'),
  p('Cada historia se estimó con **planning poker** usando la serie de **Fibonacci (1, 2, 3, 5, 8, 13)**: cada integrante muestra su carta a la vez; si hay diferencias grandes, quienes dieron el valor más alto y el más bajo explican su razonamiento y se vuelve a votar hasta converger. Los puntos miden **complejidad, esfuerzo e incertidumbre**, no horas. Ejemplo: CS-2 (consulta con sello) se estimó en 8 porque combina reglas de negocio, consulta SQL con subconsultas e interfaz; CS-9 (crear inspectores) en 2 porque reutiliza la autenticación.'),
  p(`**Velocidad:** se planifica con una velocidad inicial de **${backlog.velocidad_planificada} story points por sprint de ${backlog.duracion_sprint}**. Después de cada sprint se recalcula con el promedio de puntos realmente terminados (Done según la DoD); lo no terminado no suma.`),
  h2('3.5 Plan de sprints y Sprint Goals'),
  tabla(['Sprint', 'Sprint Goal', 'Historias', 'Pts / velocidad'], filasSprints, [1000, 5238, 1900, 1500]),
  espacio(),
  h2('3.6 Sprint Backlog del Sprint 1'),
  p(`**Sprint Goal:** ${backlog.sprints[0].objetivo}`),
  tabla(['Historia', 'Tarea', 'Estimado', 'Estado inicial'], tareas, [1100, 5638, 1300, 1600]),
  espacio(),
  h2('3.7 Ceremonias'),
  tabla(['Ceremonia', 'Cuándo / duración', 'Participantes', 'Resultado'], ceremonias, [1700, 1900, 2000, 4038]),
  espacio(),
  h2('3.8 Definition of Done (DoD)'),
  ...dod.map((d) => num(d, 'dod')),
  p('**Diferencia:** los **criterios de aceptación** son propios de cada historia (qué debe hacer); la **DoD** es común a todas (cuándo algo está realmente terminado).'),
  h2('3.9 Evidencia: tablero To Do / In Progress / Done y burndown'),
  captura('Tablero de Jira del Sprint 1 con columnas To Do / In Progress / Done (filtrado por el proyecto CS)'),
  espacio(),
  captura('Tablero de Jira al cierre del sprint (todas las historias en Done)'),
  espacio(),
  ...imagen(`${SCRUM}/burndown-sprint1.png`, 560, 'Figura 4. Burndown del Sprint 1 (ilustrativo; reemplazar por el burndown real de Jira: Reports > Burndown Chart)'),
  salto(),
];

// P4
const schemaPuestos = lineasDe(`${P}/db/schema.sql`, 'CREATE TABLE IF NOT EXISTS puestos', ');');
const schemaInsp = lineasDe(`${P}/db/schema.sql`, 'CREATE TABLE IF NOT EXISTS inspecciones', ');');
const selloLineas = fs.readFileSync(`${P}/src/domain/sello.js`, 'utf8').split('\n');
const selloIni = selloLineas.findIndex((l) => l.includes('// La inspección determina'));
const selloFin = selloLineas.findIndex((l) => l.startsWith('const ESTADO_POR_RESULTADO'));
const selloCodigo = selloLineas.slice(selloIni, selloFin + 1).join('\n');
const workflow = fs.readFileSync(`${P}/.github/workflows/ci-cd.yml`, 'utf8');
const wfJobs = workflow.split('\n').slice(workflow.split('\n').findIndex((l) => l.startsWith('jobs:'))).join('\n');

const p4er = [
  h1('P4. Implementación'),
  h2('4.1 Base de datos'),
  h3('Modelo entidad-relación'),
  ...imagen(`${DIAG}/er.png`, 960, 'Figura 5. Modelo entidad-relación (7 tablas, PostgreSQL 16)'),
];
const p4 = [
  h3('Normalización'),
  li('**1FN:** todos los atributos son atómicos; las licencias no son una lista dentro del puesto sino filas en `licencias` (un puesto tiene muchas).'),
  li('**2FN:** cada tabla tiene clave primaria simple (`id`), así que ningún atributo depende de una parte de la clave.'),
  li('**3FN:** no hay dependencias transitivas: el nombre del distrito vive en `distritos` y el puesto solo guarda `distrito_id`; los datos del inspector viven en `usuarios` y la inspección solo guarda `inspector_id`.'),
  li('**Integridad:** claves foráneas, `UNIQUE (tipo, numero)` en licencias, `CHECK` de dominios (rol, tipo de puesto, producto declarado, resultado) y `CHECK (fecha_vencimiento > fecha_emision)`.'),
  h3('¿Relacional o NoSQL?'),
  p('Elijo **relacional (PostgreSQL)** porque el problema es de **cumplimiento y trazabilidad**: cada inspección se vincula a un puesto y a un inspector, una licencia no puede duplicarse y la aprobación de una inspección debe cambiar el estado del puesto **en la misma transacción** (ACID). El sello se calcula con **consultas que cruzan cuatro tablas**, natural en SQL. Una base NoSQL documental (por ejemplo, MongoDB o Cosmos DB) convendría si los datos fueran sin esquema fijo o con volumen masivo de lecturas por clave, como un histórico de lecturas de sensores de temperatura; para ese crecimiento futuro podría añadirse sin cambiar el núcleo relacional.'),
  ...codigo(schemaPuestos + '\n\n' + schemaInsp, 'db/schema.sql (extracto)'),
  h3('Datos de prueba'),
  tabla(['Puesto', 'Distrito', 'Situación cargada', 'Sello esperado'], [
    ['Cevichería La Pota de Rosa', 'Chorrillos', 'Licencia y carnet vigentes, inspección aprobada, control 2.5 °C', 'Verde'],
    ['El Rey del Ceviche', 'San Juan de Miraflores', 'Vende mixto; inspección observada con rotulado no veraz; control 6 °C', 'Amarillo'],
    ['Ceviche Al Paso Don Lucho', 'Villa El Salvador', 'Pendiente, sin licencia ni carnet', 'Rojo'],
  ], [2600, 2000, 3638, 1400]),
  espacio(),
  p('Además: 5 distritos, 3 usuarios demo (administrador, inspector y vendedora, con contraseña cifrada con bcrypt) y 1 reporte ciudadano abierto. La migración es **idempotente**: se ejecuta en cada arranque sin duplicar datos.'),
  captura('Consulta SELECT en la base de datos de Azure (o en local) mostrando los puestos y sus licencias'),
  salto(),
  h2('4.2 MVP funcional'),
  p('El MVP resuelve el núcleo del problema de punta a punta: **el consumidor consulta el sello, el vendedor se formaliza y registra el frío, y el inspector fiscaliza sin poder aprobar pota mal rotulada.**'),
  ...imagen(`${CAPT}/mvp-1-consulta.png`, 600, 'Figura 6. Consulta pública: sello verde, amarillo y rojo con motivos y producto declarado'),
  ...imagen(`${CAPT}/mvp-2-vendedora-alerta.png`, 500, 'Figura 7. Panel de la vendedora: control de frío a 6.5 °C genera alerta'),
  ...imagen(`${CAPT}/mvp-3-reporte.png`, 600, 'Figura 8. Reporte ciudadano sin cuenta'),
  ...imagen(`${CAPT}/mvp-4-inspector.png`, 500, 'Figura 9. Panel del inspector: el sistema impide aprobar un puesto con rotulado no veraz'),
  ...codigo(selloCodigo, 'src/domain/sello.js — regla del caso: no se aprueba pota vendida como otro pescado'),
  p('**Pruebas:** 23 pruebas automáticas (10 unitarias de las reglas del sello y 13 de integración de la API contra PostgreSQL), todas en verde, con 80 % de cobertura de sentencias.'),
  captura('Aplicación funcionando en la URL pública https://[nombre-app].azurewebsites.net'),
  salto(),
  h2('4.3 Estrategia de ramas y Pull Requests'),
  ...imagen(`${DIAG}/ramas.png`, 620, 'Figura 10. Flujo main / develop / feature'),
  li('**main:** producción. Protegida: solo entra por Pull Request desde `develop` con el pipeline en verde; cada merge despliega.'),
  li('**develop:** integración del sprint; también protegida con PR obligatorio.'),
  li('**feature/CS-n-descripcion:** una rama por historia de Jira (por ejemplo `feature/CS-7-inspecciones`). Se integra a `develop` con un Pull Request que revisa otra persona.'),
  li('**Commits descriptivos:** `CS-n tipo: descripción`, con tipo feat, fix, test, ci, docs o chore. Ejemplo: `CS-2 feat: consulta pública de puestos con sello sanitario y producto declarado`. La clave de Jira enlaza el commit con la historia.'),
  li('**Revisión del PR:** el revisor comprueba los criterios de aceptación, que el CI esté en verde y deja al menos un comentario o aprobación antes del merge.'),
  captura('GitHub > Insights > Network (o lista de ramas) mostrando main, develop y feature/*'),
  espacio(),
  captura('Pull Request cerrado con revisión aprobada, comentarios y checks del CI en verde'),
  espacio(),
  captura('Historial de commits descriptivos (git log) en develop'),
  salto(),
  h2('4.4 Despliegue en la nube con URL pública'),
  p('La infraestructura se crea con el script `infra/azure-setup.sh` (Azure CLI) en Azure Cloud Shell: grupo de recursos, red virtual con dos subredes, PostgreSQL Flexible Server con acceso privado, Blob Storage privado, Application Insights, plan de App Service B1 Linux y la Web App Node 22 con integración a la red virtual, HTTPS obligatorio y health check. Las variables sensibles (cadena de conexión, secreto JWT) se configuran como **App Settings**, nunca en el repositorio.'),
  tabla(['Dato', 'Valor'], [
    ['URL pública', 'https://[nombre-app].azurewebsites.net'],
    ['Health check', 'https://[nombre-app].azurewebsites.net/health → {"status":"ok","db":"ok"}'],
    ['Región', '[región usada]'],
    ['Grupo de recursos', 'rg-[nombre-app]'],
  ], [2400, 7238]),
  espacio(),
  captura('Portal de Azure: grupo de recursos con App Service, PostgreSQL, Storage, VNet y Application Insights'),
  espacio(),
  h2('4.5 Pipeline CI/CD con GitHub Actions'),
  p('El workflow `.github/workflows/ci-cd.yml` tiene dos jobs. **CI** (en cada Pull Request y push a `develop` o `main`): instala dependencias, revisa sintaxis, ejecuta pruebas unitarias e integración contra un **PostgreSQL 16 de servicio**, mide cobertura y ejecuta `npm audit` (falla si hay vulnerabilidades altas: DevSecOps). **CD** (solo push a `main` y si el CI pasó): empaqueta, despliega en App Service con `azure/webapps-deploy@v3` y hace una **prueba de humo** contra `/health`. El publish profile se guarda como **secreto** de GitHub.'),
  ...codigo(wfJobs, '.github/workflows/ci-cd.yml (jobs)'),
  captura('GitHub Actions: ejecución exitosa del workflow CI-CD en un Pull Request (job "Build y pruebas")'),
  espacio(),
  captura('GitHub Actions: ejecución exitosa en main con los jobs de build, pruebas y despliegue en verde'),
  salto(),
];

const preguntas = [
  ['¿Qué es DevOps y cuáles son sus etapas?', 'Metodología (y enfoque cultural) que une desarrollo, QA y operaciones para entregar más rápido y con calidad, automatizando. Etapas: Plan, Code, Build, Test, Release, Deploy, Operate, Monitor; CI a la izquierda, CD a la derecha. Rol: SRE.'],
  ['¿Diferencia entre integración continua, entrega continua y despliegue continuo?', 'CI: build, test y merge automáticos en cada cambio. Entrega continua: el artefacto queda listo y publicado automáticamente. Despliegue continuo: llega solo a producción si pasa las pruebas. Aquí: push a main → despliegue automático.'],
  ['¿Por qué PostgreSQL y no MongoDB?', 'Datos relacionales con reglas de integridad (licencia única, FK, CHECK) y transacción al aprobar una inspección y cambiar el estado del puesto. El sello cruza 4 tablas. NoSQL serviría para lecturas masivas de sensores de temperatura a futuro.'],
  ['¿Qué es la 3FN en tu modelo?', 'Sin dependencias transitivas: el nombre del distrito está en `distritos`, el puesto solo guarda `distrito_id`; los datos del inspector están en `usuarios`.'],
  ['¿Diferencia entre diagrama lógico y físico?', 'Lógico: componentes y cómo se comunican (web → API → sello → BD). Físico: infraestructura real (Front Door, App Service, VNet, subredes, PostgreSQL, Blob, región). La lógica no cambia; cambian los nombres del proveedor.'],
  ['¿Dónde está el balanceador de carga?', 'Lo provee App Service internamente al escalar instancias del plan; delante va Front Door como CDN y WAF. Si usara VMs pondría un Azure Load Balancer o Application Gateway.'],
  ['¿Por qué esa región?', 'La permitida más cercana a Perú para reducir latencia (criterio de Kenny: entre Brasil y EE. UU., Brasil). Azure for Students restringe las regiones por suscripción.'],
  ['¿Cómo aseguras la base de datos?', 'Sin IP pública: solo accesible desde la subred de la app (VNet). SSL, contraseña en App Settings, nunca en el repositorio.'],
  ['¿Qué es un story point y cómo estimaron?', 'Medida relativa de complejidad, esfuerzo e incertidumbre. Planning poker con Fibonacci: votación simultánea, se discuten los extremos y se vuelve a votar.'],
  ['¿Qué es la velocidad?', 'Puntos terminados (Done) por sprint. Planificamos con 20 y se recalcula con el promedio real.'],
  ['¿Cuál es la ceremonia más importante?', 'La Retrospectiva: ahí se aplica el feedback sándwich (bueno, malo o no hecho, compromiso de mejora) y el equipo mejora.'],
  ['¿Cuál es el artefacto más importante?', 'El Product Backlog (conjunto de historias de usuario que se refina).'],
  ['¿Diferencia entre DoD y criterios de aceptación?', 'Criterios: propios de cada historia (qué debe hacer). DoD: común a todas (cuándo está realmente terminada: PR revisado, CI en verde, desplegado).'],
  ['¿Por qué ramas feature y PR?', 'Aíslan cada historia, permiten revisión de otra persona y que el CI pruebe antes de integrar; main siempre está desplegable.'],
  ['¿Qué pasa si una prueba falla en el pipeline?', 'El PR no se puede integrar y no se despliega: si una prueba no pasa, no avanza.'],
  ['¿Dónde está la seguridad en el pipeline?', '`npm audit` falla con vulnerabilidades altas (escaneo de dependencias en CI, lección del caso Equifax). Secretos en GitHub Secrets. La seguridad no existe; es hacerla más difícil de vulnerar.'],
  ['¿Cómo resuelve tu MVP que se venda pota como pescado?', 'El puesto declara el producto; el inspector registra si el rotulado es veraz; el sistema impide aprobar si no lo es y el sello lo muestra al consumidor. El consumidor puede reportar "producto no declarado".'],
  ['¿Usaste IA? ¿Cómo la controlaste?', 'Sí, con human in the loop: revisé y entiendo cada pieza; las pruebas automáticas y el CI verifican lo generado. Triángulo de la IA: ética (responsabilidad mía), lógica (GIGO) y estética (criterios objetivos).'],
];
const anexo = [
  h1('Anexo A. Preguntas probables de la sustentación presencial'),
  p('Respuestas cortas para defender cada pregunta. Hay que poder explicar cada una sin leer.'),
  tabla(['Pregunta', 'Respuesta'], preguntas, [3200, 6438]),
  espacio(),
  h1('Anexo B. Ejecución local'),
  ...codigo(['cp .env.example .env        # ajustar DATABASE_URL', 'npm install', 'npm run migrate             # tablas y datos demo', 'npm run dev                 # http://localhost:3000', 'npm test                    # 23 pruebas (integración requiere DATABASE_URL)', '', 'Cuentas demo (clave Demo1234!): vendedora@demo.pe · inspector@demo.pe · admin@demo.pe'].join('\n')),
];

// ---------- documento ----------
const encabezado = () => new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'PC2 PFC III · Caso 4 · Ceviche Seguro', size: 16, color: '808080' })] })] });
const pie = () => new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ children: ['Página ', PageNumber.CURRENT, ' de ', PageNumber.TOTAL_PAGES], size: 16, color: '808080' })] })] });
function seccion(children, horizontal = false) {
  return {
    properties: { page: { size: { width: 11906, height: 16838, orientation: horizontal ? PageOrientation.LANDSCAPE : PageOrientation.PORTRAIT }, margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 } } },
    headers: { default: encabezado() },
    footers: { default: pie() },
    children,
  };
}
const doc = new Document({
  creator: 'Estudiante PFC III',
  title: 'PC2 PFC III — Caso 4 Ceviche Seguro',
  styles: {
    default: { document: { run: { font: FONT, size: 21 } } },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: FONT, size: 32, bold: true, color: AZUL }, paragraph: { spacing: { before: 240, after: 160 }, keepNext: true, outlineLevel: 0 } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: FONT, size: 26, bold: true, color: '2E75B6' }, paragraph: { spacing: { before: 240, after: 120 }, keepNext: true, outlineLevel: 1 } },
      { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: FONT, size: 22, bold: true, color: '404040' }, paragraph: { spacing: { before: 160, after: 80 }, keepNext: true, outlineLevel: 2 } },
    ],
  },
  numbering: { config: [
    { reference: 'vinetas', levels: [
      { level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 270 } } } },
      { level: 1, format: LevelFormat.BULLET, text: '◦', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 1080, hanging: 270 } } } },
    ] },
    { reference: 'numeros', levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 300 } } } }] },
    { reference: 'dod', levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 300 } } } }] },
  ] },
  features: { updateFields: true },
  sections: [
    seccion([...portada, ...indice, ...intro, ...p1, ...p2, ...p3]),
    seccion(p4er, true),
    seccion([...p4, ...anexo]),
  ],
});

const salida = process.argv[2] || `${P}/docs/informe/Informe_PC.docx`;
Packer.toBuffer(doc).then((buf) => { fs.writeFileSync(salida, buf); console.log('OK', salida, buf.length); });
