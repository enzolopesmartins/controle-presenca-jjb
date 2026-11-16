// Alunos: cadastrar, editar, retirar do projeto, reativar e apagar de vez (só retirados).
import {
  estado, criarAluno, atualizarAluno, retirarAluno, reativarAluno, apagarAluno, listarPresencas,
} from '../dados.js';
import { app, esc, gravar, janela, chips, erroTela, aoEnviar, confirmar } from '../ui.js';
import { hojeISO, dataCurta, INICIO_DO_SISTEMA } from '../datas.js';
import { FAIXAS, maxGraus, coresDosGraus, estiloFaixa, proximaGraduacao } from '../faixas.js';

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
      <div class="acoes-titulo">
        <button type="button" class="sino sino-pequeno" id="sino-graduacao" aria-label="Avisos de graduação">${SINO}<span class="sino-numero" hidden></span></button>
        <button type="button" class="botao" id="novo">+ Novo aluno</button>
      </div>
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
  ligarSinoGraduacao();
  document.getElementById('lista-alunos').addEventListener('click', (ev) => {
    const f = ev.target.closest('[data-faixa]');
    if (f) return janelaGraduacao(estado.alunos.find((a) => a.id === f.dataset.faixa));
    const b = ev.target.closest('[data-aluno]');
    if (b) janelaOpcoes(estado.alunos.find((a) => a.id === b.dataset.aluno));
  });

  desenharLista();
}

