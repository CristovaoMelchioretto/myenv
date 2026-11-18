const EspacoTrabalho = (() => {
  const ponte = window.myenv ?? null;
  const LADOS = ["esquerda", "direita"];
  const LIMITE_SUGESTOES = 60;

  const estado = {
    abas: [],
    paineis: { esquerda: null, direita: null },
    dividido: false,
    ladoEmFoco: "esquerda",
    mostrandoInicio: true
  };

  const elementos = {
    abaInicio: document.querySelector("#abaInicio"),
    abasAbertas: document.querySelector("#abasAbertas"),
    botaoDividir: document.querySelector("#btnDividir"),
    inicio: document.querySelector("#inicio"),
    trabalho: document.querySelector("#trabalho"),
    paineis: {
      esquerda: document.querySelector('.painel[data-lado="esquerda"]'),
      direita: document.querySelector('.painel[data-lado="direita"]')
    }
  };

  let opcoes = null;
  let quadroDeLayout = 0;

  function ladoOposto(lado) {
    return lado === "esquerda" ? "direita" : "esquerda";
  }

  function abaPorId(abaId) {
    return estado.abas.find(aba => aba.id === abaId) || null;
  }

  function abaDoLink(linkId) {
    return estado.abas.find(aba => aba.linkId === linkId) || null;
  }

  function linkDaAba(aba) {
    return opcoes.obterLink(aba.linkId);
  }

  function ladoDaAba(abaId) {
    return LADOS.find(lado => ladoVisivel(lado) && estado.paineis[lado] === abaId) || null;
  }

  function ladoVisivel(lado) {
    return lado === "esquerda" || estado.dividido;
  }

  function abaAtiva() {
    if (estado.mostrandoInicio) return null;
    return estado.paineis[estado.ladoEmFoco] || estado.paineis.esquerda;
  }

  function abaMaisRecente(idsIgnorados) {
    const candidatas = estado.abas.filter(aba => !idsIgnorados.includes(aba.id));
    candidatas.sort((a, b) => b.ultimoUso - a.ultimoUso);
    return candidatas[0] || null;
  }

  function marcarUso(abaId) {
    const aba = abaPorId(abaId);
    if (aba) aba.ultimoUso = Date.now();
  }

  function garantirAba(link) {
    const existente = abaDoLink(link.id);
    if (existente) return existente;
    const aba = {
      id: gerarId(),
      linkId: link.id,
      ultimoUso: Date.now(),
      pagina: { url: link.url, titulo: "", carregando: true, podeVoltar: false, podeAvancar: false, erro: null }
    };
    estado.abas.push(aba);
    ponte.abrirAba(aba.id, link.id, link.url);
    return aba;
  }

  function colocarNoLado(lado, abaId) {
    const oposto = ladoOposto(lado);
    if (estado.paineis[oposto] === abaId) estado.paineis[oposto] = estado.paineis[lado];
    estado.paineis[lado] = abaId;
    if (!estado.dividido) estado.paineis.direita = null;
    estado.ladoEmFoco = lado;
    estado.mostrandoInicio = false;
    marcarUso(abaId);
  }

  function focarLado(lado) {
    estado.ladoEmFoco = lado;
    const abaId = estado.paineis[lado];
    if (abaId) ponte.focarAba(abaId);
  }

  function mostrarAba(abaId) {
    const lado = estado.dividido ? ladoDaAba(abaId) || estado.ladoEmFoco : "esquerda";
    colocarNoLado(lado, abaId);
    renderizar();
    ponte.focarAba(abaId);
  }

  function abrir(link) {
    mostrarAba(garantirAba(link).id);
  }

  function abrirNoLado(lado, link) {
    const aba = garantirAba(link);
    colocarNoLado(lado, aba.id);
    renderizar();
    ponte.focarAba(aba.id);
  }

  function abrirAoLado(link) {
    const aba = garantirAba(link);
    const esquerdaAtual = estado.paineis.esquerda;
    estado.dividido = true;
    estado.mostrandoInicio = false;
    if (esquerdaAtual && esquerdaAtual !== aba.id) {
      estado.paineis.direita = aba.id;
    } else {
      const outra = abaMaisRecente([aba.id]);
      estado.paineis.esquerda = outra ? outra.id : aba.id;
      estado.paineis.direita = outra ? aba.id : null;
    }
    estado.ladoEmFoco = estado.paineis.direita === aba.id ? "direita" : "esquerda";
    marcarUso(aba.id);
    renderizar();
    ponte.focarAba(aba.id);
  }

  function desfazerDivisao(ladoQueFica) {
    estado.paineis.esquerda = estado.paineis[ladoQueFica] || estado.paineis[ladoOposto(ladoQueFica)];
    estado.paineis.direita = null;
    estado.dividido = false;
    estado.ladoEmFoco = "esquerda";
    if (!estado.paineis.esquerda) estado.mostrandoInicio = true;
  }

  function alternarDivisao() {
    if (estado.dividido) {
      desfazerDivisao(estado.ladoEmFoco);
      renderizar();
      return;
    }
    const esquerda = estado.paineis.esquerda ? abaPorId(estado.paineis.esquerda) : abaMaisRecente([]);
    if (!esquerda) {
      opcoes.avisar("Abra um link para dividir a tela.");
      return;
    }
    estado.dividido = true;
    estado.mostrandoInicio = false;
    estado.paineis.esquerda = esquerda.id;
    const direita = abaMaisRecente([esquerda.id]);
    estado.paineis.direita = direita ? direita.id : null;
    estado.ladoEmFoco = "direita";
    renderizar();
  }

  function reorganizarAposFechar() {
    if (!estado.paineis.esquerda && estado.paineis.direita) {
      estado.paineis.esquerda = estado.paineis.direita;
      estado.paineis.direita = null;
    }
    if (!estado.paineis.esquerda) {
      const recente = abaMaisRecente([]);
      estado.paineis.esquerda = recente ? recente.id : null;
    }
    if (!estado.paineis.esquerda) {
      estado.dividido = false;
      estado.mostrandoInicio = true;
    }
    if (!estado.paineis[estado.ladoEmFoco]) estado.ladoEmFoco = "esquerda";
  }

  function fecharAba(abaId) {
    if (!abaPorId(abaId)) return;
    ponte.fecharAba(abaId);
    estado.abas = estado.abas.filter(aba => aba.id !== abaId);
    for (const lado of LADOS) {
      if (estado.paineis[lado] === abaId) estado.paineis[lado] = null;
    }
    reorganizarAposFechar();
    renderizar();
  }

  function esquecerLink(linkId) {
    const aba = abaDoLink(linkId);
    if (aba) fecharAba(aba.id);
    if (ponte) ponte.limparSessao(linkId);
  }

  function sincronizar() {
    if (!ponte) return;
    const orfas = estado.abas.filter(aba => !linkDaAba(aba));
    orfas.forEach(aba => fecharAba(aba.id));
    renderizar();
  }

  function mostrarInicio() {
    estado.mostrandoInicio = true;
    renderizar();
  }

  function alternarAba(passo) {
    const sequencia = [null, ...estado.abas.map(aba => aba.id)];
    const atual = sequencia.indexOf(abaAtiva());
    const proxima = sequencia[(atual + passo + sequencia.length) % sequencia.length];
    if (proxima) mostrarAba(proxima);
    else mostrarInicio();
  }

  function mensagemDoErro(erro) {
    const descricao = String(erro.descricao || "");
    if (/CERT|SSL/i.test(descricao)) {
      return "O certificado de segurança deste site não é válido. Por segurança, o MyEnv não abre a página; use o navegador para ver os detalhes.";
    }
    if (/NAME_NOT_RESOLVED/i.test(descricao)) return "O endereço não foi encontrado. Confira a URL ou a conexão com a VPN.";
    if (/INTERNET_DISCONNECTED/i.test(descricao)) return "Sem conexão com a internet.";
    if (/CONNECTION_REFUSED|CONNECTION_TIMED_OUT|TIMED_OUT|ADDRESS_UNREACHABLE/i.test(descricao)) {
      return "O servidor não respondeu. Ele pode estar fora do ar ou exigir VPN.";
    }
    return `A página não carregou (${escaparHtml(descricao) || "erro " + erro.codigo}).`;
  }

  function htmlDaAba(aba) {
    const link = linkDaAba(aba);
    if (!link) return "";
    const ambiente = ambienteValido(link.ambiente);
    const ativa = aba.id === abaAtiva();
    const visivel = !estado.mostrandoInicio && Boolean(ladoDaAba(aba.id));
    const classes = ["aba", `ambiente-${ambiente}`, ativa ? "ativa" : "", visivel ? "visivel" : "", aba.pagina.carregando ? "carregando" : ""];
    return `
      <div class="${classes.join(" ")}" role="tab" tabindex="0" aria-selected="${ativa}" data-aba-id="${aba.id}" title="${escaparHtml(aba.pagina.titulo || link.url)}">
        <span class="aba-ponto"></span>
        <span class="aba-titulo">${escaparHtml(tituloDoLink(link))}</span>
        <span class="aba-sigla">${AMBIENTES[ambiente].sigla}</span>
        <button class="aba-fechar" type="button" data-fechar="${aba.id}" title="Fechar aba (Ctrl+W)" aria-label="Fechar aba">${icone("fechar")}</button>
      </div>`;
  }

  function renderizarAbas() {
    elementos.abaInicio.classList.toggle("ativa", estado.mostrandoInicio);
    elementos.abaInicio.setAttribute("aria-selected", String(estado.mostrandoInicio));
    elementos.abasAbertas.innerHTML = estado.abas.map(htmlDaAba).join("");
    elementos.botaoDividir.hidden = !ponte || !estado.abas.length;
    elementos.botaoDividir.classList.toggle("ligado", estado.dividido);
    elementos.botaoDividir.setAttribute("aria-pressed", String(estado.dividido));
    elementos.botaoDividir.title = estado.dividido ? "Voltar para uma tela" : "Dividir a tela em duas";
  }

  function botaoDoPainel(acao, titulo, desabilitado) {
    return `<button type="button" class="icone" data-acao="${acao}" title="${titulo}" aria-label="${titulo}" ${desabilitado ? "disabled" : ""}>${icone(acao === "fecharLado" ? "fechar" : acao)}</button>`;
  }

  function htmlDoTopo(aba, link) {
    const ambiente = dadosDoAmbiente(link.ambiente);
    const { pagina } = aba;
    return `
      <span class="selo">${ambiente.nome}</span>
      <span class="painel-titulo">${escaparHtml(tituloDoLink(link))}</span>
      <span class="painel-url" title="${escaparHtml(pagina.url)}">${escaparHtml(pagina.url)}</span>
      <div class="painel-acoes">
        ${botaoDoPainel("voltar", "Voltar (Alt+←)", !pagina.podeVoltar)}
        ${botaoDoPainel("avancar", "Avançar (Alt+→)", !pagina.podeAvancar)}
        ${botaoDoPainel("recarregar", "Recarregar (F5)", false)}
        ${botaoDoPainel("copiar", "Copiar URL", false)}
        ${botaoDoPainel("navegador", "Abrir no navegador", false)}
        ${estado.dividido ? botaoDoPainel("fecharLado", "Fechar este lado", false) : ""}
      </div>`;
  }

  function htmlDoErro(aba) {
    const { erro } = aba.pagina;
    return `
      <div class="painel-erro">
        <h3>Não foi possível abrir a página</h3>
        <p>${mensagemDoErro(erro)}</p>
        <p class="painel-erro-url">${escaparHtml(erro.url || aba.pagina.url)}</p>
        <div class="painel-erro-acoes">
          <button type="button" class="primario" data-acao="recarregar">Tentar de novo</button>
          <button type="button" data-acao="navegador">Abrir no navegador</button>
        </div>
      </div>`;
  }

  function htmlDoSeletor() {
    const esquerda = estado.paineis.esquerda ? abaPorId(estado.paineis.esquerda) : null;
    const linkEsquerda = esquerda ? linkDaAba(esquerda) : null;
    const referencia = linkEsquerda ? ` com <b>${escaparHtml(tituloDoLink(linkEsquerda))}</b>` : "";
    return `
      <div class="seletor">
        <h3>Abrir ao lado</h3>
        <p>Escolha o ambiente para ver lado a lado${referencia}.</p>
        <input type="search" class="seletor-busca" placeholder="Buscar cliente, nome ou ambiente" autocomplete="off">
        <div class="seletor-lista"></div>
      </div>`;
  }

  function sugestoesDoSeletor(lado, texto) {
    const outraAba = abaPorId(estado.paineis[ladoOposto(lado)]);
    const outroLink = outraAba ? linkDaAba(outraAba) : null;
    const palavras = palavrasDaBusca(texto);
    const mesmoCliente = link => (outroLink && link.cliente === outroLink.cliente ? 0 : 1);
    return opcoes.listarLinks()
      .filter(link => !outroLink || link.id !== outroLink.id)
      .filter(link => linkAtendeBusca(link, palavras))
      .sort((a, b) => mesmoCliente(a) - mesmoCliente(b) || compararTexto(a.cliente, b.cliente) || compararLinks(a, b))
      .slice(0, LIMITE_SUGESTOES);
  }

  function atualizarSugestoes(painel) {
    const lado = painel.dataset.lado;
    const busca = painel.querySelector(".seletor-busca");
    const lista = painel.querySelector(".seletor-lista");
    const sugestoes = sugestoesDoSeletor(lado, busca.value);
    lista.innerHTML = sugestoes.length
      ? sugestoes.map(link => {
          const ambiente = ambienteValido(link.ambiente);
          const aberta = abaDoLink(link.id) ? '<span class="seletor-aberta">aberta</span>' : "";
          return `
            <button type="button" class="seletor-item ambiente-${ambiente}" data-link-id="${escaparHtml(link.id)}">
              <span class="selo">${AMBIENTES[ambiente].sigla}</span>
              <span class="seletor-titulo">${escaparHtml(tituloDoLink(link))}</span>
              ${aberta}
            </button>`;
        }).join("")
      : '<p class="seletor-vazio">Nenhum link encontrado.</p>';
  }

  function renderizarPainel(lado) {
    const painel = elementos.paineis[lado];
    const topo = painel.querySelector(".painel-topo");
    const mensagem = painel.querySelector(".painel-mensagem");
    const aba = abaPorId(estado.paineis[lado]);
    const link = aba ? linkDaAba(aba) : null;

    painel.hidden = !ladoVisivel(lado);
    painel.classList.toggle("em-foco", estado.dividido && estado.ladoEmFoco === lado);
    painel.className = painel.className.replace(/\bambiente-\S+/g, "").trim();

    if (!aba || !link) {
      topo.hidden = true;
      painel.classList.remove("carregando");
      if (painel.dataset.conteudo !== "seletor") {
        mensagem.innerHTML = htmlDoSeletor();
        painel.dataset.conteudo = "seletor";
        atualizarSugestoes(painel);
      }
      mensagem.hidden = false;
      return;
    }

    painel.classList.add(`ambiente-${ambienteValido(link.ambiente)}`);
    painel.classList.toggle("carregando", aba.pagina.carregando);
    topo.hidden = false;
    topo.innerHTML = htmlDoTopo(aba, link);
    painel.dataset.conteudo = aba.pagina.erro ? `erro:${aba.id}` : aba.id;
    mensagem.hidden = !aba.pagina.erro;
    mensagem.innerHTML = aba.pagina.erro ? htmlDoErro(aba) : "";
  }

  function renderizarTrabalho() {
    elementos.inicio.hidden = !estado.mostrandoInicio;
    elementos.trabalho.hidden = estado.mostrandoInicio;
    elementos.trabalho.classList.toggle("dividido", estado.dividido);
    if (estado.mostrandoInicio) return;
    LADOS.forEach(renderizarPainel);
  }

  function enviarLayout() {
    const itens = [];
    if (!estado.mostrandoInicio) {
      for (const lado of LADOS) {
        const aba = abaPorId(estado.paineis[lado]);
        if (!aba || !ladoVisivel(lado) || aba.pagina.erro) continue;
        const area = elementos.paineis[lado].querySelector(".painel-corpo").getBoundingClientRect();
        itens.push({ abaId: aba.id, retangulo: { x: area.left, y: area.top, width: area.width, height: area.height } });
      }
    }
    ponte.definirLayout(itens);
  }

  function agendarLayout() {
    if (!ponte) return;
    cancelAnimationFrame(quadroDeLayout);
    quadroDeLayout = requestAnimationFrame(enviarLayout);
  }

  function renderizar() {
    if (!opcoes) return;
    renderizarAbas();
    renderizarTrabalho();
    agendarLayout();
  }

  function atualizarPagina(dados) {
    const aba = abaPorId(dados.abaId);
    if (!aba) return;
    const erroMudou = Boolean(aba.pagina.erro) !== Boolean(dados.erro);
    aba.pagina = {
      url: dados.url,
      titulo: dados.titulo,
      carregando: dados.carregando,
      podeVoltar: dados.podeVoltar,
      podeAvancar: dados.podeAvancar,
      erro: dados.erro
    };
    renderizarAbas();
    const lado = ladoDaAba(aba.id);
    if (lado && !estado.mostrandoInicio) renderizarPainel(lado);
    if (erroMudou) agendarLayout();
  }

  function tratarFocoExterno({ abaId }) {
    const lado = ladoDaAba(abaId);
    if (!lado || lado === estado.ladoEmFoco) return;
    estado.ladoEmFoco = lado;
    marcarUso(abaId);
    renderizarAbas();
    LADOS.forEach(item => elementos.paineis[item].classList.toggle("em-foco", estado.dividido && item === lado));
  }

  function tratarAtalho({ atalho, abaId }) {
    if (atalho === "busca") opcoes.aoPedirBusca();
    if (atalho === "fecharAba") fecharAba(abaId);
    if (atalho === "proximaAba") alternarAba(1);
    if (atalho === "abaAnterior") alternarAba(-1);
  }

  function copiarUrl(url) {
    navigator.clipboard.writeText(url).then(
      () => opcoes.avisar("URL copiada."),
      () => opcoes.avisar("Não foi possível copiar.")
    );
  }

  function executarAcaoDoPainel(lado, acao) {
    const abaId = estado.paineis[lado];
    const aba = abaPorId(abaId);
    if (acao === "fecharLado") {
      desfazerDivisao(ladoOposto(lado));
      renderizar();
      return;
    }
    if (!aba) return;
    if (acao === "navegador") ponte.abrirNoNavegador(aba.pagina.erro?.url || aba.pagina.url);
    else if (acao === "copiar") copiarUrl(aba.pagina.url);
    else ponte.navegar(abaId, acao);
  }

  function tratarCliqueNoTrabalho(evento) {
    const painel = evento.target.closest(".painel");
    if (!painel) return;
    const lado = painel.dataset.lado;

    const item = evento.target.closest(".seletor-item");
    if (item) {
      const link = opcoes.obterLink(item.dataset.linkId);
      if (link) abrirNoLado(lado, link);
      return;
    }

    const botao = evento.target.closest("button[data-acao]");
    if (botao) {
      executarAcaoDoPainel(lado, botao.dataset.acao);
      return;
    }

    if (estado.ladoEmFoco !== lado) {
      focarLado(lado);
      renderizar();
    }
  }

  function tratarTeclaNoSeletor(evento) {
    if (!evento.target.matches(".seletor-busca") || evento.key !== "Enter") return;
    const primeiro = evento.target.closest(".painel").querySelector(".seletor-item");
    if (primeiro) primeiro.click();
  }

  function tratarCliqueNasAbas(evento) {
    const fechar = evento.target.closest("[data-fechar]");
    if (fechar) {
      evento.stopPropagation();
      fecharAba(fechar.dataset.fechar);
      return;
    }
    const aba = evento.target.closest("[data-aba-id]");
    if (aba) mostrarAba(aba.dataset.abaId);
  }

  function tratarCliqueDoMeio(evento) {
    if (evento.button !== 1) return;
    const aba = evento.target.closest("[data-aba-id]");
    if (!aba) return;
    evento.preventDefault();
    fecharAba(aba.dataset.abaId);
  }

  function tratarTeclaNasAbas(evento) {
    if (evento.key !== "Enter" && evento.key !== " ") return;
    const aba = evento.target.closest("[data-aba-id]");
    if (!aba) return;
    evento.preventDefault();
    mostrarAba(aba.dataset.abaId);
  }

  function tratarTeclaGlobal(evento) {
    const ctrl = evento.ctrlKey || evento.metaKey;
    if (ctrl && evento.key.toLowerCase() === "w") {
      evento.preventDefault();
      const ativa = abaAtiva();
      if (ativa) fecharAba(ativa);
    }
    if (ctrl && evento.key === "Tab") {
      evento.preventDefault();
      alternarAba(evento.shiftKey ? -1 : 1);
    }
  }

  function registrarEventos() {
    elementos.abaInicio.addEventListener("click", mostrarInicio);
    elementos.abasAbertas.addEventListener("click", tratarCliqueNasAbas);
    elementos.abasAbertas.addEventListener("auxclick", tratarCliqueDoMeio);
    elementos.abasAbertas.addEventListener("keydown", tratarTeclaNasAbas);
    elementos.botaoDividir.addEventListener("click", alternarDivisao);
    elementos.trabalho.addEventListener("click", tratarCliqueNoTrabalho);
    elementos.trabalho.addEventListener("keydown", tratarTeclaNoSeletor);
    elementos.trabalho.addEventListener("input", evento => {
      if (evento.target.matches(".seletor-busca")) atualizarSugestoes(evento.target.closest(".painel"));
    });
    document.addEventListener("keydown", tratarTeclaGlobal);
    window.addEventListener("resize", agendarLayout);
    new ResizeObserver(agendarLayout).observe(elementos.trabalho);
    ponte.aoMudarEstado(atualizarPagina);
    ponte.aoFocarAba(tratarFocoExterno);
    ponte.aoUsarAtalho(tratarAtalho);
  }

  function iniciar(configuracao) {
    opcoes = configuracao;
    document.body.classList.toggle("integrado", Boolean(ponte));
    if (ponte) registrarEventos();
    renderizar();
  }

  return {
    disponivel: Boolean(ponte),
    iniciar,
    abrir,
    abrirAoLado,
    abrirNoNavegador: url => ponte && ponte.abrirNoNavegador(url),
    esquecerLink,
    sincronizar,
    mostrarInicio,
    renderizar
  };
})();
