# Seguridad en la arquitectura (para la sustentación)

> "La seguridad no existe; es hacerla más difícil de vulnerar." Por eso se aplica en capas: borde, red, datos, identidad, código y monitoreo.

| Capa | Concepto del curso | Servicio en Azure / herramienta | Estado | Costo |
| --- | --- | --- | --- | --- |
| Borde | WAF **antes** de entrar al servicio | Front Door Standard + política WAF (límite por IP, bloqueo de inyección SQL/XSS) | Script `azure-frontdoor.sh`, solo para la demo | ~35 USD/mes de base: crear y borrar |
| Borde | CDN / distribución | Front Door (caché y TLS global) | Igual que arriba | Igual |
| Borde | Autoescalado y costo ante ataques de sobrecarga | Límite de peticiones por IP en el WAF; plan B1 con escala manual (no crece solo) | Hecho | 0 |
| Transporte | SSL/HTTPS | HTTPS obligatorio, TLS 1.2 mínimo, certificado administrado de `*.azurewebsites.net`; PostgreSQL exige TLS | Hecho | 0 |
| Red | Segmentación (VLAN/subredes) | VNet 10.10.0.0/16 con `snet-app` y `snet-db` | Hecho | 0 |
| Red | Firewall | NSG `nsg-db`: solo `snet-app` llega al puerto 5432 | `azure-seguridad.sh` | 0 |
| Datos | BD no expuesta | PostgreSQL sin IP pública + DNS privado | Hecho | 0 |
| Datos | Archivos privados | Blob sin acceso público + firewall que solo acepta `snet-app` | `azure-seguridad.sh` | 0 |
| Datos | Respaldo | Backups automáticos de PostgreSQL (7 días) | Hecho (incluido) | 0 |
| Identidad | IAM transversal, privilegio mínimo | Identidad administrada de la app con rol *Key Vault Secrets User*; JWT y roles en la API | `azure-seguridad.sh` | 0 |
| Secretos | Gestor de secretos | Key Vault (BD, JWT, Storage) + GitHub Secrets (publish profile) | `azure-seguridad.sh` | Centavos |
| Código | Escaneo de secretos (pre-commit/CI) | gitleaks en el pipeline | Pipeline | 0 |
| Código | Escaneo de dependencias (caso Equifax) | `npm audit --audit-level=high` bloquea el pipeline | Hecho | 0 |
| Código | Análisis estático (tipo SonarQube) | CodeQL `security-extended` | Pipeline | 0 (repo público) |
| Operación | Monitor | Application Insights + alerta de errores 5xx + health check | `azure-seguridad.sh` | Mínimo |

**Solo en el diagrama, por costo (sabes explicarlos, no los despliegas):** reglas administradas OWASP del WAF (Front Door Premium, ~330 USD/mes), Application Gateway WAF v2, DDoS Network Protection, private endpoints para Key Vault y Storage, alta disponibilidad con zona redundante en PostgreSQL y escalado automático (planes Standard/Premium).

## Respuestas cortas
- **¿Dónde está el firewall?** En dos niveles: el WAF de Front Door filtra el tráfico HTTP antes de llegar a la app, y el NSG filtra la red: a la base solo entra la subred de la app por el 5432.
- **¿Dónde guardas las contraseñas?** En Key Vault. La app no tiene la contraseña escrita: tiene una referencia y su identidad administrada tiene permiso solo para **leer** secretos (privilegio mínimo).
- **¿Y si alguien sube una clave al repo?** gitleaks la detecta en el pipeline y el despliegue no ocurre.
- **¿Por qué no desplegaste todo?** Por el triángulo de hierro: el costo. Diseñé la arquitectura completa; desplegué lo que no tiene costo fijo y Front Door solo para la demostración.