// ---------- Sininho da graduação: quem já pode receber um grau ou trocar de faixa ----------
const SINO = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
  stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/>
  <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>`;
// Conta desde o último grau dado ou a última troca de faixa. Antes disso, contam todas as presenças
// (a chamada de dias antes do cadastro também vale).
const inicioDoGrau = (a) => ((a.graus > 0 || a.faixaEm) && a.grauEm ? a.grauEm : INICIO_DO_SISTEMA);

// A mesma conta vale para o sininho e para a janela de graduação.
// Aluno sem faixa salva conta como branca, 0 graus e o número padrão de aulas por grau.
const contarAulas = (presencas, a) => {
  const desde = inicioDoGrau(a);
  return presencas.filter((p) => p.data >= desde && p.registros?.[a.id] === 'presente').length;
};
const situacaoDoGrau = (a, aulas, hoje) => proximaGraduacao({
  faixa: a.faixa ?? 'Branca', graus: a.graus ?? 0, aulasPorGrau: a.aulasPorGrau ?? AULAS_POR_GRAU,
  aulas, grauEm: inicioDoGrau(a), desdeFaixa: a.faixaEm ?? a.entrada, hoje,
});

async function prontosParaGraduar() {
  const hoje = hojeISO();
  const alunos = estado.alunos.filter((a) => a.ativo);
  if (!alunos.length) return [];
  const presencas = await listarPresencas(alunos.map(inicioDoGrau).sort()[0], hoje);
  return alunos.map((a) => {
    const aulas = contarAulas(presencas, a);
    const proximo = situacaoDoGrau(a, aulas, hoje);
    return proximo && { aluno: a, aulas, ...proximo };
  }).filter(Boolean)
    .sort((x, y) => (x.tipo === y.tipo ? x.aluno.nome.localeCompare(y.aluno.nome, 'pt-BR') : x.tipo === 'faixa' ? -1 : 1));
}

function ligarSinoGraduacao() {
  const sino = document.getElementById('sino-graduacao');
  let lista = [];
  sino.addEventListener('click', () => janelaAvisosGraduacao(lista));
  prontosParaGraduar().then((l) => {
    lista = l;
    const numero = sino.querySelector('.sino-numero');
    numero.textContent = l.length;
    numero.hidden = !l.length;
    sino.classList.toggle('tem-aviso', l.length > 0);
    sino.setAttribute('aria-label', l.length
      ? `${l.length} ${l.length === 1 ? 'aluno pronto' : 'alunos prontos'} para graduar` : 'Avisos de graduação');
  }).catch((e) => console.error(e));
}

const textoAviso = (x) => (x.tipo === 'faixa'
  ? `<strong>Trocar para a faixa ${esc(x.faixa)}</strong>`
  : `<strong>Dar o ${x.grau}º grau</strong>${x.ouFaixa ? ' (ou faixa azul, se for adulto)' : ''}${
    x.aluno.faixa === 'Preta' ? '' : ` · ${x.aulas} aulas desde o último grau`}`);

function janelaAvisosGraduacao(lista) {
  const d = janela(`
    <h2>Graduação</h2>
    ${lista.length ? `<p>${lista.length === 1 ? 'Este aluno já pode' : 'Estes alunos já podem'} receber:</p>
      <ul class="lista-avisos">${lista.map((x) => `
        <li class="${x.tipo === 'faixa' ? 'av-faixa' : 'av-grau'}"><button type="button" class="aviso-botao" data-grad="${x.aluno.id}">
          <span>${esc(x.aluno.nome)}<small>${textoAviso(x)}</small></span>${faixaHTML(x.aluno)}</button></li>`).join('')}
      </ul><p class="suave pequeno">Toque no aluno para dar o grau ou trocar a faixa.</p>`
    : '<p>Ninguém pronto para graduar agora.</p>'}
    <details class="regras-graduacao"><summary>Como o aviso funciona</summary>
      <ul>
        <li><strong>Grau:</strong> quando o aluno completa as aulas combinadas (no cadastro da faixa) desde o último grau.</li>
        <li><strong>Troca de faixa:</strong> com todos os graus da faixa, as aulas completas e o tempo mínimo da IBJJF/CBJJ na faixa:
          azul 2 anos, roxa 1 ano e meio, marrom 1 ano, faixas infantis 1 ano (cinza e branca, 6 meses).</li>
        <li><strong>Faixa preta:</strong> do 1º ao 3º grau, a cada 3 anos; do 4º ao 6º, a cada 5 anos.</li>
        <li>A idade mínima (azul e roxa 16 anos, marrom 18, preta 19) fica com o professor.</li>
      </ul></details>
    <div class="botoes"><button type="button" class="botao secundario" data-fechar>Fechar</button></div>`);
  d.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-grad]');
    if (!b) return;
    d.close();
    janelaGraduacao(estado.alunos.find((a) => a.id === b.dataset.grad));
  });
}

// Tocar no aluno: escolher entre editar e retirar (que pede confirmação)
function janelaOpcoes(aluno) {
  const d = janela(`
    <h2>${esc(aluno.nome)}</h2>
    <p class="suave">${aluno.ativo ? `No projeto desde ${dataCurta(aluno.entrada)}`
      : `Retirado em ${dataCurta(aluno.saidaEm)}${aluno.motivoSaida ? `: ${esc(aluno.motivoSaida)}` : ''}`}</p>
    <div class="opcoes-aluno">
      <button type="button" class="botao largo" data-op="editar">Editar dados</button>
      ${aluno.ativo
        ? '<button type="button" class="botao perigo-contorno largo" data-op="sair">Retirar do projeto</button>'
        : `<button type="button" class="botao secundario largo" data-op="voltar">Voltar para o projeto</button>
           <button type="button" class="botao perigo largo" data-op="apagar">Apagar permanentemente</button>`}
      <button type="button" class="botao secundario largo" data-fechar>Fechar</button>
    </div>`);
  d.addEventListener('click', async (ev) => {
    const op = ev.target.closest('[data-op]')?.dataset.op;
    if (!op) return;
    d.close();
    if (op === 'editar') janelaAluno(aluno);
    else if (op === 'sair') janelaRetirar(aluno);
    else if (op === 'apagar') {
      if (await confirmar(`Deseja apagar ${aluno.nome} permanentemente do projeto?`,
        'O aluno some da lista e dos relatórios. Não dá para desfazer.', { sim: 'Sim, apagar', nao: 'Não', perigo: true })) {
        gravar(apagarAluno(aluno.id), `${aluno.nome} apagado do projeto`);
      }
    } else if (await confirmar(`Voltar ${aluno.nome} para o projeto?`, 'Ele volta a aparecer na chamada.', { sim: 'Sim', nao: 'Não' })) {
      gravar(reativarAluno(aluno.id), `${aluno.nome} voltou para o projeto`);
    }
  });
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
`);

  const form = d.querySelector('form');
  // Só abre o teclado sozinho no cadastro novo; na edição, ele espera o toque no campo
  if (!aluno) {
    ligarGraduacao(form);
    form.nome.focus();
  }
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
  const desde = inicioDoGrau(aluno);
  let aulas = null;
  // Mostra o mesmo que o sininho, já com o que está escrito na janela
  const mostrar = () => {
    const el = d.querySelector('#progresso');
    const meta = Number(form.aulasPorGrau.value) || 0;
    if (aulas == null || !meta) return;
    const faixa = form.faixa.value;
    const graus = Number(form.graus.value) || 0;
    const pronto = situacaoDoGrau({ ...aluno, faixa, graus, aulasPorGrau: meta }, aulas, hojeISO());
    if (faixa === 'Preta') {
      el.innerHTML = pronto ? `<strong>Pronto para o ${pronto.grau}º grau!</strong> (pelo tempo na faixa preta)`
        : 'Na faixa preta, os graus vêm pelo tempo: do 1º ao 3º a cada 3 anos; do 4º ao 6º a cada 5 anos.';
    } else if (pronto?.tipo === 'faixa') {
      el.innerHTML = `<strong>Pronto para trocar para a faixa ${esc(pronto.faixa)}!</strong> ${aulas} aulas desde ${dataCurta(desde)}.`;
    } else if (pronto) {
      el.innerHTML = `<strong>Pronto para o ${pronto.grau}º grau!</strong> ${aulas} aulas desde ${dataCurta(desde)}.`;
    } else if (aulas >= meta && graus >= maxGraus(faixa)) {
      el.innerHTML = `<strong>${aulas} aulas:</strong> já tem todos os graus. Falta o tempo mínimo na faixa para trocar.`;
    } else {
      el.innerHTML = `<strong>${aulas} de ${meta}</strong> aulas para o próximo grau (desde ${dataCurta(desde)}).`;
    }
    el.classList.toggle('pronto', Boolean(pronto));
  };
  form.aulasPorGrau.addEventListener('input', mostrar);
  form.faixa.addEventListener('change', mostrar);
  form.graus.addEventListener('input', mostrar);
  listarPresencas(desde, hojeISO()).then((ps) => {
    aulas = contarAulas(ps, aluno);
    mostrar();
  }).catch((e) => {
    console.error(e);
    d.querySelector('#progresso').textContent = '';
  });

  aoEnviar(form, (dados) => {
    const g = lerGraduacao(dados);
    // Trocou de faixa ou de grau: a contagem das aulas recomeça hoje
    if (aluno.faixa && (g.faixa !== aluno.faixa || g.graus !== aluno.graus)) g.grauEm = hojeISO();
    if (aluno.faixa && g.faixa !== aluno.faixa) g.faixaEm = hojeISO(); // conta o tempo mínimo na faixa nova
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
        <button type="button" class="botao secundario" data-fechar>Não</button>
        <button type="submit" class="botao perigo">Sim, retirar</button>
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

