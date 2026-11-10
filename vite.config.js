import { defineConfig } from 'vite';

// Cada publicação ganha um número de versão. O site aberto no celular confere o
// /versao.json de tempos em tempos e se atualiza sozinho quando muda (src/atualizacao.js).
const VERSAO = String(Date.now());

export default defineConfig({
  define: { __VERSAO__: JSON.stringify(VERSAO) },
  plugins: [{
    name: 'versao-do-site',
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'versao.json', source: JSON.stringify({ versao: VERSAO }) });
    },
  }],
});
