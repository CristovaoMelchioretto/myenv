# Changelog

Todas as mudanças relevantes do MyEnv ficam registradas aqui.
O formato segue o [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e o projeto usa [versionamento semântico](https://semver.org/lang/pt-BR/).

## [1.2.0] - 2026-11-24

### Adicionado

- A janela abre com o tamanho, a posição e o estado (maximizada ou não) de quando foi fechada. Se o monitor onde ela estava não existir mais, volta ao tamanho padrão.
- Atualização automática: o app procura versão nova nas releases do GitHub, baixa em segundo plano e pergunta se pode reiniciar para atualizar.

### Removido

- Versão portátil. Ela não consegue se atualizar sozinha, então o MyEnv passa a ser distribuído só pelo instalador.

## [1.1.0] - 2026-11-18

### Adicionado

- Links abrem em abas dentro do app, com a cor do ambiente na aba e no topo da página.
- Tela dividida para ver dois ambientes lado a lado, com seletor de link no lado vazio.
- Sessão separada por link, permitindo ficar logado em produção e homologação ao mesmo tempo.
- Botões de voltar, avançar, recarregar, copiar URL e abrir no navegador em cada painel.
- Atalhos: `Shift`+clique abre ao lado, `Ctrl`+clique abre no navegador, `Ctrl+Tab` troca de aba e `Ctrl+W` fecha.
- Mensagem de erro amigável quando a página não carrega, com opção de tentar de novo ou abrir no navegador.

### Segurança

- Páginas embutidas isoladas em sandbox, com permissões negadas e só `http`/`https`.
- Comunicação entre a tela e o processo principal restrita a uma ponte com validação.
- A sessão de um link é apagada quando ele é excluído.

## [1.0.0] - 2026-11-18

### Adicionado

- Cadastro de links por cliente com ambiente (produção, homologação, desenvolvimento ou outro) e observação.
- Cartões coloridos por ambiente, agrupados por cliente.
- Busca sem acento por cliente, nome, URL, observação ou ambiente, com atalho `Ctrl+K`; `Enter` abre o primeiro resultado.
- Filtro por ambiente.
- Botão para alternar entre tema claro e escuro, com a escolha salva; sem escolha, segue o tema do sistema.
- Exportar e importar backup em JSON (`myenv-backup`, versão 1); também aceita os backups antigos em lista simples.
- Aplicativo de desktop para Windows (Electron), portátil ou com instalador.
- Migração automática dos dados do antigo Painel de Links.
