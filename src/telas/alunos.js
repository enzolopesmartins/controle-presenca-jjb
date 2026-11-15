// Alunos: cadastrar, editar, retirar do projeto e reativar. Sem apagar.
import {
  estado, criarAluno, atualizarAluno, retirarAluno, reativarAluno, listarPresencas,
} from '../dados.js';
import { app, esc, gravar, janela, chips, erroTela, aoEnviar } from '../ui.js';
import { hojeISO, dataCurta, INICIO_DO_SISTEMA } from '../datas.js';
import { FAIXAS, maxGraus, coresDosGraus, estiloFaixa } from '../faixas.js';

const AULAS_POR_GRAU = 30;
const textoGraus = (n) => `${n} ${n === 1 ? 'grau' : 'graus'}`;

// Desenho da faixa com os graus coloridos na ponteira
const faixaHTML = (a) => (a.faixa
  ? `<span class="faixa" style="${estiloFaixa(a.faixa)}">${maxGraus(a.faixa) ? `
      <span class="ponta">${coresDosGraus(a.faixa, a.graus).map((c) => `<i style="background:${c}"></i>`).join('')}</span>` : ''}</span>`
  : '<span class="faixa sem-faixa"></span>');

const camposGraduacao = (a) => `
  <div class="duas-colunas">
    <label>Faixa <select name="faixa">
      <optgroup label="Infantil (4 a 15 anos)">${Object.keys(FAIXAS).filter((f) => FAIXAS[f].infantil || f === 'Branca').map((f) => `
        <option ${f === (a?.faixa ?? 'Branca') ? 'selected' : ''}>${f}</option>`).join('')}</optgroup>
      <optgroup label="Adulto (16 anos ou mais)">${Object.keys(FAIXAS).filter((f) => !FAIXAS[f].infantil && f !== 'Branca').map((f) => `
        <option ${f === a?.faixa ? 'selected' : ''}>${f}</option>`).join('')}</optgroup>
    </select></label>
    <label>Graus <input name="graus" type="number" inputmode="numeric" min="0" max="${maxGraus(a?.faixa ?? 'Branca')}" required value="${a?.graus ?? 0}" /></label>
  </div>
  <p class="previa-faixa" aria-hidden="true">${faixaHTML({ faixa: a?.faixa ?? 'Branca', graus: a?.graus ?? 0 })}</p>
  <label>Aulas para ganhar um grau <input name="aulasPorGrau" type="number" inputmode="numeric" min="1" max="1000"
    required value="${a?.aulasPorGrau ?? AULAS_POR_GRAU}" /></label>`;

// Ao trocar a faixa ou os graus: ajusta o máximo de graus e redesenha a faixa
function ligarGraduacao(form) {
  const desenhar = () => {
    const max = maxGraus(form.faixa.value);
    form.graus.max = max;
    if (Number(form.graus.value) > max) form.graus.value = max;
    form.querySelector('.previa-faixa').innerHTML = faixaHTML({ faixa: form.faixa.value, graus: Number(form.graus.value) });
  };
  form.faixa.addEventListener('change', desenhar);
  form.graus.addEventListener('input', desenhar);
}

const lerGraduacao = (dados) => {
  const g = { faixa: dados.get('faixa'), graus: Number(dados.get('graus')), aulasPorGrau: Number(dados.get('aulasPorGrau')) };
  if (!FAIXAS[g.faixa]) throw erroTela('Escolha a faixa.');
  if (!Number.isInteger(g.graus) || g.graus < 0 || g.graus > maxGraus(g.faixa)) {
    throw erroTela(`A faixa ${g.faixa} vai até ${textoGraus(maxGraus(g.faixa))}.`);
  }
  return g;
};

let busca = '';
let mostrar = 'ativos';

