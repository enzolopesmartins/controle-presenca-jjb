// Botão de atualizar no topo: tocar recarrega o site.
// De tempos em tempos o site confere se saiu versão nova; se saiu, acende um pontinho no botão.
// O site nunca recarrega sozinho: quem atualiza é o professor, tocando no botão.

/* global __VERSAO__ */
const MINHA_VERSAO = typeof __VERSAO__ === 'undefined' ? '' : __VERSAO__;
const INTERVALO = 2 * 60 * 1000;
const botao = () => document.getElementById('atualizar');
let temNova = false;

async function verificar() {
  if (temNova) return;
  try {
    const r = await fetch(`/versao.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!r.ok) return; // no computador de desenvolvimento esse arquivo não existe
    const { versao } = await r.json();
    if (MINHA_VERSAO && versao && versao !== MINHA_VERSAO) marcarNovidade();
  } catch {
    // sem internet: tenta de novo na próxima
  }
}

function marcarNovidade() {
  temNova = true;
  const b = botao();
  if (!b) return;
  b.querySelector('.ponto-novo').hidden = false;
  b.classList.add('tem-novidade');
  b.setAttribute('aria-label', 'Tem versão nova do site: toque para atualizar');
}

export function iniciarAtualizacao() {
  botao()?.addEventListener('click', () => {
    botao().classList.add('girando');
    location.reload();
  });
  setInterval(verificar, INTERVALO);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') verificar(); });
  window.addEventListener('online', verificar);
  setTimeout(verificar, 10 * 1000);
}
