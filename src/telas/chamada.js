// Chamada em três passos: calendário (na Início) > tela do dia ("Fazer chamada") > lista com P e F.
// Na lista, as marcações só vão para o banco ao tocar em "Salvar chamada".
import {
  estado, ouvirChamada, salvarChamada, salvarExcecao, listarPresencas,
} from '../dados.js';
import { app, esc, toast, confirmar, mensagemErro } from '../ui.js';
import {
  hojeISO, temAula, dataLonga, maiuscula, MESES, DIAS_CURTOS, inicioDoMes, fimDoMes,
  somarMeses, somarDias, diaSemana,
} from '../datas.js';

const STATUS_LISTA = {
  presente: { letra: 'P', texto: 'Presente' },
  falta: { letra: 'F', texto: 'Falta' },
};

// ---------- 1. calendário (fica na tela Início) ----------

let mes = null;

// Desenha o calendário do mês dentro de "el". Tocar num dia abre a tela do dia.
export function montarCalendario(el) {
  const hoje = hojeISO();
  mes ??= inicioDoMes(hoje);
  const { diasPadrao, excecoes } = estado;
  const [ano, m] = mes.split('-').map(Number);
  const fim = fimDoMes(mes);

  el.innerHTML = `
    <div class="mes-nav">
      <button type="button" class="botao icone" data-mes="-1" aria-label="Mês anterior">‹</button>
      <h2>${maiuscula(MESES[m - 1])} de ${ano}</h2>
      <button type="button" class="botao icone" data-mes="1" aria-label="Próximo mês">›</button>
    </div>
    <div class="calendario"></div>
    <div class="legenda">
      <span><i class="aula"></i>Aula</span><span><i class="feita"></i>Chamada feita</span>
      <span><i class="pendente"></i>Sem chamada</span><span><i class="cancelada"></i>Cancelada</span>
    </div>
    <p class="suave pequeno">Toque num dia para fazer a chamada.</p>`;
  const cal = el.querySelector('.calendario');

  const desenhar = (feitas) => {
    const celulas = [];
    for (let i = 0; i < diaSemana(mes); i++) celulas.push('<span></span>');
    for (let d = mes; d <= fim; d = somarDias(d, 1)) {
      const aula = temAula(d, diasPadrao, excecoes);
      let classe = '';
      if (feitas.has(d)) classe = 'feita';
      else if (excecoes[d]?.tipo === 'cancelada') classe = 'cancelada';
      else if (aula && d < hoje) classe = 'pendente';
      else if (aula) classe = 'aula';
      celulas.push(`<button type="button" class="dia ${classe} ${d === hoje ? 'hoje' : ''}" data-dia="${d}"
        aria-label="${dataLonga(d)}">${Number(d.slice(8))}</button>`);
    }
    cal.innerHTML = DIAS_CURTOS.map((d) => `<span class="cab">${d}</span>`).join('') + celulas.join('');
  };
  desenhar(new Set());

  // Marca os dias que já têm chamada salva
  listarPresencas(mes, fim).then((lista) => {
    if (cal.isConnected) {
      desenhar(new Set(lista.filter((p) => Object.keys(p.registros || {}).length).map((p) => p.data)));
    }
  }).catch((e) => console.error(e));

  el.querySelectorAll('[data-mes]').forEach((b) => {
    b.onclick = () => { mes = somarMeses(mes, Number(b.dataset.mes)); montarCalendario(el); };
  });
  cal.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-dia]');
    if (b) location.hash = `#/dia/${b.dataset.dia}`;
  });
}

// ---------- 2. tela do dia ----------

const dataValida = (t) => (/^\d{4}-\d{2}-\d{2}$/.test(t ?? '') ? t : hojeISO());

export function telaDia({ params }) {
  const data = dataValida(params[0]);
  mes = inicioDoMes(data);
  const { diasPadrao, excecoes } = estado;
  const exc = excecoes[data];
  const situacao = exc?.tipo === 'cancelada'
    ? `Aula cancelada${exc.motivo ? `: ${esc(exc.motivo)}` : ''}.`
    : exc?.tipo === 'extra' ? 'Dia extra de aula.'
      : temAula(data, diasPadrao, excecoes) ? 'Dia de aula.' : 'Não é dia de aula normal.';

  app.innerHTML = `
    <a href="#/" class="voltar">‹ Início</a>
    <h1>${maiuscula(dataLonga(data, { ano: true }))}</h1>
    <section class="cartao destaque-hoje">
      <p class="suave">${situacao}</p>
      <div id="resumo-dia"><p class="suave">Carregando…</p></div>
      <a class="botao grande" id="fazer" href="#/chamada/${data}">Fazer chamada</a>
    </section>`;

  return ouvirChamada(data, ({ registros }) => {
    const valores = Object.values(registros);
    const p = valores.filter((s) => s === 'presente').length;
    const f = valores.filter((s) => s === 'falta').length;
    const j = valores.filter((s) => s === 'justificada').length;
    const resumo = document.getElementById('resumo-dia');
    if (!resumo) return;
    resumo.innerHTML = valores.length
      ? `<p class="resumo-chamada"><span class="n-presente"><strong>${p}</strong> presentes</span>
         <span class="n-falta"><strong>${f}</strong> faltas</span>
         ${j ? `<span class="n-justificada"><strong>${j}</strong> justificadas</span>` : ''}</p>`
      : '<p>A chamada desse dia ainda não foi feita.</p>';
    document.getElementById('fazer').textContent = valores.length ? 'Ver ou corrigir a chamada' : 'Fazer chamada';
  });
}

// ---------- 3. lista da chamada ----------

let alterado = false;
export const chamadaComAlteracao = () => alterado;

