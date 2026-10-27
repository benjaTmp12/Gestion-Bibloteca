const { test } = require('node:test');
const assert = require('node:assert/strict');
const { validarAlta, validarFiltrosSocios, validarFiltrosPrestamos, hoySantiago } =
  require('../src/services/prestamoValidaciones');
const ahora = new Date('2026-10-23T15:00:00Z');
const entrada = { libro_id: 'libro_demo_1', socio_id: 'socio_demo_2', fecha_vencimiento: '2026-11-06' };

test('solo se aceptan los campos de alta y los IDs string completos', () => {
  assert.deepEqual(validarAlta(entrada, ahora), entrada);
  for (const body of [null, [], {}, { ...entrada, libro_id: 1 },
    { ...entrada, socio_id: 'x/y' }, { ...entrada, copias_prestadas: 0 },
    { ...entrada, fecha_devolucion: null }]) {
    assert.throws(() => validarAlta(body, ahora), error => error.status === 400);
  }
});
test('fechas inválidas, de hoy y anteriores se rechazan', () => {
  for (const fecha_vencimiento of ['2026-02-30', '2026-13-01', '2026-10-23',
    '2026-10-22', '24/10/2026', ['2026-10-24']]) {
    assert.throws(() => validarAlta({ ...entrada, fecha_vencimiento }, ahora),
      error => error.status === 400);
  }
});
test('el calendario distingue años bisiestos', () => {
  assert.equal(validarAlta({ ...entrada, fecha_vencimiento: '2028-02-29' }, ahora).fecha_vencimiento, '2028-02-29');
  assert.throws(() => validarAlta({ ...entrada, fecha_vencimiento: '2027-02-29' }, ahora));
});
test('hoy se calcula en Santiago aunque UTC ya cambió de día', () => {
  assert.equal(hoySantiago(new Date('2026-10-24T01:00:00Z')), '2026-10-23');
  assert.doesNotThrow(() => validarAlta({ ...entrada, fecha_vencimiento: '2026-10-24' },
    new Date('2026-10-24T01:00:00Z')));
});
test('filtro de socios admite true/false y rechaza parámetros repetidos', () => {
  assert.deepEqual(validarFiltrosSocios({ activo: 'true' }), { activo: true });
  assert.deepEqual(validarFiltrosSocios({ activo: 'false' }), { activo: false });
  assert.deepEqual(validarFiltrosSocios(), {});
  for (const query of [{ activo: '1' }, { activo: ['true', 'false'] }, { extra: 'x' }]) {
    assert.throws(() => validarFiltrosSocios(query), error => error.status === 400);
  }
});
test('filtros de préstamos no permiten consultas arbitrarias', () => {
  assert.deepEqual(validarFiltrosPrestamos({ estado: 'activo', libro_id: 'libro_1' }),
    { estado: 'activo', libro_id: 'libro_1' });
  assert.throws(() => validarFiltrosPrestamos({ estado: 'otro' }));
  assert.throws(() => validarFiltrosPrestamos({ socio_id: ['a', 'b'] }));
  assert.throws(() => validarFiltrosPrestamos({ orderBy: 'email' }));
});
