// Faixas e cores dos graus: node --test testes/faixas.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FAIXAS, maxGraus, coresDosGraus } from '../src/faixas.js';

const B = '#ffffff';
const V = '#d32f2f';
const P = '#111111';

test('todas as faixas, na ordem', () => {
  assert.deepEqual(Object.keys(FAIXAS), [
    'Branca', 'Cinza e branca', 'Cinza', 'Cinza e preta', 'Amarela e branca', 'Amarela', 'Amarela e preta',
    'Laranja e branca', 'Laranja', 'Laranja e preta', 'Verde e branca', 'Verde', 'Verde e preta',
    'Azul', 'Roxa', 'Marrom', 'Preta', 'Coral', 'Vermelha e branca', 'Vermelha',
  ]);
  for (const f of Object.keys(FAIXAS)) assert.ok(f.length <= 20, `${f} cabe na regra do Firestore`);
});

test('máximo de graus de cada faixa', () => {
  assert.equal(maxGraus('Branca'), 5);
  assert.equal(maxGraus('Amarela e preta'), 11);
  assert.equal(maxGraus('Azul'), 4);
  assert.equal(maxGraus('Preta'), 6);
  assert.equal(maxGraus('Coral'), 0);
  assert.equal(maxGraus('Faixa antiga'), 4);
});

test('cores dos graus: 4 brancos, 4 vermelhos e 3 pretos', () => {
  assert.deepEqual(coresDosGraus('Cinza', 11), [B, B, B, B, V, V, V, V, P, P, P]);
  assert.deepEqual(coresDosGraus('Branca', 5), [B, B, B, B, V]);
  assert.deepEqual(coresDosGraus('Branca', 9), [B, B, B, B, V], 'a branca para no 5º grau');
  assert.deepEqual(coresDosGraus('Roxa', 4), [B, B, B, B]);
  assert.deepEqual(coresDosGraus('Preta', 6), [B, B, B, B, B, B]);
  assert.deepEqual(coresDosGraus('Vermelha', 3), []);
  assert.deepEqual(coresDosGraus('Azul', undefined), []);
});
