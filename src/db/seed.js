require('dotenv').config();
const { getDb } = require('./connection');

const libros = [
  ['libro_demo_1', 'Cien años de soledad', 'Gabriel García Márquez', '9780307474728', 'Novela', 1967, 3],
  ['libro_demo_2', 'Clean Code', 'Robert C. Martin', '9780132350884', 'Informática', 2008, 2],
  ['libro_demo_3', 'La casa de los espíritus', 'Isabel Allende', '9788401242779', 'Novela', 1982, 2],
  ['libro_demo_4', 'Patrones de diseño', 'Erich Gamma', '9780201633610', 'Informática', 1994, 1],
  ['libro_demo_5', 'Sapiens', 'Yuval Noah Harari', '9780062316097', 'Historia', 2011, 2]
];

async function cargarEjemplos(db) {
  for (const [id, titulo, autor, isbn, categoria, anio, copias_total] of libros) {
    const ref = db.collection('libros').doc(id);
    await db.runTransaction(async tx => {
      if (!(await tx.get(ref)).exists) {
        tx.create(ref, { titulo, autor, isbn, categoria, anio, copias_total, copias_prestadas: 0 });
      }
    });
  }
  for (const [id, nombre, email, activo] of [
    ['socio_demo_1', 'Ana Pérez', 'ana@demo.cl', true],
    ['socio_demo_2', 'Luis Soto', 'luis@demo.cl', true],
    ['socio_demo_3', 'Socio inactivo', 'inactivo@demo.cl', false]
  ]) {
    const ref = db.collection('socios').doc(id);
    await db.runTransaction(async tx => {
      if (!(await tx.get(ref)).exists) tx.create(ref, { nombre, email, activo });
    });
  }
}

if (require.main === module) {
  (async () => {
    if (!process.env.FIRESTORE_EMULATOR_HOST && !process.argv.includes('--cloud')) {
      throw new Error('Usa el emulador local o agrega --cloud para cargar ejemplos en el proyecto configurado.');
    }
    const db = getDb();
    try {
      await cargarEjemplos(db);
      console.log('Datos ficticios preparados; los documentos existentes se conservaron.');
    } finally {
      await db.terminate();
    }
  })().catch(error => { console.error(error.message); process.exitCode = 1; });
}
module.exports = { cargarEjemplos };
