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

module.exports = { listar, buscar, obtenerPorId, categorias };
