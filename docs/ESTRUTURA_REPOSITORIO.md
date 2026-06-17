# Estrutura do repositório MiShiro

Esta organização mantém o GitHub Pages funcional e reduz arquivos soltos na raiz.

## Raiz

- `index.html`: entrada do GitHub Pages.
- `manifest.webmanifest`: manifesto PWA oficial.
- `service-worker.js`: cache e suporte offline.
- `style.css`: única ponte CSS mantida porque o `index.html` ainda carrega este arquivo diretamente.
- `js/main.js`: ponte mínima para carregar `src/main.js` sem quebrar o carregamento antigo.

## assets

- `assets/css`: estilos reais da aplicação.
- `assets/icons`: identidade visual nova do MiShiro.

## src

- `src`: código real da aplicação.
- `src/mvc/modelos`: banco local, esquema e backup.
- `src/mvc/servicos`: regras de negócio.
- `src/mvc/controladores`: telas e eventos MVC.

## Arquivos removidos

- `Database.js`, `Storage.js` e `manifest.json` eram arquivos antigos/duplicados e foram removidos.
- CSS soltos da raiz, exceto `style.css`, foram removidos porque os estilos reais estão em `assets/css`.

## Observação

A pasta `js` permanece somente com `main.js` por compatibilidade. A pasta `icons` permanece por enquanto porque o manifesto e ícones instalados por PWAs antigas ainda podem referenciar esses caminhos em cache.
