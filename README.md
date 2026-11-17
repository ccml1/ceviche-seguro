# Ceviche Seguro — MVP Caso 4 (PFC III)

Plataforma para que la municipalidad formalice y fiscalice a los vendedores de ceviche de pota, y para que el consumidor sepa, antes de comer, si un puesto cumple licencia, carnet de sanidad, inspección y cadena de frío, y qué producto vende de verdad.

> **Plantilla para la PC de PFC III.** Este repo incluye un kit para Claude Code (`CLAUDE.md`, skill `/pc-pfc3`, subagentes y hook de pruebas). Lee `GUIA_CLAUDE_CODE.md` y `PREREQUISITOS.md`.

## Funcionalidades núcleo

| Rol | Puede |
| --- | --- |
| Consumidor (sin cuenta) | Buscar puestos por distrito, sello y producto; ver el sello sanitario y sus motivos; reportar un puesto |
| Vendedor | Registrarse, registrar su puesto y el producto que vende, cargar licencia y carnet, registrar el control de frío (alerta sobre 4 °C) |
| Inspector | Registrar inspecciones (no puede aprobar si la pota se vende como otro pescado), atender reportes, ver archivos de licencias |
| Administrador | Crear cuentas de inspectores |

## Stack

Node.js 22 + Express 5 · PostgreSQL 16 · HTML/CSS/JS sin framework · Jest + Supertest · GitHub Actions · Azure App Service, Azure Database for PostgreSQL Flexible Server, Blob Storage, VNet, Application Insights y Front Door (opcional).

## Ejecutar en local

```bash
cp .env.example .env            # ajusta DATABASE_URL a tu PostgreSQL local
npm install
npm run migrate                 # crea tablas y datos demo
npm run dev                     # http://localhost:3000
```

Cuentas demo (clave `Demo1234!`): `vendedora@demo.pe`, `inspector@demo.pe`, `admin@demo.pe`.

## Pruebas

```bash
npm run test:unit                                                    # reglas del sello, sin base de datos
DATABASE_URL=postgres://postgres:postgres@localhost:5432/test npm test  # unitarias + integración
```

## Documentación generada desde el repo

```bash
npm run diagramas          # PNG de docs/diagramas (Mermaid + UML de casos de uso + burndown)
BASE_URL=http://localhost:3000 npm run capturas   # capturas del MVP con Playwright
npm run informe            # docs/informe/Informe_PC.docx
python3 .claude/skills/pc-pfc3/scripts/jira_csv.py   # docs/scrum/jira-import.csv
```

## Estrategia de ramas

- `main`: lo que está en producción. Protegida: solo entra por Pull Request desde `develop` con el pipeline en verde.
- `develop`: integración del sprint.
- `feature/CS-<n>-<descripcion>`: una rama por historia de usuario de Jira (clave `CS-n`). Se integra a `develop` por Pull Request revisado por otro integrante.
- Commits: `CS-<n> tipo: descripción` (tipos: feat, fix, test, ci, docs, chore).

## Despliegue en Azure

1. `REGION=<región permitida> APP=<nombre-unico> bash infra/azure-setup.sh` en Azure Cloud Shell.
2. En GitHub: secreto `AZURE_WEBAPP_PUBLISH_PROFILE` (contenido del XML que genera el script) y variable `AZURE_WEBAPP_NAME`.
3. Cada push a `main` ejecuta CI, despliega y hace la prueba de humo contra `/health`.

## API

| Método | Ruta | Acceso |
| --- | --- | --- |
| GET | `/health` | Público |
| GET | `/api/puestos?distrito=&sello=&producto=` | Público |
| GET | `/api/puestos/:id` | Público |
| POST | `/api/reportes` | Público |
| POST | `/api/auth/login`, `/api/auth/registro` | Público |
| GET | `/api/puestos/mios` | Vendedor |
| POST | `/api/puestos`, `/api/puestos/:id/licencias`, `/api/puestos/:id/controles-frio` | Vendedor (dueño) |
| POST | `/api/puestos/:id/inspecciones` | Inspector, admin |
| GET / PATCH | `/api/reportes`, `/api/reportes/:id` | Inspector, admin |
| POST | `/api/usuarios` | Admin |