const normalizar = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function telaAlunos() {
  const ativos = estado.alunos.filter((a) => a.ativo);
  const retirados = estado.alunos.filter((a) => !a.ativo);

  app.innerHTML = `
    <div class="titulo-acao">
      <h1>Alunos</h1>
      <button type="button" class="botao" id="novo">+ Novo aluno</button>
    </div>
    <input type="search" id="busca" class="busca" placeholder="Buscar pelo nome" value="${esc(busca)}" />
    ${chips([['ativos', `Ativos (${ativos.length})`], ['retirados', `Retirados (${retirados.length})`]], mostrar, 'mostrar')}
    <div id="lista-alunos"></div>`;

  const desenharLista = () => {
    const termo = normalizar(busca.trim());
    const base = (mostrar === 'ativos' ? ativos : retirados)
      .filter((a) => !termo || normalizar(a.nome).includes(termo));
    const el = document.getElementById('lista-alunos');
    if (!base.length) {
      el.innerHTML = `<p class="vazio">${termo ? 'Ninguém com esse nome.' : mostrar === 'ativos'
        ? 'Nenhum aluno ainda. Toque em "+ Novo aluno".' : 'Nenhum aluno retirado.'}</p>`;
      return;
    }
    el.innerHTML = `
        <ul class="lista-toque">${base.map((a) => `
          <li class="linha-aluno"><button type="button" data-aluno="${a.id}">
            <span>${esc(a.nome)}</span>
            <small class="suave">${a.ativo ? `desde ${dataCurta(a.entrada, { ano: false })}` : `saiu em ${dataCurta(a.saidaEm)}`}${a.observacao ? ' · tem observação' : ''}</small>
          </button>
          <button type="button" class="botao-faixa" data-faixa="${a.id}" aria-label="Graduação de ${esc(a.nome)}">
            ${faixaHTML(a)}<small>${a.faixa ? textoGraus(a.graus ?? 0) : 'Faixa'}</small>
          </button></li>`).join('')}
        </ul>`;
  };

  document.getElementById('busca').addEventListener('input', (ev) => {
    busca = ev.target.value;
    desenharLista();
  });
  app.querySelectorAll('[data-mostrar]').forEach((b) => b.addEventListener('click', () => {
    mostrar = b.dataset.mostrar;
    telaAlunos();
  }));
  document.getElementById('novo').addEventListener('click', () => janelaAluno(null));
  document.getElementById('lista-alunos').addEventListener('click', (ev) => {
    const f = ev.target.closest('[data-faixa]');
    if (f) return janelaGraduacao(estado.alunos.find((a) => a.id === f.dataset.faixa));
    const b = ev.target.closest('[data-aluno]');
    if (b) janelaAluno(estado.alunos.find((a) => a.id === b.dataset.aluno));
  });

  desenharLista();
}

// Cadastro e edição. Ao salvar, mostra o aviso e volta para a lista.
function janelaAluno(aluno) {
  const d = janela(`
    <h2>${aluno ? 'Editar aluno' : 'Novo aluno'}</h2>
    <form id="form-aluno">
      <label>Nome ou apelido <input name="nome" maxlength="80" required value="${esc(aluno?.nome ?? '')}" autocomplete="off" /></label>
      <label>Observação <textarea name="observacao" rows="3" maxlength="500"
        placeholder="Ex.: alergia, quem busca, combinado com a família">${esc(aluno?.observacao ?? '')}</textarea></label>
      ${aluno ? '' : camposGraduacao(null)}
      <p class="erro" hidden></p>
      <div class="botoes">
        <button type="button" class="botao secundario" data-fechar>${aluno ? 'Voltar' : 'Fechar'}</button>
        <button type="submit" class="botao">${aluno ? 'Salvar' : 'Cadastrar'}</button>
      </div>
    </form>
    ${aluno ? `<div class="zona-saida">
      ${aluno.ativo
        ? '<button type="button" class="botao perigo-contorno largo" id="retirar">Retirar do projeto</button>'
        : `<p class="suave">Retirado em ${dataCurta(aluno.saidaEm)}${aluno.motivoSaida ? `: ${esc(aluno.motivoSaida)}` : ''}.</p>
           <button type="button" class="botao secundario largo" id="reativar">Voltar para o projeto</button>`}
    </div>` : ''}`);

  const form = d.querySelector('form');
  if (!aluno) ligarGraduacao(form);
  form.nome.focus();
  aoEnviar(form, (dados) => {
    const nome = dados.get('nome').trim().replace(/\s+/g, ' ');
    if (!nome) throw erroTela('Digite o nome.');
    const observacao = dados.get('observacao').trim();
    const repetido = estado.alunos.find((a) => a.id !== aluno?.id && normalizar(a.nome) === normalizar(nome));
    if (repetido && !form.dataset.confirmouRepetido) {
      form.dataset.confirmouRepetido = '1';
      throw erroTela(`Já existe "${repetido.nome}". Se for outra criança, toque de novo para cadastrar mesmo assim.`);
    }
    if (aluno) {
      gravar(atualizarAluno(aluno.id, { nome, observacao }), 'Aluno salvo com sucesso');
      d.close();
    } else {
      gravar(criarAluno({ nome, observacao, ...lerGraduacao(dados), grauEm: hojeISO() }), `${nome} cadastrado com sucesso`);
      d.close();
    }
  });
  form.nome.addEventListener('input', () => delete form.dataset.confirmouRepetido);

  d.querySelector('#retirar')?.addEventListener('click', () => { d.close(); janelaRetirar(aluno); });
  d.querySelector('#reativar')?.addEventListener('click', () => {
    gravar(reativarAluno(aluno.id), `${aluno.nome} voltou para o projeto`);
    d.close();
  });
}

