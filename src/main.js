import './style.css';
import {
  aoMudarLogin, lerProfessor, ouvirEstado, pararEstado, prepararPrimeiroUso, aoMudarEstado, sair,
} from './dados.js';
import { app, esc, mensagemErro } from './ui.js';
import { hojeISO, dataLonga } from './datas.js';
import { iniciarAtualizacao } from './atualizacao.js';
import { telaLogin } from './telas/login.js';
import { telaInicio } from './telas/inicio.js';
import {
  telaDia, telaChamada, chamadaComAlteracao,
} from './telas/chamada.js';
import { telaAlunos } from './telas/alunos.js';
import { telaRelatorio } from './telas/relatorio.js';
import { telaMais, telaExportar } from './telas/mais.js';
import { telaDias } from './telas/dias.js';
import { telaCiclos } from './telas/ciclos.js';

const ROTAS = {
  '': telaInicio,
  // #/dia/AAAA-MM-DD = tela do dia; #/chamada/AAAA-MM-DD = lista com P e F
  chamada: telaChamada,
  dia: telaDia,
  alunos: telaAlunos,
  relatorio: telaRelatorio,
  mais: telaMais,
  dias: telaDias,
  ciclos: telaCiclos,
  exportar: telaExportar,
};

// Qual item da barra de baixo fica aceso em cada tela
const ABA = { dia: '', chamada: '', dias: 'mais', ciclos: 'mais', exportar: 'mais' };

const barra = document.getElementById('barra');
const topoData = document.getElementById('topo-data');
let professor = null;
let limpar = null;

function rotaAtual() {
  const [nome = '', ...resto] = location.hash.replace(/^#\/?/, '').split('/');
  return { nome: ROTAS[nome] ? nome : '', params: resto.map(decodeURIComponent) };
}

export function desenhar() {
  if (!professor) return;
  const { nome, params } = rotaAtual();
  topoData.textContent = dataLonga(hojeISO());
  barra.hidden = false;
  barra.querySelectorAll('a').forEach((a) => {
    a.classList.toggle('ativo', a.dataset.aba === (ABA[nome] ?? nome));
  });
  limpar?.();
  limpar = ROTAS[nome]({ params, professor }) ?? null;
}

// Telas que mostram listas se redesenham quando os dados mudam,
// menos quando há algo sendo digitado
let mudouEsperando = false;
function redesenharSeLivre() {
  if (!['alunos', 'ciclos', 'dias', ''].includes(rotaAtual().nome)) return;
  const ativo = document.activeElement;
  if (document.querySelector('dialog[open]') || ativo?.matches?.('#app input, #app select, #app textarea')) {
    mudouEsperando = true;
    return;
  }
  mudouEsperando = false;
  desenhar();
}
aoMudarEstado(redesenharSeLivre);
// Ao fechar uma janela ou sair do campo de busca, mostra o que mudou enquanto isso
window.addEventListener('janela-fechada', () => { if (mudouEsperando) setTimeout(redesenharSeLivre); });
document.addEventListener('focusout', () => { if (mudouEsperando) setTimeout(redesenharSeLivre, 50); });

// Saindo da chamada sem salvar: pergunta antes
let hashAtual = location.hash;
let voltando = false;
window.addEventListener('hashchange', () => {
  if (voltando) { voltando = false; return; }
  if (chamadaComAlteracao() && !window.confirm('A chamada não foi salva. Sair mesmo assim?')) {
    voltando = true;
    location.hash = hashAtual;
    return;
  }
  hashAtual = location.hash;
  window.scrollTo(0, 0);
  desenhar();
});
window.addEventListener('beforeunload', (ev) => {
  if (chamadaComAlteracao()) ev.preventDefault();
});

aoMudarLogin(async (usuario) => {
  limpar?.();
  limpar = null;
  pararEstado();
  professor = null;
  barra.hidden = true;
  topoData.textContent = '';
  if (!usuario) {
    telaLogin();
    return;
  }
  app.innerHTML = '<p class="carregando">Carregando…</p>';
  try {
    professor = await lerProfessor(usuario.uid);
    if (!professor) {
      app.innerHTML = `
        <section class="cartao">
          <h1>Sem acesso</h1>
          <p>A conta <strong>${esc(usuario.email)}</strong> entrou, mas não está liberada como professor.</p>
          <p class="suave">No console do Firebase, crie o documento <code>professores/${esc(usuario.uid)}</code> com o campo <code>nome</code>.</p>
          <button class="botao secundario" id="sair">Sair</button>
        </section>`;
      document.getElementById('sair').onclick = sair;
      return;
    }
    await ouvirEstado();
    await prepararPrimeiroUso().catch((e) => console.error(e));
    desenhar();
  } catch (e) {
    console.error(e);
    app.innerHTML = `<section class="cartao"><h1>Não deu para abrir</h1><p>${esc(mensagemErro(e))}</p>
      <button class="botao" onclick="location.reload()">Tentar de novo</button></section>`;
  }
});

iniciarAtualizacao();
