const FORMATO_BACKUP = "myenv-backup";
const VERSAO_BACKUP = 1;
const DURACAO_AVISO_MS = 2200;

const elementos = {
  lista: document.querySelector("#lista"),
  busca: document.querySelector("#busca"),
  filtroAmbiente: document.querySelector("#filtroAmbiente"),
  clientes: document.querySelector("#clientes"),
  dialogo: document.querySelector("#dlg"),
  formulario: document.querySelector("#frm"),
  tituloDialogo: document.querySelector("#dlgTitulo"),
  botaoNovo: document.querySelector("#btnNovo"),
  botaoCancelar: document.querySelector("#btnCancelar"),
  botaoExportar: document.querySelector("#btnExportar"),
  botaoImportar: document.querySelector("#btnImportar"),
  arquivoImportar: document.querySelector("#arquivoImportar"),
  botaoTema: document.querySelector("#btnTema"),
  aviso: document.querySelector("#toast")
};

let links = [];
let idEmEdicao = null;
let temporizadorAviso = null;

function avisar(mensagem) {
  elementos.aviso.textContent = mensagem;
  elementos.aviso.classList.add("visivel");
  clearTimeout(temporizadorAviso);
  temporizadorAviso = setTimeout(() => elementos.aviso.classList.remove("visivel"), DURACAO_AVISO_MS);
}

async function salvar() {
  try {
    await Armazenamento.salvarLinks(links);
  } catch (erro) {
    avisar("Não foi possível salvar. Use Exportar para não perder os links.");
  }
}

function obterLink(linkId) {
  return links.find(link => link.id === linkId) || null;
}

function linksFiltrados() {
  const palavras = palavrasDaBusca(elementos.busca.value);
  const ambiente = elementos.filtroAmbiente.value;
  return links.filter(link => (!ambiente || link.ambiente === ambiente) && linkAtendeBusca(link, palavras));
}

function agruparPorCliente(itens) {
  const grupos = new Map();
  for (const link of itens) {
    if (!grupos.has(link.cliente)) grupos.set(link.cliente, []);
    grupos.get(link.cliente).push(link);
  }
  return [...grupos.entries()].sort(([clienteA], [clienteB]) => compararTexto(clienteA, clienteB));
}

function botaoDoCartao(acao, titulo, linkId) {
  return `<button type="button" class="icone" data-acao="${acao}" data-id="${escaparHtml(linkId)}" title="${titulo}" aria-label="${titulo}">${icone(acao)}</button>`;
}

function htmlDoCartao(link) {
  const ambiente = ambienteValido(link.ambiente);
  const observacao = link.obs ? `<span class="obs">${escaparHtml(link.obs)}</span>` : "";
  const acoesDoApp = EspacoTrabalho.disponivel
    ? botaoDoCartao("aoLado", "Abrir ao lado (Shift+Enter)", link.id) + botaoDoCartao("navegador", "Abrir no navegador (Ctrl+Enter)", link.id)
    : "";
  return `
    <div class="link ambiente-${ambiente}">
      <span class="selo">${AMBIENTES[ambiente].nome}</span>
      <a class="abrir" href="${escaparHtml(urlSegura(link.url))}" data-id="${escaparHtml(link.id)}" target="_blank" rel="noopener noreferrer">${escaparHtml(link.nome)}</a>
      <span class="url">${escaparHtml(link.url)}</span>
      ${observacao}
      <div class="acoes">
        ${acoesDoApp}
        ${botaoDoCartao("copiar", "Copiar URL", link.id)}
        ${botaoDoCartao("editar", "Editar", link.id)}
        ${botaoDoCartao("excluir", "Excluir", link.id)}
      </div>
    </div>`;
}

function htmlDoGrupo([cliente, linksDoCliente]) {
  const cartoes = [...linksDoCliente].sort(compararLinks).map(htmlDoCartao).join("");
  return `<section class="grupo"><h2>${escaparHtml(cliente)}</h2><div class="grade">${cartoes}</div></section>`;
}

