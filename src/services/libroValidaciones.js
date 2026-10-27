const AppError = require('../utils/appError');
const campos = ['titulo', 'autor', 'isbn', 'categoria', 'anio', 'copias_total'];
function validarId(id) {
  if (typeof id !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(id)) {
    throw new AppError(400, 'ID_INVALIDO', 'El identificador del libro no es válido.');
  }
  return id;
}
function validarLibro(body) {
  const fallo = mensaje => { throw new AppError(400, 'LIBRO_INVALIDO', mensaje); };
  if (!body || Array.isArray(body) || typeof body !== 'object'
      || Object.keys(body).some(c => !campos.includes(c))) fallo('Envía solamente los campos del libro.');
  const datos = {};
  for (const [campo, max] of [['titulo', 200], ['autor', 150], ['categoria', 80]]) {
    if (typeof body[campo] !== 'string' || !body[campo].trim() || body[campo].trim().length > max) {
      fallo(`${campo}: escribe un texto de entre 1 y ${max} caracteres.`);
    }
    datos[campo] = body[campo].trim();
  }
  if (typeof body.isbn !== 'string') fallo('Escribe un ISBN válido.');
  datos.isbn = body.isbn.replace(/[\s-]/g, '').toUpperCase();
  if (!/^(?:\d{13}|\d{9}[\dX])$/.test(datos.isbn)) fallo('El ISBN debe tener 10 o 13 caracteres válidos.');
  datos.anio = body.anio ?? null;
  if (datos.anio !== null && (!Number.isInteger(datos.anio) || datos.anio < 1
      || datos.anio > new Date().getFullYear())) fallo('El año debe estar entre 1 y el año actual.');
  if (!Number.isSafeInteger(body.copias_total) || body.copias_total < 0 || body.copias_total > 10000) {
    fallo('Las copias deben ser un entero entre 0 y 10000.');
  }
  datos.copias_total = body.copias_total;
  return datos;
}
module.exports = { validarLibro, validarId };
