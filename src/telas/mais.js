// Menu Configurações: dias de aula, ciclos, tutoriais e sair.
import { sair } from '../dados.js';
import { app, esc, confirmar } from '../ui.js';
import { janelaTutoriais } from '../tutorial-passos.js';

export function telaMais({ professor }) {
  app.innerHTML = `
    <h1>Configurações</h1>
    <ul class="lista-toque menu-mais">
      <li><a href="#/dias"><span>Dias de aula</span><small class="suave">dias da semana, extras e cancelados</small></a></li>
      <li><a href="#/ciclos"><span>Ciclos</span><small class="suave">datas, limite de faltas e renovar</small></a></li>
      <li><button type="button" id="ver-tutorial"><span>Tutoriais</span><small class="suave">passo a passo de cada parte do site</small></button></li>
    </ul>
    <section class="cartao">
      <p class="suave">Entrou como <strong>${esc(professor.nome || 'professor')}</strong>.</p>
      <p class="suave pequeno">Em celular dos outros, toque em Sair no fim.</p>
      <button type="button" class="botao secundario" id="sair">Sair</button>
    </section>
    <footer class="rodape-mais">
      <img src="/icone.svg" alt="" width="44" height="44" />
      <strong>Projeto MCC Jiu-jitsu</strong>
      <span>Controle de presença</span>
      <span class="rodape-linha" aria-hidden="true"></span>
      <span class="rodape-autor">Desenvolvido por <b>Enzo Lopes</b></span>
      <small>© ${new Date().getFullYear()}</small>
    </footer>`;
  document.getElementById('ver-tutorial').addEventListener('click', janelaTutoriais);
  document.getElementById('sair').addEventListener('click', async () => {
    if (await confirmar('Sair do site?', 'Para entrar de novo, use o e-mail e a senha.', { sim: 'Sair' })) sair();
  });
}

