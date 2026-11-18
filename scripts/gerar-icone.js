const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const TAMANHO = 256;
const FUNDO = [32, 35, 42];
const BARRAS = [
  { y: 60, cor: [229, 72, 77] },
  { y: 112, cor: [76, 201, 131] },
  { y: 164, cor: [91, 142, 240] }
];

function dentroRetanguloArredondado(x, y, x0, y0, largura, altura, raio) {
  const cx = Math.min(Math.max(x, x0 + raio), x0 + largura - raio);
  const cy = Math.min(Math.max(y, y0 + raio), y0 + altura - raio);
  return (x - cx) ** 2 + (y - cy) ** 2 <= raio ** 2;
}

function corDoPixel(x, y) {
  if (!dentroRetanguloArredondado(x, y, 8, 8, 240, 240, 48)) return null;
  for (const barra of BARRAS) {
    if (dentroRetanguloArredondado(x, y, 52, barra.y, 22, 32, 6)) return barra.cor;
    if (dentroRetanguloArredondado(x, y, 86, barra.y, 118, 32, 8)) return [230, 232, 236];
  }
  return FUNDO;
}

function tabelaCrc() {
  const tabela = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    tabela[n] = c >>> 0;
  }
  return tabela;
}

const CRC = tabelaCrc();

function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) c = CRC[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function bloco(tipo, dados) {
  const tamanho = Buffer.alloc(4);
  tamanho.writeUInt32BE(dados.length);
  const tipoEDados = Buffer.concat([Buffer.from(tipo, "ascii"), dados]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(tipoEDados));
  return Buffer.concat([tamanho, tipoEDados, crc]);
}

function gerarPng() {
  const linhas = [];
  for (let y = 0; y < TAMANHO; y++) {
    const linha = Buffer.alloc(1 + TAMANHO * 4);
    for (let x = 0; x < TAMANHO; x++) {
      const cor = corDoPixel(x + 0.5, y + 0.5);
      const pos = 1 + x * 4;
      if (cor) {
        linha[pos] = cor[0];
        linha[pos + 1] = cor[1];
        linha[pos + 2] = cor[2];
        linha[pos + 3] = 255;
      }
    }
    linhas.push(linha);
  }
  const cabecalho = Buffer.alloc(13);
  cabecalho.writeUInt32BE(TAMANHO, 0);
  cabecalho.writeUInt32BE(TAMANHO, 4);
  cabecalho[8] = 8;
  cabecalho[9] = 6;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    bloco("IHDR", cabecalho),
    bloco("IDAT", zlib.deflateSync(Buffer.concat(linhas))),
    bloco("IEND", Buffer.alloc(0))
  ]);
}

const destino = path.join(__dirname, "..", "build", "icon.png");
fs.writeFileSync(destino, gerarPng());
console.log("Ícone gerado em", destino);
