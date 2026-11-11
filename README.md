# Controle de presença (jiu-jitsu)

Site para o professor marcar a presença dos alunos em cada aula, feito com HTML, CSS e
JavaScript (Vite) e Firebase. Segue o "Guia: site de controle de presença (jiu-jitsu)".

Endereço: **https://controlepresencajjb.web.app**. Projeto no Firebase: `controle-presenca-jjb`
(plano gratuito Spark, banco em São Paulo).

## Regras de negócio

- Só o professor entra (e-mail e senha). Não há tela de criar conta.
- **Sem turmas:** uma chamada por dia com todos os alunos.
- Aluno: nome (ou apelido) e observação.
- Dias de aula padrão: segunda e sábado. Dá para acrescentar dia extra ou cancelar um dia.
- Chamada: na Início, toca no dia do calendário > "Fazer chamada" > todos os alunos em ordem
  alfabética com **P** (presente, verde) e **F** (falta, vermelho). Tocar de novo desmarca.
  Nada é gravado até tocar em **Salvar chamada**; **Limpar dados** apaga as marcações do dia.
  Tocar no **F** abre a janela da justificativa (opcional): com motivo vira **falta justificada**
  (F laranja, não conta no limite); sem motivo é falta normal.
- Ciclos de 3 meses, com início e fim editáveis e botão Renovar.
- **Limite de 4 faltas por ciclo** (campo `limiteFaltas` de cada ciclo). Falta justificada não conta.
- Cor da linha no relatório: sem cor sem faltas, amarela de 1 a 3, vermelha a partir de 4.
- Frequência = presenças ÷ (presenças + faltas). A justificada fica de fora.
- Retirar do projeto = desativar (com data e motivo). O aluno retirado só aparece na aba Retirados
  (some da chamada e do relatório), mas as marcações antigas continuam guardadas.
- Sininho na Início: avisa quem está com 3 faltas (perto do limite) e com 4 ou mais no ciclo ativo.
- Relatório: botão "Exportar PDF e enviar no WhatsApp" (gera o PDF no celular e abre a lista de apps).
- Aluno novo no meio do ciclo só conta as aulas depois do cadastro.

## Telas

Entrar (com "Esqueci a senha" e o olho para ver a senha), Início (calendário da chamada,
próxima aula, aulas sem chamada), Dia ("Fazer chamada"), Chamada (P e F, salvar e limpar), Alunos, Dias de aula (calendário), Ciclos, Relatório (resumo, tabela por aluno, ficha, por aula, grade,
avisos e salvar em PDF).

Funciona sem internet: as marcações ficam guardadas no aparelho e vão para o banco quando a
conexão volta. Não feche o site logo depois de marcar sem sinal.

## Primeiro acesso (uma vez só)

1. Console do Firebase > Authentication > Usuários > **Adicionar usuário**: e-mail e senha do
   professor. Copie o **UID**.
2. Firestore > Dados > coleção `professores` > documento com **ID = UID**, campo `nome` (texto).
3. Entrar no site. Os dias padrão são criados sozinhos. Depois: cadastrar os alunos e criar o ciclo.
4. Authentication > Configurações > Ações do usuário: desmarcar a criação de contas.

## Rodar no computador

```bash
npm install
npm run dev
```

## Testar com o Firebase de teste (no próprio computador)

Precisa do Java. Nada é criado na internet.

1. `npm run emulador` (deixe aberto)
2. Em outro terminal: `npm run emulador:dados` (12 alunos, ciclo e chamadas de exemplo)
3. `npm run dev:emulador`. Conta de teste: `professor@presenca.test` / `professor123`

Testes:

```bash
npm run testar
npm run testar:regras
```

## Publicar

```bash
npm run build
npx firebase deploy --only hosting:principal
```

Regras do banco: `npx firebase deploy --only firestore`.

## Estrutura

| Arquivo | O que faz |
| --- | --- |
| `src/datas.js` | Datas no fuso de São Paulo, dias de aula, ciclos (sem Firebase) |
| `src/relatorio.js` | Cálculos do relatório: contas, cores, sequências, por aula (sem Firebase) |
| `src/dados.js` | Ponto único de acesso ao Firebase (login, estado em tempo real, gravações) |
| `src/firebase.js` | Configuração do Firebase com cache offline |
| `src/main.js` | Rotas e login |
| `src/telas/*.js` | Uma tela por arquivo |
| `src/ui.js` | Utilidades de tela (avisos e janelas) |
| `src/atualizacao.js` | Atualiza o site sozinho quando sai versão nova |
| `firestore.rules` | Regras de segurança |
| `testes/` | Testes dos cálculos e das regras |
| `scripts/` | Dados de exemplo e gerador dos ícones |

## Segurança e LGPD

Das crianças: só o nome (ou apelido) e a observação. Sem Analytics nem scripts de terceiros. Exclusão a pedido
do responsável: pelo console, trocando o nome por um código. Backup: salvar o relatório do ciclo em PDF.

## Histórico

Commits seguem o padrão `ano-mês-dia Implementação: ...` ou `ano-mês-dia Mudança: ...`.
