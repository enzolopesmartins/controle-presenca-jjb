// Menu Mais: dias de aula, ciclos e sair.
import { sair } from '../dados.js';
import { app, esc, confirmar } from '../ui.js';

export function telaMais({ professor }) {
  app.innerHTML = `
    <h1>Mais</h1>
    <ul class="lista-toque menu-mais">
      <li><a href="#/dias"><span>Dias de aula</span><small class="suave">dias da semana, extras e cancelados</small></a></li>
      <li><a href="#/ciclos"><span>Ciclos</span><small class="suave">datas, limite de faltas e renovar</small></a></li>
    </ul>
    <section class="cartao">
      <p class="suave">Entrou como <strong>${esc(professor.nome || 'professor')}</strong>.</p>
      <p class="suave pequeno">Em celular dos outros, toque em Sair no fim.</p>
      <button type="button" class="botao secundario" id="sair">Sair</button>
    </section>
    <p class="assinatura">Desenvolvido por Enzo Lopes</p>`;
  document.getElementById('sair').addEventListener('click', async () => {
    if (await confirmar('Sair do site?', 'Para entrar de novo, use o e-mail e a senha.', { sim: 'Sair' })) sair();
  });
}

