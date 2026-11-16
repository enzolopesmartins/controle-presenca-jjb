// Faixas do jiu-jitsu (IBJJF/CBJJ) e as cores dos graus.
// Infantil (4 a 15 anos): branca, cinza, amarela, laranja e verde, com as variações "e branca" e "e preta".
// Adulto: branca, azul, roxa, marrom, preta, coral (vermelha e preta), vermelha e branca, vermelha.
const BRANCO = '#ffffff';
const PRETO = '#111111';
const VERMELHO = '#d32f2f';
const COR = {
  Cinza: '#9ca3af', Amarela: '#facc15', Laranja: '#f97316', Verde: '#16a34a',
};

// nome -> { cor, listra (faixa do meio), blocos (coral e vermelha e branca), max (graus), infantil }
export const FAIXAS = { Branca: { cor: '#f4f4f4', max: 5 } };
for (const [nome, cor] of Object.entries(COR)) {
  FAIXAS[`${nome} e branca`] = { cor, listra: BRANCO, max: 11, infantil: true };
  FAIXAS[nome] = { cor, max: 11, infantil: true };
  FAIXAS[`${nome} e preta`] = { cor, listra: PRETO, max: 11, infantil: true };
}
Object.assign(FAIXAS, {
  Azul: { cor: '#1d4ed8', max: 4 },
  Roxa: { cor: '#7e22ce', max: 4 },
  Marrom: { cor: '#78350f', max: 4 },
  Preta: { cor: PRETO, max: 6, ponta: VERMELHO },
  Coral: { cor: VERMELHO, blocos: PRETO, max: 0 }, // 7º grau da preta
  'Vermelha e branca': { cor: VERMELHO, blocos: BRANCO, max: 0 }, // 8º grau
  Vermelha: { cor: VERMELHO, max: 0 }, // 9º e 10º grau
});

export const maxGraus = (faixa) => FAIXAS[faixa]?.max ?? 4;

// IBJJF: os 3 últimos graus infantis têm a cor do próximo grupo de faixas (verde vai para a azul, aos 16 anos)
const PROXIMA_COR = { Cinza: COR.Amarela, Amarela: COR.Laranja, Laranja: COR.Verde, Verde: '#1d4ed8' };
const grupo = (faixa) => faixa.split(' ')[0];

// Cores de cada grau, na ordem em que são dados (padrão da IBJJF).
// Faixas infantis: 4 brancos, 4 vermelhos e 3 da cor da próxima faixa; o próximo grau é a troca de faixa.
// Branca: 4 brancos e 1 vermelho. Adulto: brancos (até 4; na preta, até 6).
export function coresDosGraus(faixa, graus) {
  const n = Math.max(0, Math.min(graus ?? 0, maxGraus(faixa)));
  const coloridos = FAIXAS[faixa]?.infantil || faixa === 'Branca';
  const finais = PROXIMA_COR[grupo(faixa)] ?? VERMELHO;
  return Array.from({ length: n }, (_, i) => (!coloridos || i < 4 ? BRANCO : i < 8 ? VERMELHO : finais));
}

// Desenho da faixa (para o site): fundo, ponteira e os graus
export function estiloFaixa(faixa) {
  const f = FAIXAS[faixa] ?? { cor: '#ccc' };
  let fundo = f.cor;
  if (f.listra) fundo = `linear-gradient(${f.cor} 0 34%, ${f.listra} 34% 66%, ${f.cor} 66%)`;
  if (f.blocos) fundo = `repeating-linear-gradient(90deg, ${f.cor} 0 8px, ${f.blocos} 8px 16px)`;
  return `--cor:${fundo};--ponta:${f.ponta ?? PRETO}`;
}