// Quem aparece: ativos que já tinham entrado e quem saiu depois dessa data ou tem marcação nela
function alunosDoDia(data, registros) {
  return estado.alunos.filter((a) => registros[a.id] ||
    ((a.entrada || '') <= data && (a.ativo || (a.saidaEm && a.saidaEm >= data))));
}

export function telaChamada({ params }) {
  const data = dataValida(params[0]);
  let registros = {};
  let salvos = {};
  alterado = false;

  app.innerHTML = `
    <a href="#/dia/${data}" class="voltar">‹ Voltar</a>
    <div class="chamada-topo">
      <h1>${maiuscula(dataLonga(data))}</h1>
      <div class="contador" id="contador" aria-live="polite"></div>
    </div>
    <div id="lista"><p class="carregando">Carregando…</p></div>
    <div class="acoes-chamada">
      <button type="button" class="botao perigo-contorno" id="limpar">Limpar dados</button>
      <button type="button" class="botao" id="salvar">Salvar chamada</button>
    </div>`;

  const lista = document.getElementById('lista');

  function desenharLista() {
    const alunos = alunosDoDia(data, registros);
    if (!alunos.length) {
      lista.innerHTML = '<section class="cartao"><p>Nenhum aluno cadastrado ainda.</p><a class="botao" href="#/alunos">Cadastrar alunos</a></section>';
    } else {
      lista.innerHTML = `<ul class="chamada">${alunos.map(linhaAluno).join('')}</ul>`;
    }
    atualizarContador();
  }

  function linhaAluno(a) {
    const s = registros[a.id];
    return `
      <li class="aluno-chamada ${s ? `marcado-${s}` : ''}" data-aluno="${a.id}">
        <span class="nome">${esc(a.nome)}${s === 'justificada' ? ' <small class="suave">(justificada)</small>' : ''}${a.ativo ? '' : ' <small class="suave">(retirado)</small>'}</span>
        <div class="dois-botoes">${Object.entries(STATUS_LISTA).map(([chave, info]) => `
          <button type="button" class="st st-${chave} ${s === chave ? 'escolhido' : ''}" data-status="${chave}"
            aria-pressed="${s === chave}" aria-label="${info.texto}: ${esc(a.nome)}">${info.letra}</button>`).join('')}
        </div>
      </li>`;
  }

  function atualizarContador() {
    const alunos = alunosDoDia(data, registros);
    const p = alunos.filter((a) => registros[a.id] === 'presente').length;
    const f = alunos.filter((a) => registros[a.id] === 'falta').length;
    const faltam = alunos.filter((a) => !registros[a.id]).length;
    document.getElementById('contador').innerHTML = `
      <span class="n-presente"><strong>${p}</strong> presentes</span>
      <span class="n-falta"><strong>${f}</strong> faltas</span>
      ${faltam ? `<span class="n-falta-marcar"><strong>${faltam}</strong> sem marcar</span>` : ''}
      ${alterado ? '<span class="nao-salvo">não salvo</span>' : ''}`;
  }

  // Um toque marca; tocar de novo no mesmo botão desmarca
  lista.addEventListener('click', (ev) => {
    const botao = ev.target.closest('[data-status]');
    if (!botao) return;
    const li = botao.closest('[data-aluno]');
    const id = li.dataset.aluno;
    const novo = registros[id] === botao.dataset.status ? null : botao.dataset.status;
    if (novo) registros[id] = novo;
    else delete registros[id];
    alterado = true;
    li.outerHTML = linhaAluno(estado.alunos.find((a) => a.id === id));
    if (navigator.vibrate) navigator.vibrate(15);
    atualizarContador();
  });

  document.getElementById('salvar').addEventListener('click', async () => {
    const alunos = alunosDoDia(data, registros);
    const faltam = alunos.filter((a) => !registros[a.id]).length;
    if (faltam && !await confirmar('Salvar mesmo assim?',
      `${faltam} ${faltam === 1 ? 'aluno ficou' : 'alunos ficaram'} sem marcar. Quem não tem P nem F não conta presença nem falta.`,
      { sim: 'Salvar chamada' })) return;
    gravarChamada(registros, navigator.onLine
      ? 'Chamada salva com sucesso!'
      : 'Chamada guardada no celular. Envia sozinha quando a internet voltar.');
    location.hash = `#/dia/${data}`;
  });

  document.getElementById('limpar').addEventListener('click', async () => {
    const tinhaSalvo = Object.keys(salvos).length > 0;
    if (!await confirmar('Limpar dados da chamada?',
      tinhaSalvo ? 'Todas as marcações desse dia vão ser apagadas.' : 'As marcações da tela vão ser apagadas.',
      { sim: 'Limpar', perigo: true })) return;
    registros = {};
    if (tinhaSalvo) gravarChamada({}, 'Dados da chamada apagados');
    else alterado = false;
    desenharLista();
  });

  function gravarChamada(novos, aviso) {
    // Dia fora do padrão com chamada vira dia extra (para os avisos e o calendário)
    if (Object.keys(novos).length && !temAula(data, estado.diasPadrao, estado.excecoes)) {
      salvarExcecao(data, 'extra').catch((e) => console.error(e));
    }
    salvos = { ...novos };
    alterado = false;
    toast(aviso, 'ok');
    salvarChamada(data, novos).catch((e) => {
      console.error(e);
      toast(mensagemErro(e), 'erro');
    });
  }

  // Carrega o que já foi salvo; depois disso, só atualiza se não houver mudança na tela
  const parar = ouvirChamada(data, ({ registros: r }) => {
    salvos = { ...r };
    if (alterado) return;
    registros = { ...r };
    desenharLista();
  });

  return () => { parar(); alterado = false; };
}
