// Turmas: cadastrar e renomear. Trocar aluno de turma é na ficha do aluno.
import { estado, salvarTurma } from '../dados.js';
import { app, esc, gravar, janela, aoEnviar, erroTela } from '../ui.js';

export function telaTurmas() {
  const contar = (id) => estado.alunos.filter((a) => a.ativo && a.turmaId === id).length;
  app.innerHTML = `
    <a href="#/mais" class="voltar">‹ Mais</a>
    <div class="titulo-acao">
      <h1>Turmas</h1>
      <button type="button" class="botao" id="nova">+ Nova turma</button>
    </div>
    <p class="suave">As turmas têm os mesmos dias e horário. A chamada de cada dia mostra as duas juntas, separadas por turma.</p>
    <ul class="lista-toque">${estado.turmas.map((t) => `
      <li><button type="button" data-turma="${t.id}">
        <span>${esc(t.nome)}</span><small class="suave">${contar(t.id)} alunos · renomear</small>
      </button></li>`).join('')}
    </ul>
    <p class="suave">Para trocar um aluno de turma, abra o aluno na tela <a href="#/alunos">Alunos</a>.</p>`;

  document.getElementById('nova').addEventListener('click', () => janelaTurma(null));
  app.querySelectorAll('[data-turma]').forEach((b) => b.addEventListener('click', () =>
    janelaTurma(estado.turmas.find((t) => t.id === b.dataset.turma))));
}

function janelaTurma(turma) {
  const d = janela(`
    <h2>${turma ? 'Renomear turma' : 'Nova turma'}</h2>
    <form>
      <label>Nome <input name="nome" maxlength="60" required value="${esc(turma?.nome ?? '')}" /></label>
      <p class="erro" hidden></p>
      <div class="botoes">
        <button type="button" class="botao secundario" data-fechar>Voltar</button>
        <button type="submit" class="botao">Salvar</button>
      </div>
    </form>`);
  const form = d.querySelector('form');
  form.nome.select();
  aoEnviar(form, (dados) => {
    const nome = dados.get('nome').trim();
    if (!nome) throw erroTela('Digite o nome da turma.');
    gravar(salvarTurma(turma?.id, nome), 'Turma salva');
    d.close();
  });
}
