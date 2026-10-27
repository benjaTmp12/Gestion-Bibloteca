const repo = require('../repositories/prestamoRepository');
const { validarAlta, validarFiltrosPrestamos, hoySantiago } = require('./prestamoValidaciones');

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
async function listarPrestamos(query) {
  const filtros = validarFiltrosPrestamos(query);
  const ahora = new Date();
  return (await repo.listar()).map(prestamo => presentar(prestamo, ahora))
    .filter(prestamo => (filtros.estado === 'todos' || prestamo.estado === filtros.estado)
      && (!filtros.libro_id || prestamo.libro_id === filtros.libro_id)
      && (!filtros.socio_id || prestamo.socio_id === filtros.socio_id))
    .sort((a, b) => b.fecha_prestamo.localeCompare(a.fecha_prestamo) || b.id.localeCompare(a.id));
}
module.exports = { crearPrestamo, listarPrestamos, presentar };
