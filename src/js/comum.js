const AMBIENTES = {
  producao: { nome: "Produção", sigla: "PROD", ordem: 1 },
  homologacao: { nome: "Homologação", sigla: "HOM", ordem: 2 },
  desenvolvimento: { nome: "Desenvolvimento", sigla: "DEV", ordem: 3 },
  outro: { nome: "Outro", sigla: "OUTRO", ordem: 4 }
};

const ICONES = {
  voltar: '<path d="M15 18l-6-6 6-6"/>',
  avancar: '<path d="M9 18l6-6-6-6"/>',
  recarregar: '<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/>',
  navegador: '<path d="M14 4h6v6"/><path d="M20 4l-9 9"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
  copiar: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a1 1 0 0 1 1-1h10"/>',
  editar: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
  excluir: '<path d="M4 7h16"/><path d="M10 11v6M14 11v6"/><path d="M6 7l1 13h10l1-13"/><path d="M9 7V4h6v3"/>',
  aoLado: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M12 4v16"/>',
  fechar: '<path d="M6 6l12 12M18 6L6 18"/>'
};

function icone(nome) {
  return `<svg class="icone-svg" viewBox="0 0 24 24" aria-hidden="true">${ICONES[nome] || ""}</svg>`;
}

function gerarId() {
  const tempo = Date.now().toString(36);
  const aleatorio = Math.random().toString(36).slice(2, 7);
  return tempo + aleatorio;
}

function escaparHtml(texto) {
  const substitutos = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  return String(texto ?? "").replace(/[&<>"']/g, caractere => substitutos[caractere]);
}

function urlSegura(url) {
  return /^https?:\/\//i.test(url) ? url : "#";
}

function normalizarParaBusca(texto) {
  return String(texto ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

function palavrasDaBusca(texto) {
  const termo = normalizarParaBusca(texto.trim());
  return termo ? termo.split(/\s+/) : [];
}

function ambienteValido(ambiente) {
  return AMBIENTES[ambiente] ? ambiente : "outro";
}

function dadosDoAmbiente(ambiente) {
  return AMBIENTES[ambienteValido(ambiente)];
}

function compararTexto(a, b) {
  return a.localeCompare(b, "pt-BR");
}

function compararLinks(a, b) {
  const ordemA = dadosDoAmbiente(a.ambiente).ordem;
  const ordemB = dadosDoAmbiente(b.ambiente).ordem;
  return ordemA - ordemB || compararTexto(a.nome, b.nome);
}

function linkAtendeBusca(link, palavras) {
  if (!palavras.length) return true;
  const ambiente = dadosDoAmbiente(link.ambiente);
  const texto = normalizarParaBusca([link.cliente, link.nome, link.url, link.obs, ambiente.nome, ambiente.sigla].join(" "));
  return palavras.every(palavra => texto.includes(palavra));
}

function tituloDoLink(link) {
  return `${link.cliente} · ${link.nome}`;
}
