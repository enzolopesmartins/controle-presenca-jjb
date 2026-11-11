// Testes das regras de segurança no emulador: npm run testar:regras
import { test, before, after, beforeEach } from 'node:test';
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, getDocs, deleteField } from 'firebase/firestore';

let env;
before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-presenca',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
  });
});
after(() => env.cleanup());
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (c) => {
    const db = c.firestore();
    await setDoc(doc(db, 'professores/prof'), { nome: 'Professor' });
    await setDoc(doc(db, 'alunos/a1'), { nome: 'Ana', ativo: true, entrada: '2026-11-01' });
    await setDoc(doc(db, 'presencas/20261109'), { data: '2026-11-09', registros: { a1: 'presente' } });
  });
});

const prof = () => env.authenticatedContext('prof').firestore();
const outro = () => env.authenticatedContext('intruso').firestore();
const anonimo = () => env.unauthenticatedContext().firestore();

test('sem login: não lê nada', async () => {
  await assertFails(getDoc(doc(anonimo(), 'alunos/a1')));
  await assertFails(getDocs(collection(anonimo(), 'presencas')));
});

test('logado com outra conta: não lê nem grava', async () => {
  await assertFails(getDoc(doc(outro(), 'alunos/a1')));
  await assertFails(setDoc(doc(outro(), 'alunos/x'), { nome: 'X', ativo: true, entrada: '2026-11-01' }));
  await assertFails(getDoc(doc(outro(), 'professores/prof')));
});

test('ninguém vira professor pelo site', async () => {
  await assertFails(setDoc(doc(outro(), 'professores/intruso'), { nome: 'Eu' }));
  await assertFails(updateDoc(doc(prof(), 'professores/prof'), { nome: 'Outro' }));
});

test('professor lê o próprio documento e os dados', async () => {
  await assertSucceeds(getDoc(doc(prof(), 'professores/prof')));
  await assertSucceeds(getDocs(collection(prof(), 'alunos')));
});

test('professor marca presença, falta e justificada e desmarca', async () => {
  const db = prof();
  const ref = doc(db, 'presencas/20261109');
  await assertSucceeds(setDoc(ref, { data: '2026-11-09', registros: { a1: 'falta' } }, { merge: true }));
  await assertSucceeds(setDoc(ref, { data: '2026-11-09', registros: { a2: 'justificada' } }, { merge: true }));
  await assertSucceeds(setDoc(ref, { data: '2026-11-09', registros: { a1: deleteField() } }, { merge: true }));
});

test('presença com status inválido ou ID errado é recusada', async () => {
  const db = prof();
  await assertFails(setDoc(doc(db, 'presencas/20261110'), { data: '2026-11-10', registros: { a1: 'talvez' } }));
  await assertFails(setDoc(doc(db, 'presencas/20261111'), { data: '2026-11-10', registros: {} }));
});

test('ninguém apaga aluno pelo site', async () => {
  await assertFails(deleteDoc(doc(prof(), 'alunos/a1')));
});

test('só o professor exclui a chamada de um dia', async () => {
  await assertFails(deleteDoc(doc(outro(), 'presencas/20261109')));
  await assertFails(deleteDoc(doc(anonimo(), 'presencas/20261109')));
  await assertSucceeds(deleteDoc(doc(prof(), 'presencas/20261109')));
});

test('retirar aluno é desativar', async () => {
  await assertSucceeds(updateDoc(doc(prof(), 'alunos/a1'), { ativo: false, saidaEm: '2026-11-20', motivoSaida: 'faltas' }));
});

test('aluno com observação', async () => {
  await assertSucceeds(setDoc(doc(prof(), 'alunos/x'), {
    nome: 'Gael', ativo: true, entrada: '2026-11-10', observacao: 'Alergia a amendoim',
  }));
  await assertFails(setDoc(doc(prof(), 'alunos/y'), {
    nome: 'Gael', ativo: true, entrada: '2026-11-10', observacao: 'x'.repeat(501),
  }));
});

test('aluno sem nome é recusado', async () => {
  await assertFails(setDoc(doc(prof(), 'alunos/x'), { nome: '', ativo: true, entrada: '2026-11-01' }));
});

test('ciclo: datas e limite válidos, sem apagar', async () => {
  const db = prof();
  const ok = { nome: 'Nov/2026 a Jan/2027', inicio: '2026-11-01', fim: '2027-01-31', limiteFaltas: 4, ativo: true };
  await assertSucceeds(setDoc(doc(db, 'ciclos/c1'), ok));
  await assertFails(setDoc(doc(db, 'ciclos/c2'), { ...ok, fim: '2026-10-01' }));
  await assertFails(setDoc(doc(db, 'ciclos/c3'), { ...ok, limiteFaltas: 0 }));
  await assertFails(deleteDoc(doc(db, 'ciclos/c1')));
});

test('dias de aula: extra, cancelada e desfazer', async () => {
  const db = prof();
  await assertSucceeds(setDoc(doc(db, 'diasAula/20261110'), { data: '2026-11-10', tipo: 'extra' }));
  await assertSucceeds(setDoc(doc(db, 'diasAula/20261116'), { data: '2026-11-16', tipo: 'cancelada', motivo: 'feriado' }));
  await assertFails(setDoc(doc(db, 'diasAula/20261117'), { data: '2026-11-17', tipo: 'outro' }));
  await assertSucceeds(deleteDoc(doc(db, 'diasAula/20261110')));
  await assertSucceeds(setDoc(doc(db, 'config/aulas'), { diasPadrao: [1, 6] }));
  await assertFails(setDoc(doc(db, 'config/aulas'), { diasPadrao: [1, 9] }));
});
