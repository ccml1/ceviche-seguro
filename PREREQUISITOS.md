# Prerrequisitos para el día de la práctica (checklist)

Hazlo **al menos 2 días antes**. La idea: que durante los 120 minutos solo cambies el dominio del caso; la nube, el pipeline y las cuentas ya funcionan.

## 0. Antes que nada
- [ ] **Confirmar con Kenny que se permite usar IA / Claude Code y la laptop** en la PC. El enunciado dice: "No puede utilizar recursos de apoyo, dispositivos a menos que el docente se lo indique." Si no se permite, usa este kit solo para practicar.
- [ ] Laptop cargada, cargador, internet de respaldo (datos móviles / hotspot).

## 1. Cuentas (inicia sesión en cada una y guarda las claves en un gestor de contraseñas)
- [ ] **GitHub**: repositorio creado desde esta plantilla (público o privado con acceso del docente). Si vas a pedir revisión de PR a un compañero, agrégalo ya como colaborador.
- [ ] **Jira** (Atlassian): proyecto Scrum creado con su clave (ej. `CS`), tablero con columnas **To Do / In Progress / Done**. Prueba a importar `docs/scrum/jira-import.csv` una vez para saber cómo se hace.
- [ ] **Azure for Students** activa con crédito disponible (portal.azure.com > Suscripciones). Ten a mano tus **regiones permitidas** (ver punto 4).
- [ ] **Claude** con acceso a Claude Code (plan que lo incluya) y, si quieres Fable, saber si te consume créditos de uso.

## 2. Programas instalados en tu laptop (verifica la versión)
| Programa | Comando para verificar |
| --- | --- |
| Node.js 22 LTS | `node -v` → v22.x |
| Git | `git --version` |
| GitHub CLI (para PR desde la terminal) | `gh --version` y `gh auth login` hecho |
| Azure CLI (opcional: puedes usar Cloud Shell en el navegador) | `az version` y `az login` hecho |
| Claude Code (actualizado) | `claude --version`, luego `claude update` |
| PostgreSQL local o Docker (para probar sin nube) | `psql --version` o `docker --version` |
| Mermaid CLI (diagramas) | `npm i -g @mermaid-js/mermaid-cli` y `mmdc --version` |
| Python 3 (casos de uso, burndown, CSV de Jira) | `python3 --version` + `pip install matplotlib` |
| Playwright (capturas automáticas) | `npx playwright install chromium` |
| Microsoft Word | para pegar capturas y exportar a PDF si lo piden |
| draw.io (opcional) | por si el docente pide el diagrama en draw.io |

En Windows, Claude Code necesita **Git for Windows** (Git Bash) para ejecutar comandos y los hooks.

## 3. Repositorio listo
- [ ] Clonar tu repo, `npm install`, `npm run test:unit` en verde.
- [ ] Con PostgreSQL local: `DATABASE_URL=… npm run migrate && npm test` (23 pruebas en verde) y `npm run dev` abre en http://localhost:3000.
- [ ] Ramas `main` y `develop` creadas y subidas. **Proteger** `main` y `develop` (Settings > Branches: requerir Pull Request y que pase el check "Build y pruebas").
- [ ] `npm run diagramas` y `npm run informe` funcionan en tu laptop.

## 4. Azure (prueba pequeña primero)
1. Abre **Azure Cloud Shell** (portal.azure.com > icono `>_` > Bash). Sube `infra/prueba-azure.sh` y ejecuta `bash prueba-azure.sh`: muestra tu suscripción y **tus regiones permitidas**.
2. Elige la permitida más cercana a Perú (por ejemplo `brazilsouth` si aparece) y ejecuta `REGION=<region> bash prueba-azure.sh`: despliega un "hola mundo" gratuito (F1), confirma que PostgreSQL Burstable existe en esa región y **borra todo al final**.
3. Si todo salió bien, crea la infraestructura real **una sola vez**: `REGION=<region> APP=<nombre-unico> bash infra/azure-setup.sh` (tarda unos 15 minutos). Guarda la contraseña de la BD que imprime.
4. En GitHub (Settings > Secrets and variables > Actions):
   - Secreto `AZURE_WEBAPP_PUBLISH_PROFILE` = contenido completo de `publish-profile-<APP>.xml`.
   - Variable `AZURE_WEBAPP_NAME` = `<APP>`.
   - Environment `produccion` (se crea solo al primer despliegue).
5. Haz un PR `develop → main` y verifica en Actions que **build, pruebas y despliegue** salgan en verde, y que `https://<APP>.azurewebsites.net/health` responda `{"status":"ok","db":"ok"}`.
6. **Cuida el crédito:** detén la BD cuando no la uses (`az postgres flexible-server stop -g rg-<APP> -n pg-<APP>`) y **enciéndela el día de la PC** (`… start …`, tarda unos minutos). Front Door (`infra/azure-frontdoor.sh`) tiene costo fijo: créalo solo si lo vas a mostrar y bórralo después.

## 5. Día de la PC (primeros 5 minutos)
- [ ] BD de Azure encendida y `/health` en verde.
- [ ] `git switch develop && git pull`.
- [ ] Abrir Claude Code en la carpeta del repo, elegir modelo (`/model fable` o `/model claude-fable-5-2`) y comprobar con `/status`.
- [ ] Pegar el enunciado y escribir `/pc-pfc3`.
- [ ] Jira y GitHub abiertos en el navegador para capturas.
