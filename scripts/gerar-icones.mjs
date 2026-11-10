// Gera os ícones PNG (quadrado azul-marinho com um "certo" branco), sem bibliotecas.
// Uso: node scripts/gerar-icones.mjs
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const crcTabela = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc = (buf) => { let c = 0xffffffff; for (const b of buf) c = crcTabela[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
function bloco(tipo, dados) {
  const t = Buffer.from(tipo);
  const tam = Buffer.alloc(4); tam.writeUInt32BE(dados.length);
  const c = Buffer.alloc(4); c.writeUInt32BE(crc(Buffer.concat([t, dados])));
  return Buffer.concat([tam, t, dados, c]);
}

// Distância de um ponto a um segmento
function dist(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

function icone(lado, cantos) {
  const s = lado / 512;
  const raio = cantos ? 96 * s : 0;
  const linhas = [];
  for (let y = 0; y < lado; y++) {
    const linha = [0];
    for (let x = 0; x < lado; x++) {
      let a = 255;
      if (raio) {
        const cx = Math.min(Math.max(x + .5, raio), lado - raio);
        const cy = Math.min(Math.max(y + .5, raio), lado - raio);
        const d = Math.hypot(x + .5 - cx, y + .5 - cy);
        a = Math.round(255 * Math.max(0, Math.min(1, raio - d + .5)));
      }
      const px = (x + .5) / s, py = (y + .5) / s;
      const d = Math.min(dist(px, py, 136, 270, 218, 352), dist(px, py, 218, 352, 378, 176));
      const branco = Math.max(0, Math.min(1, (28 - d) * s + .5));
      const mix = (f, b) => Math.round(f * (1 - branco) + b * branco);
      linha.push(mix(0x14, 255), mix(0x21, 255), mix(0x3d, 255), a);
    }
    linhas.push(Buffer.from(linha));
  }
  const cab = Buffer.alloc(13);
  cab.writeUInt32BE(lado, 0); cab.writeUInt32BE(lado, 4);
  cab[8] = 8; cab[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    bloco('IHDR', cab), bloco('IDAT', deflateSync(Buffer.concat(linhas))), bloco('IEND', Buffer.alloc(0)),
  ]);
}

writeFileSync('public/icone-180.png', icone(180, false)); // iPhone arredonda sozinho
writeFileSync('public/icone-192.png', icone(192, true));
writeFileSync('public/icone-512.png', icone(512, false)); // "maskable": sem cantos
console.log('Ícones gerados em public/');
