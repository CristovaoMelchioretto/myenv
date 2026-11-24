const { app, screen } = require("electron");
const fs = require("fs");
const path = require("path");

const NOME_ARQUIVO = "janela.json";
const TAMANHO_PADRAO = { width: 1280, height: 820 };

function caminhoDoArquivo() {
  return path.join(app.getPath("userData"), NOME_ARQUIVO);
}

function ehNumero(valor) {
  return Number.isFinite(valor);
}

function retanguloValido(retangulo) {
  return Boolean(retangulo) && ["x", "y", "width", "height"].every(campo => ehNumero(retangulo[campo]));
}

function cabeEmAlgumMonitor(retangulo) {
  return screen.getAllDisplays().some(({ workArea }) => {
    const sobraHorizontal = Math.min(retangulo.x + retangulo.width, workArea.x + workArea.width) - Math.max(retangulo.x, workArea.x);
    const sobraVertical = Math.min(retangulo.y + retangulo.height, workArea.y + workArea.height) - Math.max(retangulo.y, workArea.y);
    return sobraHorizontal >= 100 && sobraVertical >= 50;
  });
}

function lerEstadoDaJanela() {
  try {
    const salvo = JSON.parse(fs.readFileSync(caminhoDoArquivo(), "utf8"));
    if (!retanguloValido(salvo) || !cabeEmAlgumMonitor(salvo)) {
      return { ...TAMANHO_PADRAO, maximizada: Boolean(salvo.maximizada) };
    }
    return {
      x: salvo.x,
      y: salvo.y,
      width: salvo.width,
      height: salvo.height,
      maximizada: Boolean(salvo.maximizada)
    };
  } catch {
    return { ...TAMANHO_PADRAO, maximizada: false };
  }
}

function gravarEstadoDaJanela(janela) {
  if (!janela || janela.isDestroyed()) return;
  const estado = { ...janela.getNormalBounds(), maximizada: janela.isMaximized() };
  try {
    fs.writeFileSync(caminhoDoArquivo(), JSON.stringify(estado, null, 2));
  } catch (erro) {
    console.error("Falha ao gravar o tamanho da janela:", erro);
  }
}

module.exports = { lerEstadoDaJanela, gravarEstadoDaJanela };
