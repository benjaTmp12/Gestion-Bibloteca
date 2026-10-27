const { test } = require('node:test');
const assert = require('node:assert/strict');
const { validarLibro } = require('../src/services/libroValidaciones');
const datos = { titulo: 'Libro de prueba', autor: 'Autora', isbn: '9780307474728', categoria: 'Novela', anio: 2020, copias_total: 2 };
test('validar libros rechaza campos internos, tipos incorrectos e ISBN inválido', () => {
  for (const cambio of [{ copias_prestadas: 1 }, { copias_total: -1 }, { copias_total: '2' },
    { titulo: ' ' }, { isbn: 'abc' }, { anio: 9999 }]) {
    assert.throws(() => validarLibro({ ...datos, ...cambio }), e => e.status === 400);
  }
  assert.equal(validarLibro({ ...datos, isbn: '978-0-307-47472-8' }).isbn, datos.isbn);
});
test('CRUD de libros y consistencia exclusivamente en emulador', { skip: process.env.RUN_FIRESTORE_TESTS !== '1' }, async t => {
  assert.match(process.env.FIRESTORE_EMULATOR_HOST || '', /^(127\.0\.0\.1|localhost):\d+$/);
  process.env.FIREBASE_PROJECT_ID = 'demo-biblioteca-libros-crud';
  const db = require('../src/db/connection').getDb();
  const app = require('../src/app');
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(async () => { await new Promise(resolve => server.close(resolve)); await db.terminate(); });
  const base = 'http://127.0.0.1:' + server.address().port + '/api/libros';
  const request = (path, method = 'GET', body) => fetch(base + path, {
    method, headers: { 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {})
  });
  t.beforeEach(async () => {
    const res = await fetch('http://' + process.env.FIRESTORE_EMULATOR_HOST
      + '/emulator/v1/projects/' + process.env.FIREBASE_PROJECT_ID + '/databases/(default)/documents', { method: 'DELETE' });
    assert.equal(res.ok, true);
  });
  async function crear() {
    const res = await request('', 'POST', datos);
    assert.equal(res.status, 201);
    return (await res.json()).data;
  }
  await t.test('crear, consultar, editar y eliminar desde HTTP', async () => {
    const libro = await crear();
    assert.equal((await (await request('/' + libro.id)).json()).titulo, datos.titulo);
    const actualizado = await request('/' + libro.id, 'PUT', { ...datos, titulo: 'Título editado' });
    assert.equal(actualizado.status, 200);
    assert.equal((await actualizado.json()).data.titulo, 'Título editado');
    assert.equal((await request('/' + libro.id, 'DELETE')).status, 204);
    assert.equal((await request('/' + libro.id)).status, 404);
    assert.equal((await db.collection('isbns').doc(datos.isbn).get()).exists, false);
  });
  await t.test('ISBN duplicado simultáneo solo permite crear un libro', async () => {
    const respuestas = await Promise.all([request('', 'POST', datos), request('', 'POST', datos)]);
    assert.deepEqual(respuestas.map(r => r.status).sort(), [201, 409]);
    assert.equal((await db.collection('libros').get()).size, 1);
  });
  await t.test('ISBN de libros existentes sin reserva tampoco se duplica', async () => {
    await db.collection('libros').doc('semilla').set({ ...datos, copias_prestadas: 0 });
    assert.equal((await request('', 'POST', datos)).status, 409);
  });
  await t.test('no reduce copias prestadas ni elimina historial, incluso devuelto', async () => {
    const libro = await crear();
    await db.collection('libros').doc(libro.id).update({ copias_prestadas: 1 });
    assert.equal((await request('/' + libro.id, 'PUT', { ...datos, copias_total: 0 })).status, 409);
    assert.equal((await request('/' + libro.id, 'DELETE')).status, 409);
    assert.equal((await request('/' + libro.id, 'PUT', { ...datos, copias_total: 3 })).status, 200);
    assert.equal((await db.collection('libros').doc(libro.id).get()).data().copias_prestadas, 1);
    await db.collection('libros').doc(libro.id).update({ copias_prestadas: 0 });
    await db.collection('prestamos').doc('historial').set({ libro_id: libro.id, fecha_devolucion: new Date() });
    assert.equal((await request('/' + libro.id, 'DELETE')).status, 409);
  });
  await t.test('editar ISBN libera la reserva anterior y rechaza datos inválidos', async () => {
    const libro = await crear();
    assert.equal((await request('/' + libro.id, 'PUT', { ...datos, isbn: '9780132350884' })).status, 200);
    assert.equal((await db.collection('isbns').doc(datos.isbn).get()).exists, false);
    assert.equal((await request('', 'POST', { ...datos, copias_prestadas: 10 })).status, 400);
    assert.equal((await request('/inexistente', 'DELETE')).status, 404);
  });
});
