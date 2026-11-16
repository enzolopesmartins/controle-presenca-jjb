import { entrar, entrarComGoogle, recuperarSenha } from '../dados.js';
import { app, aoEnviar, erroTela, mensagemErro } from '../ui.js';

const svg = (corpo) => `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
  stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${corpo}</svg>`;
const OLHO_ABERTO = svg('<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>');
// Logo do Google (as cores oficiais do "G")
const G_GOOGLE = `<svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
  <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/>
  <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
  <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
  <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>`;
export const BOTAO_GOOGLE = (texto = 'Entrar com Google') =>
  `<p class="ou"><span>ou</span></p><button type="button" class="botao-google" data-google>${G_GOOGLE} ${texto}</button>`;

// Liga o botão do Google: mostra o erro no mesmo lugar dos erros do formulário
export function ligarGoogle(raiz, acao = entrarComGoogle) {
  const botao = raiz.querySelector('[data-google]');
  const erro = raiz.querySelector('.erro');
  botao.addEventListener('click', async () => {
    botao.disabled = true;
    erro.hidden = true;
    try {
      await acao();
    } catch (e) {
      console.error(e);
      erro.textContent = e.mensagem ?? mensagemErro(e);
      erro.hidden = false;
    }
    if (botao.isConnected) botao.disabled = false;
  });
}
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
      ${BOTAO_GOOGLE()}
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
  ligarGoogle(form.closest('section'));
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