function htmlListaVazia() {
  const mensagem = links.length
    ? "Nenhum link encontrado."
    : "Nenhum link cadastrado. Clique em <b>+ Novo link</b>.";
  return `<div class="vazio">${mensagem}</div>`;
}

function atualizarSugestoesDeCliente() {
  const nomes = [...new Set(links.map(link => link.cliente))].sort(compararTexto);
  elementos.clientes.innerHTML = nomes.map(nome => `<option value="${escaparHtml(nome)}">`).join("");
}

function renderizar() {
  const itens = linksFiltrados();
  elementos.lista.innerHTML = itens.length
    ? agruparPorCliente(itens).map(htmlDoGrupo).join("")
    : htmlListaVazia();
  atualizarSugestoesDeCliente();
}

function abrirDialogo(link) {
  const { formulario } = elementos;
  idEmEdicao = link ? link.id : null;
  elementos.tituloDialogo.textContent = link ? "Editar link" : "Novo link";
  formulario.reset();
  if (link) {
    formulario.cliente.value = link.cliente;
    formulario.nome.value = link.nome;
    formulario.url.value = link.url;
    formulario.ambiente.value = ambienteValido(link.ambiente);
    formulario.obs.value = link.obs || "";
  }
  elementos.dialogo.showModal();
  formulario.cliente.focus();
}

function dadosDoFormulario() {
  const { formulario } = elementos;
  return {
    cliente: formulario.cliente.value.trim(),
    nome: formulario.nome.value.trim(),
    url: formulario.url.value.trim(),
    ambiente: formulario.ambiente.value,
    obs: formulario.obs.value.trim()
  };
}

function gravarDialogo() {
  const dados = dadosDoFormulario();
  if (idEmEdicao) {
    links = links.map(link => (link.id === idEmEdicao ? { ...link, ...dados } : link));
  } else {
    links.push({ id: gerarId(), ...dados });
  }
  salvar();
  renderizar();
  EspacoTrabalho.renderizar();
  avisar("Link salvo.");
}

function copiarUrl(link) {
  if (!navigator.clipboard) {
    avisar("Não foi possível copiar.");
    return;
  }
  navigator.clipboard.writeText(link.url).then(
    () => avisar("URL copiada."),
    () => avisar("Não foi possível copiar.")
  );
}

function excluirLink(link) {
  const nomeAmbiente = dadosDoAmbiente(link.ambiente).nome;
  if (!confirm(`Excluir "${link.nome}" (${nomeAmbiente}) de ${link.cliente}?`)) return;
  links = links.filter(item => item.id !== link.id);
  EspacoTrabalho.esquecerLink(link.id);
  salvar();
  renderizar();
}

function abrirLink(link, modo) {
  if (modo === "aoLado") EspacoTrabalho.abrirAoLado(link);
  else if (modo === "navegador") EspacoTrabalho.abrirNoNavegador(link.url);
  else EspacoTrabalho.abrir(link);
}

function modoPelasTeclas(evento) {
  if (evento.ctrlKey || evento.metaKey) return "navegador";
  if (evento.shiftKey) return "aoLado";
  return "app";
}

function exportar() {
  const backup = {
    formato: FORMATO_BACKUP,
    versao: VERSAO_BACKUP,
    geradoEm: new Date().toISOString(),
    links
  };
  const arquivo = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  const ancora = document.createElement("a");
  ancora.href = URL.createObjectURL(arquivo);
  ancora.download = `myenv-${new Date().toISOString().slice(0, 10)}.json`;
  ancora.click();
  URL.revokeObjectURL(ancora.href);
}

function linksDoBackup(conteudo) {
  if (Array.isArray(conteudo)) return conteudo;
  if (conteudo && conteudo.formato === FORMATO_BACKUP && Array.isArray(conteudo.links)) return conteudo.links;
  throw new Error("Backup inválido");
}

function linkImportado(link) {
  return {
    id: link.id ? String(link.id) : gerarId(),
    cliente: String(link.cliente),
    nome: String(link.nome),
    url: String(link.url),
    ambiente: ambienteValido(link.ambiente),
    obs: String(link.obs || "")
  };
}

