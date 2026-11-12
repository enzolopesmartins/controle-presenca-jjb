# Projeto MCC Jiu-jitsu

Site de controle de presença dos alunos, feito com Vite e Firebase.

- Endereço: **https://controlepresencajjb.web.app**
- Projeto no Firebase: `controle-presenca-jjb`

## Rodar no computador

```bash
npm install
npm run dev
```

Para rodar com o Firebase de teste, sem mexer nos dados reais (precisa do Java):

```bash
npm run emulador
npm run emulador:dados
npm run dev:emulador
```

## Publicar

```bash
npm run build
npx firebase deploy --only hosting:principal
```

Se as regras do banco mudarem: `npx firebase deploy --only firestore`.

## Commits

Padrão `AAAA-MM-DD Implementação: ...` ou `AAAA-MM-DD Mudança: ...`.
