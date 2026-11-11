// Alunos: cadastrar, editar, retirar do projeto e reativar. Sem apagar.
import {
  estado, criarAluno, atualizarAluno, retirarAluno, reativarAluno,
} from '../dados.js';
import { app, esc, gravar, janela, chips, erroTela, aoEnviar } from '../ui.js';
import { hojeISO, dataCurta } from '../datas.js';

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
          <li><button type="button" data-aluno="${a.id}">
            <span>${esc(a.nome)}</span>
            <small class="suave">${a.ativo ? `desde ${dataCurta(a.entrada, { ano: false })}` : `saiu em ${dataCurta(a.saidaEm)}`}${a.observacao ? ' · tem observação' : ''}</small>
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
      gravar(criarAluno({ nome, observacao }), `${nome} cadastrado com sucesso`);
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

