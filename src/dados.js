// Ponto único de acesso ao Firebase (login e banco).
import {
  signInWithEmailAndPassword, signOut, onAuthStateChanged, sendPasswordResetEmail,
} from 'firebase/auth';
import {
  collection, doc, getDoc, getDocs, setDoc, addDoc, updateDoc, writeBatch, onSnapshot,
  query, where, serverTimestamp, deleteField, deleteDoc,
} from 'firebase/firestore';
import { auth, db } from './firebase.js';
import { idDia, hojeISO } from './datas.js';

// ---------- login ----------

export const entrar = (email, senha) => signInWithEmailAndPassword(auth, email.trim(), senha);
export const sair = () => signOut(auth);
export const recuperarSenha = (email) => sendPasswordResetEmail(auth, email.trim());
export const aoMudarLogin = (fn) => onAuthStateChanged(auth, fn);

export async function lerProfessor(uid) {
  const s = await getDoc(doc(db, 'professores', uid));
  return s.exists() ? { id: s.id, ...s.data() } : null;
}

// ---------- estado (alunos, dias de aula e ciclos ficam sempre atualizados) ----------
// São coleções pequenas: ficam escutando o banco o tempo todo, inclusive sem internet.

export const estado = {
  alunos: [],
  diasPadrao: [1, 6],
  temConfig: true,
  excecoes: {},
  ciclos: [],
};

const ouvintes = new Set();
export const aoMudarEstado = (fn) => { ouvintes.add(fn); return () => ouvintes.delete(fn); };
const avisarMudanca = () => ouvintes.forEach((fn) => fn());

const porNome = (a, b) => a.nome.localeCompare(b.nome, 'pt-BR');
let pararDeOuvir = [];

export function ouvirEstado() {
  pararEstado();
  const prontos = new Set();
  return new Promise((resolve, reject) => {
    const pronto = (nome) => {
      prontos.add(nome);
      if (prontos.size === 4) resolve();
      avisarMudanca();
    };
    const ouvir = (ref, fn, nome) => onSnapshot(ref, (s) => { fn(s); pronto(nome); }, reject);
    pararDeOuvir = [
      ouvir(collection(db, 'alunos'), (s) => {
        estado.alunos = s.docs.map((d) => ({ id: d.id, ...d.data() })).sort(porNome);
      }, 'alunos'),
      ouvir(doc(db, 'config', 'aulas'), (s) => {
        estado.temConfig = s.exists();
        estado.diasPadrao = s.exists() ? s.data().diasPadrao : [1, 6];
      }, 'config'),
      ouvir(collection(db, 'diasAula'), (s) => {
        estado.excecoes = Object.fromEntries(s.docs.map((d) => [d.data().data, d.data()]));
      }, 'diasAula'),
      ouvir(collection(db, 'ciclos'), (s) => {
        estado.ciclos = s.docs.map((d) => ({ id: d.id, ...d.data() }))
          .sort((a, b) => b.inicio.localeCompare(a.inicio));
      }, 'ciclos'),
    ];
  });
}

export function pararEstado() {
  pararDeOuvir.forEach((p) => p());
  pararDeOuvir = [];
}

export const cicloAtivo = () => estado.ciclos.find((c) => c.ativo) ?? null;

// Primeiro uso: cria os dias padrão (segunda e sábado)
export async function prepararPrimeiroUso() {
  if (!estado.temConfig) await setDoc(doc(db, 'config', 'aulas'), { diasPadrao: [1, 6] });
}

// ---------- gravações ----------
// Sem internet, o Firebase guarda no aparelho e a promessa só termina quando envia.
// Por isso as telas não esperam: o "estado" já se atualiza na hora.

export const salvarDiasPadrao = (diasPadrao) =>
  setDoc(doc(db, 'config', 'aulas'), { diasPadrao: [...diasPadrao].sort() });

export function salvarExcecao(data, tipo, motivo = '') {
  const dados = { data, tipo, atualizadoEm: serverTimestamp() };
  if (motivo) dados.motivo = motivo;
  return setDoc(doc(db, 'diasAula', idDia(data)), dados);
}

export const removerExcecao = (data) => deleteDoc(doc(db, 'diasAula', idDia(data)));

export function criarAluno({ nome, observacao = '' }) {
  return addDoc(collection(db, 'alunos'), {
    nome, observacao, ativo: true, entrada: hojeISO(), criadoEm: serverTimestamp(),
  });
}

export const atualizarAluno = (id, campos) => updateDoc(doc(db, 'alunos', id), campos);

export const retirarAluno = (id, saidaEm, motivoSaida = '') =>
  atualizarAluno(id, { ativo: false, saidaEm, motivoSaida });

export const reativarAluno = (id) =>
  atualizarAluno(id, { ativo: true, saidaEm: deleteField(), motivoSaida: deleteField() });

// Apaga a chamada do dia inteira
export const excluirChamada = (data) => deleteDoc(doc(db, 'presencas', idDia(data)));

// Grava a chamada inteira do dia (substitui a anterior).
// registros: { idAluno: 'presente' | 'falta' | 'justificada' }, justificativas: { idAluno: motivo }
export function salvarChamada(data, registros, justificativas = {}) {
  return setDoc(doc(db, 'presencas', idDia(data)), {
    data, registros, justificativas, atualizadoEm: serverTimestamp(),
  });
}

// Escuta a chamada de um dia. fn({ registros, pendente })
export function ouvirChamada(data, fn) {
  return onSnapshot(doc(db, 'presencas', idDia(data)), { includeMetadataChanges: true }, (s) => {
    fn({ registros: s.data()?.registros ?? {}, justificativas: s.data()?.justificativas ?? {}, existe: s.exists(), pendente: s.metadata.hasPendingWrites });
  });
}

export async function listarPresencas(inicio, fim) {
  const q = query(collection(db, 'presencas'), where('data', '>=', inicio), where('data', '<=', fim));
  const s = await getDocs(q);
  return s.docs.map((d) => d.data());
}

export function salvarCiclo(id, campos) {
  return id ? updateDoc(doc(db, 'ciclos', id), campos) : addDoc(collection(db, 'ciclos'), campos);
}

// Só um ciclo ativo por vez
export function ativarCiclo(id) {
  const lote = writeBatch(db);
  for (const c of estado.ciclos) {
    if (c.ativo !== (c.id === id)) lote.update(doc(db, 'ciclos', c.id), { ativo: c.id === id });
  }
  return lote.commit();
}

// Renovar: cria o novo ciclo já ativo e desativa os outros, de uma vez
export function criarCicloAtivo(campos) {
  const lote = writeBatch(db);
  const novo = doc(collection(db, 'ciclos'));
  lote.set(novo, { ...campos, ativo: true });
  for (const c of estado.ciclos) if (c.ativo) lote.update(doc(db, 'ciclos', c.id), { ativo: false });
  return lote.commit();
}
