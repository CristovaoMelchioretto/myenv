const { spawnSync } = require("child_process");
const path = require("path");
const pacote = require("../package.json");

const { owner, repo } = pacote.build.publish;
const tag = `v${pacote.version}`;
const token = process.env.GH_TOKEN;
const API = `https://api.github.com/repos/${owner}/${repo}/releases`;

function cabecalhos() {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "User-Agent": "myenv-publicar"
  };
}

async function buscarRelease() {
  const resposta = await fetch(API, { headers: cabecalhos() });
  if (!resposta.ok) throw new Error(`GitHub respondeu ${resposta.status} ao listar as releases.`);
  const releases = await resposta.json();
  return releases.find(release => release.tag_name === tag) || null;
}

async function criarRelease() {
  const resposta = await fetch(API, {
    method: "POST",
    headers: cabecalhos(),
    body: JSON.stringify({ tag_name: tag, name: pacote.version, draft: false })
  });
  if (!resposta.ok) throw new Error(`GitHub respondeu ${resposta.status} ao criar a release ${tag}.`);
}

function gerarEPublicar() {
  const binario = path.join(__dirname, "..", "node_modules", ".bin", process.platform === "win32" ? "electron-builder.cmd" : "electron-builder");
  const resultado = spawnSync(binario, ["--win", "nsis", "--publish", "always"], { stdio: "inherit", shell: true });
  process.exit(resultado.status ?? 1);
}

async function publicar() {
  if (!token) throw new Error("Defina a variável GH_TOKEN com um token do GitHub antes de publicar.");
  const existente = await buscarRelease();
  if (existente) {
    console.log(`Release ${tag} já existe; os arquivos serão enviados para ela.`);
  } else {
    await criarRelease();
    console.log(`Release ${tag} criada.`);
  }
  gerarEPublicar();
}

publicar().catch(erro => {
  console.error(erro.message);
  process.exit(1);
});
