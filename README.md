## API de catálogo

- `GET /api/libros?q=&categoria=` → lista y busca libros (título, autor, ISBN, categoría)
- `GET /api/libros/categorias` → categorías disponibles
- `GET /api/libros/:id` → detalle de un libro (400 si el id es inválido, 404 si no existe)

## Préstamos de Benja y base Firestore

Se reemplazó el acceso SQL del catálogo por Firestore. La pantalla original de
catálogo se conserva. El módulo de devoluciones queda a cargo de Fabian.
El trabajo está separado en [siete hitos](docs/hitos-prestamos.md).

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

Abrir el catálogo en `http://localhost:3000/` y el módulo de Benja en
`http://localhost:3000/prestamos.html`. Ambas pantallas incluyen enlaces de
navegación para ir del catálogo a préstamos y volver.

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
El módulo de Fabian deberá devolver el préstamo y disminuir ese contador en
una misma transacción, conservando la fecha si se repite la devolución.
No se incluyó su ruta de devolución en esta rama.

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
