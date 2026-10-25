const { test } = require('node:test');
const assert = require('node:assert/strict');

const ejecutar = process.env.RUN_FIRESTORE_TESTS === '1';
test('devoluciones e historial exclusivamente en el emulador local', { skip: !ejecutar }, async t => {
  const host = process.env.FIRESTORE_EMULATOR_HOST;
  assert.match(host || '', /^(127\.0\.0\.1|localhost):\d+$/, 'Solo se permite un emulador local');
  process.env.FIREBASE_PROJECT_ID = 'demo-biblioteca-devoluciones-pruebas';
  const { getDb } = require('../src/db/connection');
  const { Timestamp } = require('firebase-admin/firestore');
  const prestamos = require('../src/repositories/prestamoRepository');
  const devoluciones = require('../src/repositories/devolucionRepository');
  const db = getDb();
  const app = require('../src/app');
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const base = 'http://127.0.0.1:' + server.address().port;
  const libroRef = db.collection('libros').doc('libro_test');
  const datos = { libro_id: libroRef.id, socio_id: 'socio_test', fecha_vencimiento: '2099-11-06' };
  const obtener = async ruta => {
    const respuesta = await fetch(base + ruta);
    assert.equal(respuesta.status, 200);
    return respuesta.json();
  };
  const devolver = (id, body) => fetch(base + '/api/prestamos/' + encodeURIComponent(id) + '/devolucion', {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  });
  const inventario = async () => (await libroRef.get()).data().copias_prestadas;
  const prestamoGuardado = async id => (await db.collection('prestamos').doc(id).get()).data();

  t.beforeEach(async () => {
    const respuesta = await fetch('http://' + host + '/emulator/v1/projects/'
      + process.env.FIREBASE_PROJECT_ID + '/databases/(default)/documents', { method: 'DELETE' });
    assert.equal(respuesta.ok, true);
    await libroRef.set({
      titulo: 'Libro de prueba', autor: 'Autor', isbn: '9780307474728',
      categoria: 'Prueba', anio: 2026, copias_total: 2, copias_prestadas: 0
    });
    await db.collection('socios').doc('socio_test').set({
      nombre: 'Socio de prueba', email: 'socio@demo.cl', activo: true
    });
  });

  try {
    await t.test('prestar, devolver y repetir recupera exactamente una copia y conserva la fecha', async () => {
      const alta = await fetch(base + '/api/prestamos', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(datos)
      });
      assert.equal(alta.status, 201);
      const prestamo = (await alta.json()).data;
      assert.equal((await obtener('/api/libros/' + libroRef.id)).disponibles, 1);
      assert.equal((await obtener('/api/prestamos?estado=activo')).data[0].id, prestamo.id);
      const antes = Date.now();
      const respuesta = await devolver(prestamo.id);
      assert.equal(respuesta.status, 200);
      const devuelto = (await respuesta.json()).data;
      assert.equal(devuelto.estado, 'devuelto');
      assert.equal(devuelto.vencido, false);
      assert.ok(Date.parse(devuelto.fecha_devolucion) >= antes - 2000);
      assert.ok(Date.parse(devuelto.fecha_devolucion) <= Date.now() + 2000);
      const guardado = await prestamoGuardado(prestamo.id);
      assert.ok(guardado.fecha_devolucion instanceof Timestamp);
      assert.equal(guardado.fecha_devolucion.toDate().toISOString(), devuelto.fecha_devolucion);
      // El timestamp del servidor debe corresponder a la escritura confirmada.
      const snapshot = await db.collection('prestamos').doc(prestamo.id).get();
      assert.ok(Math.abs(snapshot.updateTime.toMillis() - guardado.fecha_devolucion.toMillis()) < 1000);
      assert.equal(await inventario(), 0);
      assert.equal((await obtener('/api/libros/' + libroRef.id)).disponibles, 2);
      assert.deepEqual((await obtener('/api/prestamos?estado=activo')).data, []);
      assert.equal((await obtener('/api/prestamos?estado=devuelto')).data[0].id, prestamo.id);
      const repetida = await devolver(prestamo.id, {});
      assert.equal(repetida.status, 200);
      assert.deepEqual((await repetida.json()).data, devuelto);
      assert.ok((await prestamoGuardado(prestamo.id)).fecha_devolucion.isEqual(guardado.fecha_devolucion));
      assert.ok((await db.collection('prestamos').doc(prestamo.id).get()).updateTime.isEqual(snapshot.updateTime));
      assert.equal(await inventario(), 0);
      assert.equal((await obtener('/api/libros/' + libroRef.id)).disponibles, 2);
    });

    await t.test('dos solicitudes simultáneas al mismo préstamo liberan una sola copia', async () => {
      const primero = await prestamos.crear(datos);
      const segundo = await prestamos.crear(datos);
      const respuestas = await Promise.all([devolver(primero.id), devolver(primero.id)]);
      assert.deepEqual(respuestas.map(respuesta => respuesta.status), [200, 200]);
      const resultados = await Promise.all(respuestas.map(respuesta => respuesta.json()));
      assert.equal(resultados[0].data.fecha_devolucion, resultados[1].data.fecha_devolucion);
      assert.equal(await inventario(), 1);
      assert.equal((await prestamoGuardado(segundo.id)).fecha_devolucion, null);
      assert.equal((await obtener('/api/prestamos?estado=activo')).data.length, 1);
      assert.equal((await obtener('/api/prestamos?estado=devuelto')).data.length, 1);
    });

    await t.test('devolver dos préstamos diferentes simultáneamente no pierde actualizaciones', async () => {
      const primero = await prestamos.crear(datos);
      const segundo = await prestamos.crear(datos);
      const respuestas = await Promise.all([devolver(primero.id), devolver(segundo.id)]);
      assert.deepEqual(respuestas.map(respuesta => respuesta.status), [200, 200]);
      assert.equal(await inventario(), 0);
      assert.equal((await obtener('/api/prestamos?estado=devuelto')).data.length, 2);
    });

    await t.test('un préstamo inexistente devuelve 404 sin modificar el libro', async () => {
      const respuesta = await devolver('no_existe');
      assert.equal(respuesta.status, 404);
      assert.equal((await respuesta.json()).error.codigo, 'PRESTAMO_NO_ENCONTRADO');
      assert.equal(await inventario(), 0);
      assert.equal((await db.collection('prestamos').get()).size, 0);
    });

    await t.test('ID y campos inválidos devuelven 400 sin registrar una devolución', async () => {
      const prestamo = await prestamos.crear(datos);
      for (const [id, body] of [['a/b'], ['a'.repeat(129)], [prestamo.id, { fecha_devolucion: '2000-01-01' }],
        [prestamo.id, { copias_prestadas: 0 }], [prestamo.id, []]]) {
        const respuesta = await devolver(id, body);
        assert.equal(respuesta.status, 400);
        assert.equal((await respuesta.json()).error.codigo, 'DATOS_INVALIDOS');
      }
      assert.equal(await inventario(), 1);
      assert.equal((await prestamoGuardado(prestamo.id)).fecha_devolucion, null);
    });

    await t.test('inventarios inconsistentes abortan ambas escrituras', async () => {
      const prestamo = await prestamos.crear(datos);
      for (const prestadas of [0, -1, 3, 0.5, '1', null]) {
        await libroRef.update({ copias_prestadas: prestadas });
        const respuesta = await devolver(prestamo.id);
        assert.equal(respuesta.status, 409);
        assert.equal((await respuesta.json()).error.codigo, 'INVENTARIO_INVALIDO');
        assert.equal((await prestamoGuardado(prestamo.id)).fecha_devolucion, null);
        assert.equal(await inventario(), prestadas);
      }
    });

    await t.test('libro inexistente o referencia inválida no marca el préstamo como devuelto', async () => {
      const prestamo = await prestamos.crear(datos);
      await libroRef.delete();
      const respuesta = await devolver(prestamo.id);
      assert.equal(respuesta.status, 404);
      assert.equal((await respuesta.json()).error.codigo, 'LIBRO_NO_ENCONTRADO');
      assert.equal((await prestamoGuardado(prestamo.id)).fecha_devolucion, null);
      await db.collection('prestamos').doc(prestamo.id).update({ libro_id: 'a/b' });
      await assert.rejects(devoluciones.devolver(prestamo.id), error => error.codigo === 'PRESTAMO_INVALIDO');
      assert.equal((await prestamoGuardado(prestamo.id)).fecha_devolucion, null);
    });

    await t.test('un préstamo ya devuelto conserva su fecha aunque el libro ya no exista', async () => {
      const prestamo = await prestamos.crear(datos);
      const original = await devoluciones.devolver(prestamo.id);
      await libroRef.delete();
      const respuesta = await devolver(prestamo.id);
      assert.equal(respuesta.status, 200);
      assert.equal((await respuesta.json()).data.fecha_devolucion, original.fecha_devolucion.toDate().toISOString());
    });

    await t.test('la pantalla y los menús se sirven junto al módulo existente', async () => {
      for (const ruta of ['/', '/prestamos.html', '/devoluciones.html']) {
        const respuesta = await fetch(base + ruta);
        assert.equal(respuesta.status, 200);
        assert.match(await respuesta.text(), /href="\/?devoluciones.html"/);
      }
    });
  } finally {
    await new Promise(resolve => server.close(resolve));
    await db.terminate();
  }
});
