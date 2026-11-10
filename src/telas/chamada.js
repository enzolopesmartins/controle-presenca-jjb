// Chamada do dia: uma lista só com as duas turmas, três botões por aluno.
import { estado, ouvirChamada, marcar, marcarVarios, salvarExcecao } from '../dados.js';
import { app, esc, gravar, chips, STATUS, confirmar } from '../ui.js';
import {
  hojeISO, temAula, dataLonga, aulaAnterior, proximaAula, maiuscula,
} from '../datas.js';

let filtroTurma = '';

// Quem aparece na chamada de um dia: ativos que já tinham entrado,
// e quem saiu depois dessa data ou tem marcação nela
function alunosDoDia(data, registros) {
  return estado.alunos.filter((a) => registros[a.id] ||
    ((a.entrada || '') <= data && (a.ativo || (a.saidaEm && a.saidaEm >= data))));
}

export function telaChamada({ params }) {
  const data = /^\d{4}-\d{2}-\d{2}$/.test(params[0] ?? '') ? params[0] : hojeISO();
  const { diasPadrao, excecoes } = estado;
  const hoje = hojeISO();
  const anterior = aulaAnterior(data, diasPadrao, excecoes);
  const proxima = proximaAula(data, diasPadrao, excecoes);
  let registros = {};

  app.innerHTML = `
    <div class="chamada-topo">
      <div class="navegar-dia">
        <a class="botao icone" ${anterior ? `href="#/chamada/${anterior}"` : 'aria-disabled="true"'} aria-label="Aula anterior">‹</a>
        <label class="seletor-data">
          <span class="dia-texto">${data === hoje ? `Hoje, ${dataLonga(data)}` : maiuscula(dataLonga(data))}</span>
          <input type="date" id="data" value="${data}" max="${hoje}" aria-label="Escolher a data" />
        </label>
        <a class="botao icone" ${proxima && proxima <= hoje ? `href="#/chamada/${proxima}"` : 'aria-disabled="true"'} aria-label="Próxima aula">›</a>
      </div>
      <div id="sem-aula"></div>
      <div class="contador" id="contador" aria-live="polite"></div>
      <p class="sincronia" id="sincronia"></p>
      ${estado.turmas.length > 1 ? chips([['', 'Todas'], ...estado.turmas.map((t) => [t.id, t.nome])], filtroTurma, 'turma') : ''}
    </div>
    <div id="lista"></div>
    <button type="button" class="botao secundario largo" id="todos-presentes">Marcar quem falta como presente</button>`;

  document.getElementById('data').addEventListener('change', (ev) => {
    if (ev.target.value) location.hash = `#/chamada/${ev.target.value}`;
  });

  app.querySelectorAll('[data-turma]').forEach((b) => b.addEventListener('click', () => {
    filtroTurma = b.dataset.turma;
    app.querySelectorAll('[data-turma]').forEach((c) => {
      c.classList.toggle('ativo', c === b);
      c.setAttribute('aria-pressed', c === b);
    });
    desenharLista();
  }));

  // Data sem aula: avisa e oferece abrir um dia extra
  const semAula = document.getElementById('sem-aula');
  if (!temAula(data, diasPadrao, excecoes)) {
    const cancelada = excecoes[data]?.tipo === 'cancelada';
    semAula.innerHTML = `
      <p class="alerta">${cancelada ? 'A aula desse dia foi cancelada.' : 'Esse dia não é dia de aula.'}
      <button type="button" class="botao pequeno" id="abrir-extra">${cancelada ? 'Desfazer o cancelamento' : 'Abrir dia extra'}</button></p>`;
    document.getElementById('abrir-extra').addEventListener('click', () => {
      gravar(salvarExcecao(data, 'extra'), 'Dia de aula aberto');
      semAula.innerHTML = '';
    });
  }

  const lista = document.getElementById('lista');

  function visiveis() {
    return alunosDoDia(data, registros).filter((a) => !filtroTurma || a.turmaId === filtroTurma);
  }

  function desenharLista() {
    const alunos = visiveis();
    if (!estado.alunos.length) {
      lista.innerHTML = '<section class="cartao"><p>Nenhum aluno cadastrado ainda.</p><a class="botao" href="#/alunos">Cadastrar alunos</a></section>';
      return;
    }
    const grupos = estado.turmas
      .filter((t) => !filtroTurma || t.id === filtroTurma)
      .map((t) => [t, alunos.filter((a) => a.turmaId === t.id)]);
    const semTurma = alunos.filter((a) => !estado.turmas.some((t) => t.id === a.turmaId));
    if (semTurma.length) grupos.push([{ nome: 'Sem turma' }, semTurma]);

    lista.innerHTML = grupos.filter(([, l]) => l.length).map(([t, l]) => `
      <section class="grupo-turma">
        <h2>${esc(t.nome)} <span class="suave">(${l.length})</span></h2>
        <ul class="chamada">${l.map(linhaAluno).join('')}</ul>
      </section>`).join('');
    atualizarContador();
  }

  function linhaAluno(a) {
    const s = registros[a.id];
    return `
      <li class="aluno-chamada ${s ? `marcado-${s}` : ''}" data-aluno="${a.id}">
        <span class="nome">${esc(a.nome)}${a.ativo ? '' : ' <small class="suave">(retirado)</small>'}</span>
        <div class="tres-botoes">${Object.entries(STATUS).map(([chave, info]) => `
          <button type="button" class="st st-${chave} ${s === chave ? 'escolhido' : ''}" data-status="${chave}"
            aria-pressed="${s === chave}" aria-label="${info.texto}: ${esc(a.nome)}">${info.texto}</button>`).join('')}
        </div>
      </li>`;
  }

  function atualizarContador() {
    const alunos = visiveis();
    const c = { presente: 0, falta: 0, justificada: 0 };
    for (const a of alunos) if (registros[a.id]) c[registros[a.id]]++;
    const faltam = alunos.length - c.presente - c.falta - c.justificada;
    document.getElementById('contador').innerHTML = `
      <span class="n-presente"><strong>${c.presente}</strong> presentes</span>
      <span class="n-falta"><strong>${c.falta}</strong> faltas</span>
      <span class="n-justificada"><strong>${c.justificada}</strong> justificadas</span>
      ${faltam ? `<span class="n-falta-marcar"><strong>${faltam}</strong> sem marcar</span>` : ''}`;
    document.getElementById('todos-presentes').hidden = !faltam;
  }

  // Um toque marca; tocar de novo no mesmo botão desmarca
  lista.addEventListener('click', (ev) => {
    const botao = ev.target.closest('[data-status]');
    if (!botao) return;
    const li = botao.closest('[data-aluno]');
    const id = li.dataset.aluno;
    const novo = registros[id] === botao.dataset.status ? null : botao.dataset.status;
    if (novo) registros[id] = novo;
    else delete registros[id];
    li.className = `aluno-chamada ${novo ? `marcado-${novo}` : ''}`;
    li.querySelectorAll('[data-status]').forEach((b) => {
      const sel = b.dataset.status === novo;
      b.classList.toggle('escolhido', sel);
      b.setAttribute('aria-pressed', sel);
    });
    if (navigator.vibrate) navigator.vibrate(15);
    atualizarContador();
    gravar(marcar(data, id, novo));
  });

  document.getElementById('todos-presentes').addEventListener('click', async () => {
    const faltam = visiveis().filter((a) => !registros[a.id]).map((a) => a.id);
    if (!faltam.length) return;
    const ok = await confirmar('Marcar como presente?',
      `${faltam.length} ${faltam.length === 1 ? 'aluno ainda sem marcação vai' : 'alunos ainda sem marcação vão'} ficar como presente.`,
      { sim: 'Marcar presentes' });
    if (!ok) return;
    for (const id of faltam) registros[id] = 'presente';
    desenharLista();
    gravar(marcarVarios(data, faltam, 'presente'), 'Marcados como presente');
  });

  // Fica escutando a chamada: mostra o que já foi marcado (inclusive em outro aparelho)
  const sincronia = document.getElementById('sincronia');
  let primeira = true;
  const parar = ouvirChamada(data, ({ registros: r, pendente }) => {
    if (primeira || !pendente) {
      registros = { ...r };
      desenharLista();
    }
    primeira = false;
    sincronia.className = `sincronia ${pendente ? 'pendente' : 'ok'}`;
    sincronia.textContent = pendente
      ? (navigator.onLine ? 'Salvando…' : 'Sem internet: guardado no aparelho. Envia sozinho quando a internet voltar (não feche o site).')
      : 'Tudo salvo.';
  });

  desenharLista();
  return parar;
}
