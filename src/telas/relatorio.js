// Relatório de frequência (e de fim de ciclo): resumo, tabela por aluno, por aula e grade.
import { estado, cicloAtivo, listarPresencas } from '../dados.js';
import { app, esc, pct, chips, janela, baixarCSV, STATUS, mensagemErro } from '../ui.js';
import { montarRelatorio, ordenar } from '../relatorio.js';
import {
  hojeISO, dataCurta, dataLonga, diaSemana, DIAS, DIAS_CURTOS, inicioDoMes, noDia,
} from '../datas.js';
import { janelaRetirar } from './alunos.js';

// Escolhas do professor ficam guardadas enquanto o site está aberto
const filtro = { periodo: null, inicio: '', fim: '', aba: 'alunos', ordem: 'faltas' };
let ultimo = null; // { chave, presencas }

const COR_TEXTO = { vermelho: 'Chegou ao limite', amarelo: 'Com faltas', '': 'Sem faltas' }; // planilha

function periodoEscolhido() {
  const hoje = hojeISO();
  const ciclo = filtro.periodo === 'livre' ? null
    : estado.ciclos.find((c) => c.id === filtro.periodo) ?? cicloAtivo() ?? estado.ciclos[0];
  if (ciclo) return { ciclo, inicio: ciclo.inicio, fim: ciclo.fim, limite: ciclo.limiteFaltas };
  return {
    ciclo: null,
    inicio: filtro.inicio || inicioDoMes(hoje),
    fim: filtro.fim || hoje,
    limite: cicloAtivo()?.limiteFaltas ?? 4,
  };
}

// Vindo do menu, busca as presenças de novo; trocando filtro, aproveita as que já tem
export function telaRelatorio(rota) {
  if (rota) ultimo = null;
  const p = periodoEscolhido();
  if (!filtro.periodo) filtro.periodo = p.ciclo?.id ?? 'livre';

  app.innerHTML = `
    <h1>Relatório</h1>
    <section class="cartao filtros nao-imprimir">
      <label>Período
        <select id="periodo">
          ${estado.ciclos.map((c) => `<option value="${c.id}" ${c.id === filtro.periodo ? 'selected' : ''}>
            ${esc(c.nome)}${c.ativo ? ' (ativo)' : ''}</option>`).join('')}
          <option value="livre" ${filtro.periodo === 'livre' ? 'selected' : ''}>Escolher datas</option>
        </select>
      </label>
      ${filtro.periodo === 'livre' ? `
        <div class="duas-colunas">
          <label>De <input type="date" id="de" value="${p.inicio}" /></label>
          <label>Até <input type="date" id="ate" value="${p.fim}" /></label>
        </div>` : ''}
    </section>
    <h2 class="so-imprimir">${p.ciclo ? esc(p.ciclo.nome) : 'Período'}: ${dataCurta(p.inicio)} a ${dataCurta(p.fim)}</h2>
    <div id="conteudo"><p class="carregando">Calculando…</p></div>`;

  document.getElementById('periodo').addEventListener('change', (ev) => {
    filtro.periodo = ev.target.value;
    telaRelatorio();
  });
  for (const [id, campo] of [['de', 'inicio'], ['ate', 'fim']]) {
    document.getElementById(id)?.addEventListener('change', (ev) => {
      filtro[campo] = ev.target.value;
      telaRelatorio();
    });
  }
  carregar(p);
}

async function carregar(p) {
  const conteudo = document.getElementById('conteudo');
  if (p.fim < p.inicio) {
    conteudo.innerHTML = '<p class="erro">A data final precisa ser depois da inicial.</p>';
    return;
  }
  try {
    const chave = `${p.inicio}|${p.fim}`;
    if (ultimo?.chave !== chave) ultimo = { chave, presencas: await listarPresencas(p.inicio, p.fim) };
    if (!conteudo.isConnected) return;
    const rel = montarRelatorio({
      inicio: p.inicio,
      fim: p.fim,
      hoje: hojeISO(),
      alunos: estado.alunos,
      presencas: ultimo.presencas,
      diasPadrao: estado.diasPadrao,
      excecoes: estado.excecoes,
      limite: p.limite,
    });
    desenhar(conteudo, rel, p);
  } catch (e) {
    console.error(e);
    conteudo.innerHTML = `<p class="erro">${esc(mensagemErro(e))}</p>`;
  }
}

