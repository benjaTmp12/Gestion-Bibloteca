const { test } = require('node:test');
const assert = require('node:assert/strict');
const service = require('../src/services/libroService');

test('IDs ajenos al formato Firestore se rechazan antes de consultar', async () => {
  for (const id of [1, '', '../libros', 'a/b']) {
    await assert.rejects(service.obtenerLibro(id), error => error.status === 400);
  }
});
test('los filtros repetidos y excesivos generan 400', async () => {
  for (const filtros of [{ q: ['a', 'b'] }, { categoria: {} }, { q: 'a'.repeat(101) }]) {
    await assert.rejects(service.listarLibros(filtros), error => error.status === 400);
  }
});
