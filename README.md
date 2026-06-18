# MiShiro Tattoo

Aplicação estática e local para orçamento, estoque, agenda, relatórios e backup. Os dados são salvos no IndexedDB do navegador.

## Estrutura

- `index.html`: painel inicial.
- `pages/`: páginas funcionais do aplicativo.
- `src/pages/`: um módulo JavaScript por página.
- `src/models/`: schema e acesso ao IndexedDB.
- `src/services/`: regras de estoque, orçamento, agenda e backup.
- `src/shared/`: componentes e utilitários compartilhados.
- `assets/css/app.css`: folha visual consolidada.

Publique o conteúdo desta pasta na raiz do repositório. Não há arquivos legados, páginas duplicadas, módulos de compatibilidade ou camadas de CSS carregadas dinamicamente.
