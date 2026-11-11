// Testes dos cálculos (sem Firebase): npm run testar
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  temAula, aulasNoPeriodo, sugerirCiclo, somarMeses, diaSemana, nomeDoCiclo,
} from '../src/datas.js';
import { corDaLinha, montarRelatorio, maiorSequenciaDeFaltas, presencasSeguidasAgora } from '../src/relatorio.js';

test('dias padrão segunda e sábado, com extra e cancelada', () => {
  assert.equal(diaSemana('2026-11-09'), 1); // segunda
  assert.equal(temAula('2026-11-09', [1, 6]), true);
  assert.equal(temAula('2026-11-10', [1, 6]), false);
  assert.equal(temAula('2026-11-10', [1, 6], { '2026-11-10': { tipo: 'extra' } }), true);
  assert.equal(temAula('2026-11-09', [1, 6], { '2026-11-09': { tipo: 'cancelada' } }), false);
  assert.deepEqual(aulasNoPeriodo('2026-11-01', '2026-11-10', [1, 6]), ['2026-11-02', '2026-11-07', '2026-11-09']);
});

test('ciclo de 3 meses', () => {
  assert.deepEqual(sugerirCiclo('2026-11-01'), { inicio: '2026-11-01', fim: '2027-01-31', nome: 'Nov/2026 a Jan/2027' });
  assert.equal(sugerirCiclo('2027-02-01').fim, '2027-04-30');
  assert.equal(somarMeses('2027-01-31', 1), '2027-02-28');
  assert.equal(nomeDoCiclo('2027-02-01', '2027-04-30'), 'Fev/2027 a Abr/2027');
});

test('cor da linha: sem falta, 1 a 3, 4 ou mais', () => {
  assert.equal(corDaLinha(0, 4), '');
  assert.equal(corDaLinha(1, 4), 'amarelo');
  assert.equal(corDaLinha(3, 4), 'amarelo');
  assert.equal(corDaLinha(4, 4), 'vermelho');
  assert.equal(corDaLinha(6, 4), 'vermelho');
});

const alunos = [
  { id: 'a', nome: 'Ana', ativo: true, entrada: '2026-10-01' },
  { id: 'b', nome: 'Bruno', ativo: true, entrada: '2026-10-01' },
  { id: 'c', nome: 'Caio', ativo: true, entrada: '2026-11-08' }, // entrou no meio
  { id: 'd', nome: 'Duda', ativo: false, entrada: '2026-01-01', saidaEm: '2026-10-15' }, // saiu antes
];
const presencas = [
  { data: '2026-11-02', registros: { a: 'presente', b: 'falta' } },
  { data: '2026-11-07', registros: { a: 'justificada', b: 'falta' } },
  { data: '2026-11-09', registros: { a: 'presente', b: 'falta', c: 'presente' } },
  { data: '2026-11-14', registros: { a: 'falta', b: 'falta' } },
];
const base = { inicio: '2026-11-01', fim: '2027-01-31', hoje: '2026-11-20', alunos, presencas, diasPadrao: [1, 6], limite: 4 };

test('relatório do ciclo: contas, justificada não conta, cores', () => {
  const r = montarRelatorio(base);
  const por = Object.fromEntries(r.linhas.map((l) => [l.id, l]));
  assert.equal(r.resumo.aulas, 4);
  assert.equal(por.d, undefined, 'quem saiu antes do ciclo não aparece');
  assert.deepEqual([por.a.presente, por.a.falta, por.a.justificada], [2, 1, 1]);
  assert.equal(por.a.cor, 'amarelo');
  assert.equal(por.a.freq, 2 / 3);
  assert.equal(por.b.falta, 4);
  assert.equal(por.b.cor, 'vermelho');
  assert.equal(por.b.estourou, true);
  assert.equal(por.b.restantes, 0);
  assert.equal(por.b.freq, 0);
  // Caio entrou dia 8: conta só as aulas de 9 e 14 (uma não marcada)
  assert.equal(por.c.aulas, 2);
  assert.equal(por.c.naoMarcada, 1);
  assert.equal(por.c.entrouNoMeio, true);
  assert.equal(por.c.cor, '');
  assert.deepEqual(r.semChamada, ['2026-11-16']);
  assert.equal(r.resumo.vermelhos, 1);
  assert.equal(r.resumo.amarelos, 1);
  assert.equal(r.resumo.semFaltas, 1);
  assert.deepEqual(r.porAula[0], { data: '2026-11-02', presente: 1, falta: 1, justificada: 0, pct: 0.5 });
});

test('sequências da ficha do aluno', () => {
  const h = (...s) => s.map((status) => ({ status }));
  assert.equal(maiorSequenciaDeFaltas(h('falta', 'falta', 'justificada', 'falta', 'presente', 'falta')), 3);
  assert.equal(presencasSeguidasAgora(h('falta', 'presente', 'justificada', 'presente', null)), 2);
});
