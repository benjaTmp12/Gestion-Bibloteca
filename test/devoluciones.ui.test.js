const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const html = readFileSync(path.join(__dirname, '../public/devoluciones.html'), 'utf8');
const script = readFileSync(path.join(__dirname, '../public/js/devoluciones.js'), 'utf8');
const activo = {
  id: 'prestamo_1', libro_id: 'libro_1', libro_titulo: 'Libro de prueba', socio_nombre: 'Socio de prueba',
  fecha_prestamo: '2026-10-20T15:00:00.000Z', fecha_vencimiento: '2099-11-06',
  fecha_devolucion: null, estado: 'activo', vencido: false
};
const devuelto = { ...activo, estado: 'devuelto', fecha_devolucion: '2026-10-25T17:45:00.000Z' };
const respuesta = (body, status = 200) => ({ ok: status < 400, status, json: async () => body });

async function esperar(condicion) {
  const limite = Date.now() + 2000;
  while (!condicion()) {
    if (Date.now() > limite) assert.fail('La interfaz no llegó al estado esperado.');
    await new Promise(resolve => setImmediate(resolve));
  }
}
async function pantalla(t, manejar) {
  const dom = new JSDOM(html, { runScripts: 'outside-only', url: 'http://localhost/devoluciones.html' });
  t.after(() => dom.window.close());
  const llamadas = [];
  let confirmado = false;
  dom.window.fetch = async (url, opciones = {}) => {
    llamadas.push({ url, method: opciones.method || 'GET' });
    const resultado = await manejar?.(url, opciones, () => { confirmado = true; });
    if (resultado) return resultado;
    if (url === '/api/libros') {
      return respuesta([{ id: 'libro_1', copias_total: 2, disponibles: confirmado ? 2 : 1 }]);
    }
    if (url === '/api/prestamos?estado=activo') return respuesta({ data: confirmado ? [] : [activo] });
    if (url === '/api/prestamos?estado=devuelto') return respuesta({ data: [devuelto] });
    throw new Error('Solicitud inesperada: ' + url);
  };
  dom.window.eval(script);
  const doc = dom.window.document;
  const actualizar = doc.getElementById('actualizar-devoluciones');
  await esperar(() => !actualizar.disabled);
  return { doc, llamadas, window: dom.window };
}

test('solo confirma tras el PUT y evita el doble clic mientras la respuesta está pendiente', async t => {
  let resolver;
  const { doc, llamadas } = await pantalla(t, (url, opciones, confirmar) => {
    if (opciones.method === 'PUT') return new Promise(resolve => {
      resolver = () => { confirmar(); resolve(respuesta({ data: devuelto })); };
    });
  });
  const boton = doc.querySelector('.boton-devolver');
  boton.click();
  boton.click();
  assert.equal(llamadas.filter(item => item.method === 'PUT').length, 1);
  assert.equal(boton.disabled, true);
  assert.equal(doc.querySelectorAll('#filas-devoluciones tr').length, 1);
  assert.notEqual(doc.getElementById('mensaje-devolucion').dataset.tipo, 'exito');
  resolver();
  await esperar(() => !doc.getElementById('actualizar-devoluciones').disabled);
  assert.equal(doc.getElementById('mensaje-devolucion').dataset.tipo, 'exito');
  assert.equal(doc.querySelectorAll('#filas-devoluciones tr').length, 0);
  assert.equal(llamadas.filter(item => item.url === '/api/libros').length, 2);
  assert.equal(llamadas.filter(item => item.url === '/api/prestamos?estado=activo').length, 2);
});

test('un fallo del servidor conserva el préstamo y muestra el error sin confirmar devolución', async t => {
  const { doc } = await pantalla(t, (url, opciones) => opciones.method === 'PUT'
    ? respuesta({ error: { codigo: 'SERVICIO_NO_DISPONIBLE', mensaje: 'Base no disponible.' } }, 503) : undefined);
  doc.querySelector('.boton-devolver').click();
  await esperar(() => !doc.getElementById('actualizar-devoluciones').disabled);
  assert.equal(doc.getElementById('mensaje-devolucion').dataset.tipo, 'error');
  assert.equal(doc.getElementById('mensaje-devolucion').textContent, 'Base no disponible.');
  assert.equal(doc.querySelectorAll('#filas-devoluciones tr').length, 1);
  assert.match(doc.getElementById('filas-devoluciones').textContent, /1 de 2 copias/);
  assert.equal(doc.querySelector('.boton-devolver').disabled, false);
});

test('una respuesta perdida indica que hay que comprobar el estado y permite reintentar', async t => {
  const { doc } = await pantalla(t, (url, opciones) => {
    if (opciones.method === 'PUT') throw new TypeError('Failed to fetch');
  });
  doc.querySelector('.boton-devolver').click();
  await esperar(() => !doc.getElementById('actualizar-devoluciones').disabled);
  assert.equal(doc.getElementById('mensaje-devolucion').dataset.tipo, 'error');
  assert.match(doc.getElementById('mensaje-devolucion').textContent, /No se pudo confirmar la devolución/);
  assert.equal(doc.querySelectorAll('#filas-devoluciones tr').length, 1);
});

test('el historial reutiliza el filtro existente y muestra la fecha sin botones Devolver', async t => {
  const { doc, window, llamadas } = await pantalla(t);
  const filtro = doc.getElementById('estado-devoluciones');
  filtro.value = 'devuelto';
  filtro.dispatchEvent(new window.Event('change'));
  await esperar(() => !doc.getElementById('actualizar-devoluciones').disabled);
  assert.ok(llamadas.some(item => item.url === '/api/prestamos?estado=devuelto'));
  assert.equal(doc.getElementById('titulo-devoluciones').textContent, 'Historial de devoluciones');
  assert.equal(doc.querySelector('.boton-devolver'), null);
  assert.match(doc.querySelector('#filas-devoluciones td:last-child').textContent, /25.*10.*26.*14:45/);
  assert.equal(doc.querySelector('.estado-prestamo').textContent, 'Devuelto');
});

test('si falla el refresco después de guardar, distingue el registro confirmado del panel desactualizado', async t => {
  let guardado = false;
  const { doc } = await pantalla(t, (url, opciones, confirmar) => {
    if (opciones.method === 'PUT') {
      guardado = true;
      confirmar();
      return respuesta({ data: devuelto });
    }
    if (guardado && url === '/api/libros') throw new TypeError('Sin conexión');
  });
  doc.querySelector('.boton-devolver').click();
  await esperar(() => !doc.getElementById('actualizar-devoluciones').disabled);
  assert.equal(doc.getElementById('mensaje-devolucion').dataset.tipo, 'error');
  assert.match(doc.getElementById('mensaje-devolucion').textContent, /El servidor guardó la devolución/);
  assert.equal(doc.getElementById('contenedor-tabla').hidden, true);
});

test('una consulta fallida puede recuperarse con Actualizar listado', async t => {
  let fallar = true;
  const { doc } = await pantalla(t, url => url === '/api/libros' && fallar
    ? respuesta({ error: 'No disponible' }, 500) : undefined);
  assert.match(doc.getElementById('mensaje-listado').textContent, /No se pudo actualizar/);
  assert.equal(doc.getElementById('contenedor-tabla').hidden, true);
  fallar = false;
  doc.getElementById('actualizar-devoluciones').click();
  await esperar(() => !doc.getElementById('actualizar-devoluciones').disabled);
  assert.equal(doc.getElementById('contenedor-tabla').hidden, false);
  assert.equal(doc.querySelectorAll('#filas-devoluciones tr').length, 1);
});
