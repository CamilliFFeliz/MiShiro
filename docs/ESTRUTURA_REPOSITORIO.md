# Estrutura do repositório MiShiro

Esta organização mantém o GitHub Pages funcionando e separa os arquivos por responsabilidade.

## Raiz

- `index.html`: entrada obrigatória do GitHub Pages.
- `manifest.webmanifest`: manifesto PWA.
- `service-worker.js`: cache e funcionamento offline.
- `style.css`, `mishiro.css`, `mishiro-pdf-tools.css`, `mishiro-ux.css`, `mishiro-studio-pro.css`, `mvc-mishiro.css`: pontes de compatibilidade que importam os estilos reais em `assets/css`.
- `js/main.js`: ponte de compatibilidade que carrega `src/main.js`.

## assets

- `assets/css`: estilos reais da aplicação.
- `assets/icons`: identidade visual e ícones da PWA.

## src

- `src`: módulos principais do aplicativo.
- `src/mvc/modelos`: banco local, esquema e backup.
- `src/mvc/servicos`: regras de negócio.
- `src/mvc/controladores`: controle das telas MVC.

## Compatibilidade

Alguns arquivos finos continuam na raiz e em `js/main.js` para não quebrar links antigos do GitHub Pages, cache de PWA e carregamento inicial do `index.html`.
