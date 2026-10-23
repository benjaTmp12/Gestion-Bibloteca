const { test } = require('node:test');
const assert = require('node:assert/strict');
const { presentar } = require('../src/services/prestamoService');

const prestamo = {
  id: 'p1', libro_id: 'l1', socio_id: 's1', libro_titulo: 'Libro', socio_nombre: 'Socio',
  fecha_prestamo: new Date('2026-10-01T12:00:00Z'),
  fecha_vencimiento: '2026-10-23', fecha_devolucion: null
};
test('el propio día de vencimiento no se marca como vencido', () => {
  const actual = presentar(prestamo, new Date('2026-10-24T01:00:00Z'));
  assert.equal(actual.estado, 'activo');
  assert.equal(actual.vencido, false);
});
test('un préstamo vencido permanece activo hasta la devolución', () => {
  const actual = presentar(prestamo, new Date('2026-10-24T15:00:00Z'));
  assert.equal(actual.estado, 'activo');
  assert.equal(actual.vencido, true);
});
test('la devolución se presenta como devuelta y no como vencida', () => {
  const devuelto = presentar({ ...prestamo, fecha_devolucion: new Date('2026-10-24T14:00:00Z') },
    new Date('2026-10-24T15:00:00Z'));
  assert.equal(devuelto.estado, 'devuelto');
  assert.equal(devuelto.vencido, false);
  assert.equal(devuelto.fecha_devolucion, '2026-10-24T14:00:00.000Z');
});