function desenhar(conteudo, rel, p) {
  const { resumo } = rel;

  conteudo.innerHTML = `
    <div class="numeros">
      <div class="numero"><strong>${resumo.aulas}</strong><span>aulas dadas</span></div>
      <div class="numero"><strong>${resumo.ativos}</strong><span>alunos ativos</span></div>
      <div class="numero"><strong>${pct(resumo.freqGeral)}</strong><span>frequência média</span></div>
      <div class="numero cores">
        <span class="cor-item"><span class="bolinha vermelho">${resumo.vermelhos}</span><small>no limite</small></span>
        <span class="cor-item"><span class="bolinha amarelo">${resumo.amarelos}</span><small>com faltas</small></span>
        <span class="cor-item"><span class="bolinha verde">${resumo.semFaltas}</span><small>sem faltas</small></span>
      </div>
    </div>

    ${avisos(rel)}

    <div class="nao-imprimir">
      ${chips([['alunos', 'Alunos'], ['aulas', 'Por aula'], ['grade', 'Grade']], filtro.aba, 'aba')}
    </div>
    <div id="aba"></div>

    <section class="cartao nao-imprimir exportar">
      <h2>Guardar ou mostrar</h2>
      <div class="botoes">
        <button type="button" class="botao secundario" id="csv-resumo">Planilha do resumo</button>
        <button type="button" class="botao secundario" id="csv-detalhe">Planilha aula por aula</button>
        <button type="button" class="botao secundario" id="imprimir">Imprimir ou PDF</button>
      </div>
      <p class="suave pequeno">Frequência = presenças ÷ (presenças + faltas). Falta justificada fica de fora.</p>
    </section>`;

  conteudo.querySelectorAll('[data-aba]').forEach((b) => b.addEventListener('click', () => {
    filtro.aba = b.dataset.aba;
    conteudo.querySelectorAll('[data-aba]').forEach((c) => c.classList.toggle('ativo', c === b));
    desenharAba(rel, p);
  }));
  document.getElementById('csv-resumo').onclick = () => csvResumo(rel, p);
  document.getElementById('csv-detalhe').onclick = () => csvDetalhe(rel, p);
  document.getElementById('imprimir').onclick = () => window.print();
  desenharAba(rel, p);
}

function avisos(rel) {
  const itens = [];
  if (rel.semChamada.length) {
    itens.push(`<li><strong>${rel.semChamada.length} ${rel.semChamada.length === 1 ? 'aula passada' : 'aulas passadas'} sem chamada:</strong>
      ${rel.semChamada.slice(-6).map((d) => `<a href="#/dia/${d}">${dataCurta(d, { ano: false })}</a>`).join(', ')}
      ${rel.semChamada.length > 6 ? '…' : ''}</li>`);
  }
  return itens.length ? `<section class="cartao alerta-cartao"><ul class="avisos">${itens.join('')}</ul></section>` : '';
}

function desenharAba(rel, p) {
  const el = document.getElementById('aba');
  if (!rel.linhas.length) {
    el.innerHTML = '<p class="vazio">Nenhum aluno nesse período.</p>';
    return;
  }
  if (filtro.aba === 'aulas') el.innerHTML = abaPorAula(rel);
  else if (filtro.aba === 'grade') el.innerHTML = abaGrade(rel);
  else el.innerHTML = abaAlunos(rel, p);

  el.querySelectorAll('[data-ordem]').forEach((b) => b.addEventListener('click', () => {
    filtro.ordem = b.dataset.ordem;
    desenharAba(rel, p);
  }));
  el.querySelectorAll('[data-ficha]').forEach((b) => b.addEventListener('click', (ev) => {
    if (ev.target.closest('[data-retirar]')) return;
    fichaAluno(rel.linhas.find((l) => l.id === b.dataset.ficha), rel);
  }));
  el.querySelectorAll('[data-retirar]').forEach((b) => b.addEventListener('click', () => {
    const aluno = estado.alunos.find((a) => a.id === b.dataset.retirar);
    janelaRetirar(aluno, () => { b.replaceWith(Object.assign(document.createElement('small'), { textContent: 'retirado' })); });
  }));
}

