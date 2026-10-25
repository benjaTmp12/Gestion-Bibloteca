const { FieldValue } = require('firebase-admin/firestore');
const { getDb } = require('../db/connection');
const AppError = require('../utils/appError');

async function devolver(id) {
  const db = getDb();
  const prestamoRef = db.collection('prestamos').doc(id);
  const anterior = await db.runTransaction(async tx => {
    const prestamoDoc = await tx.get(prestamoRef);
    if (!prestamoDoc.exists) {
      throw new AppError(404, 'PRESTAMO_NO_ENCONTRADO', 'El préstamo no existe.');
    }
    const prestamo = prestamoDoc.data();
    // También se comprueba en cada reintento de la transacción concurrente.
    if (prestamo.fecha_devolucion !== null && prestamo.fecha_devolucion !== undefined) {
      return { ...prestamo, id: prestamoDoc.id };
    }
    if (prestamo.fecha_devolucion !== null || typeof prestamo.libro_id !== 'string'
        || !/^[A-Za-z0-9_-]{1,128}$/.test(prestamo.libro_id)) {
      throw new AppError(409, 'PRESTAMO_INVALIDO', 'El préstamo necesita revisión de sus datos.');
    }
    const libroRef = db.collection('libros').doc(prestamo.libro_id);
    const libroDoc = await tx.get(libroRef);
    if (!libroDoc.exists) {
      throw new AppError(404, 'LIBRO_NO_ENCONTRADO', 'El libro del préstamo no existe.');
    }
    const { copias_total: total, copias_prestadas: prestadas } = libroDoc.data();
    if (!Number.isSafeInteger(total) || !Number.isSafeInteger(prestadas)
        || total < 1 || prestadas < 1 || prestadas > total) {
      throw new AppError(409, 'INVENTARIO_INVALIDO', 'El inventario del libro necesita revisión.');
    }
    // Todas las lecturas preceden a las escrituras; ambas se confirman juntas.
    tx.update(prestamoRef, { fecha_devolucion: FieldValue.serverTimestamp() });
    tx.update(libroRef, { copias_prestadas: prestadas - 1 });
    return null;
  });
  if (anterior) return anterior;
  // Recuperar el timestamp asignado por Firestore después de confirmar el commit.
  const guardado = await prestamoRef.get();
  return { ...guardado.data(), id: guardado.id };
}

module.exports = { devolver };
