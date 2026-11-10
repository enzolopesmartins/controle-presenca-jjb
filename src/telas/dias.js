// Dias de aula: dias padrão da semana, dias extras e cancelados, com calendário do mês.
import { estado, salvarDiasPadrao, salvarExcecao, removerExcecao } from '../dados.js';
import { app, esc, gravar, janela } from '../ui.js';
import {
  DIAS, DIAS_CURTOS, MESES, hojeISO, inicioDoMes, fimDoMes, somarMeses, somarDias, diaSemana,
  temAula, dataLonga, dataCurta, maiuscula,
} from '../datas.js';

let mes = null;

export function telaDias() {
  const hoje = hojeISO();
  mes ??= inicioDoMes(hoje);
  const { diasPadrao, excecoes } = estado;
  const [ano, m] = mes.split('-').map(Number);

  // Calendário: começa no domingo da primeira semana
  const celulas = [];
  for (let i = 0; i < diaSemana(mes); i++) celulas.push('<span></span>');
  for (let d = mes; d <= fimDoMes(mes); d = somarDias(d, 1)) {
    const exc = excecoes[d]?.tipo;
    const aula = temAula(d, diasPadrao, excecoes);
    const classe = exc === 'extra' ? 'extra' : exc === 'cancelada' ? 'cancelada' : aula ? 'aula' : '';
    celulas.push(`<button type="button" class="dia ${classe} ${d === hoje ? 'hoje' : ''}" data-dia="${d}"
      aria-label="${dataLonga(d)}${classe ? `: ${{ aula: 'aula', extra: 'dia extra', cancelada: 'cancelada' }[classe]}` : ''}">${Number(d.slice(8))}</button>`);
  }

  const doMes = Object.values(excecoes).filter((e) => e.data >= mes && e.data <= fimDoMes(mes))
    .sort((a, b) => a.data.localeCompare(b.data));

  app.innerHTML = `
    <a href="#/mais" class="voltar">‹ Mais</a>
    <h1>Dias de aula</h1>

    <section class="cartao">
      <h2>Dias da semana com aula</h2>
      <div class="semana">${DIAS.map((nome, i) => `
        <label class="dia-semana"><input type="checkbox" value="${i}" ${diasPadrao.includes(i) ? 'checked' : ''} />
        <span>${DIAS_CURTOS[i]}</span></label>`).join('')}
      </div>
      <p class="suave pequeno">Padrão: segunda e sábado.</p>
    </section>

    <section class="cartao">
      <div class="mes-nav">
        <button type="button" class="botao icone" id="mes-antes" aria-label="Mês anterior">‹</button>
        <h2>${maiuscula(MESES[m - 1])} de ${ano}</h2>
        <button type="button" class="botao icone" id="mes-depois" aria-label="Próximo mês">›</button>
      </div>
      <div class="calendario">
        ${DIAS_CURTOS.map((d) => `<span class="cab">${d}</span>`).join('')}
        ${celulas.join('')}
      </div>
      <div class="legenda">
        <span><i class="aula"></i>Aula</span><span><i class="extra"></i>Extra</span><span><i class="cancelada"></i>Cancelada</span>
      </div>
      <p class="suave pequeno">Toque num dia para acrescentar uma aula extra ou cancelar a aula.</p>
      ${doMes.length ? `<ul class="lista-simples">${doMes.map((e) => `
        <li><span>${dataCurta(e.data, { ano: false })} · ${e.tipo === 'extra' ? 'Extra' : 'Cancelada'}</span>
        <small class="suave">${esc(e.motivo ?? '')}</small></li>`).join('')}</ul>` : ''}
    </section>`;

  app.querySelectorAll('.semana input').forEach((c) => c.addEventListener('change', () => {
    const marcados = [...app.querySelectorAll('.semana input:checked')].map((x) => Number(x.value));
    gravar(salvarDiasPadrao(marcados), 'Dias de aula salvos');
  }));
  document.getElementById('mes-antes').onclick = () => { mes = somarMeses(mes, -1); telaDias(); };
  document.getElementById('mes-depois').onclick = () => { mes = somarMeses(mes, 1); telaDias(); };
  app.querySelectorAll('[data-dia]').forEach((b) => b.addEventListener('click', () => janelaDia(b.dataset.dia)));
}

function janelaDia(data) {
  const { diasPadrao, excecoes } = estado;
  const exc = excecoes[data];
  const padrao = diasPadrao.includes(diaSemana(data));
  let acao;
  if (exc) {
    acao = `<p>${exc.tipo === 'extra' ? 'Dia extra' : 'Aula cancelada'}${exc.motivo ? `: ${esc(exc.motivo)}` : ''}.</p>
      <button type="button" class="botao largo" data-acao="desfazer">${exc.tipo === 'extra' ? 'Tirar o dia extra' : 'Desfazer o cancelamento'}</button>`;
  } else {
    acao = `<p>${padrao ? 'Dia normal de aula.' : 'Não é dia de aula.'}</p>
      <label>Motivo (opcional) <input name="motivo" maxlength="200" placeholder="${padrao ? 'Ex.: feriado' : 'Ex.: aula de reposição'}" /></label>
      <button type="button" class="botao largo ${padrao ? 'perigo' : ''}" data-acao="${padrao ? 'cancelada' : 'extra'}">
        ${padrao ? 'Cancelar a aula desse dia' : 'Acrescentar aula extra'}</button>`;
  }
  const d = janela(`<h2>${dataLonga(data, { ano: true })}</h2>${acao}
    <div class="botoes"><button type="button" class="botao secundario" data-fechar>Voltar</button></div>`);
  d.querySelector('[data-acao]').addEventListener('click', (ev) => {
    const tipo = ev.target.dataset.acao;
    if (tipo === 'desfazer') gravar(removerExcecao(data), 'Pronto');
    else gravar(salvarExcecao(data, tipo, d.querySelector('[name=motivo]')?.value.trim()),
      tipo === 'extra' ? 'Aula extra acrescentada' : 'Aula cancelada');
    d.close();
  });
}
