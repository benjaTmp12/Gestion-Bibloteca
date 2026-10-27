const AppError = require('../utils/appError');

function errorEntrada(mensaje) {
  throw new AppError(400, 'DATOS_INVALIDOS', mensaje);
}
function objetoConCampos(valor, permitidos) {
  if (!valor || typeof valor !== 'object' || Array.isArray(valor)
      || Object.keys(valor).some(key => !permitidos.includes(key))) {
    errorEntrada('La solicitud contiene campos inválidos.');
  }
}
function validarId(id, campo) {
  if (typeof id !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(id)) {
    errorEntrada('El campo ' + campo + ' debe ser un identificador válido.');
  }
  return id;
}
function hoySantiago(fecha = new Date()) {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Santiago', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(fecha);
  const valor = tipo => partes.find(parte => parte.type === tipo).value;
  return valor('year') + '-' + valor('month') + '-' + valor('day');
}
function validarAlta(body, ahora = new Date()) {
  objetoConCampos(body, ['libro_id', 'socio_id', 'fecha_vencimiento']);
  const libro_id = validarId(body.libro_id, 'libro_id');
  const socio_id = validarId(body.socio_id, 'socio_id');
  const fecha = body.fecha_vencimiento;
  if (typeof fecha !== 'string' || !/^[1-9]\d{3}-\d{2}-\d{2}$/.test(fecha)) {
    errorEntrada('La fecha de vencimiento debe tener formato YYYY-MM-DD.');
  }
  const calendario = new Date(fecha + 'T00:00:00.000Z');
  if (Number.isNaN(calendario.getTime()) || calendario.toISOString().slice(0, 10) !== fecha) {
    errorEntrada('La fecha de vencimiento no existe.');
  }
  if (fecha <= hoySantiago(ahora)) errorEntrada('El vencimiento debe ser posterior a hoy.');
  return { libro_id, socio_id, fecha_vencimiento: fecha };
}
function validarFiltrosSocios(query = {}) {
  objetoConCampos(query, ['activo']);
  if (query.activo === undefined) return {};
  if (query.activo !== 'true' && query.activo !== 'false') {
    errorEntrada('activo debe ser true o false.');
  }
  return { activo: query.activo === 'true' };
}
function validarFiltrosPrestamos(query = {}) {
  objetoConCampos(query, ['estado', 'libro_id', 'socio_id']);
  const estado = query.estado === undefined ? 'todos' : query.estado;
  if (!['todos', 'activo', 'devuelto'].includes(estado)) {
    errorEntrada('estado debe ser activo, devuelto o todos.');
  }
  const filtros = { estado };
  for (const campo of ['libro_id', 'socio_id']) {
    if (query[campo] !== undefined) filtros[campo] = validarId(query[campo], campo);
  }
  return filtros;
}
module.exports = {
  validarId, validarAlta, validarFiltrosSocios, validarFiltrosPrestamos, hoySantiago
};
