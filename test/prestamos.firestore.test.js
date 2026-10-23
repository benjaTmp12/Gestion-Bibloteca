const { test } = require('node:test');
const assert = require('node:assert/strict');

const ejecutar = process.env.RUN_FIRESTORE_TESTS === '1';
test('préstamos sobre Firestore real en emulador local', { skip: !ejecutar }, async t => {
  const host = process.env.FIRESTORE_EMULATOR_HOST;
  assert.match(host || '', /^(127\.0\.0\.1|localhost):\d+$/, 'Solo se permite un emulador local');
  // Proyecto exclusivo de pruebas; jamás se usa la base cloud o el demo de la interfaz.
  process.env.FIREBASE_PROJECT_ID = 'demo-biblioteca-pruebas';
  const { getDb } = require('../src/db/connection');
  const { cargarEjemplos } = require('../src/db/seed');
  const repo = require('../src/repositories/prestamoRepository');
  const db = getDb();
  const datos = { libro_id: 'libro_test', socio_id: 'socio_test', fecha_vencimiento: '2099-11-06' };
  const ahora = new Date('2026-10-23T15:00:00Z');
  t.beforeEach(async () => {
    const response = await fetch('http://' + host
      + '/emulator/v1/projects/demo-biblioteca-pruebas/databases/(default)/documents', { method: 'DELETE' });
    assert.equal(response.ok, true);
    await db.collection('libros').doc('libro_test').set({
      titulo: 'Libro de prueba', autor: 'Autor', isbn: '9780307474728',
      categoria: 'Prueba', anio: 2026, copias_total: 1, copias_prestadas: 0
    });
    await db.collection('socios').doc('socio_test').set({
      nombre: 'Socio de prueba', email: 'socio@demo.cl', activo: true
    });
  });
  try {
    await t.test('el préstamo y la copia ocupada se guardan juntos', async () => {
      const prestamo = await repo.crear(datos, ahora);
      assert.equal((await db.collection('libros').doc('libro_test').get()).data().copias_prestadas, 1);
      const guardado = (await db.collection('prestamos').doc(prestamo.id).get()).data();
      assert.equal(guardado.fecha_devolucion, null);
      assert.equal(guardado.fecha_prestamo.toDate().toISOString(), ahora.toISOString());
      assert.equal(guardado.socio_nombre, 'Socio de prueba');
    });
    await t.test('sin copias disponibles no se guarda un préstamo', async () => {
      await db.collection('libros').doc('libro_test').update({ copias_prestadas: 1 });
      await assert.rejects(repo.crear(datos, ahora), error => error.codigo === 'SIN_DISPONIBILIDAD');
      assert.equal((await db.collection('prestamos').get()).size, 0);
    });
    await t.test('socio inactivo o inexistente no cambia el inventario', async () => {
      await db.collection('socios').doc('socio_test').update({ activo: false });
      await assert.rejects(repo.crear(datos, ahora), error => error.codigo === 'SOCIO_INACTIVO');
      await assert.rejects(repo.crear({ ...datos, socio_id: 'no_existe' }, ahora),
        error => error.status === 404);
      assert.equal((await db.collection('libros').doc('libro_test').get()).data().copias_prestadas, 0);
    });
    await t.test('libro inexistente e inventario incompleto se rechazan', async () => {
      await assert.rejects(repo.crear({ ...datos, libro_id: 'no_existe' }, ahora),
        error => error.codigo === 'LIBRO_NO_ENCONTRADO');
      await db.collection('libros').doc('libro_test').set({ titulo: 'Sin inventario' });
      await assert.rejects(repo.crear(datos, ahora), error => error.codigo === 'INVENTARIO_INVALIDO');
    });
    await t.test('dos solicitudes por la última copia crean exactamente un préstamo', async () => {
      const resultados = await Promise.allSettled([repo.crear(datos, ahora), repo.crear(datos, ahora)]);
      assert.equal(resultados.filter(r => r.status === 'fulfilled').length, 1);
      assert.equal(resultados.find(r => r.status === 'rejected').reason.codigo, 'SIN_DISPONIBILIDAD');
      assert.equal((await db.collection('prestamos').get()).size, 1);
      assert.equal((await db.collection('libros').doc('libro_test').get()).data().copias_prestadas, 1);
    });
    await t.test('repetir el seed no reinicia las copias ya prestadas', async () => {
      await cargarEjemplos(db);
      await db.collection('libros').doc('libro_demo_1').update({ copias_prestadas: 1 });
      await cargarEjemplos(db);
      assert.equal((await db.collection('libros').doc('libro_demo_1').get()).data().copias_prestadas, 1);
    });
  } finally { await db.terminate(); }
});
