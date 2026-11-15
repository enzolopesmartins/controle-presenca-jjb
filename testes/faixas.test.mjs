// Faixas e cores dos graus: node --test testes/faixas.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FAIXAS, maxGraus, coresDosGraus } from '../src/faixas.js';

const B = '#ffffff';
const V = '#d32f2f';

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

test('cores dos graus (IBJJF): 4 brancos, 4 vermelhos e 3 da cor da próxima faixa', () => {
  const amarelo = '#facc15';
  assert.deepEqual(coresDosGraus('Cinza e preta', 11), [B, B, B, B, V, V, V, V, amarelo, amarelo, amarelo]);
  assert.equal(coresDosGraus('Amarela', 9).at(-1), '#f97316', 'amarela -> laranja');
  assert.equal(coresDosGraus('Laranja e branca', 10).at(-1), '#16a34a', 'laranja -> verde');
  assert.equal(coresDosGraus('Verde e preta', 11).at(-1), '#1d4ed8', 'verde -> azul');
  assert.deepEqual(coresDosGraus('Branca', 5), [B, B, B, B, V]);
  assert.deepEqual(coresDosGraus('Branca', 9), [B, B, B, B, V], 'a branca para no 5º grau');
  assert.deepEqual(coresDosGraus('Roxa', 4), [B, B, B, B]);
  assert.deepEqual(coresDosGraus('Preta', 6), [B, B, B, B, B, B]);
  assert.deepEqual(coresDosGraus('Vermelha', 3), []);
  assert.deepEqual(coresDosGraus('Azul', undefined), []);
});

test('próxima faixa', async () => {
  const { proximaFaixa } = await import('../src/faixas.js');
  assert.equal(proximaFaixa('Cinza e branca'), 'Cinza');
  assert.equal(proximaFaixa('Cinza e preta'), 'Amarela e branca');
  assert.equal(proximaFaixa('Verde e preta'), 'Azul');
  assert.equal(proximaFaixa('Marrom'), 'Preta');
  assert.equal(proximaFaixa('Preta'), null);
  assert.equal(proximaFaixa('Branca'), 'Cinza e branca ou Azul');
});

test('quando dar grau e trocar de faixa', async () => {
  const { proximaGraduacao, mesesEntre } = await import('../src/faixas.js');
  assert.equal(mesesEntre('2025-11-15', '2026-11-15'), 12);
  assert.equal(mesesEntre('2025-11-16', '2026-11-15'), 11);
  const base = { aulasPorGrau: 16, hoje: '2026-11-15', grauEm: '2026-09-01', desdeFaixa: '2025-01-10' };
  assert.equal(proximaGraduacao({ ...base, faixa: 'Azul', graus: 2, aulas: 15 }), null, 'faltou 1 aula');
  assert.deepEqual(proximaGraduacao({ ...base, faixa: 'Azul', graus: 2, aulas: 16 }), { tipo: 'grau', grau: 3 });
  assert.equal(proximaGraduacao({ ...base, faixa: 'Azul', graus: 4, aulas: 40 }), null, 'azul: 2 anos de faixa');
  assert.deepEqual(proximaGraduacao({ ...base, faixa: 'Azul', graus: 4, aulas: 16, desdeFaixa: '2024-11-15' }),
    { tipo: 'faixa', faixa: 'Roxa' });
  assert.deepEqual(proximaGraduacao({ ...base, faixa: 'Cinza', graus: 11, aulas: 20, desdeFaixa: '2025-11-15' }),
    { tipo: 'faixa', faixa: 'Cinza e preta' }, 'infantil: 11 graus e 1 ano');
  assert.equal(proximaGraduacao({ ...base, faixa: 'Cinza', graus: 11, aulas: 20, desdeFaixa: '2026-01-15' }), null);
  assert.deepEqual(proximaGraduacao({ ...base, faixa: 'Branca', graus: 4, aulas: 16 }), { tipo: 'grau', grau: 5, ouFaixa: 'Azul' });
  assert.deepEqual(proximaGraduacao({ ...base, faixa: 'Branca', graus: 5, aulas: 16 }), { tipo: 'faixa', faixa: 'Cinza e branca ou Azul' });
  assert.deepEqual(proximaGraduacao({ ...base, faixa: 'Preta', graus: 1, aulas: 0, grauEm: '2023-11-15' }), { tipo: 'grau', grau: 2 });
  assert.equal(proximaGraduacao({ ...base, faixa: 'Preta', graus: 3, aulas: 0, grauEm: '2023-11-15' }), null, '4º grau: 5 anos');
  assert.equal(proximaGraduacao({ ...base, faixa: 'Coral', graus: 0, aulas: 99 }), null);
  assert.equal(proximaGraduacao({ ...base, faixa: undefined, aulas: 99 }), null);
});
