// Menu Mais e a exportação do mês em planilha (serve de backup).
import { estado, sair, listarPresencas, nomeDaTurma } from '../dados.js';
import { app, esc, baixarCSV, confirmar, mensagemErro, STATUS } from '../ui.js';
import { hojeISO, inicioDoMes, fimDoMes, dataCurta } from '../datas.js';

export function telaMais({ professor }) {
  app.innerHTML = `
    <h1>Mais</h1>
    <ul class="lista-toque menu-mais">
      <li><a href="#/turmas"><span>Turmas</span><small class="suave">nomes das turmas</small></a></li>
      <li><a href="#/dias"><span>Dias de aula</span><small class="suave">dias da semana, extras e cancelados</small></a></li>
      <li><a href="#/ciclos"><span>Ciclos</span><small class="suave">datas, limite de faltas e renovar</small></a></li>
      <li><a href="#/exportar"><span>Exportar planilha do mês</span><small class="suave">backup: faça uma vez por mês</small></a></li>
    </ul>
    <section class="cartao">
      <p class="suave">Entrou como <strong>${esc(professor.nome || 'professor')}</strong>.</p>
      <p class="suave pequeno">Em celular dos outros, toque em Sair no fim.</p>
      <button type="button" class="botao secundario" id="sair">Sair</button>
    </section>`;
  document.getElementById('sair').addEventListener('click', async () => {
    if (await confirmar('Sair do site?', 'Para entrar de novo, use o e-mail e a senha.', { sim: 'Sair' })) sair();
  });
}

export function telaExportar() {
  const mes = hojeISO().slice(0, 7);
  app.innerHTML = `
    <a href="#/mais" class="voltar">‹ Mais</a>
    <h1>Exportar planilha</h1>
    <section class="cartao">
      <p>Baixa um arquivo com a presença de cada aluno em cada aula do mês. Abre no Excel ou no Google Planilhas.</p>
      <label>Mês <input type="month" id="mes" value="${mes}" max="${mes}" /></label>
      <p class="erro" hidden></p>
      <button type="button" class="botao grande" id="baixar">Baixar planilha</button>
      <p class="suave pequeno">Guarde o arquivo num lugar seguro: é o backup simples do site.</p>
    </section>`;

  document.getElementById('baixar').addEventListener('click', async (ev) => {
    const erro = app.querySelector('.erro');
    erro.hidden = true;
    ev.target.disabled = true;
    try {
      const inicio = inicioDoMes(`${document.getElementById('mes').value}-01`);
      const fim = fimDoMes(inicio);
      const presencas = (await listarPresencas(inicio, fim))
        .filter((p) => Object.keys(p.registros || {}).length)
        .sort((a, b) => a.data.localeCompare(b.data));
      const ids = new Set(presencas.flatMap((p) => Object.keys(p.registros)));
      const alunos = estado.alunos.filter((a) => ids.has(a.id) ||
        (a.ativo && (a.entrada || '') <= fim));
      baixarCSV(`presenca-${inicio.slice(0, 7)}.csv`, [
        ['Aluno', 'Turma', ...presencas.map((p) => dataCurta(p.data)), 'Presenças', 'Faltas', 'Justificadas'],
        ...alunos.map((a) => {
          const st = presencas.map((p) => p.registros[a.id]);
          const n = (s) => st.filter((x) => x === s).length;
          return [a.nome, nomeDaTurma(a.turmaId), ...st.map((s) => (s ? STATUS[s].texto : '')),
            n('presente'), n('falta'), n('justificada')];
        }),
      ]);
    } catch (e) {
      console.error(e);
      erro.textContent = mensagemErro(e);
      erro.hidden = false;
    }
    ev.target.disabled = false;
  });
}
