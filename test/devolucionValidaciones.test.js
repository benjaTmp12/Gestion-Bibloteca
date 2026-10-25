const { test } = require('node:test');
const assert = require('node:assert/strict');
const { validarDevolucion, devolverPrestamo } = require('../src/services/devolucionService');

test('la devolución acepta un ID completo sin cuerpo o con un objeto vacío', () => {
  assert.equal(validarDevolucion('prestamo_1-A'), 'prestamo_1-A');
  assert.equal(validarDevolucion('prestamo_1-A', {}), 'prestamo_1-A');
});

test('IDs inválidos se rechazan antes de acceder a Firestore', async () => {
  for (const id of [undefined, null, 1, '', 'a/b', 'con espacio', 'a'.repeat(129)]) {
    await assert.rejects(devolverPrestamo(id), error =>
      error.status === 400 && error.codigo === 'DATOS_INVALIDOS');
  }
});

test('el cliente no puede elegir fecha, libro ni inventario de una devolución', async () => {
  for (const body of [null, [], 'texto', 1, { fecha_devolucion: '2099-01-01' },
    { copias_prestadas: 0 }, { libro_id: 'otro' }]) {
    await assert.rejects(devolverPrestamo('prestamo_1', body), error =>
      error.status === 400 && error.codigo === 'DATOS_INVALIDOS');
  }
});
