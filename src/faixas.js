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
