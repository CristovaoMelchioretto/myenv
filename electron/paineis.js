const { WebContentsView, session, shell } = require("electron");

const PERMISSOES_LIBERADAS = new Set(["clipboard-sanitized-write", "fullscreen"]);
const ERRO_NAVEGACAO_CANCELADA = -3;
const TAMANHO_JANELA_SECUNDARIA = { width: 1100, height: 760 };

const sessoesConfiguradas = new WeakSet();

function ehUrlWeb(url) {
  try {
    const { protocol } = new URL(url);
    return protocol === "http:" || protocol === "https:";
  } catch (erro) {
    return false;
  }
}

function ehUrlDeEmail(url) {
  return /^mailto:/i.test(url);
}

function nomeDaParticao(linkId) {
  const idSeguro = String(linkId).replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64);
  return `persist:link-${idSeguro || "sem-id"}`;
}

function userAgentDeNavegador(userAgentOriginal) {
  return userAgentOriginal.replace(/\s(?:MyEnv|Electron)\/\S+/gi, "");
}

function configurarSessao(sessao) {
  if (sessoesConfiguradas.has(sessao)) return;
  sessoesConfiguradas.add(sessao);
  sessao.setUserAgent(userAgentDeNavegador(sessao.getUserAgent()));
  sessao.setPermissionRequestHandler((_conteudo, permissao, responder) => {
    responder(PERMISSOES_LIBERADAS.has(permissao));
  });
  sessao.setPermissionCheckHandler((_conteudo, permissao) => PERMISSOES_LIBERADAS.has(permissao));
}

function bloquearNavegacaoNaoWeb(evento, url) {
  if (ehUrlWeb(url)) return;
  evento.preventDefault();
  if (ehUrlDeEmail(url)) shell.openExternal(url);
}

function protegerConteudo(conteudo) {
  conteudo.on("will-navigate", bloquearNavegacaoNaoWeb);
  conteudo.on("will-redirect", bloquearNavegacaoNaoWeb);

  conteudo.setWindowOpenHandler(({ url }) => {
    if (!ehUrlWeb(url)) return { action: "deny" };
    return {
      action: "allow",
      overrideBrowserWindowOptions: {
        ...TAMANHO_JANELA_SECUNDARIA,
        autoHideMenuBar: true,
        webPreferences: {
          session: conteudo.session,
          sandbox: true,
          contextIsolation: true,
          nodeIntegration: false
        }
      }
    };
  });

  conteudo.on("did-create-window", janela => protegerConteudo(janela.webContents));
}

function atalhoDaTecla(entrada) {
  const ctrl = entrada.control || entrada.meta;
  const tecla = entrada.key.toLowerCase();
  if (ctrl && tecla === "k") return "busca";
  if (ctrl && tecla === "w") return "fecharAba";
  if (ctrl && tecla === "tab") return entrada.shift ? "abaAnterior" : "proximaAba";
  if (entrada.key === "F5" || (ctrl && tecla === "r")) return "recarregar";
  if (entrada.alt && entrada.key === "ArrowLeft") return "voltar";
  if (entrada.alt && entrada.key === "ArrowRight") return "avancar";
  return null;
}

function retanguloValido(retangulo) {
  const campos = ["x", "y", "width", "height"];
  if (!retangulo || !campos.every(campo => Number.isFinite(retangulo[campo]))) return null;
  return {
    x: Math.round(retangulo.x),
    y: Math.round(retangulo.y),
    width: Math.max(0, Math.round(retangulo.width)),
    height: Math.max(0, Math.round(retangulo.height))
  };
}

