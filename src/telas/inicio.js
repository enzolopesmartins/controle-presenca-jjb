import { estado, cicloAtivo, listarPresencas } from '../dados.js';
import { app, esc, janela } from '../ui.js';
import { montarRelatorio, ordenar } from '../relatorio.js';
import { montarCalendario, janelaDoDia } from './chamada.js';
import { janelaTutoriais } from '../tutorial-passos.js';
import {
  hojeISO, temAula, proximaAula, dataLonga, dataCurta,
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
    <div class="titulo-acao">
      <h1>Olá${primeiroNome ? `, ${esc(primeiroNome)}` : ''}!</h1>
      <div class="topo-botoes">
        <button type="button" class="ajuda" id="ajuda" aria-label="Tutoriais"><b aria-hidden="true">?</b><small>Tutorial</small></button>
        <button type="button" class="sino" id="sino" aria-label="Avisos de faltas">${SINO}<span class="sino-numero" id="sino-numero" hidden></span></button>
      </div>
    </div>

    <section class="cartao destaque-hoje">
      ${aulaHoje ? `
        <p class="rotulo">Hoje tem aula</p>
        <button type="button" class="botao grande" id="chamada-hoje">Chamada de hoje</button>
        ${excecoes[hoje]?.tipo === 'extra' ? '<p class="suave">Dia extra.</p>' : ''}
      ` : `
        <p class="rotulo">Hoje não tem aula</p>
        ${excecoes[hoje]?.tipo === 'cancelada'
          ? `<p class="suave">Aula cancelada${excecoes[hoje].motivo ? `: ${esc(excecoes[hoje].motivo)}` : ''}.</p>` : ''}
      `}
      ${proxima ? `<p class="suave">Próxima aula: <strong>${dataLonga(proxima)}</strong></p>` : ''}
    </section>

    <section class="cartao" id="calendario-inicio"></section>

    <section class="cartao">
      <h2>Resumo</h2>
      <ul class="lista-simples">
        <li><span>Alunos ativos</span><strong>${ativos}</strong></li>
        <li><span>Ciclo/trimestre</span><strong>${ciclo ? `${esc(ciclo.nome)}` : 'nenhum ativo'}</strong></li>
        ${ciclo ? `<li><span>Período</span><strong>${dataCurta(ciclo.inicio)} a ${dataCurta(ciclo.fim)}</strong></li>` : ''}
      </ul>
      ${!ciclo ? '<a class="botao secundario" href="#/ciclos">Criar o ciclo</a>' : ''}
      ${!ativos ? '<a class="botao secundario" href="#/alunos">Cadastrar os alunos</a>' : ''}
      ${ciclo && ciclo.fim < hoje ? `<p class="alerta">O ciclo terminou em ${dataCurta(ciclo.fim)}.
        <a href="#/relatorio">Ver o relatório</a> e <a href="#/ciclos">renovar</a>.</p>` : ''}
    </section>`;

  montarCalendario(document.getElementById('calendario-inicio'));
  document.getElementById('ajuda').addEventListener('click', janelaTutoriais);
  document.getElementById('chamada-hoje')?.addEventListener('click', () => janelaDoDia(hoje));

  prepararSino(ciclo, hoje);
}

const SINO = `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
  stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/>
  <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>`;

// Sininho: avisa quem está a 1 falta do limite (3 faltas) e quem chegou ao limite (4 ou mais), no ciclo ativo
async function prepararSino(ciclo, hoje) {
  const sino = document.getElementById('sino');
  let vermelhos = [];
  let amarelos = [];
  sino.addEventListener('click', () => janelaAvisos(ciclo, vermelhos, amarelos));
  if (!ciclo) return;
  try {
    const presencas = await listarPresencas(ciclo.inicio, ciclo.fim);
    const rel = montarRelatorio({
      inicio: ciclo.inicio, fim: ciclo.fim, hoje, alunos: estado.alunos, presencas,
      diasPadrao: estado.diasPadrao, excecoes: estado.excecoes, limite: ciclo.limiteFaltas,
    });
    const linhas = ordenar(rel.linhas, 'faltas');
    vermelhos = linhas.filter((l) => l.falta >= ciclo.limiteFaltas);
    amarelos = linhas.filter((l) => l.falta === ciclo.limiteFaltas - 1 && l.falta > 0);
    const total = vermelhos.length + amarelos.length;
    const numero = document.getElementById('sino-numero');
    if (!numero) return;
    numero.hidden = !total;
    numero.textContent = total;
    sino.classList.toggle('tem-aviso', total > 0);
    sino.setAttribute('aria-label', total ? `${total} ${total === 1 ? 'aviso' : 'avisos'} de faltas` : 'Avisos de faltas');
  } catch (e) {
    console.error(e);
  }
}

function janelaAvisos(ciclo, vermelhos, amarelos) {
  const item = (l, classe) => `<li class="${classe}"><span>${esc(l.nome)}</span><span>${l.falta} faltas</span></li>`;
  const limite = ciclo?.limiteFaltas ?? 4;
  janela(`
    <h2>Avisos de faltas</h2>
    ${!ciclo ? '<p>Crie o ciclo/trimestre em Configurações > Ciclos para o sininho começar a contar as faltas.</p>'
      : !vermelhos.length && !amarelos.length ? '<p>Nenhum aluno perto do limite de faltas.</p>' : ''}
    ${vermelhos.length ? `<h3>Chegaram ao limite (${limite} faltas ou mais)</h3>
      <ul class="lista-avisos">${vermelhos.map((l) => item(l, 'av-vermelho')).join('')}</ul>` : ''}
    ${amarelos.length ? `<h3>Perto do limite (${limite - 1} faltas)</h3>
      <ul class="lista-avisos">${amarelos.map((l) => item(l, 'av-amarelo')).join('')}</ul>` : ''}
    ${ciclo ? '<p class="suave pequeno">Conta as faltas do ciclo/trimestre ativo. Falta justificada não conta.</p>' : ''}
    <div class="botoes">
      <button type="button" class="botao secundario" data-fechar>Fechar</button>
      ${vermelhos.length || amarelos.length ? '<a class="botao" href="#/relatorio" data-fechar>Ver relatório</a>' : ''}
    </div>`);
}
