import { entrar, recuperarSenha } from '../dados.js';
import { app, aoEnviar, erroTela, mensagemErro } from '../ui.js';

export function telaLogin() {
  app.innerHTML = `
    <section class="cartao login">
      <h1>Entrar</h1>
      <p class="suave">Controle de presença das aulas de jiu-jitsu.</p>
      <form id="form-login" novalidate>
        <label>E-mail <input name="email" type="email" autocomplete="username" required /></label>
        <label>Senha <input name="senha" type="password" autocomplete="current-password" required /></label>
        <p class="erro" hidden></p>
        <button type="submit" class="botao grande">Entrar</button>
      </form>
      <button type="button" class="link" id="esqueci">Esqueci a senha</button>
      <p class="aviso-ok" id="enviado" hidden></p>
    </section>`;

  const form = document.getElementById('form-login');
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