function abaAlunos(rel) {
  const linhas = ordenar(rel.linhas, filtro.ordem);
  return `
    <div class="ordem nao-imprimir">Ordenar:
      ${chips([['faltas', 'Mais faltas'], ['nome', 'Nome']], filtro.ordem, 'ordem')}
    </div>
    <ul class="lista-relatorio">${linhas.map((l) => `
      <li class="linha-${l.cor || 'ok'}" data-ficha="${l.id}" tabindex="0" role="button">
        <div class="lr-topo">
          <span class="nome">${esc(l.nome)}${l.ativo ? '' : ' <small class="suave">(retirado)</small>'}</span>
          <span class="lr-faltas"><strong>${l.falta}</strong> ${l.falta === 1 ? 'falta' : 'faltas'}</span>
        </div>
        <div class="lr-detalhe">
          ${l.presente} ${l.presente === 1 ? 'presença' : 'presenças'} · frequência ${pct(l.freq)}
          ${l.justificada ? ` · ${l.justificada} justif.` : ''}
          · ${l.restantes ? `pode faltar mais ${l.restantes}` : 'chegou ao limite'}
        </div>
        ${l.cor === 'vermelho' && l.ativo
          ? `<button type="button" class="botao perigo pequeno nao-imprimir" data-retirar="${l.id}">Retirar do projeto</button>` : ''}
      </li>`).join('')}
    </ul>
    <p class="suave pequeno nao-imprimir">Toque num aluno para ver todas as aulas dele.</p>`;
}

function abaPorAula(rel) {
  const porDia = {};
  for (const a of rel.porAula) (porDia[diaSemana(a.data)] ||= []).push(a);
  const mediaDia = Object.entries(porDia).map(([dia, l]) => {
    const p = l.reduce((t, a) => t + a.presente, 0);
    const f = l.reduce((t, a) => t + a.falta, 0);
    return `<span><strong>${DIAS[dia]}</strong>: ${pct(p + f ? p / (p + f) : null)}</span>`;
  }).join(' · ');
  return `
    ${mediaDia ? `<p class="suave">Comparecimento por dia da semana: ${mediaDia}</p>` : ''}
    <ul class="lista-aulas">${[...rel.porAula].reverse().map((a) => `
      <li><a href="#/dia/${a.data}">
        <span class="la-data">${DIAS_CURTOS[diaSemana(a.data)]} ${dataCurta(a.data, { ano: false })}</span>
        <span class="la-numeros"><span class="n-presente"><strong>${a.presente}</strong> vieram</span>
          <span class="n-falta"><strong>${a.falta}</strong> faltaram</span></span>
        <strong class="la-pct">${pct(a.pct)}</strong>
      </a></li>`).join('')}
    </ul>`;
}

function abaGrade(rel) {
  const linhas = ordenar(rel.linhas, 'nome');
  const status = Object.fromEntries(linhas.map((l) => [l.id, Object.fromEntries(l.historico.map((h) => [h.data, h.status]))]));
  return `
    <div class="tabela-rolagem">
      <table class="tabela grade">
        <thead><tr><th class="fixa">Aluno</th>${rel.aulasDadas.map((d) => `
          <th><span>${DIAS_CURTOS[diaSemana(d)]}</span>${dataCurta(d, { ano: false })}</th>`).join('')}</tr></thead>
        <tbody>${linhas.map((l) => `
          <tr data-ficha="${l.id}"><td class="fixa nome">${esc(l.nome)}</td>${rel.aulasDadas.map((d) => {
            const s = status[l.id][d];
            return s ? `<td class="g-${s}">${STATUS[s].letra}</td>` : `<td class="g-vazio">${d in status[l.id] ? '·' : ''}</td>`;
          }).join('')}</tr>`).join('')}
        </tbody>
      </table>
    </div>
    <p class="suave pequeno">P presente · F falta · J justificada · ponto = não marcado · vazio = ainda não era aluno.</p>`;
}