// Faixa, graus e aulas para o próximo grau. Conta as presenças desde o último grau.
function janelaGraduacao(aluno) {
  const d = janela(`
    <h2>Graduação de ${esc(aluno.nome)}</h2>
    <form>
      ${camposGraduacao(aluno)}
      <p class="progresso-grau" id="progresso">Contando as aulas…</p>
      <p class="erro" hidden></p>
      <div class="botoes">
        <button type="button" class="botao secundario" data-fechar>Voltar</button>
        <button type="submit" class="botao">Salvar</button>
      </div>
    </form>`);
  const form = d.querySelector('form');
  ligarGraduacao(form);
  // Sem grau registrado ainda: conta desde quando o controle começou
  const desde = aluno.grauEm ?? INICIO_DO_SISTEMA;
  let aulas = null;
  const mostrar = () => {
    const el = d.querySelector('#progresso');
    const meta = Number(form.aulasPorGrau.value) || 0;
    if (aulas == null || !meta) return;
    el.innerHTML = aulas >= meta
      ? `<strong>Pronto para o próximo grau!</strong> ${aulas} aulas desde ${dataCurta(desde)}.`
      : `<strong>${aulas} de ${meta}</strong> aulas para o próximo grau (desde ${dataCurta(desde)}).`;
    el.classList.toggle('pronto', aulas >= meta);
  };
  form.aulasPorGrau.addEventListener('input', mostrar);
  listarPresencas(desde, hojeISO()).then((ps) => {
    aulas = ps.filter((p) => p.registros?.[aluno.id] === 'presente').length;
    mostrar();
  }).catch((e) => {
    console.error(e);
    d.querySelector('#progresso').textContent = '';
  });

  aoEnviar(form, (dados) => {
    const g = lerGraduacao(dados);
    // Trocou de faixa ou de grau: a contagem das aulas recomeça hoje
    if (aluno.faixa && (g.faixa !== aluno.faixa || g.graus !== aluno.graus)) g.grauEm = hojeISO();
    gravar(atualizarAluno(aluno.id, g), 'Graduação salva com sucesso');
    d.close();
  });
}

// Retirar = desativar com data e motivo. O histórico continua nos relatórios.
export function janelaRetirar(aluno, aoTerminar) {
  const d = janela(`
    <h2>Retirar ${esc(aluno.nome)} do projeto?</h2>
    <p>Ele sai da chamada, mas continua nos relatórios dos ciclos em que participou. Dá para voltar depois.</p>
    <form>
      <label>Data da saída <input type="date" name="data" value="${hojeISO()}" required /></label>
      <label>Motivo (opcional) <input name="motivo" maxlength="200" placeholder="Ex.: passou do limite de faltas" /></label>
      <div class="botoes">
        <button type="button" class="botao secundario" data-fechar>Voltar</button>
        <button type="submit" class="botao perigo">Retirar</button>
      </div>
    </form>`);
  d.querySelector('form').addEventListener('submit', (ev) => {
    ev.preventDefault();
    const f = new FormData(ev.target);
    gravar(retirarAluno(aluno.id, f.get('data') || hojeISO(), f.get('motivo').trim()),
      `${aluno.nome} retirado do projeto`);
    d.close();
    aoTerminar?.();
  });
}

