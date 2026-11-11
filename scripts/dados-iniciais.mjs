// Coloca dados de exemplo no Firebase de teste (emulador): npm run emulador:dados
// Conta de teste: professor@presenca.test / professor123
import { initializeApp } from 'firebase/app';
import {
  getAuth, connectAuthEmulator, createUserWithEmailAndPassword, signInWithEmailAndPassword,
} from 'firebase/auth';
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { readFileSync } from 'node:fs';
import { doc, setDoc } from 'firebase/firestore';

const app = initializeApp({ apiKey: 'chave-de-teste', projectId: 'demo-presenca' });
const auth = getAuth(app);
connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
const email = 'professor@presenca.test';
const senha = 'professor123';
const { user } = await createUserWithEmailAndPassword(auth, email, senha)
  .catch(() => signInWithEmailAndPassword(auth, email, senha));

const env = await initializeTestEnvironment({
  projectId: 'demo-presenca',
  firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
});

const hoje = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
const somar = (iso, n) => {
  const [a, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(a, m - 1, d + n)).toISOString().slice(0, 10);
};
const inicio = somar(hoje.slice(0, 8) + '01', -31).slice(0, 8) + '01'; // começo do mês passado
const nomes = ['Ana Beatriz Souza', 'Bruno Henrique Castro', 'Caio', 'Duda', 'Enzo Gabriel Rocha',
  'Fernanda Lima', 'Gabriel', 'Helena Cristina dos Santos Pereira', 'Igor', 'Julia', 'Kaua', 'Laura',
  'Lucas Matheus', 'Manuela', 'Nicolas Ferreira', 'Olivia', 'Pedro Henrique Alves Martins', 'Rafaela',
  'Samuel', 'Sofia Vitória', 'Thiago', 'Valentina', 'Vitor Hugo', 'Yasmin Carolina', 'Arthur',
  'Beatriz', 'Cauã Miguel', 'Davi Lucas', 'Eloá', 'Felipe', 'Giovanna', 'Heitor', 'Isabela', 'João Miguel',
  'Lara', 'Lorenzo', 'Maria Clara', 'Miguel', 'Pietra', 'Ravi'];

await env.withSecurityRulesDisabled(async (c) => {
  const db = c.firestore();
  await setDoc(doc(db, 'professores', user.uid), { nome: 'Professor Teste' });
  await setDoc(doc(db, 'config/aulas'), { diasPadrao: [1, 6] });
  for (const [i, nome] of nomes.entries()) {
    await setDoc(doc(db, 'alunos', `a${i}`), {
      nome, ativo: true,
      observacao: i === 2 ? 'Asma: tem bombinha na mochila' : '', entrada: somar(inicio, i === 11 ? 20 : -30),
    });
  }
  await setDoc(doc(db, 'ciclos/c1'), {
    nome: 'Ciclo de teste', inicio, fim: somar(somar(inicio, 92), -1), limiteFaltas: 4, ativo: true,
  });
  // Chamadas passadas com algumas faltas (pula uma aula para aparecer o aviso)
  let n = 0;
  for (let d = inicio; d < hoje; d = somar(d, 1)) {
    const dia = new Date(`${d}T12:00:00Z`).getUTCDay();
    if (dia !== 1 && dia !== 6) continue;
    n++;
    if (n === 3) continue;
    const registros = {};
    nomes.forEach((_, i) => {
      if (i === 11 && d < somar(inicio, 20)) return;
      if (i === 39) return; // um sem marcar
      registros[`a${i}`] = (i + n) % 7 === 0 || (i === 3 && n % 2) ? 'falta'
        : (i * n) % 11 === 5 ? 'justificada' : 'presente';
    });
    await setDoc(doc(db, 'presencas', d.replaceAll('-', '')), { data: d, registros });
  }
});
await env.cleanup();
console.log(`Pronto. Entre com ${email} / ${senha}`);
process.exit(0);
