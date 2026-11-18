const { contextBridge, ipcRenderer } = require("electron");

function escutar(canal, callback) {
  ipcRenderer.on(canal, (_evento, dados) => callback(dados));
}

contextBridge.exposeInMainWorld("myenv", {
  abrirAba: (abaId, linkId, url) => ipcRenderer.send("aba:abrir", { abaId, linkId, url }),
  fecharAba: abaId => ipcRenderer.send("aba:fechar", { abaId }),
  focarAba: abaId => ipcRenderer.send("aba:focar", { abaId }),
  navegar: (abaId, acao) => ipcRenderer.send("aba:navegar", { abaId, acao }),
  definirLayout: itens => ipcRenderer.send("aba:layout", itens),
  abrirNoNavegador: url => ipcRenderer.send("navegador:abrir", { url }),
  limparSessao: linkId => ipcRenderer.send("sessao:limpar", { linkId }),
  aoMudarEstado: callback => escutar("aba:estado", callback),
  aoFocarAba: callback => escutar("aba:foco", callback),
  aoUsarAtalho: callback => escutar("atalho", callback)
});
