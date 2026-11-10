import { estado, cicloAtivo, salvarExcecao, listarPresencas } from '../dados.js';
import { app, esc, gravar } from '../ui.js';
import {
  hojeISO, temAula, proximaAula, dataLonga, dataCurta, aulasNoPeriodo, somarDias,
} from '../datas.js';

export function telaInicio({ professor }) {
  const hoje = hojeISO();
  const { diasPadrao, excecoes } = estado;
  const aulaHoje = temAula(hoje, diasPadrao, excecoes);
  const proxima = proximaAula(hoje, diasPadrao, excecoes);
  const ciclo = cicloAtivo();
  const ativos = estado.alunos.filter((a) => a.ativo).length;
  const primeiroNome = (professor.nome || '').split(' ')[0];

  app.innerHTML = `
    <h1>Olá${primeiroNome ? `, ${esc(primeiroNome)}` : ''}!</h1>

    <section class="cartao destaque-hoje">
      ${aulaHoje ? `
        <p class="rotulo">Hoje tem aula</p>
        <a class="botao grande" href="#/chamada/${hoje}">Fazer chamada de hoje</a>
        ${excecoes[hoje]?.tipo === 'extra' ? '<p class="suave">Dia extra.</p>' : ''}
      ` : `
        <p class="rotulo">Hoje não tem aula</p>
        ${excecoes[hoje]?.tipo === 'cancelada'
          ? `<p class="suave">Aula cancelada${excecoes[hoje].motivo ? `: ${esc(excecoes[hoje].motivo)}` : ''}.</p>` : ''}
        <button type="button" class="botao secundario" id="abrir-extra">Abrir um dia extra hoje</button>
      `}
      ${proxima ? `<p class="suave">Próxima aula: <strong>${dataLonga(proxima)}</strong></p>` : ''}
    </section>

    <div id="pendentes"></div>

    <section class="cartao">
      <h2>Resumo</h2>
      <ul class="lista-simples">
        <li><span>Alunos ativos</span><strong>${ativos}</strong></li>
        <li><span>Ciclo</span><strong>${ciclo ? `${esc(ciclo.nome)}` : 'nenhum ativo'}</strong></li>
        ${ciclo ? `<li><span>Período</span><strong>${dataCurta(ciclo.inicio)} a ${dataCurta(ciclo.fim)}</strong></li>` : ''}
      </ul>
      ${!ciclo ? '<a class="botao secundario" href="#/ciclos">Criar o ciclo</a>' : ''}
      ${!ativos ? '<a class="botao secundario" href="#/alunos">Cadastrar os alunos</a>' : ''}
      ${ciclo && ciclo.fim < hoje ? `<p class="alerta">O ciclo terminou em ${dataCurta(ciclo.fim)}.
        <a href="#/relatorio">Ver o relatório</a> e <a href="#/ciclos">renovar</a>.</p>` : ''}
    </section>`;

  document.getElementById('abrir-extra')?.addEventListener('click', () => {
    gravar(salvarExcecao(hoje, 'extra'), 'Dia extra aberto');
    location.hash = `#/chamada/${hoje}`;
  });

  avisarAulasSemChamada(ciclo, hoje);
}

// Aulas passadas do ciclo (ou das últimas 4 semanas) sem nenhuma marcação
async function avisarAulasSemChamada(ciclo, hoje) {
  const inicio = ciclo?.inicio ?? somarDias(hoje, -28);
  const ontem = somarDias(hoje, -1);
  if (inicio > ontem) return;
  const previstas = aulasNoPeriodo(inicio, ontem, estado.diasPadrao, estado.excecoes);
  if (!previstas.length) return;
  try {
    const feitas = new Set((await listarPresencas(inicio, ontem))
      .filter((p) => Object.keys(p.registros || {}).length).map((p) => p.data));
    const faltando = previstas.filter((d) => !feitas.has(d)).reverse();
    const el = document.getElementById('pendentes');
    if (!el || !faltando.length) return;
    el.innerHTML = `
      <section class="cartao alerta-cartao">
        <h2>Aulas sem chamada</h2>
        <p class="suave">Se não teve aula nesses dias, cancele em <a href="#/dias">Dias de aula</a>.</p>
        <ul class="lista-links">${faltando.slice(0, 8).map((d) => `
          <li><a href="#/chamada/${d}">${dataLonga(d)}</a></li>`).join('')}</ul>
        ${faltando.length > 8 ? `<p class="suave">E mais ${faltando.length - 8}.</p>` : ''}
      </section>`;
  } catch (e) {
    console.error(e);
  }
}
