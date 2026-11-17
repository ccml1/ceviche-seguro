---
name: pc-pfc3
description: Resuelve una práctica calificada de PFC III (caso de negocio → DevOps, diagramas, Scrum, BD, MVP, ramas, despliegue en Azure, CI/CD e informe Word) adaptando esta plantilla en 120 minutos. Úsala cuando el estudiante pegue o adjunte un caso nuevo de la PC.
---

# Práctica calificada PFC III con la plantilla

La plantilla ya trae resuelto el Caso 4 (Ceviche Seguro). En un caso nuevo **no se reescribe todo**: se cambia el dominio (entidades, roles, reglas) y se reutiliza la estructura, el pipeline, la infraestructura ya creada en Azure y el generador del informe.

Regla de oro: el estudiante debe poder explicar cada pieza en la sustentación presencial. Al cerrar cada fase, resume en 3 o 4 líneas qué se hizo y por qué, con el vocabulario de `CLAUDE.md`. **Human in the loop:** pide confirmación antes de push, PR, merge y cualquier comando de Azure.

## Fase 0 — Leer el caso (5 min)
1. Pide el enunciado (PDF o texto) y guárdalo en `docs/caso/` (`enunciado.md`). Copia la rúbrica con puntajes en `docs/caso/rubrica.md` (si no cambia, usa `references/rubrica.md`).
2. Extrae y muestra en una tabla: problema, causas, actores, qué debe poder hacer cada actor, reglas de negocio verificables (umbrales, estados, prohibiciones) y datos que hay que guardar.
3. Propón: nombre de la app, clave de Jira (2–3 letras), 3–5 roles, 5–7 tablas y **la regla central** (la que hace que el MVP resuelva el problema, como "no aprobar pota rotulada como pescado"). Espera el OK del estudiante.

## Fase 1 — Scrum primero (15 min) → P3 (6 pts)
1. Reescribe `docs/scrum/backlog.json` con el mismo formato: visión, 3–4 épicas, 10–14 HU "Como… quiero… para…", puntos Fibonacci (1, 2, 3, 5, 8, 13), MoSCoW, 2–4 criterios **Dado / cuando / entonces** por HU del MVP, 3 sprints con Sprint Goal (velocidad 20), tareas del Sprint 1 en horas, y `burndown_sprint1`.
2. Las historias técnicas (modelo de datos, pipeline, infraestructura) también van como HU del Sprint 1: así las ramas y commits técnicos tienen clave de Jira.
3. Genera el CSV de Jira: `python3 .claude/skills/pc-pfc3/scripts/jira_csv.py` → `docs/scrum/jira-import.csv`. Indica al estudiante: Jira > proyecto con la clave elegida > Importar desde CSV (o crear las HU a mano si el import tarda), crear Sprint 1 y moverlas al tablero.
4. Ceremonias y DoD: el texto está en `docs/informe/build.js` (sección P3); solo ajusta nombres y ejemplos del caso.

## Fase 2 — Base de datos (15 min) → P4 BD (2 pts)
1. Reescribe `db/schema.sql` en 3FN: `CREATE TABLE IF NOT EXISTS`, `SERIAL PRIMARY KEY`, FK, `CHECK` de dominios, `UNIQUE` de negocio e índices. Mantén `usuarios` con `rol`.
2. Reescribe `db/seed.sql` con datos que muestren **todos los estados** de la regla central (un caso OK, uno observado, uno rechazado). Mantén la idempotencia (`ON CONFLICT` / `NOT EXISTS`). Ajusta usuarios demo en `db/migrate.js`.
3. Actualiza `docs/diagramas/er.mmd` desde el esquema. Prepara el párrafo "relacional vs NoSQL" con razones del caso (integridad, transacciones, consultas que cruzan tablas; cuándo convendría NoSQL).

## Fase 3 — MVP (30 min) → P4 MVP (3 pts)
Trabaja historia por historia, **una rama por historia** (Fase 4 en paralelo):
1. Reglas puras en `src/domain/` (patrón de `sello.js`: función que devuelve estado + motivos) con pruebas en `tests/unit/`. El hook corre las pruebas unitarias tras cada edición: si fallan, corrige antes de seguir.
2. Rutas en `src/routes/` (patrón de `puestos.js`: validación con `src/validar.js`, `requireAuth` / `requireRol`, transacción cuando un cambio afecta dos tablas). Registra los routers en `src/app.js`.
3. Frontend en `public/` (mismas pestañas: consulta pública, reporte o acción ciudadana, ingreso por rol con paneles).
4. Pruebas de integración en `tests/integration/api.test.js` para el flujo principal y la regla central. Usa el subagente **test-runner** al cerrar cada historia.
5. Prioriza: primero lo que el consumidor ve (consulta pública con el estado), luego la regla central, luego el resto. Un MVP pequeño que funciona en la URL pública vale más que uno grande en local.