function fichaAluno(l, rel) {
  const dias = Object.entries(l.faltasPorDia).sort((a, b) => b[1] - a[1]);
  const maisFalta = dias.length > 1 && dias[0][1] > dias[1][1] ? `Falta mais ${noDia(Number(dias[0][0]))}.`
    : dias.length === 1 ? `Faltas só ${noDia(Number(dias[0][0]))}.` : dias.length ? 'Faltas iguais nos dias.' : '';
  janela(`
    <h2>${esc(l.nome)}</h2>
    <p class="suave">${l.ativo ? `aluno desde ${dataCurta(l.entrada)}` : `retirado em ${dataCurta(l.saidaEm)}`}</p>
    ${l.observacao ? `<p class="alerta">${esc(l.observacao)}</p>` : ''}
    <div class="ficha-numeros linha-${l.cor || 'ok'}">
      <span><strong>${l.presente}</strong> presenças</span>
      <span><strong>${l.falta}</strong> faltas</span>
      ${l.justificada ? `<span><strong>${l.justificada}</strong> justificadas</span>` : ''}
      <span><strong>${pct(l.freq)}</strong> frequência</span>
    </div>
    <ul class="lista-simples">
      <li><span>Presenças seguidas agora</span><strong>${l.seguidasAgora}</strong></li>
      <li><span>Maior sequência de faltas</span><strong>${l.maiorSeqFaltas}</strong></li>
      <li><span>Faltas que ainda cabem no limite (${rel.limite})</span><strong>${l.restantes}</strong></li>
      ${maisFalta ? `<li><span>${maisFalta}</span><span>${dias.map(([d, n]) => `${DIAS_CURTOS[d]}: ${n}`).join(' · ')}</span></li>` : ''}
    </ul>
    <h3>Aula por aula</h3>
    <ul class="historico">${[...l.historico].reverse().map((h) => `
      <li class="h-${h.status ?? 'vazio'}"><span>${dataLonga(h.data)}</span>
      <strong>${h.status ? STATUS[h.status].texto : 'Não marcado'}</strong></li>`).join('') || '<li>Nenhuma aula no período.</li>'}
    </ul>
    <div class="botoes"><button type="button" class="botao" data-fechar>Fechar</button></div>`);
}

const nomeArquivo = (p, tipo) => `presenca-${tipo}-${p.inicio}-a-${p.fim}.csv`;

function csvResumo(rel, p) {
  const linhas = ordenar(rel.linhas, 'nome');
  baixarCSV(nomeArquivo(p, 'resumo'), [
    ['Aluno', 'Ativo', 'Presenças', 'Faltas', 'Justificadas', 'Não marcadas', 'Frequência', 'Faltas até o limite', 'Situação'],
    ...linhas.map((l) => [l.nome, l.ativo ? 'sim' : 'não', l.presente, l.falta,
      l.justificada, l.naoMarcada, pct(l.freq), l.restantes, COR_TEXTO[l.cor]]),
  ]);
}

function csvDetalhe(rel, p) {
  const linhas = ordenar(rel.linhas, 'nome');
  baixarCSV(nomeArquivo(p, 'aulas'), [
    ['Aluno', ...rel.aulasDadas.map((d) => dataCurta(d))],
    ...linhas.map((l) => {
      const s = Object.fromEntries(l.historico.map((h) => [h.data, h.status]));
      return [l.nome, ...rel.aulasDadas.map((d) => (s[d] ? STATUS[s[d]].texto : ''))];
    }),
  ]);
}
