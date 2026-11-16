// Atualização automática: quando sai uma versão nova do site, quem já está com ele
// aberto recebe a nova sozinho, sem precisar fechar e abrir de novo.
// Nunca recarrega no meio de algo sendo digitado: espera trocar de tela ou sair do site.
import { toast } from './ui.js';

/* global __VERSAO__ */
const MINHA_VERSAO = typeof __VERSAO__ === 'undefined' ? '' : __VERSAO__;
const INTERVALO = 2 * 60 * 1000;
let temNova = false;

async function verificar() {
  if (temNova) return;
  try {
    const r = await fetch(`/versao.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!r.ok) return; // no computador de desenvolvimento esse arquivo não existe
    const { versao } = await r.json();
    if (MINHA_VERSAO && versao && versao !== MINHA_VERSAO) {
      temNova = true;
      marcarNovidade();
      tentarAtualizar();
    }
  } catch {
    // sem internet: tenta de novo na próxima
  }
}

// Tem algo digitado e ainda não enviado na tela?
function ocupado() {
  const ativo = document.activeElement;
  if (ativo?.matches?.('input, textarea, select')) return true;
  return [...document.querySelectorAll('main input, main textarea')]
    .some((c) => c.type !== 'checkbox' && c.type !== 'radio' && c.type !== 'search' && c.value !== c.defaultValue);
}

function tentarAtualizar() {
  if (!temNova) return;
  if (document.visibilityState === 'hidden') { location.reload(); return; }
  if (ocupado()) return; // tenta de novo ao trocar de tela ou voltar para o site
  toast('Atualizando o site para a versão nova…');
  setTimeout(() => location.reload(), 1200);
}

// Botão de atualizar no topo: recarrega o site. O pontinho aparece quando tem versão nova.
const botao = () => document.getElementById('atualizar');
function marcarNovidade() {
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
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') verificar();
    else tentarAtualizar();
  });
  window.addEventListener('hashchange', () => { if (temNova) tentarAtualizar(); else verificar(); });
  window.addEventListener('online', verificar);
  setTimeout(verificar, 10 * 1000);
}
