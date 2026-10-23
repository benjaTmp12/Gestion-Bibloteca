const repo = require('../repositories/prestamoRepository');
const { validarAlta, hoySantiago } = require('./prestamoValidaciones');

function instanteISO(valor) {
  if (valor === null) return null;
  const fecha = typeof valor?.toDate === 'function' ? valor.toDate() : new Date(valor);
  return fecha.toISOString();
}
function presentar(prestamo, ahora = new Date()) {
  const devuelto = prestamo.fecha_devolucion !== null;
  return {
    id: prestamo.id, libro_id: prestamo.libro_id, libro_titulo: prestamo.libro_titulo,
    socio_id: prestamo.socio_id, socio_nombre: prestamo.socio_nombre,
    fecha_prestamo: instanteISO(prestamo.fecha_prestamo),
    fecha_vencimiento: prestamo.fecha_vencimiento,
    fecha_devolucion: instanteISO(prestamo.fecha_devolucion),
    estado: devuelto ? 'devuelto' : 'activo',
    vencido: !devuelto && prestamo.fecha_vencimiento < hoySantiago(ahora)
  };
}
async function crearPrestamo(body) {
  const ahora = new Date();
  const datos = validarAlta(body, ahora);
  return presentar(await repo.crear(datos, ahora), ahora);
}
module.exports = { crearPrestamo, presentar };