## Fase 4 — Ramas, commits y PR (en paralelo) → P4 ramas (2 pts)
- `git switch develop && git switch -c feature/<CLAVE>-<n>-<descripcion>` por historia.
- Commits pequeños: `<CLAVE>-<n> feat: …`, `… test: …`, `… fix: …`.
- PR a `develop` con `gh pr create --base develop --title "<CLAVE>-<n> …" --body` (plantilla en `references/plantilla-pr.md`). La revisión la hace **otra persona** (compañero con acceso al repo): pídeselo al estudiante; si no hay compañero, que deje una revisión con comentario desde la web y lo indique en el informe.
- Al final: PR `develop → main` (dispara el despliegue). Tag `sprint-1`.

## Fase 5 — Despliegue y CI/CD (10 min) → P4 nube (2) + CI/CD (1)
La infraestructura de Azure, el secreto `AZURE_WEBAPP_PUBLISH_PROFILE` y la variable `AZURE_WEBAPP_NAME` se crearon **antes** del examen (ver `PREREQUISITOS.md`). Durante la PC:
1. Merge a `main` → revisa con `gh run list` / `gh run view` que pasen build, pruebas y despliegue.
2. Como el esquema cambió: la app migra al arrancar (`RUN_MIGRATIONS=true`). Si la BD tiene tablas del caso anterior con el mismo nombre y otra estructura, pide permiso y usa otra base: `az postgres flexible-server db create … --database-name <nueva>` y actualiza `DATABASE_URL` en App Settings.
3. Verifica `https://<app>.azurewebsites.net/health` y el flujo principal en la URL pública.
4. Si el despliegue falla, revisa `az webapp log tail` y el job de GitHub Actions; no improvises otra nube.

## Fase 6 — Diagramas (10 min) → P2 (2 pts)
1. `docs/diagramas/logica.mmd`: actores → presentación → API (módulos del caso + motor de la regla central) → datos.
2. `docs/diagramas/fisica-azure.mmd`: normalmente solo cambia nombres; mantiene servicios reales (Front Door CDN/WAF, balanceador de App Service, App Service, PostgreSQL Flexible Server, Blob Storage, VNet con subredes, Application Insights, GitHub Actions) y la región real.
3. `docs/diagramas/gen_casos_uso.py`: actores, casos, include/extend; coordenadas sin cruces (revisa el PNG).
4. `npm run diagramas` y **mira cada PNG** antes de seguir.

## Fase 7 — Informe Word (15 min) → todo se evalúa desde aquí
1. Edita los textos de `docs/informe/build.js` (portada, problema, etapas DevOps, stack con justificación ligada al caso, servicios, roles, datos de prueba, preguntas del anexo). El backlog, sprints, tareas, diagramas, extractos de código y workflow se leen solos del repo.
2. Con la app corriendo (local o pública): `BASE_URL=… npm run capturas` (ajusta `scripts/capturas.js` a los nuevos formularios).
3. `npm run informe` → `docs/informe/Informe_PC.docx`. El estudiante pega las capturas reales en los recuadros rojos "[INSERTAR CAPTURA]": tablero Jira (To Do/In Progress/Done), PR revisado, ramas, Actions en verde, portal de Azure, URL pública.
4. Corre el subagente **revisor-rubrica** y atiende las 3 acciones de mayor impacto.

## Presupuesto de tiempo (120 min)
| Min | Fase |
| --- | --- |
| 0–5 | Leer caso, decidir dominio |
| 5–20 | Backlog + Jira |
| 20–35 | BD (esquema, seed, ER) |
| 35–65 | MVP con ramas y PR |
| 65–75 | Merge a main, despliegue, verificación |
| 75–85 | Diagramas |
| 85–105 | Informe + capturas |
| 105–120 | Revisión con la rúbrica, ensayo de respuestas (`references/preguntas-sustentacion.md`) |

## Referencias
- `references/rubrica.md` — rúbrica de la PC2 tipo D con puntajes.
- `references/preguntas-sustentacion.md` — respuestas cortas con el vocabulario del curso.
- `references/plantilla-pr.md` — cuerpo de Pull Request.
- `scripts/jira_csv.py` — CSV de importación a Jira desde `backlog.json`.
