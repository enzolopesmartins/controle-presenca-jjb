// Ciclos de 3 meses: criar, editar as datas, renovar e escolher o ativo. Sem apagar.
import { estado, cicloAtivo, salvarCiclo, ativarCiclo, criarCicloAtivo } from '../dados.js';
import { app, esc, gravar, janela, aoEnviar, erroTela, confirmar } from '../ui.js';
import { hojeISO, inicioDoMes, somarDias, sugerirCiclo, dataCurta, nomeDoCiclo } from '../datas.js';

export function telaCiclos() {
  const ativo = cicloAtivo();
  app.innerHTML = `
    <a href="#/mais" class="voltar">‹ Mais</a>
    <h1>Ciclos</h1>
    <p class="suave">Cada ciclo tem início, fim e limite de faltas (padrão 4). A falta justificada não conta.</p>
    ${ativo ? `
      <section class="cartao ciclo-ativo">
        <p class="rotulo">Ciclo ativo</p>
        <h2>${esc(ativo.nome)}</h2>
        <p>${dataCurta(ativo.inicio)} a ${dataCurta(ativo.fim)} · limite de ${ativo.limiteFaltas} faltas</p>
        <div class="botoes">
          <button type="button" class="botao secundario" data-editar="${ativo.id}">Editar</button>
          <button type="button" class="botao" id="renovar">Renovar</button>
        </div>
      </section>` : `
      <section class="cartao">
        <p>Nenhum ciclo ativo.</p>
        <button type="button" class="botao" id="criar">Criar ciclo</button>
      </section>`}
    ${estado.ciclos.filter((c) => !c.ativo).length ? `
      <h2>Ciclos anteriores</h2>
      <ul class="lista-toque">${estado.ciclos.filter((c) => !c.ativo).map((c) => `
        <li><button type="button" data-editar="${c.id}">
          <span>${esc(c.nome)}</span><small class="suave">${dataCurta(c.inicio)} a ${dataCurta(c.fim)}</small>
        </button></li>`).join('')}
      </ul>` : ''}
    ${ativo ? '<button type="button" class="link" id="criar">Criar outro ciclo</button>' : ''}`;

  app.querySelectorAll('[data-editar]').forEach((b) => b.addEventListener('click', () =>
    janelaCiclo(estado.ciclos.find((c) => c.id === b.dataset.editar))));
  document.getElementById('criar')?.addEventListener('click', () => {
    janelaCiclo(null, sugerirCiclo(ativo ? somarDias(ativo.fim, 1) : inicioDoMes(hojeISO())));
  });
  document.getElementById('renovar')?.addEventListener('click', () => {
    janelaCiclo(null, { ...sugerirCiclo(somarDias(ativo.fim, 1)), limiteFaltas: ativo.limiteFaltas }, true);
  });
}

function janelaCiclo(ciclo, sugestao = {}, renovar = false) {
  const v = { limiteFaltas: 4, ...sugestao, ...ciclo };
  const d = janela(`
    <h2>${ciclo ? 'Editar ciclo' : renovar ? 'Renovar ciclo' : 'Novo ciclo'}</h2>
    ${renovar ? '<p class="suave">O ciclo novo fica ativo e o atual vai para os anteriores (o relatório dele continua disponível).</p>' : ''}
    <form>
      <label>Início <input type="date" name="inicio" required value="${v.inicio ?? ''}" /></label>
      <label>Fim <input type="date" name="fim" required value="${v.fim ?? ''}" /></label>
      <label>Nome <input name="nome" maxlength="60" required value="${esc(v.nome ?? '')}" /></label>
      <label>Limite de faltas <input type="number" name="limite" min="1" max="100" required value="${v.limiteFaltas}" inputmode="numeric" /></label>
      <p class="aviso-meses suave pequeno" hidden></p>
      <p class="erro" hidden></p>
      <div class="botoes">
        <button type="button" class="botao secundario" data-fechar>Voltar</button>
        <button type="submit" class="botao">${renovar ? 'Renovar' : 'Salvar'}</button>
      </div>
    </form>
    ${ciclo && !ciclo.ativo ? '<button type="button" class="link" id="tornar-ativo">Tornar este o ciclo ativo</button>' : ''}`);

  const form = d.querySelector('form');
  const aviso = d.querySelector('.aviso-meses');
  let nomeAutomatico = !ciclo || ciclo.nome === nomeDoCiclo(ciclo.inicio, ciclo.fim);

  const conferir = () => {
    const { inicio, fim } = form;
    if (inicio.value && fim.value && nomeAutomatico) form.nome.value = nomeDoCiclo(inicio.value, fim.value);
    const certo = inicio.value ? sugerirCiclo(inicio.value).fim : '';
    aviso.hidden = !certo || !fim.value || fim.value === certo;
    aviso.textContent = `Para 3 meses certinhos, o fim seria ${certo ? dataCurta(certo) : ''}.`;
  };
  form.inicio.addEventListener('change', () => {
    if (!ciclo && form.inicio.value) form.fim.value = sugerirCiclo(form.inicio.value).fim;
    conferir();
  });
  form.fim.addEventListener('change', conferir);
  form.nome.addEventListener('input', () => { nomeAutomatico = false; });
  conferir();

  aoEnviar(form, (dados) => {
    const campos = {
      nome: dados.get('nome').trim(),
      inicio: dados.get('inicio'),
      fim: dados.get('fim'),
      limiteFaltas: Math.round(Number(dados.get('limite'))),
    };
    if (!campos.inicio || !campos.fim) throw erroTela('Escolha o início e o fim.');
    if (campos.fim < campos.inicio) throw erroTela('O fim precisa ser depois do início.');
    if (!(campos.limiteFaltas >= 1 && campos.limiteFaltas <= 100)) throw erroTela('Limite de faltas entre 1 e 100.');
    if (!campos.nome) campos.nome = nomeDoCiclo(campos.inicio, campos.fim);
    if (ciclo) gravar(salvarCiclo(ciclo.id, campos), 'Ciclo salvo');
    else if (renovar || !cicloAtivo()) gravar(criarCicloAtivo(campos), 'Ciclo criado');
    else gravar(salvarCiclo(null, { ...campos, ativo: false }), 'Ciclo criado');
    d.close();
  });

  d.querySelector('#tornar-ativo')?.addEventListener('click', async () => {
    d.close();
    if (await confirmar('Tornar ativo?', `O relatório e a tela inicial passam a usar "${esc(ciclo.nome)}".`)) {
      gravar(ativarCiclo(ciclo.id), 'Ciclo ativo trocado');
    }
  });
}
