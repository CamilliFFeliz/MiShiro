const SELETOR_ORCAMENTO = "#budgetScreen";
const SELETORES_ABRIR_ORCAMENTO = [
  "[data-home-action='budget']",
  "[data-screen-target='budget']",
  "[data-command-id='budget']"
].join(",");

export function iniciarTelaOrcamento() {
  garantirEntradaOrcamentoNoMenu();
  prepararEstruturaOrcamento();
  vincularAberturaOrcamento();
}

function garantirEntradaOrcamentoNoMenu() {
  const navegacao = document.querySelector(".sidebar-nav");
  if (!navegacao || navegacao.querySelector("[data-screen-target='budget']")) return;

  const botao = document.createElement("button");
  botao.className = "nav-link";
  botao.type = "button";
  botao.dataset.screenTarget = "budget";
  botao.innerHTML = `<span aria-hidden="true"><i data-lucide="file-pen-line"></i></span>Orçamento`;

  const estoque = navegacao.querySelector("[data-screen-target='inventory']");
  if (estoque) {
    estoque.after(botao);
  } else {
    navegacao.append(botao);
  }

  atualizarIcones();
}

function prepararEstruturaOrcamento() {
  const tela = document.querySelector(SELETOR_ORCAMENTO);
  if (!tela || tela.dataset.orcamentoPreparado === "true") return;

  tela.dataset.orcamentoPreparado = "true";
  tela.classList.add("orcamento-app-screen");

  const cabecalho = tela.querySelector(".section-header");
  if (cabecalho && !tela.querySelector(".orcamento-app-intro")) {
    cabecalho.insertAdjacentHTML("afterend", `
      <section class="orcamento-app-intro glass-panel" aria-label="Fluxo do orçamento">
        <div>
          <span>Fluxo de criação</span>
          <strong>Monte a proposta em etapas claras</strong>
          <p>Preencha cliente, dados da tatuagem, materiais estimados e resumo financeiro. Depois exporte o PDF ou envie para o fluxo de aceite.</p>
        </div>
        <ol>
          <li>Cliente</li>
          <li>Tatuagem</li>
          <li>Materiais</li>
          <li>Resumo</li>
        </ol>
      </section>
    `);
  }

  adicionarTituloSecao(tela.querySelector(".budget-form-card > .form-grid"), "Dados principais", "Cliente, tempo, valor/hora, margem e desconto.");
  adicionarTituloSecao(tela.querySelector(".image-upload-card"), "Referência visual", "Imagem, tamanho, cores e observações para o PDF.");
  adicionarTituloSecao(tela.querySelector(".total-grid"), "Resumo financeiro", "Prévia do valor antes de gerar o orçamento.");
  adicionarTituloSecao(tela.querySelector(".budget-picker-card"), "Materiais estimados", "Busque insumos do estoque e adicione ao orçamento.");
  adicionarTituloSecao(tela.querySelector(".cart-card"), "Itens selecionados", "Ajuste quantidades usadas antes de exportar.");
}

function adicionarTituloSecao(elemento, titulo, descricao) {
  if (!elemento || elemento.previousElementSibling?.classList?.contains("orcamento-section-title")) return;

  const cabecalho = document.createElement("div");
  cabecalho.className = "orcamento-section-title";
  cabecalho.innerHTML = `<span>${titulo}</span><p>${descricao}</p>`;
  elemento.before(cabecalho);
}

function vincularAberturaOrcamento() {
  document.addEventListener("click", (evento) => {
    const acionador = evento.target.closest(SELETORES_ABRIR_ORCAMENTO);
    if (!acionador) return;

    const destino = acionador.dataset.homeAction || acionador.dataset.screenTarget || acionador.dataset.commandId;
    if (destino !== "budget") return;

    evento.preventDefault();
    evento.stopPropagation();
    evento.stopImmediatePropagation();
    abrirTelaOrcamento();
  }, true);
}

function abrirTelaOrcamento() {
  const tela = document.querySelector(SELETOR_ORCAMENTO);
  if (!tela) {
    console.error("MiShiro: tela de orçamento não encontrada no HTML.");
    return;
  }

  prepararEstruturaOrcamento();

  document.querySelectorAll(".screen-panel").forEach((painel) => {
    const ativo = painel === tela;
    painel.classList.toggle("is-active", ativo);
    if (ativo) {
      painel.removeAttribute("hidden");
      painel.style.removeProperty("display");
      painel.style.removeProperty("visibility");
      painel.style.removeProperty("opacity");
    }
  });

  tela.classList.add("budget-screen-ready", "orcamento-visivel");

  document.querySelectorAll(".nav-link").forEach((botao) => {
    botao.classList.toggle("is-active", botao.dataset.screenTarget === "budget");
  });

  const titulo = document.querySelector("#pageTitle");
  const subtitulo = document.querySelector("#pageEyebrow");
  const botaoNovoItem = document.querySelector("#quickNewItemButton");

  if (titulo) titulo.textContent = "Orçamento";
  if (subtitulo) subtitulo.textContent = "Proposta do cliente";
  if (botaoNovoItem) botaoNovoItem.hidden = true;

  fecharMenuResponsivo();
  atualizarIcones();

  window.requestAnimationFrame(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    verificarRenderizacaoOrcamento(tela);
  });
}

function verificarRenderizacaoOrcamento(tela) {
  const altura = tela.getBoundingClientRect().height;
  const possuiConteudo = Boolean(tela.querySelector(".budget-form-card, .budget-picker-card, .cart-card"));

  if (altura < 80 || !possuiConteudo) {
    tela.classList.add("orcamento-renderizacao-forcada");
    console.warn("MiShiro: orçamento estava sem altura útil; renderização forçada aplicada.");
  }
}

function fecharMenuResponsivo() {
  const menu = document.querySelector("#sidebar");
  const fundo = document.querySelector("#drawerBackdrop");
  menu?.classList.remove("is-open");
  if (fundo) fundo.hidden = true;
}

function atualizarIcones() {
  if (window.lucide?.createIcons) window.lucide.createIcons();
}
