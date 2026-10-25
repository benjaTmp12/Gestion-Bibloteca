const { validarId } = require('./prestamoValidaciones');
const AppError = require('../utils/appError');
const repo = require('../repositories/devolucionRepository');
const { presentar } = require('./prestamoService');

function validarDevolucion(id, body) {
  validarId(id, 'id');
  // La fecha y el inventario los determina el servidor, nunca el cliente.
  if (body !== undefined && (!body || typeof body !== 'object'
      || Array.isArray(body) || Object.keys(body).length > 0)) {
    throw new AppError(400, 'DATOS_INVALIDOS', 'La devolución no admite campos en el cuerpo.');
  }
  return id;
}

async function devolverPrestamo(id, body) {
  validarDevolucion(id, body);
  return presentar(await repo.devolver(id));
}

module.exports = { validarDevolucion, devolverPrestamo };