function criarGerenciadorDePaineis(janela, notificar) {
  const paineis = new Map();

  function estadoDoPainel(abaId) {
    const painel = paineis.get(abaId);
    const conteudo = painel.visualizacao.webContents;
    return {
      abaId,
      url: conteudo.getURL() || painel.urlInicial,
      titulo: conteudo.getTitle(),
      carregando: conteudo.isLoading(),
      podeVoltar: conteudo.navigationHistory.canGoBack(),
      podeAvancar: conteudo.navigationHistory.canGoForward(),
      erro: painel.erro
    };
  }

  function enviarEstado(abaId) {
    if (!paineis.has(abaId)) return;
    notificar("aba:estado", estadoDoPainel(abaId));
  }

  function registrarFalha(abaId, codigo, descricao, url) {
    const painel = paineis.get(abaId);
    if (!painel) return;
    painel.erro = { codigo, descricao, url };
    painel.visualizacao.setVisible(false);
    enviarEstado(abaId);
  }

  function tratarAtalho(abaId, conteudo, atalho) {
    if (atalho === "recarregar") conteudo.reload();
    else if (atalho === "voltar") navegar(abaId, "voltar");
    else if (atalho === "avancar") navegar(abaId, "avancar");
    else notificar("atalho", { atalho, abaId });
  }

  function observarConteudo(abaId, conteudo) {
    const atualizar = () => enviarEstado(abaId);

    conteudo.on("did-start-loading", () => {
      const painel = paineis.get(abaId);
      if (painel) painel.erro = null;
      atualizar();
    });
    conteudo.on("did-stop-loading", atualizar);
    conteudo.on("did-navigate", atualizar);
    conteudo.on("did-navigate-in-page", atualizar);
    conteudo.on("page-title-updated", atualizar);

    conteudo.on("did-fail-load", (_evento, codigo, descricao, url, ehQuadroPrincipal) => {
      if (!ehQuadroPrincipal || codigo === ERRO_NAVEGACAO_CANCELADA) return;
      registrarFalha(abaId, codigo, descricao, url);
    });

    conteudo.on("render-process-gone", (_evento, detalhes) => {
      registrarFalha(abaId, 0, `A página parou de responder (${detalhes.reason}).`, conteudo.getURL());
    });

    conteudo.on("focus", () => notificar("aba:foco", { abaId }));

    conteudo.on("before-input-event", (evento, entrada) => {
      if (entrada.type !== "keyDown") return;
      const atalho = atalhoDaTecla(entrada);
      if (!atalho) return;
      evento.preventDefault();
      tratarAtalho(abaId, conteudo, atalho);
    });
  }

  function abrir(abaId, linkId, url) {
    if (paineis.has(abaId) || !ehUrlWeb(url)) return;
    const sessao = session.fromPartition(nomeDaParticao(linkId));
    configurarSessao(sessao);

    const visualizacao = new WebContentsView({
      webPreferences: {
        session: sessao,
        sandbox: true,
        contextIsolation: true,
        nodeIntegration: false
      }
    });
    visualizacao.setBackgroundColor("#ffffff");
    visualizacao.setVisible(false);

    paineis.set(abaId, { visualizacao, urlInicial: url, erro: null });
    janela.contentView.addChildView(visualizacao);
    protegerConteudo(visualizacao.webContents);
    observarConteudo(abaId, visualizacao.webContents);
    visualizacao.webContents.loadURL(url).catch(() => {});
  }

  function fechar(abaId) {
    const painel = paineis.get(abaId);
    if (!painel) return;
    paineis.delete(abaId);
    janela.contentView.removeChildView(painel.visualizacao);
    painel.visualizacao.webContents.close();
  }

  function aplicarLayout(itens) {
    const visiveis = new Map();
    for (const item of Array.isArray(itens) ? itens : []) {
      const retangulo = retanguloValido(item && item.retangulo);
      if (retangulo && paineis.has(item.abaId)) visiveis.set(item.abaId, retangulo);
    }
    for (const [abaId, painel] of paineis) {
      const retangulo = visiveis.get(abaId);
      const mostrar = Boolean(retangulo) && !painel.erro;
      if (retangulo) painel.visualizacao.setBounds(retangulo);
      painel.visualizacao.setVisible(mostrar);
    }
  }

  function focar(abaId) {
    const painel = paineis.get(abaId);
    if (painel && !painel.erro) painel.visualizacao.webContents.focus();
  }

  function navegar(abaId, acao) {
    const painel = paineis.get(abaId);
    if (!painel) return;
    const conteudo = painel.visualizacao.webContents;
    const historico = conteudo.navigationHistory;
    if (acao === "voltar" && historico.canGoBack()) historico.goBack();
    if (acao === "avancar" && historico.canGoForward()) historico.goForward();
    if (acao === "recarregar") {
      const urlComFalha = painel.erro && painel.erro.url;
      if (urlComFalha) conteudo.loadURL(urlComFalha).catch(() => {});
      else conteudo.reload();
    }
  }

  async function limparSessao(linkId) {
    const sessao = session.fromPartition(nomeDaParticao(linkId));
    await sessao.clearData();
  }

  function fecharTodos() {
    for (const abaId of [...paineis.keys()]) fechar(abaId);
  }

  return { abrir, fechar, aplicarLayout, focar, navegar, limparSessao, fecharTodos };
}

module.exports = { criarGerenciadorDePaineis, ehUrlWeb };
