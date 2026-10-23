# Trabajo de Benja: siete hitos

Rama: `feat/prestamos`. Cada hito se guarda en un commit distinto, en este orden.
La sustitución del acceso SQL por Firestore fue autorizada por el equipo.
No se implementa el módulo de devoluciones de Fabian ni una nueva interfaz de catálogo.

| Hito | Cambio | Commit |
| --- | --- | --- |
| 1 | Conexión Firestore, entorno y arranque del servidor | `conexion firestore` |
| 2 | Adaptar las consultas existentes del catálogo y sus datos de ejemplo | `catalogo con firestore` |
| 3 | Consulta de socios y validaciones de entrada de préstamos | `consulta de socios` |
| 4 | Registrar préstamos y reservar la última copia con una transacción | `registro de prestamos` |
| 5 | API de registro y listado con filtros y errores | `api de prestamos` |
| 6 | Formulario de préstamos conectado a la API | `formulario de prestamos` |
| 7 | Listado, filtros, pruebas de integración e instrucciones | `listado de prestamos` |

No subir los archivos privados de Firebase ni `.env`. La base cloud se usará en
plan Spark sin vincular facturación. Las pruebas locales no requieren un servicio pagado.
Cada commit contiene un avance distinto; no se reescribe la autoría del catálogo.
