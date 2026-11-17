# Cómo usar este kit con Claude Code (y Fable 5.2)

## ¿Este chat o Claude Code?
- **Este chat de Claude** sirve para preparar: estudiar, revisar el informe, practicar la sustentación y adaptar la plantilla a casos de práctica.
- **El día de la PC, usa Claude Code en tu laptop**, dentro de la carpeta del repositorio: necesita tu Git, tu sesión de GitHub (`gh`), tu Azure CLI y tus archivos; desde un chat en la nube no puede hacer push con tus credenciales ni ver tu Jira con tu sesión.

## Qué trae el kit (todo dentro del repositorio)
| Archivo | Para qué sirve (harness) |
| --- | --- |
| `CLAUDE.md` | **Contexto**: stack, comandos, convenciones de ramas y commits, DoD y vocabulario del curso. Claude Code lo lee al iniciar. |
| `.claude/skills/pc-pfc3/` | **Skill** con el procedimiento de la PC en 7 fases y presupuesto de 120 minutos; rúbrica, plantilla de PR, preguntas de sustentación y script del CSV de Jira. |
| `.claude/agents/test-runner.md` | Subagente que corre pruebas, cobertura y `npm audit` y resume fallas. |
| `.claude/agents/revisor-rubrica.md` | Subagente que revisa el repo y el informe contra la rúbrica antes de entregar. |
| `.claude/settings.json` | **Permisos** (permite pruebas y git local; pregunta antes de push, PR y Azure; prohíbe `push --force`, borrar el grupo de recursos y leer `.env`) y **hook** que corre las pruebas unitarias después de cada edición en `src/` o `tests/`. |
| `PREREQUISITOS.md` | Checklist de cuentas, programas, Azure y GitHub para el día de la PC. |

## Instalar y elegir Fable 5.2
1. Instala o actualiza Claude Code (`claude update`) y verifica con `claude --version`. Para que el alias `fable` apunte a Fable 5.2 se necesita una versión reciente; si tu versión es antigua, el alias puede seguir en Fable 5.1.
2. Entra a la carpeta del repo y ejecuta `claude`.
3. Elige el modelo: `/model fable` (o el ID exacto `/model claude-fable-5-2`). También puedes iniciar con `claude --model fable`.
4. Comprueba el modelo activo con `/status`.
5. Ten en cuenta que Fable puede consumir **créditos de uso** según tu plan; el selector `/model` lo indica. Si no quieres gastar créditos, Opus (`/model opus`) también sirve para este kit.

## Flujo en la PC
```text
claude                      # en la carpeta del repo
/model fable
/pc-pfc3                    # y pega el enunciado del caso (o adjunta el PDF en docs/caso/)
```
La skill te va a: (0) leer el caso y proponer dominio y regla central → (1) backlog y CSV de Jira → (2) BD → (3) MVP por historias → (4) ramas, commits y PR → (5) merge a main y verificación del despliegue → (6) diagramas → (7) informe Word. Te pedirá confirmación antes de cada push, PR y comando de Azure (**human in the loop**).

Atajos útiles dentro de Claude Code:
- "usa el subagente test-runner" después de cada historia.
- "usa el subagente revisor-rubrica" antes de entregar.
- `/hooks` para ver el hook de pruebas; `/permissions` para ver las reglas.

## Practicar antes
Pide a Claude (aquí o en Claude Code) un caso de práctica similar (por ejemplo, "comida al paso sin registro sanitario en mercados") y haz el recorrido completo cronometrado. Cada vez que algo tome más tiempo del previsto, mejora la plantilla (no el día de la PC).
