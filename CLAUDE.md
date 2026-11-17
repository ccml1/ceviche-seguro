# Contexto del proyecto (léelo antes de trabajar)

Este repositorio es la **plantilla para las prácticas calificadas de PFC III** (docente: Kenny Neira) y, a la vez, la solución del **Caso 4 "Vendedores de ceviche de pota"** (app "Ceviche Seguro"). En una PC nueva se adapta el dominio al caso que toque, no se empieza de cero.

## Cómo trabajar conmigo (estudiante)
- Escribe todo en **español**. Commits, PR, historias e informe también.
- **Human in the loop:** antes de decisiones que no se pueden deshacer (borrar recursos de Azure, `git push --force`, cambiar el esquema en producción) pregúntame.
- Explícame lo que generes con palabras simples: después tengo que **defender cada parte en la sustentación presencial** y, si no sé explicarla, pierdo los puntos.
- Para trabajar un caso nuevo usa la skill **pc-pfc3** (`/pc-pfc3`).

## Stack y comandos
- Node.js 22 + Express 5, PostgreSQL 16 (pg), HTML/CSS/JS sin framework, Jest + Supertest.
- `npm run dev` (local, puerto 3000) · `npm run migrate` (tablas + datos demo, idempotente)
- `npm run test:unit` (sin BD) · `npm test` (unitarias + integración; requiere `DATABASE_URL`)
- `npm run check` (sintaxis) · `npm run diagramas` (PNG desde `docs/diagramas/*.mmd`) · `npm run capturas` (Playwright, app corriendo en `BASE_URL`) · `npm run informe` (Word en `docs/informe/Informe_PC.docx`)

## Estructura
- `src/domain/` reglas de negocio **puras** (sin BD) con pruebas unitarias en `tests/unit/`.
- `src/routes/` API REST; `src/app.js` arma Express; `src/server.js` migra y levanta.
- `db/schema.sql` (3FN, `CREATE TABLE IF NOT EXISTS`, CHECK, FK) y `db/seed.sql` (datos demo con `ON CONFLICT`/`NOT EXISTS`).
- `public/` frontend. `infra/` scripts de Azure. `.github/workflows/ci-cd.yml` pipeline.
- `docs/diagramas/` (Mermaid + generador UML), `docs/scrum/backlog.json` (backlog, sprints, tareas, burndown), `docs/informe/build.js` (informe Word), `docs/capturas/`.

## Convenciones (se evalúan)
- Ramas: `main` (producción, protegida) ← `develop` ← `feature/<CLAVE>-<n>-<descripcion>`. Nunca commitear directo a `main`.
- Commits: `<CLAVE>-<n> tipo: descripción` (feat, fix, test, ci, docs, chore). La clave es la del proyecto de Jira (aquí `CS`). Lo que hay en Jira debe **coincidir** con GitHub.
- Un Pull Request por historia hacia `develop`, con descripción, criterios de aceptación marcados y revisión de otra persona; luego PR `develop → main` para desplegar.
- Secretos solo en GitHub Secrets / App Settings de Azure. Nunca en el repo (`.env` está en `.gitignore`).

## Definition of Done
Rama feature + commits con clave · PR revisado · CI en verde (pruebas + `npm audit`) · criterios de aceptación cumplidos · cobertura ≥ 70 % del módulo · desplegado en la URL pública · historia en Done en Jira.

## Vocabulario del curso (úsalo en el informe y al explicar)
- DevOps: metodología/enfoque cultural que une Desarrollo, QA y Operaciones; ciclo Plan → Code → Build → Test → Release → Deploy → Operate → Monitor; CI = build, test y merge; rol SRE.
- Diagrama **lógico** = componentes y cómo se comunican; **físico** = infraestructura real (servicios del proveedor, red, región). "La lógica no cambia; cambian los nombres". Región más cercana al usuario; WAF antes del servicio.
- Scrum: el artefacto más importante es el **Backlog**; la ceremonia más importante es la **Retrospectiva** (feedback sándwich). HU: "Como… quiero… para…".
- IA: triángulo ética–lógica (GIGO)–estética y **human in the loop**. DevSecOps: "la seguridad no existe, es hacerla más difícil de vulnerar".
