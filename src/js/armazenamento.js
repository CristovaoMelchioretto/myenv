const Armazenamento = (() => {
  const CHAVE_LINKS = "myenv-links-v1";
  const CHAVE_LINKS_ANTIGA = "painel-links-v1";
  const CHAVE_TEMA = "myenv-tema";

  function ler(chave) {
    try {
      return localStorage.getItem(chave);
    } catch (erro) {
      return null;
    }
  }

  function gravar(chave, valor) {
    try {
      localStorage.setItem(chave, valor);
      return true;
    } catch (erro) {
      return false;
    }
  }

  function remover(chave) {
    try {
      localStorage.removeItem(chave);
    } catch (erro) {
      console.warn(`Não foi possível remover a chave ${chave}:`, erro);
    }
  }

  function migrarChaveAntiga() {
    const antigo = ler(CHAVE_LINKS_ANTIGA);
    if (ler(CHAVE_LINKS) !== null || antigo === null) return;
    if (gravar(CHAVE_LINKS, antigo)) remover(CHAVE_LINKS_ANTIGA);
  }

  async function carregarLinks() {
    migrarChaveAntiga();
    const salvo = ler(CHAVE_LINKS);
    if (!salvo) return [];
    try {
      const dados = JSON.parse(salvo);
      return Array.isArray(dados) ? dados : [];
    } catch (erro) {
      return [];
    }
  }

  async function salvarLinks(links) {
    if (!gravar(CHAVE_LINKS, JSON.stringify(links))) throw new Error("Falha ao gravar");
  }

  function lerTema() {
    return ler(CHAVE_TEMA);
  }

  function salvarTema(tema) {
    gravar(CHAVE_TEMA, tema);
  }

  return { carregarLinks, salvarLinks, lerTema, salvarTema };
})();
