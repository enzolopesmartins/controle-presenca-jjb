import { entrar, recuperarSenha } from '../dados.js';
import { app, aoEnviar, erroTela, mensagemErro } from '../ui.js';

const svg = (corpo) => `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
  stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${corpo}</svg>`;
const OLHO_ABERTO = svg('<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>');
const OLHO_FECHADO = svg('<path d="M3 3l18 18"/><path d="M10.6 5.1A10.4 10.4 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.2M6.6 6.6A17 17 0 0 0 2 12s3.5 7 10 7a10 10 0 0 0 5.4-1.6"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>');

export function telaLogin() {
  app.innerHTML = `
    <section class="cartao login">
      <h1>Entrar</h1>
      <p class="suave">Controle de presença das aulas de jiu-jitsu.</p>
      <form id="form-login" novalidate>
        <label>E-mail <input name="email" type="email" autocomplete="username" required /></label>
        <label class="campo-senha">Senha <input name="senha" type="password" autocomplete="current-password" required />
          <button type="button" class="olho" id="olho" aria-label="Mostrar senha" aria-pressed="false">${OLHO_ABERTO}</button></label>
        <p class="erro" hidden></p>
        <button type="submit" class="botao grande">Entrar</button>
      </form>
      <button type="button" class="link" id="esqueci">Esqueci a senha</button>
      <p class="aviso-ok" id="enviado" hidden></p>
    </section>`;

  const form = document.getElementById('form-login');
  const olho = document.getElementById('olho');
  olho.addEventListener('click', () => {
    const mostrar = form.senha.type === 'password';
    form.senha.type = mostrar ? 'text' : 'password';
    olho.innerHTML = mostrar ? OLHO_FECHADO : OLHO_ABERTO;
    olho.setAttribute('aria-label', mostrar ? 'Esconder senha' : 'Mostrar senha');
    olho.setAttribute('aria-pressed', String(mostrar));
    form.senha.focus();
  });
  aoEnviar(form, async (dados) => {
    await entrar(dados.get('email'), dados.get('senha'));
  });

  document.getElementById('esqueci').addEventListener('click', async () => {
    const email = form.email.value.trim();
    const erro = form.querySelector('.erro');
    const enviado = document.getElementById('enviado');
    erro.hidden = true;
    enviado.hidden = true;
    try {
      if (!email) throw erroTela('Digite o e-mail acima e toque de novo em "Esqueci a senha".');
      await recuperarSenha(email);
      enviado.textContent = `Se ${email} tiver acesso, chega um e-mail com o link para criar uma senha nova.`;
      enviado.hidden = false;
    } catch (e) {
      erro.textContent = e.mensagem ?? mensagemErro(e);
      erro.hidden = false;
    }
  });
}
