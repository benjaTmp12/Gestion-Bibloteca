const AppError = require('./appError');
const noDisponibles = new Set([4, 8, 10, 14, 'deadline-exceeded', 'resource-exhausted', 'aborted', 'unavailable']);

function apiError(error, req, res, next) {
  if (res.headersSent) return next(error);
  if (error instanceof AppError) {
    return res.status(error.status).json({ error: { codigo: error.codigo, mensaje: error.message } });
  }
  const status = noDisponibles.has(error.code) ? 503 : 500;
  console.error('Error en API de préstamos/socios:', error.code || error.name);
  res.status(status).json({
    error: {
      codigo: status === 503 ? 'SERVICIO_NO_DISPONIBLE' : 'ERROR_INTERNO',
      mensaje: status === 503
        ? 'La base de datos no está disponible. Inténtalo nuevamente.'
        : 'No se pudo completar la operación.'
    }
  });
}
module.exports = apiError;
