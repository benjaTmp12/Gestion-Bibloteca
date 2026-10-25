## API de catálogo

- `GET /api/libros?q=&categoria=` → lista y busca libros (título, autor, ISBN, categoría)
- `GET /api/libros/categorias` → categorías disponibles
- `GET /api/libros/:id` → detalle de un libro (400 si el id es inválido, 404 si no existe)

## Préstamos de Benja y base Firestore

Se reemplazó el acceso SQL del catálogo por Firestore. La pantalla original de
catálogo se conserva. El módulo de Fabián incorpora devoluciones e historial
desde la base integrada de `feat/prestamos` (`413e0ed`), en `feat/devoluciones`.

### Desarrollo local sin servicios pagados

Requisitos: Node.js 22 o 24, Java 21 para el emulador y npm. El servidor también
se verificó con Node.js 20. No se necesitan cuentas ni credenciales cloud para
usar el proyecto `demo-biblioteca` con el emulador.

En PowerShell, desde la carpeta del repositorio:

```powershell
npm ci
if (!(Test-Path .env)) { Copy-Item .env.example .env }
```

En una terminal, iniciar Firestore local (la primera ejecución descarga las
herramientas gratuitas necesarias):

```powershell
npx firebase-tools emulators:start --only firestore --project demo-biblioteca
```

En otra terminal:

```powershell
npm run seed
npm run dev
```

Abrir el catálogo en `http://localhost:3000/`, préstamos en
`http://localhost:3000/prestamos.html` y devoluciones en
`http://localhost:3000/devoluciones.html`. Las tres pantallas comparten navegación.

El seed crea cinco libros y tres socios ficticios (dos activos y uno inactivo).
No borra préstamos ni sobrescribe documentos existentes. Al cerrar el emulador,
sus datos se pierden salvo que se utilicen sus opciones de importación/exportación.
Esto es distinto de Firestore cloud, donde los datos persisten.

### Rutas del módulo

| Método | Ruta | Uso |
| --- | --- | --- |
| GET | `/api/socios?activo=true` | Socios habilitados para el formulario |
| POST | `/api/prestamos` | Registrar y ocupar una copia en una transacción |
| GET | `/api/prestamos?estado=activo` | Listar préstamos; admite activo, devuelto o todos |
| PUT | `/api/prestamos/:id/devolucion` | Devolver un préstamo y liberar una copia |
| GET | `/api/prestamos?estado=devuelto` | Consultar el historial de devoluciones |

El listado también acepta `libro_id` y `socio_id`. Los IDs son strings de Firestore.
El catálogo conserva su respuesta como arreglo y el campo `disponibles` para
compatibilidad con su interfaz. Las rutas de socios y préstamos responden
`{ "data": ... }`; sus errores usan `{ "error": { "codigo": "...", "mensaje": "..." } }`.

Ejemplo de cuerpo de `POST /api/prestamos` (la fecha debe ser futura):

```json
{
  "libro_id": "libro_demo_1",
  "socio_id": "socio_demo_2",
  "fecha_vencimiento": "2099-11-06"
}
```

Los documentos de libros necesitan `copias_total` y `copias_prestadas` enteros.
La disponibilidad es su diferencia. La creación del préstamo y el aumento de
`copias_prestadas` se confirman juntos. Un préstamo vencido sigue ocupando copia.
La devolución guarda `fecha_devolucion` mediante `FieldValue.serverTimestamp()`
y disminuye `copias_prestadas` en una sola transacción. Responde 200 con
`{ "data": prestamo }`, usando la misma presentación del listado. No requiere
cuerpo (también admite `{}`); rechaza fechas o contadores enviados por el cliente.
Un ID inválido responde 400; un préstamo o libro inexistente, 404; un inventario
inconsistente, 409, sin confirmar cambios parciales.

Si ya estaba devuelto, devuelve 200 con la fecha original y no modifica el libro.
La comprobación ocurre dentro de la transacción y se repite si Firestore la
reintenta, por lo que dos solicitudes simultáneas liberan una sola copia.
El panel actualiza préstamos y disponibilidad después de confirmar la respuesta;
el historial muestra fecha y hora en Santiago, con las devoluciones recientes primero.
Ante un fallo de red no anuncia éxito: permite actualizar el listado y reintentar
la misma devolución de forma segura. Si el servidor confirmó la operación pero
falló la actualización del panel, avisa de ambas cosas.

Los siete commits del módulo son: rutas de devoluciones, validaciones, registro
de devolucion, control de devoluciones, panel de devoluciones, historial y
pruebas de devoluciones.

Los límites del MVP son 100 libros, 100 socios y 500 préstamos. Los filtros del
listado se aplican en memoria sobre lecturas acotadas; no hay sondeo automático.
Al superar los límites, la API avisa en lugar de entregar listados incompletos.

### Pruebas

```powershell
npm test
```

Ejecuta las validaciones sin servicios cloud. Con el emulador iniciado:

```powershell
npm run test:firestore
```

La integración usa exclusivamente un proyecto ficticio separado,
`demo-biblioteca-pruebas`, en un emulador localhost. Comprueba errores, filtros,
persistencia de documentos, seed repetido y dos solicitudes simultáneas por
la última copia. No borra la base demo del formulario ni toca proyectos cloud.

Las pruebas de devoluciones usan otro proyecto exclusivo del emulador,
`demo-biblioteca-devoluciones-pruebas`. Verifican el ciclo prestar/devolver,
la disponibilidad del catálogo, el historial, la fecha del servidor,
reintentos, concurrencia y errores sin cambios parciales.

Comprobación manual en el emulador: registrar un préstamo, abrir Devoluciones,
pulsar Devolver y comprobar el historial y la copia recuperada en el catálogo.
Repetir el mismo `PUT` y comprobar que la fecha y la disponibilidad no cambian.
Las credenciales privadas y `.env` se configuran fuera de Git y no son necesarios
para las pruebas con el emulador.

### Configurar el Firebase del equipo en la VM

1. Usar un proyecto Firebase en plan Spark con Firestore Standard creado;
   no vincular facturación ni activar Blaze.
2. Configurar `FIREBASE_PROJECT_ID` con el ID real y quitar
   `FIRESTORE_EMULATOR_HOST` del entorno de la VM.
3. Configurar `GOOGLE_APPLICATION_CREDENTIALS` con la ruta al archivo privado de
   la cuenta de servicio autorizada para Firestore. Guardarlo fuera de `public/`
   y del repositorio. También se admiten credenciales de aplicación por defecto.
4. `npm run seed -- --cloud` carga ejemplos en el proyecto configurado sin
   sobrescribir documentos existentes. Este paso escribe datos en Firebase;
   hacerlo solo cuando el proyecto y sus permisos ya estén comprobados.
5. Ejecutar `npm start` y comprobar `/health/db`. La publicación de la VM debe
   mantenerse dentro de los créditos institucionales.

Las reglas incluidas deniegan el acceso directo del navegador. El Admin SDK del
backend se autoriza con IAM; nunca publicar sus credenciales para corregir permisos.
No se ha configurado ni modificado ninguna cuenta Firebase o recurso Azure real.

Referencias: [Admin SDK](https://firebase.google.com/docs/admin/setup),
[emulador](https://firebase.google.com/docs/emulator-suite/connect_firestore),
[transacciones](https://firebase.google.com/docs/firestore/manage-data/transactions).