// ---------- Quando dar grau e quando trocar de faixa (IBJJF/CBJJ) ----------
// Tempo mínimo na faixa, em meses, antes de trocar. Infantis: 1 ano por faixa (cinza e branca: 6 meses).
const TEMPO_MINIMO = { 'Cinza e branca': 6, Azul: 24, Roxa: 18, Marrom: 12 };
const tempoMinimo = (faixa) => TEMPO_MINIMO[faixa] ?? (FAIXAS[faixa]?.infantil ? 12 : 0);
const ORDEM = Object.keys(FAIXAS);

// Próxima faixa. A branca depende da idade: cinza e branca (até 15 anos) ou azul (16 anos ou mais).
export function proximaFaixa(faixa) {
  if (faixa === 'Branca') return 'Cinza e branca ou Azul';
  if (faixa === 'Verde e preta') return 'Azul';
  if (faixa === 'Preta' || !FAIXAS[faixa]) return null; // da preta em diante: só graus, por tempo
  return ORDEM[ORDEM.indexOf(faixa) + 1] ?? null;
}

// Meses completos entre duas datas 'AAAA-MM-DD'
export function mesesEntre(de, ate) {
  const [a1, m1, d1] = de.split('-').map(Number);
  const [a2, m2, d2] = ate.split('-').map(Number);
  return (a2 - a1) * 12 + (m2 - m1) - (d2 < d1 ? 1 : 0);
}

// O que o aluno já pode receber: { tipo: 'grau', grau } | { tipo: 'faixa', faixa } | null.
// aulas = presenças desde o último grau; desdeFaixa = data em que recebeu a faixa atual.
export function proximaGraduacao({ faixa, graus = 0, aulasPorGrau, aulas, grauEm, desdeFaixa, hoje }) {
  const f = FAIXAS[faixa];
  if (!f) return null;
  // Preta: graus por tempo (1º ao 3º a cada 3 anos; 4º ao 6º a cada 5 anos)
  if (faixa === 'Preta') {
    if (graus >= f.max || !grauEm) return null;
    return mesesEntre(grauEm, hoje) >= (graus < 3 ? 36 : 60) ? { tipo: 'grau', grau: graus + 1 } : null;
  }
  if (!f.max || !aulasPorGrau || aulas < aulasPorGrau) return null;
  // Branca de adulto tem 4 graus; a infantil, 5. Com 4 graus, vale o 5º grau ou a troca para a azul.
  if (faixa === 'Branca' && graus === 4) return { tipo: 'grau', grau: 5, ouFaixa: 'Azul' };
  if (graus < f.max) return { tipo: 'grau', grau: graus + 1 };
  const proxima = proximaFaixa(faixa);
  if (!proxima || mesesEntre(desdeFaixa, hoje) < tempoMinimo(faixa)) return null;
  return { tipo: 'faixa', faixa: proxima };
}

// De que dia contar as presenças para o próximo grau ('' = todas as presenças, de qualquer data).
// A contagem só recomeça quando o professor dá um grau ou troca a faixa pelo site.
// Até isso acontecer valem todas as presenças, inclusive de chamadas lançadas para dias antes do cadastro.
// (Versões antigas gravavam grauEm no dia do cadastro: esse não conta, porque não foi um grau dado.)
export function inicioDaContagem(aluno) {
  const { grauEm, graus = 0, faixaEm, grauDadoNoSite, entrada = '' } = aluno ?? {};
  if (!grauEm) return '';
  if (grauDadoNoSite || faixaEm) return grauEm;
  return graus > 0 && grauEm > entrada ? grauEm : ''; // dados de antes da marcação grauDadoNoSite
}

// O professor salvou a graduação: mudou a faixa ou os graus? Então a contagem recomeça hoje.
// Aluno sem faixa salva conta como branca, 0 graus.
export function marcarGraduacao(antes, depois, hoje) {
  const mudouFaixa = depois.faixa !== (antes.faixa ?? 'Branca');
  const mudouGraus = depois.graus !== (antes.graus ?? 0);
  if (!mudouFaixa && !mudouGraus) return depois;
  return { ...depois, grauEm: hoje, grauDadoNoSite: true, ...(mudouFaixa ? { faixaEm: hoje } : {}) };
}
