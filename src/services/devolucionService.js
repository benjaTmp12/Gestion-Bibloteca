const { validarId } = require('./prestamoValidaciones');
const AppError = require('../utils/appError');

function validarDevolucion(id, body) {
  validarId(id, 'id');
  // La fecha y el inventario los determina el servidor, nunca el cliente.
  if (body !== undefined && (!body || typeof body !== 'object'
      || Array.isArray(body) || Object.keys(body).length > 0)) {
    throw new AppError(400, 'DATOS_INVALIDOS', 'La devolución no admite campos en el cuerpo.');
  }
  return id;
}

module.exports = { validarDevolucion };
