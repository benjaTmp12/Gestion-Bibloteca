const { getDb } = require('../db/connection');
const AppError = require('../utils/appError');

const LIMITE_CATALOGO = 100;
const normalizar = texto => String(texto || '').normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es');

function presentar(doc) {
  const libro = doc.data();
  const { copias_total: total, copias_prestadas: prestadas } = libro;
  if (!Number.isSafeInteger(total) || !Number.isSafeInteger(prestadas)
      || total < 0 || prestadas < 0 || prestadas > total) {
    throw new AppError(409, 'INVENTARIO_INVALIDO', 'El inventario del libro necesita revisión.');
  }
  return {
    id: doc.id, titulo: libro.titulo, autor: libro.autor, isbn: libro.isbn,
    categoria: libro.categoria, anio: libro.anio ?? null, copias_total: total,
    disponibles: total - prestadas, copias_disponibles: total - prestadas
  };
}

async function listar() {
  const snapshot = await getDb().collection('libros').limit(LIMITE_CATALOGO + 1).get();
  if (snapshot.size > LIMITE_CATALOGO) {
    throw new AppError(409, 'LIMITE_MVP', 'El catálogo supera el límite de 100 libros del MVP.');
  }
  return snapshot.docs.map(presentar)
    .sort((a, b) => a.titulo.localeCompare(b.titulo, 'es') || a.id.localeCompare(b.id));
}

async function buscar(texto, categoria) {
  const q = normalizar(texto);
  const cat = normalizar(categoria);
  return (await listar()).filter(libro =>
    (!q || [libro.titulo, libro.autor, libro.isbn].some(valor => normalizar(valor).includes(q)))
    && (!cat || normalizar(libro.categoria) === cat));
}

async function obtenerPorId(id) {
  const doc = await getDb().collection('libros').doc(id).get();
  return doc.exists ? presentar(doc) : undefined;
}

async function categorias() {
  return [...new Set((await listar()).map(libro => libro.categoria))]
    .sort((a, b) => a.localeCompare(b, 'es'));
}

async function guardar(datos, id) {
  const db = getDb();
  const ref = id ? db.collection('libros').doc(id) : db.collection('libros').doc();
  await db.runTransaction(async tx => {
    const actual = await tx.get(ref);
    if (id && !actual.exists) throw new AppError(404, 'LIBRO_NO_ENCONTRADO', 'El libro no existe.');
    if (!id) {
      const catalogo = await tx.get(db.collection('libros').limit(LIMITE_CATALOGO));
      if (catalogo.size >= LIMITE_CATALOGO) {
        throw new AppError(409, 'LIMITE_MVP', 'El catálogo admite hasta 100 libros en este MVP.');
      }
    }
    const reserva = db.collection('isbns').doc(datos.isbn);
    const reservado = await tx.get(reserva);
    const coincidencias = await tx.get(db.collection('libros').where('isbn', '==', datos.isbn).limit(2));
    if ((reservado.exists && reservado.data().libro_id !== ref.id)
        || coincidencias.docs.some(doc => doc.id !== ref.id)) {
      throw new AppError(409, 'ISBN_DUPLICADO', 'Ya existe un libro con ese ISBN.');
    }
    const prestadas = actual.exists ? actual.data().copias_prestadas : 0;
    if (actual.exists) presentar(actual);
    if (datos.copias_total < prestadas) {
      throw new AppError(409, 'COPIAS_INSUFICIENTES', 'El total no puede ser menor que las copias prestadas.');
    }
    const isbnAnterior = actual.exists ? actual.data().isbn : null;
    const reservaAnterior = isbnAnterior && isbnAnterior !== datos.isbn
      ? db.collection('isbns').doc(isbnAnterior) : null;
    const anterior = reservaAnterior ? await tx.get(reservaAnterior) : null;
    if (anterior?.exists && anterior.data().libro_id === ref.id) tx.delete(reservaAnterior);
    tx.set(reserva, { libro_id: ref.id });
    if (actual.exists) tx.update(ref, datos);
    else tx.create(ref, { ...datos, copias_prestadas: 0 });
  });
  return obtenerPorId(ref.id);
}

async function eliminar(id) {
  const db = getDb();
  const ref = db.collection('libros').doc(id);
  await db.runTransaction(async tx => {
    const doc = await tx.get(ref);
    if (!doc.exists) throw new AppError(404, 'LIBRO_NO_ENCONTRADO', 'El libro no existe.');
    const libro = presentar(doc);
    const historial = await tx.get(db.collection('prestamos').where('libro_id', '==', id).limit(1));
    const reserva = db.collection('isbns').doc(libro.isbn);
    const reservado = await tx.get(reserva);
    if (!historial.empty || libro.copias_disponibles !== libro.copias_total) {
      throw new AppError(409, 'LIBRO_CON_HISTORIAL', 'No se puede eliminar un libro con préstamos registrados.');
    }
    tx.delete(ref);
    if (reservado.exists && reservado.data().libro_id === id) tx.delete(reserva);
  });
}

module.exports = { listar, buscar, obtenerPorId, categorias, guardar, eliminar };
