# Diagnóstico da correção

## O que quebrou

1. O `index.html` apontava para `styles/main.css`, `styles/components.css` e `styles/responsive.css`, mas estes arquivos não existiam no projeto. O CSS real estava em `style.css`. Resultado: a aplicação abria sem o visual.

2. O HTML foi refatorado para usar containers vazios, como `#screensContainer` e `#modalsContainer`, mas o arquivo `js/dom.js` ainda esperava elementos reais na página, como `#inventoryGrid`, `#itemModal`, `#budgetNameInput`, `#openItemModalButton`, entre outros. Resultado: o JavaScript quebrava ao tentar adicionar eventos em elementos `null`.

3. A navegação lateral usava `data-screen`, mas o JavaScript procurava `data-screen-target`. Resultado: os botões de menu não trocavam de tela corretamente.

4. O botão rápido foi criado como `#quickAddItemButton`, mas o JavaScript esperava `#quickNewItemButton`. Resultado: erro na inicialização.

5. O `service-worker.js` tentava cachear caminhos antigos e absolutos, como `/styles/main.css` e `/js/core/Database.js`. Em GitHub Pages, isso é problemático porque o projeto roda dentro de uma subpasta do domínio.

6. O projeto chamava um arquivo opcional `config/firebase.config.js` que não existia. A dependência foi removida porque a aplicação atual funciona local/offline.

## O que foi corrigido

- Reconstrução do `index.html` com todos os elementos que o `js/dom.js` realmente utiliza.
- Correção do CSS para carregar `style.css` diretamente.
- Correção dos atributos de navegação para `data-screen-target`.
- Correção dos IDs esperados pelo JavaScript.
- Ajuste do service worker para caminhos relativos, compatíveis com GitHub Pages.
- Atualização do manifesto PWA para `MiShiro Orçamentos`.
- Melhoria do `js/state.js` para manter fallback em `localStorage` quando IndexedDB falhar.
- Remoção da referência inexistente ao Firebase.

## Como testar

Use um servidor local estático, por exemplo:

```bash
python -m http.server 8000
```

Depois abra:

```text
http://localhost:8000
```

No GitHub Pages, basta publicar os arquivos na raiz do repositório.
