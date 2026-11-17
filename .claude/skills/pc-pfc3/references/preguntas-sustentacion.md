# Preguntas probables en la sustentación presencial

Respuestas cortas con el vocabulario del curso. Adapta el ejemplo al caso que toque. Fuente de los conceptos: clases de Kenny y material oficial del curso (Mapa Maestro).

## P1 — DevOps y stack
- **¿Qué es DevOps?** Metodología y enfoque cultural y colaborativo que une Desarrollo, QA y Operaciones para entregar más rápido y con calidad, automatizando. Sin DevOps hay "brecha DevOps": despliegues lentos y caros. El rol es el SRE.
- **Etapas:** Plan → Code → Build → Test → Release → Deploy → Operate → Monitor. Izquierda CI, derecha CD. Nombra una herramienta por etapa: Jira · Git/GitHub · GitHub Actions/npm · Jest · PR y tags · azure/webapps-deploy · App Service · Application Insights.
- **CI vs entrega continua vs despliegue continuo:** CI = build, test y merge automáticos; entrega continua = artefacto listo y publicado; despliegue continuo = llega solo a producción si pasa las pruebas. "Si una prueba no pasa, no avanza."
- **¿Por qué tu stack?** Cada tecnología con su razón ligada al problema (ver tabla del informe). No digas "porque es popular".

## P2 — Diagramas
- **Lógico vs físico:** lógico = componentes y cómo se comunican; físico = infraestructura (servicios del proveedor, red, subredes, región, seguridad). "La lógica no cambia; cambian los nombres."
- **¿Dónde está el balanceador?** App Service balancea entre las instancias del plan al escalar; delante va Front Door (CDN + WAF). Con VMs usaría Azure Load Balancer o Application Gateway.
- **¿Por qué esa región?** La permitida más cercana al usuario para reducir latencia (Kenny: entre Brasil y EE. UU., para Perú, Brasil).
- **WAF:** va antes de entrar al servicio de distribución.
- **include vs extend:** include siempre ocurre (ver estado incluye calcularlo); extend es opcional/condicional (alerta solo si se supera el umbral).

## P3 — Scrum
- **Artefacto más importante:** el Product Backlog. **Ceremonia más importante:** la Retrospectiva (feedback sándwich: lo bueno, lo malo o no hecho, compromiso de mejora).
- **Flujo:** Backlog → Sprint Planning → Sprint (1 a 4 semanas) → Daily → Sprint Review (lo no cumplido vuelve al backlog) → Retrospectiva.
- **Story points:** medida relativa de complejidad, esfuerzo e incertidumbre. **Planning poker:** votación simultánea con Fibonacci, se discuten los extremos y se vuelve a votar.
- **Velocidad:** puntos terminados (Done) por sprint; se planifica con la histórica.
- **Sprint Goal:** el objetivo de negocio del sprint en una frase.
- **DoD vs criterios de aceptación:** criterios = propios de cada historia; DoD = común a todas.
- **Épica:** "todo aquello que te genera valor"; agrupa historias.

## P4 — Implementación
- **3FN:** sin dependencias transitivas; cada dato vive en su tabla y se referencia por FK.
- **Relacional vs NoSQL:** relacional por integridad (FK, UNIQUE, CHECK), transacciones ACID y consultas que cruzan tablas; NoSQL para datos sin esquema o lecturas masivas por clave (por ejemplo, telemetría de sensores).
- **Ramas:** main = producción protegida; develop = integración; feature por historia; PR revisado por otra persona; CI antes del merge.
- **¿Cómo despliegas?** Push/merge a main → GitHub Actions: build, pruebas, audit, empaquetado, despliegue a App Service con publish profile en GitHub Secrets, prueba de humo en /health.
- **Seguridad en el pipeline (DevSecOps):** escaneo de dependencias (`npm audit`) en CI, secretos fuera del repo, BD sin IP pública. Caso Equifax: parche no aplicado a tiempo. "La seguridad no existe; es hacerla más difícil de vulnerar."
- **Pruebas:** unitarias (reglas puras: atómicas, independientes, inocuas, automatizables, rápidas) e integración (API + BD); ciclo en V.

## IA
- **¿Usaste IA?** Sí, con human in the loop: entiendo y verifiqué cada pieza; las pruebas y el CI verifican lo generado. Triángulo: ética (la responsabilidad es mía), lógica (GIGO), estética (criterios objetivos).
- **Agente = modelo + harness** (CLAUDE.md como contexto, hooks que corren pruebas, permisos). "El código se genera; el proceso se escribe."
