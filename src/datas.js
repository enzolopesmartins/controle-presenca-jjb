// Datas sempre no formato AAAA-MM-DD e no fuso do Brasil. Sem Firebase aqui.

export const FUSO = 'America/Sao_Paulo';

export const DIAS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
export const DIAS_CURTOS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
export const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho',
  'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const MESES_CURTOS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export const hojeISO = () => new Date().toLocaleDateString('sv-SE', { timeZone: FUSO });

// '2026-11-10' -> '20261110' (ID dos documentos de presença e de dias de aula)
export const idDia = (iso) => iso.replaceAll('-', '');

const partes = (iso) => iso.split('-').map(Number);
const paraISO = (dt) => dt.toISOString().slice(0, 10);

export function diaSemana(iso) {
  const [a, m, d] = partes(iso);
  return new Date(Date.UTC(a, m - 1, d)).getUTCDay();
}

export function somarDias(iso, n) {
  const [a, m, d] = partes(iso);
  return paraISO(new Date(Date.UTC(a, m - 1, d + n)));
}

// Soma meses sem pular para o mês seguinte (31/jan + 1 mês = 28 ou 29/fev)
export function somarMeses(iso, n) {
  const [a, m, d] = partes(iso);
  const ultimo = new Date(Date.UTC(a, m - 1 + n + 1, 0)).getUTCDate();
  return paraISO(new Date(Date.UTC(a, m - 1 + n, Math.min(d, ultimo))));
}

export const inicioDoMes = (iso) => iso.slice(0, 8) + '01';
export const fimDoMes = (iso) => somarDias(somarMeses(inicioDoMes(iso), 1), -1);

// Há aula nesta data? Exceção vence o padrão.
// excecoes: { 'AAAA-MM-DD': { tipo: 'extra' | 'cancelada', motivo } }
export function temAula(iso, diasPadrao, excecoes = {}) {
  const tipo = excecoes[iso]?.tipo;
  if (tipo === 'extra') return true;
  if (tipo === 'cancelada') return false;
  return diasPadrao.includes(diaSemana(iso));
}

export function aulasNoPeriodo(inicio, fim, diasPadrao, excecoes = {}) {
  const lista = [];
  for (let d = inicio; d <= fim; d = somarDias(d, 1)) {
    if (temAula(d, diasPadrao, excecoes)) lista.push(d);
  }
  return lista;
}

export function proximaAula(depoisDe, diasPadrao, excecoes = {}) {
  for (let i = 1, d = somarDias(depoisDe, 1); i <= 120; i++, d = somarDias(d, 1)) {
    if (temAula(d, diasPadrao, excecoes)) return d;
  }
  return null;
}

export function aulaAnterior(antesDe, diasPadrao, excecoes = {}) {
  for (let i = 1, d = somarDias(antesDe, -1); i <= 120; i++, d = somarDias(d, -1)) {
    if (temAula(d, diasPadrao, excecoes)) return d;
  }
  return null;
}

// '2026-11-10' -> '10/11/2026'
export function dataCurta(iso, { ano = true } = {}) {
  const [a, m, d] = iso.split('-');
  return ano ? `${d}/${m}/${a}` : `${d}/${m}`;
}

// Primeira letra maiúscula
export const maiuscula = (t) => t.charAt(0).toUpperCase() + t.slice(1);

// Com artigo: 'na segunda', 'no sábado'
export const noDia = (dia) => `${dia === 0 || dia === 6 ? 'no' : 'na'} ${DIAS[dia]}`;

// '2026-11-10' -> 'terça, 10 de novembro'
export function dataLonga(iso, { ano = false } = {}) {
  const [a, m, d] = partes(iso);
  return `${DIAS[diaSemana(iso)]}, ${d} de ${MESES[m - 1]}${ano ? ` de ${a}` : ''}`;
}

// Nome de ciclo: 'Nov/2026 a Jan/2027'
export function nomeDoCiclo(inicio, fim) {
  const [a1, m1] = partes(inicio);
  const [a2, m2] = partes(fim);
  return `${MESES_CURTOS[m1 - 1]}/${a1} a ${MESES_CURTOS[m2 - 1]}/${a2}`;
}

// Ciclo de 3 meses a partir de uma data: 01/11 -> 31/01
export function sugerirCiclo(inicio) {
  const fim = somarDias(somarMeses(inicio, 3), -1);
  return { inicio, fim, nome: nomeDoCiclo(inicio, fim) };
}
