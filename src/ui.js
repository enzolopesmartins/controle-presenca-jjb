// Utilidades de tela: texto seguro, avisos e janelas.

export const app = document.getElementById('app');

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[c]);

export const pct = (n) => (n == null ? '—' : `${Math.round(n * 100)}%`);

export const STATUS = {
  presente: { texto: 'Presente', letra: 'P', plural: 'presentes' },
  falta: { texto: 'Falta', letra: 'F', plural: 'faltas' },
  justificada: { texto: 'Justificada', letra: 'J', plural: 'justificadas' },
};

const MENSAGENS_ERRO = {
  'auth/invalid-credential': 'E-mail ou senha incorretos.',
  'auth/user-not-found': 'E-mail ou senha incorretos.',
  'auth/wrong-password': 'E-mail ou senha incorretos.',
  'auth/invalid-login-credentials': 'E-mail ou senha incorretos.',
  'auth/invalid-email': 'E-mail inválido.',
  'auth/missing-password': 'Digite a senha.',
  'auth/too-many-requests': 'Muitas tentativas. Espere um pouco e tente de novo.',
  'auth/network-request-failed': 'Sem conexão. Confira a internet.',
  'auth/user-disabled': 'Essa conta foi desativada.',
  'permission-denied': 'Sem permissão. Saia e entre de novo.',
  unavailable: 'Sem conexão. Confira a internet e tente de novo.',
};
export const mensagemErro = (e) => MENSAGENS_ERRO[e?.code] ?? 'Algo deu errado. Tente de novo.';

// Aviso rápido embaixo da tela
let tempoToast;
export function toast(texto, tipo = '') {
  let el = document.getElementById('toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    el.setAttribute('role', 'status');
    document.body.append(el);
  }
  el.textContent = texto;
  el.className = `toast visivel ${tipo}`;
  clearTimeout(tempoToast);
  tempoToast = setTimeout(() => { el.className = 'toast'; }, 3500);
}

// Gravação sem esperar a internet: se o banco recusar, avisa
export function gravar(promessa, ok) {
  if (ok) toast(ok, 'ok');
  promessa.catch((e) => {
    console.error(e);
    toast(mensagemErro(e), 'erro');
  });
}

// Janela por cima da tela (fica fora do #app, então sobrevive quando a tela se redesenha)
// Não depende do evento "close" (alguns navegadores demoram a disparar).
export function janela(html, { aoFechar } = {}) {
  const d = document.createElement('dialog');
  d.className = 'janela';
  d.innerHTML = `<div class="janela-corpo">${html}</div>`;
  document.body.append(d);
  d.close = () => {
    if (!d.isConnected) return;
    if (d.open) HTMLDialogElement.prototype.close.call(d);
    d.remove();
    aoFechar?.();
    window.dispatchEvent(new Event('janela-fechada'));
  };
  d.addEventListener('close', () => d.close()); // tecla Esc
  d.addEventListener('click', (ev) => {
    if (ev.target === d || ev.target.closest('[data-fechar]')) d.close();
  });
  d.showModal();
  // Abre sempre no topo (o navegador rola até o primeiro botão)
  requestAnimationFrame(() => { d.scrollTop = 0; });
  d.scrollTop = 0;
  return d;
}

// Pergunta sim/não. Devolve true se confirmou.
export function confirmar(titulo, texto, { sim = 'Confirmar', perigo = false } = {}) {
  return new Promise((resolve) => {
    let resposta = false;
    const d = janela(`
      <h2>${esc(titulo)}</h2>
      ${texto ? `<p>${texto}</p>` : ''}
      <div class="botoes">
        <button type="button" class="botao secundario" data-fechar>Voltar</button>
        <button type="button" class="botao ${perigo ? 'perigo' : ''}" data-sim>${esc(sim)}</button>
      </div>`, { aoFechar: () => resolve(resposta) });
    d.querySelector('[data-sim]').addEventListener('click', () => { resposta = true; d.close(); });
  });
}

// Formulário: trava o botão, chama a ação e mostra o erro
export function aoEnviar(form, acao) {
  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const botao = form.querySelector('button[type=submit]');
    const erro = form.querySelector('.erro');
    if (botao) botao.disabled = true;
    if (erro) erro.hidden = true;
    try {
      await acao(new FormData(form), form);
    } catch (e) {
      console.error(e);
      if (erro) {
        erro.textContent = e.mensagem ?? mensagemErro(e);
        erro.hidden = false;
      }
    }
    if (botao?.isConnected) botao.disabled = false;
  });
}

export const erroTela = (mensagem) => Object.assign(new Error(mensagem), { mensagem });

// Botões de escolha (aba, ordem...). Devolve o HTML.
export function chips(opcoes, atual, nome) {
  return `<div class="chips" role="group">${opcoes.map(([valor, texto]) => `
    <button type="button" class="chip ${valor === atual ? 'ativo' : ''}" data-${nome}="${esc(valor)}"
      aria-pressed="${valor === atual}">${esc(texto)}</button>`).join('')}</div>`;
}
