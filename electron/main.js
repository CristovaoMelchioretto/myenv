const { app, BrowserWindow, Menu, ipcMain, nativeTheme, shell } = require("electron");
const fs = require("fs");
const path = require("path");
const { criarGerenciadorDePaineis, ehUrlWeb } = require("./paineis");
const { lerEstadoDaJanela, gravarEstadoDaJanela } = require("./janela");

const RAIZ = path.join(__dirname, "..");
const PASTA_DADOS_ANTIGA = "Painel de Links";
const COR_FUNDO_ESCURO = "#16181d";
const COR_FUNDO_CLARO = "#f4f5f7";
const ACOES_DE_NAVEGACAO = new Set(["voltar", "avancar", "recarregar"]);

let janelaPrincipal = null;
let paineis = null;

function abrirNoNavegador(url) {
  if (ehUrlWeb(url)) shell.openExternal(url);
}

function ehIdValido(valor) {
  return typeof valor === "string" && /^[a-zA-Z0-9_-]{1,64}$/.test(valor);
}

function migrarDadosAntigos() {
  const destino = path.join(app.getPath("userData"), "Local Storage");
  const origem = path.join(app.getPath("appData"), PASTA_DADOS_ANTIGA, "Local Storage");
  if (fs.existsSync(destino) || !fs.existsSync(origem)) return;
  try {
    fs.cpSync(origem, destino, { recursive: true });
  } catch (erro) {
    console.error("Falha ao migrar os dados da versão antiga:", erro);
  }
}

function notificarTela(canal, dados) {
  if (janelaPrincipal && !janelaPrincipal.isDestroyed()) janelaPrincipal.webContents.send(canal, dados);
}

function criarJanela() {
  const { maximizada, ...posicaoETamanho } = lerEstadoDaJanela();
  const janela = new BrowserWindow({
    ...posicaoETamanho,
    minWidth: 640,
    minHeight: 420,
    title: "MyEnv",
    icon: path.join(RAIZ, "build", "icon.png"),
    autoHideMenuBar: true,
    backgroundColor: nativeTheme.shouldUseDarkColors ? COR_FUNDO_ESCURO : COR_FUNDO_CLARO,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  janela.webContents.setWindowOpenHandler(({ url }) => {
    abrirNoNavegador(url);
    return { action: "deny" };
  });

  janela.webContents.on("will-navigate", (evento, url) => {
    if (url.startsWith("file://")) return;
    evento.preventDefault();
    abrirNoNavegador(url);
  });

  janela.once("ready-to-show", () => {
    if (maximizada) janela.maximize();
    janela.show();
  });
  janela.on("close", () => gravarEstadoDaJanela(janela));
  janela.on("closed", () => {
    janelaPrincipal = null;
    app.quit();
  });
  janela.loadFile(path.join(RAIZ, "src", "index.html"));
  return janela;
}

function daJanelaPrincipal(evento) {
  return janelaPrincipal && evento.sender === janelaPrincipal.webContents;
}

function registrarCanal(canal, tratar) {
  ipcMain.on(canal, (evento, dados) => {
    if (!daJanelaPrincipal(evento) || !paineis) return;
    tratar(dados || {});
  });
}

function registrarCanais() {
  registrarCanal("aba:abrir", ({ abaId, linkId, url }) => {
    if (ehIdValido(abaId) && typeof linkId === "string" && ehUrlWeb(url)) paineis.abrir(abaId, linkId, url);
  });

  registrarCanal("aba:fechar", ({ abaId }) => {
    if (ehIdValido(abaId)) paineis.fechar(abaId);
  });

  registrarCanal("aba:focar", ({ abaId }) => {
    if (ehIdValido(abaId)) paineis.focar(abaId);
  });

  registrarCanal("aba:navegar", ({ abaId, acao }) => {
    if (ehIdValido(abaId) && ACOES_DE_NAVEGACAO.has(acao)) paineis.navegar(abaId, acao);
  });

  registrarCanal("aba:layout", itens => paineis.aplicarLayout(itens));

  registrarCanal("navegador:abrir", ({ url }) => abrirNoNavegador(url));

  registrarCanal("sessao:limpar", ({ linkId }) => {
    if (typeof linkId !== "string") return;
    paineis.limparSessao(linkId).catch(erro => console.error("Falha ao limpar a sessão:", erro));
  });
}

function iniciar() {
  app.on("second-instance", () => {
    if (!janelaPrincipal) return;
    if (janelaPrincipal.isMinimized()) janelaPrincipal.restore();
    janelaPrincipal.focus();
  });

  app.on("window-all-closed", () => app.quit());

  migrarDadosAntigos();
  registrarCanais();

  app.whenReady().then(() => {
    Menu.setApplicationMenu(null);
    janelaPrincipal = criarJanela();
    paineis = criarGerenciadorDePaineis(janelaPrincipal, notificarTela);
    janelaPrincipal.on("close", () => paineis.fecharTodos());
  });
}

if (app.requestSingleInstanceLock()) {
  iniciar();
} else {
  app.quit();
}
