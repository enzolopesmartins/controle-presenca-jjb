// Tutoriais do Projeto MCC: o completo (obrigatório na primeira vez) e um por assunto,
// listados no botão "?" ao lado do sininho da Início.
import { iniciarTutorial } from './tutorial.js';
import { marcarTutorialFeito } from './dados.js';
import { janela } from './ui.js';

// Cada passo diz de qual assunto é ("tema"); o tutorial completo passa por todos, na ordem
const PASSOS = [
  {
    tema: 'boas-vindas',
    titulo: 'Bem-vindo ao controle de presença!',
    texto: 'Vamos passar por tudo o que o site faz, em poucos minutos. No caminho você já cadastra um aluno.',
    rota: '#/',
  },
  {
    tema: 'inicio', rota: '#/', alvo: '#sino',
    titulo: 'Avisos de faltas',
    texto: 'O sininho mostra quem está perto do limite de faltas do ciclo e quem já passou dele.',
  },
  {
    tema: 'inicio', rota: '#/', alvo: '#ajuda',
    titulo: 'Tutoriais',
    texto: 'Neste botão ficam todos os tutoriais, um para cada parte do site. Abra quando tiver dúvida.',
  },
  {
    tema: 'inicio', rota: '#/', alvo: '#calendario-inicio',
    titulo: 'Calendário das aulas',
    texto: 'Verde: chamada feita. Amarelo: aula que ficou sem chamada. Vermelho: aula cancelada. Tocando num dia, você faz a chamada ou cancela as aulas.',
  },
  {
    tema: 'aulas', rota: '#/dias', alvo: '.semana',
    titulo: 'Dias de aula',
    texto: 'Marque os dias da semana que têm aula. No calendário logo abaixo dá para cancelar um dia (feriado) ou acrescentar uma aula extra.',
  },
  {
    tema: 'aulas', rota: '#/ciclos', alvo: '.ciclo-ativo, #criar',
    titulo: 'Ciclo (trimestre)',
    texto: 'O ciclo tem as datas de início e fim e o limite de faltas. As faltas do sininho e do relatório contam dentro do ciclo ativo.',
  },
  {
    tema: 'alunos', rota: '#/alunos', alvo: '#novo',
    titulo: 'Cadastre um aluno',
    texto: 'Cadastre os alunos do projeto: nome, faixa e uma observação, se precisar.',
    clique: 'Toque em "Novo aluno".',
    janela: 'Preencha os dados do aluno e toque em "Cadastrar".',
  },
  {
    tema: 'alunos', rota: '#/alunos', alvo: '#lista-alunos .linha-aluno',
    titulo: 'Lista de alunos',
    texto: 'Tocando no nome, você edita os dados ou retira do projeto. Tocando na faixa, você dá grau ou troca a faixa.',
  },
  {
    tema: 'alunos', rota: '#/alunos', alvo: '#sino-graduacao',
    titulo: 'Graduação',
    texto: 'Este sininho avisa quem já tem aulas para o próximo grau ou para trocar de faixa.',
  },
  {
    tema: 'chamada', rota: '#/', alvo: '#chamada-hoje, #calendario-inicio',
    titulo: 'Faça a chamada',
    texto: 'No dia da aula, toque em "Chamada de hoje" (ou no dia, no calendário) e depois em "Fazer chamada". Todos começam com falta: marque P em quem veio e toque em "Salvar chamada".',
  },
  {
    tema: 'relatorio', rota: '#/relatorio', alvo: '.filtros',
    titulo: 'Relatório',
    texto: 'Escolha o período para ver as presenças e faltas de cada aluno. Dá para mandar em PDF pelo WhatsApp.',
  },
  {
    tema: 'configuracoes', rota: '#/mais', alvo: '.menu-mais',
    titulo: 'Configurações',
    texto: 'Dias de aula, ciclos e o botão de sair.',
  },
  {
    tema: 'fim', rota: '#/',
    titulo: 'Tudo pronto!',
    texto: 'Agora é só usar. Os tutoriais ficam no botão "?" ao lado do sininho. Bom treino!',
  },
];

// Os da lista do botão "?"
const TEMAS = [
  { id: 'completo', nome: 'Tutorial completo', desc: 'Tudo o que o site faz, na ordem' },
  { id: 'inicio', nome: 'Tela inicial', desc: 'Avisos, tutoriais e calendário' },
  { id: 'aulas', nome: 'Dias de aula e ciclos', desc: 'Quando tem aula e o limite de faltas' },
  { id: 'alunos', nome: 'Alunos', desc: 'Cadastrar, editar e graduação' },
  { id: 'chamada', nome: 'Chamada', desc: 'Marcar presença e falta' },
  { id: 'relatorio', nome: 'Relatório', desc: 'Presenças, faltas e PDF' },
  { id: 'configuracoes', nome: 'Configurações', desc: 'Dias de aula, ciclos e sair' },
];

// Abre um tutorial. Sem tema: o completo (que, ao terminar ou pular, não aparece mais sozinho)
export function abrirTutorial(tema = 'completo') {
  const completo = tema === 'completo';
  iniciarTutorial(completo ? PASSOS : PASSOS.filter((p) => p.tema === tema), {
    nome: tema,
    aoTerminar: completo ? () => marcarTutorialFeito().catch((e) => console.error(e)) : null,
  });
}

// Lista de tutoriais (botão "?" ao lado do sininho)
export function janelaTutoriais() {
  const d = janela(`
    <h2>Tutoriais</h2>
    <p class="suave">Escolha o que quer aprender. O site leva você passo a passo.</p>
    <ul class="lista-tutoriais">${TEMAS.map((t) => `
      <li><button type="button" data-tema="${t.id}"><strong>${t.nome}</strong><small>${t.desc}</small></button></li>`).join('')}
    </ul>
    <div class="botoes"><button type="button" class="botao secundario" data-fechar>Fechar</button></div>`);
  d.querySelectorAll('[data-tema]').forEach((b) => b.addEventListener('click', () => {
    d.close();
    setTimeout(() => abrirTutorial(b.dataset.tema), 250);
  }));
}
