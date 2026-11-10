# Controle de presença (jiu-jitsu)

Site para o professor marcar a presença dos alunos em cada aula, feito com HTML, CSS e
JavaScript (Vite) e Firebase. Segue o "Guia: site de controle de presença (jiu-jitsu)".

Endereço: **https://controlepresencajjb.web.app**. Projeto no Firebase: `controle-presenca-jjb`
(plano gratuito Spark, banco em São Paulo).

## Regras de negócio

- Só o professor entra (e-mail e senha). Não há tela de criar conta.
- Duas turmas, mas **uma chamada por dia** com os alunos das duas, separados por turma.
- Dias de aula padrão: segunda e sábado. Dá para acrescentar dia extra ou cancelar um dia.
- Três status: presente, falta e falta justificada. Tocar de novo no mesmo botão desmarca.
- Ciclos de 3 meses, com início e fim editáveis e botão Renovar.
- **Limite de 4 faltas por ciclo** (campo `limiteFaltas` de cada ciclo). Falta justificada não conta.
- Cor da linha no relatório: sem cor sem faltas, amarela de 1 a 3, vermelha a partir de 4.
- Frequência = presenças ÷ (presenças + faltas). A justificada fica de fora.
- Retirar do projeto = desativar (com data e motivo). Nada é apagado pelo site.
- Aluno novo no meio do ciclo só conta as aulas depois do cadastro.

## Telas

Entrar (com "Esqueci a senha"), Início (chamada de hoje, próxima aula, aulas sem chamada),
Chamada (data, filtro por turma, contador, marcar quem falta como presente), Alunos, Turmas,
Dias de aula (calendário), Ciclos, Relatório (resumo, tabela por aluno, ficha, por aula, grade,
avisos, planilhas e impressão) e Exportar planilha do mês (backup).

Funciona sem internet: as marcações ficam guardadas no aparelho e vão para o banco quando a
conexão volta. Não feche o site logo depois de marcar sem sinal.

## Primeiro acesso (uma vez só)

1. Console do Firebase > Authentication > Usuários > **Adicionar usuário**: e-mail e senha do
   professor. Copie o **UID**.
2. Firestore > Dados > coleção `professores` > documento com **ID = UID**, campo `nome` (texto).
3. Entrar no site. As turmas "Turma 1" e "Turma 2" e os dias padrão são criados sozinhos.
   Depois: renomear as turmas, cadastrar os alunos e criar o ciclo.
4. Authentication > Configurações > Ações do usuário: desmarcar a criação de contas.

## Rodar no computador

```bash
npm install
npm run dev
```

## Testar com o Firebase de teste (no próprio computador)

Precisa do Java. Nada é criado na internet.

1. `npm run emulador` (deixe aberto)
2. Em outro terminal: `npm run emulador:dados` (turmas, 12 alunos, ciclo e chamadas de exemplo)
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
| `src/ui.js` | Utilidades de tela (avisos, janelas, CSV) |
| `src/atualizacao.js` | Atualiza o site sozinho quando sai versão nova |
| `firestore.rules` | Regras de segurança |
| `testes/` | Testes dos cálculos e das regras |
| `scripts/` | Dados de exemplo e gerador dos ícones |

## Segurança e LGPD

Só o nome (ou apelido) das crianças. Sem Analytics nem scripts de terceiros. Exclusão a pedido
do responsável: pelo console, trocando o nome por um código. Backup: exportar a planilha uma
vez por mês.

## Histórico

Commits seguem o padrão `ano-mês-dia Implementação: ...` ou `ano-mês-dia Mudança: ...`.
