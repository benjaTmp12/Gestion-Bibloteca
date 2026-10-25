const AppError = require('../utils/appError');

async function devolver(req, res, next) {
  next(new AppError(501, 'NO_IMPLEMENTADO', 'El registro de devoluciones está en preparación.'));
}
module.exports = { devolver };
