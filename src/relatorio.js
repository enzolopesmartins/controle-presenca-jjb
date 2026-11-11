// Cálculos do relatório de frequência. Sem Firebase aqui: recebe os dados prontos.
import { aulasNoPeriodo, diaSemana, INICIO_DO_SISTEMA } from './datas.js';

// Sem faltas: sem cor | de 1 até o limite - 1: amarelo | chegou ao limite: vermelho
export function corDaLinha(faltas, limite) {
  if (faltas >= limite) return 'vermelho';
  if (faltas > 0) return 'amarelo';
  return '';
}

// Frequência = presenças / (presenças + faltas). A falta justificada fica de fora.
export function frequencia(presente, falta) {
  return presente + falta > 0 ? presente / (presente + falta) : null;
}

// Monta o relatório de um período.
// alunos: [{ id, nome, ativo, entrada, saidaEm }]
// presencas: [{ data, registros: { idAluno: status } }]
export function montarRelatorio({
  inicio, fim, hoje, alunos, presencas, diasPadrao, excecoes = {}, limite = 4,
}) {
  const doPeriodo = presencas
    .filter((p) => p.data >= inicio && p.data <= fim && Object.keys(p.registros || {}).length)
    .sort((a, b) => a.data.localeCompare(b.data));
  const aulasDadas = doPeriodo.map((p) => p.data);
  const registrosDoDia = Object.fromEntries(doPeriodo.map((p) => [p.data, p.registros]));
  const motivosDoDia = Object.fromEntries(doPeriodo.map((p) => [p.data, p.justificativas || {}]));

  // Aulas previstas que já passaram e não tiveram chamada (hoje não entra: pode estar acontecendo)
  const ultimoDia = fim < hoje ? fim : hoje;
  const semChamada = inicio <= ultimoDia
    ? aulasNoPeriodo(inicio, ultimoDia, diasPadrao, excecoes)
      .filter((d) => d < hoje && d >= INICIO_DO_SISTEMA && !registrosDoDia[d])
    : [];

  const comRegistro = (a) => aulasDadas.some((d) => registrosDoDia[d][a.id]);
  const estavaNoProjeto = (a) => (a.entrada || '') <= fim && (a.ativo || (a.saidaEm && a.saidaEm >= inicio));
  const participantes = alunos.filter((a) => comRegistro(a) || estavaNoProjeto(a));

  const linhas = participantes.map((a) => {
    // Só contam as aulas depois da entrada e até a saída (ou as que têm marcação)
    const historico = aulasDadas
      .filter((d) => registrosDoDia[d][a.id] ||
        (d >= (a.entrada || '') && (!a.saidaEm || d <= a.saidaEm)))
      .map((d) => ({ data: d, status: registrosDoDia[d][a.id] ?? null, motivo: motivosDoDia[d][a.id] ?? '' }));

    const conta = { presente: 0, falta: 0, justificada: 0, naoMarcada: 0 };
    const faltasPorDia = {};
    for (const h of historico) {
      if (h.status) conta[h.status]++;
      else conta.naoMarcada++;
      if (h.status === 'falta') {
        const dia = diaSemana(h.data);
        faltasPorDia[dia] = (faltasPorDia[dia] || 0) + 1;
      }
    }

    return {
      ...a,
      ...conta,
      historico,
      aulas: historico.length,
      freq: frequencia(conta.presente, conta.falta),
      restantes: Math.max(0, limite - conta.falta),
      estourou: conta.falta >= limite,
      cor: corDaLinha(conta.falta, limite),
      entrouNoMeio: (a.entrada || '') > inicio,
      seguidasAgora: presencasSeguidasAgora(historico),
      maiorSeqFaltas: maiorSequenciaDeFaltas(historico),
      faltasPorDia,
    };
  });

  const porAula = aulasDadas.map((d) => {
    const c = { data: d, presente: 0, falta: 0, justificada: 0 };
    for (const a of participantes) {
      const s = registrosDoDia[d][a.id];
      if (s) c[s]++;
    }
    return { ...c, pct: frequencia(c.presente, c.falta) };
  });

  const soma = (lista, campo) => lista.reduce((t, l) => t + l[campo], 0);
  const freqDe = (lista) => frequencia(soma(lista, 'presente'), soma(lista, 'falta'));

  return {
    inicio, fim, limite,
    aulasDadas,
    semChamada,
    linhas,
    porAula,
    resumo: {
      aulas: aulasDadas.length,
      ativos: participantes.filter((a) => a.ativo).length,
      freqGeral: freqDe(linhas),
      vermelhos: linhas.filter((l) => l.cor === 'vermelho').length,
      amarelos: linhas.filter((l) => l.cor === 'amarelo').length,
      semFaltas: linhas.filter((l) => l.cor === '').length,
    },
    novosNoMeio: linhas.filter((l) => l.entrouNoMeio),
  };
}

// Presenças seguidas até a última aula marcada (justificada não interrompe)
export function presencasSeguidasAgora(historico) {
  let n = 0;
  for (let i = historico.length - 1; i >= 0; i--) {
    const s = historico[i].status;
    if (s === 'presente') n++;
    else if (s === 'falta') break;
  }
  return n;
}

// Maior número de faltas em seguida (justificada e não marcada não interrompem)
export function maiorSequenciaDeFaltas(historico) {
  let maior = 0;
  let atual = 0;
  for (const { status } of historico) {
    if (status === 'falta') maior = Math.max(maior, ++atual);
    else if (status === 'presente') atual = 0;
  }
  return maior;
}

// Ordena: mais faltas primeiro (empate: nome) ou por nome
export function ordenar(linhas, por = 'faltas') {
  const nome = (a, b) => a.nome.localeCompare(b.nome, 'pt-BR');
  return [...linhas].sort(por === 'nome' ? nome : (a, b) => b.falta - a.falta || nome(a, b));
}
