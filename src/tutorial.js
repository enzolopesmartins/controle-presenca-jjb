// Tutorial guiado (mesmo arquivo nos dois sites). A tela toda fica escura e embaçada,
// menos o que está sendo explicado. Os passos ficam em tutorial-passos.js.
//
// Passo: { titulo, texto, rota?, alvo? (seletor), clique?: 'texto pedindo o toque',
//          janela?: 'dica mostrada dentro da janela que o toque abre' }
// Todo tutorial pode ser pulado ("Pular tutorial").
// - Sem alvo: cartão no meio da tela.
// - Com "clique": não tem "Próximo"; o passo anda quando a pessoa toca no destaque
//   (e, se tiver "janela", quando a janela que abriu for fechada).

// Em que passo parou (para continuar se recarregar a página), um para cada tutorial
const guardado = (nome) => `tutorial-passo-${nome}`;
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
const escapar = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

let ativo = null;

export const tutorialAberto = () => Boolean(ativo);

export function iniciarTutorial(passos, { nome = 'geral', aoTerminar } = {}) {
  if (ativo || !passos.length) return;
  const GUARDADO = guardado(nome);
  let i = 0;
  try { i = Math.min(Number(localStorage.getItem(GUARDADO)) || 0, passos.length - 1); } catch { /* sem armazenamento */ }

  const veu = document.createElement('div');
  veu.className = 'tut-veu';
  const anel = document.createElement('div');
  anel.className = 'tut-anel';
  const cartao = document.createElement('div');
  cartao.className = 'tut-cartao';
  cartao.setAttribute('role', 'dialog');
  cartao.setAttribute('aria-live', 'polite');
  document.body.append(veu, anel, cartao);
  document.documentElement.classList.add('em-tutorial');

  let alvo = null;
  let pararClique = null;
  let quadro = 0;

  // Furo no véu em volta do alvo (o resto fica escuro e embaçado, e não recebe toques)
  function posicionar() {
    cancelAnimationFrame(quadro);
    quadro = requestAnimationFrame(() => {
      const L = innerWidth;
      const A = innerHeight;
      // A tela pode ter sido redesenhada (dados novos): procura o destaque de novo
      if (alvo && !alvo.isConnected) alvo = document.querySelector(passos[i].alvo);
      if (!alvo || !alvo.isConnected) {
        veu.style.clipPath = 'none';
        anel.hidden = true;
        cartao.classList.add('tut-meio');
        cartao.style.top = '';
        return;
      }
      const r = alvo.getBoundingClientRect();
      const f = 6; // folga em volta do destaque
      const x = Math.max(r.left - f, 2);
      const y = Math.max(r.top - f, 2);
      const w = Math.min(r.right + f, L - 2) - x;
      const h = Math.min(r.bottom + f, A - 2) - y;
      veu.style.clipPath = `path(evenodd, 'M0 0H${L}V${A}H0Z M${x} ${y}H${x + w}V${y + h}H${x}Z')`;
      Object.assign(anel.style, { left: `${x}px`, top: `${y}px`, width: `${w}px`, height: `${h}px` });
      anel.hidden = false;
      // Cartão embaixo do destaque; se não couber, em cima; se não couber, no pé da tela
      cartao.classList.remove('tut-meio');
      const alturaCartao = cartao.offsetHeight;
      let topo = y + h + 12;
      if (topo + alturaCartao > A - 8) topo = y - alturaCartao - 12;
      if (topo < 8) topo = A - alturaCartao - 8;
      cartao.style.top = `${Math.round(topo)}px`;
    });
  }

  async function achar(seletor) {
    for (let t = 0; t < 30; t++) { // até 3 segundos, esperando a tela desenhar
      const el = seletor && document.querySelector(seletor);
      if (el && el.getClientRects().length) return el;
      await esperar(100);
    }
    return null;
  }

  async function mostrar() {
    const passo = passos[i];
    try { localStorage.setItem(GUARDADO, String(i)); } catch { /* sem armazenamento */ }
    pararClique?.();
    pararClique = null;
    veu.hidden = false;
    cartao.hidden = false;
    if (passo.rota !== undefined && location.hash !== passo.rota && !(passo.rota === '#/' && location.hash === '')) {
      location.hash = passo.rota;
      await esperar(150);
    }
    alvo = passo.alvo ? await achar(passo.alvo) : null;
    if (ativo?.i !== i) return; // a pessoa já andou para outro passo enquanto esperava
    if (alvo) {
      alvo.scrollIntoView({ block: 'center', behavior: 'instant' });
      await esperar(60);
    }
    const ultimo = i === passos.length - 1;
    const pedeToque = alvo && passo.clique;
    cartao.innerHTML = `
      <p class="tut-contador">Passo ${i + 1} de ${passos.length}</p>
      <h2>${escapar(passo.titulo)}</h2>
      <p>${escapar(passo.texto)}</p>
      ${pedeToque ? `<p class="tut-toque">👆 ${escapar(passo.clique)}</p>` : ''}
      <div class="tut-botoes">
        ${i > 0 ? '<button type="button" class="botao secundario" data-tut="voltar">Voltar</button>' : '<span></span>'}
        ${pedeToque ? '' : `<button type="button" class="botao" data-tut="proximo">${ultimo ? 'Concluir' : i === 0 ? 'Vamos lá' : 'Próximo'}</button>`}
      </div>
      ${ultimo ? '' : '<button type="button" class="tut-pular" data-tut="pular">Pular tutorial</button>'}`;
    posicionar();
    cartao.querySelector('[data-tut="proximo"]')?.focus({ preventScroll: true });

    if (pedeToque) {
      // Escuta na página toda: se a tela for redesenhada, o botão novo também vale
      const aoTocar = (ev) => {
        if (!ev.target.closest?.(passo.alvo)) return;
        pararClique?.();
        pararClique = null;
        veu.hidden = true;
        anel.hidden = true;
        cartao.hidden = true;
        if (passo.janela) esperarJanela(passo.janela);
        else setTimeout(() => ir(1), 400);
      };
      document.addEventListener('click', aoTocar, true);
      pararClique = () => document.removeEventListener('click', aoTocar, true);
    }
  }

  // O toque abriu uma janela (cadastro etc.): mostra a dica dentro dela e espera fechar
  async function esperarJanela(dica) {
    let d = null;
    for (let t = 0; t < 30 && !d; t++) {
      d = document.querySelector('dialog.janela[open]');
      if (!d) await esperar(100);
    }
    if (!d) { ir(1); return; }
    const caixa = document.createElement('p');
    caixa.className = 'tut-dica';
    caixa.innerHTML = `<b>Passo ${i + 1} de ${passos.length}</b> ${escapar(dica)}
      <button type="button" class="tut-pular">Pular tutorial</button>`;
    (d.querySelector('.janela-corpo') ?? d).prepend(caixa);
    let pulou = false;
    caixa.querySelector('.tut-pular').addEventListener('click', () => { pulou = true; d.close(); });
    window.addEventListener('janela-fechada', () => setTimeout(() => (pulou ? terminar() : ir(1)), 300), { once: true });
  }

  function ir(direcao) {
    const novo = i + direcao;
    if (novo >= passos.length) { terminar(); return; }
    i = Math.max(novo, 0);
    ativo.i = i;
    mostrar();
  }

  function terminar() {
    pararClique?.();
    removeEventListener('resize', posicionar);
    removeEventListener('scroll', posicionar, true);
    veu.remove();
    anel.remove();
    cartao.remove();
    document.documentElement.classList.remove('em-tutorial');
    try { localStorage.removeItem(GUARDADO); } catch { /* sem armazenamento */ }
    ativo = null;
    location.hash = '#/';
    aoTerminar?.();
  }

  cartao.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-tut]');
    if (!b) return;
    if (b.dataset.tut === 'pular') terminar();
    else ir(b.dataset.tut === 'voltar' ? -1 : 1);
  });
  addEventListener('resize', posicionar);
  addEventListener('scroll', posicionar, true);

  ativo = { i };
  mostrar();
}