function aplicarBackup(texto) {
  const validos = linksDoBackup(JSON.parse(texto))
    .filter(link => link && link.cliente && link.nome && link.url)
    .map(linkImportado);
  if (!confirm(`Substituir os ${links.length} links atuais pelos ${validos.length} do arquivo?`)) return;
  links = validos;
  salvar();
  renderizar();
  EspacoTrabalho.sincronizar();
  avisar("Backup importado.");
}

function importar(arquivo) {
  const leitor = new FileReader();
  leitor.onload = () => {
    try {
      aplicarBackup(leitor.result);
    } catch (erro) {
      avisar("Arquivo inválido.");
    }
  };
  leitor.readAsText(arquivo);
}

function atualizarBotaoTema() {
  const escuro = Tema.atual() === "escuro";
  const descricao = escuro ? "Mudar para o tema claro" : "Mudar para o tema escuro";
  elementos.botaoTema.classList.toggle("escuro", escuro);
  elementos.botaoTema.title = descricao;
  elementos.botaoTema.setAttribute("aria-label", descricao);
}

function focarBusca() {
  EspacoTrabalho.mostrarInicio();
  elementos.busca.focus();
  elementos.busca.select();
}

function tratarCliqueNaLista(evento) {
  const botao = evento.target.closest("button[data-acao]");
  const ancora = evento.target.closest("a.abrir");
  const alvo = botao || ancora;
  if (!alvo) return;
  const link = obterLink(alvo.dataset.id);
  if (!link) return;

  if (botao) {
    evento.preventDefault();
    const acoes = {
      aoLado: () => abrirLink(link, "aoLado"),
      navegador: () => abrirLink(link, "navegador"),
      copiar: () => copiarUrl(link),
      editar: () => abrirDialogo(link),
      excluir: () => excluirLink(link)
    };
    acoes[botao.dataset.acao]?.();
    return;
  }

  if (!EspacoTrabalho.disponivel) return;
  evento.preventDefault();
  abrirLink(link, modoPelasTeclas(evento));
}

function abrirPrimeiroResultado(evento) {
  if (evento.key !== "Enter") return;
  const primeiro = elementos.lista.querySelector("a.abrir");
  if (!primeiro) return;
  evento.preventDefault();
  const link = obterLink(primeiro.dataset.id);
  if (EspacoTrabalho.disponivel && link) abrirLink(link, modoPelasTeclas(evento));
  else primeiro.click();
}

function focarBuscaComAtalho(evento) {
  const atalho = (evento.ctrlKey || evento.metaKey) && evento.key.toLowerCase() === "k";
  if (!atalho) return;
  evento.preventDefault();
  focarBusca();
}

function registrarEventos() {
  elementos.lista.addEventListener("click", tratarCliqueNaLista);
  elementos.formulario.addEventListener("submit", gravarDialogo);
  elementos.botaoCancelar.addEventListener("click", () => elementos.dialogo.close());
  elementos.botaoNovo.addEventListener("click", () => abrirDialogo(null));
  elementos.botaoExportar.addEventListener("click", exportar);
  elementos.botaoImportar.addEventListener("click", () => elementos.arquivoImportar.click());
  elementos.arquivoImportar.addEventListener("change", evento => {
    const [arquivo] = evento.target.files;
    if (arquivo) importar(arquivo);
    evento.target.value = "";
  });
  elementos.busca.addEventListener("input", renderizar);
  elementos.busca.addEventListener("keydown", abrirPrimeiroResultado);
  elementos.filtroAmbiente.addEventListener("change", renderizar);
  elementos.botaoTema.addEventListener("click", () => {
    Tema.alternar();
    atualizarBotaoTema();
  });
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", atualizarBotaoTema);
  document.addEventListener("keydown", focarBuscaComAtalho);
}

async function iniciar() {
  registrarEventos();
  atualizarBotaoTema();
  links = await Armazenamento.carregarLinks();
  EspacoTrabalho.iniciar({
    obterLink,
    listarLinks: () => links,
    avisar,
    aoPedirBusca: focarBusca
  });
  renderizar();
  elementos.busca.focus();
}

iniciar();
