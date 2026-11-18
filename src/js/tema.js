const Tema = (() => {
  const raiz = document.documentElement;
  const midiaEscuro = window.matchMedia("(prefers-color-scheme: dark)");

  function atual() {
    return raiz.dataset.tema || (midiaEscuro.matches ? "escuro" : "claro");
  }

  function aplicar(tema) {
    raiz.dataset.tema = tema;
  }

  function alternar() {
    const novo = atual() === "escuro" ? "claro" : "escuro";
    aplicar(novo);
    Armazenamento.salvarTema(novo);
    return novo;
  }

  const salvo = Armazenamento.lerTema();
  if (salvo === "claro" || salvo === "escuro") aplicar(salvo);

  return { atual, alternar };
})();
