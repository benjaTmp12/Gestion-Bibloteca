const { getDb } = require('../db/connection');
const AppError = require('../utils/appError');

async function crear(datos, ahora = new Date()) {
  const db = getDb();
  const libroRef = db.collection('libros').doc(datos.libro_id);
  const socioRef = db.collection('socios').doc(datos.socio_id);
  // El ID permanece igual si Firestore reintenta la transacción.
  const prestamoRef = db.collection('prestamos').doc();
  return db.runTransaction(async tx => {
    const [libroDoc, socioDoc] = await tx.getAll(libroRef, socioRef);
    if (!libroDoc.exists) throw new AppError(404, 'LIBRO_NO_ENCONTRADO', 'El libro no existe.');
    if (!socioDoc.exists) throw new AppError(404, 'SOCIO_NO_ENCONTRADO', 'El socio no existe.');
    const libro = libroDoc.data();
    const socio = socioDoc.data();
    if (socio.activo !== true) {
      throw new AppError(409, 'SOCIO_INACTIVO', 'El socio no está habilitado para recibir préstamos.');
    }
    const total = libro.copias_total;
    const prestadas = libro.copias_prestadas;
    if (!Number.isSafeInteger(total) || !Number.isSafeInteger(prestadas)
        || total < 0 || prestadas < 0 || prestadas > total
        || typeof libro.titulo !== 'string' || typeof socio.nombre !== 'string') {
      throw new AppError(409, 'INVENTARIO_INVALIDO', 'El libro o el socio necesita revisión de sus datos.');
    }
    if (prestadas === total) {
      throw new AppError(409, 'SIN_DISPONIBILIDAD', 'No quedan ejemplares disponibles de este libro.');
    }
    const prestamo = {
      libro_id: datos.libro_id, socio_id: datos.socio_id,
      libro_titulo: libro.titulo, socio_nombre: socio.nombre,
      fecha_prestamo: ahora, fecha_vencimiento: datos.fecha_vencimiento,
      fecha_devolucion: null
    };
    // Todas las lecturas van antes de las escrituras.
    tx.create(prestamoRef, prestamo);
    tx.update(libroRef, { copias_prestadas: prestadas + 1 });
    return { ...prestamo, id: prestamoRef.id };
  });
}
async function listar() {
  const snapshot = await getDb().collection('prestamos').limit(501).get();
  if (snapshot.size > 500) {
    throw new AppError(409, 'LIMITE_MVP', 'El listado supera el límite de 500 préstamos del MVP.');
  }
  return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
}
module.exports = { crear, listar };
