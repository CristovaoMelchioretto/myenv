const { app, dialog } = require("electron");
const { autoUpdater } = require("electron-updater");

const INTERVALO_DE_VERIFICACAO = 6 * 60 * 60 * 1000;

function verificarAtualizacao() {
  autoUpdater.checkForUpdates().catch(erro => console.error("Falha ao verificar atualização:", erro));
}

async function perguntarSeReinicia(janela, versao) {
  const opcoes = {
    type: "info",
    title: "Atualização disponível",
    message: `A versão ${versao} do MyEnv foi baixada.`,
    detail: "Reinicie agora para atualizar. Se preferir, a atualização é instalada na próxima vez que o app for fechado.",
    buttons: ["Reiniciar agora", "Depois"],
    defaultId: 0,
    cancelId: 1,
    noLink: true
  };
  const janelaValida = janela && !janela.isDestroyed();
  const { response } = janelaValida ? await dialog.showMessageBox(janela, opcoes) : await dialog.showMessageBox(opcoes);
  if (response === 0) autoUpdater.quitAndInstall();
}

function iniciarAtualizacaoAutomatica(obterJanela) {
  if (!app.isPackaged) return;

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on("error", erro => console.error("Falha na atualização:", erro));
  autoUpdater.on("update-downloaded", ({ version }) => {
    perguntarSeReinicia(obterJanela(), version).catch(erro => console.error("Falha ao perguntar sobre a atualização:", erro));
  });

  verificarAtualizacao();
  setInterval(verificarAtualizacao, INTERVALO_DE_VERIFICACAO);
}

module.exports = { iniciarAtualizacaoAutomatica };
