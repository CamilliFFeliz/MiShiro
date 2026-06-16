const PROFILE_STORAGE_KEY = "MISHIRO_STUDIO_PROFILE_V1";
const COMMANDS = [
  { id: "home", label: "Ir para início", hint: "Visão geral", action: () => clickScreen("home") },
  { id: "inventory", label: "Abrir estoque", hint: "Cadastrar e revisar insumos", action: () => clickScreen("inventory") },
  { id: "budget", label: "Abrir orçamento", hint: "Montar proposta", action: () => clickScreen("budget") },
  { id: "reports", label: "Abrir relatórios", hint: "Ver indicadores", action: () => clickScreen("reports") },
  { id: "client", label: "Focar cliente", hint: "Preencher nome do cliente", action: () => focusField("#clientNameInput") },
  { id: "image", label: "Adicionar referência", hint: "Imagem da tatuagem", action: () => focusField("#referenceImageInput") },
  { id: "internal-pdf", label: "Gerar PDF do estúdio", hint: "Custos completos", action: () => document.querySelector("#exportInternalPdfButton")?.click() },
  { id: "client-pdf", label: "Gerar PDF para cliente", hint: "Proposta simplificada", action: () => document.querySelector("#exportClientPdfButton")?.click() }
];
const PRESETS = {
  flash: {
    label: "Flash / pequena",
    duration: "1,5",
    margin: "35",
    discount: "0",
    note: "Proposta calculada para tatuagem pequena, com arte objetiva e sessão curta."
  },
  media: {
    label: "Sessão média",
    duration: "3",
    margin: "45",
    discount: "5",
    note: "Proposta calculada para sessão média, considerando preparo, aplicação e finalização."
  },
  grande: {
    label: "Projeto grande",
    duration: "6",
    margin: "55",
    discount: "0",
    note: "Projeto maior com maior tempo de execução, planejamento e consumo de materiais."
  },
  cobertura: {
    label: "Cobertura / reforma",
    duration: "4,5",
    margin: "60",
    discount: "0",
    note: "Cobertura ou reforma pode exigir ajustes de arte, contraste e tempo adicional de sessão."
  }
};

let commandDialog = null;
let commandSearchInput = null;
let commandList = null;
let panelElements = {};

export function setupStudioProLayer() {
  injectStudioPanel();
  injectCommandPalette();
  bindStudioEvents();
  loadStudioProfile();
  updateBudgetIntelligence();
}

function injectStudioPanel() {
  const budgetFormCard = document.querySelector(".budget-form-card");

  if (!budgetFormCard || document.querySelector("#studioProPanel")) {
    return;
  }

  const panel = document.createElement("section");
  panel.id = "studioProPanel";
  panel.className = "studio-pro-panel glass-panel";
  panel.innerHTML = `
    <div class="studio-pro-header">
      <div>
        <span>Modo Estúdio Pro</span>
        <h3>Atendimento, presets e inteligência do orçamento</h3>
      </div>
      <button class="ghost-button" id="openCommandPaletteButton" type="button"><i data-lucide="command" aria-hidden="true"></i>Comandos</button>
    </div>

    <div class="studio-pro-grid">
      <article class="studio-pro-card studio-profile-card">
        <span>Perfil do estúdio</span>
        <div class="studio-mini-form">
          <label><small>Nome do estúdio</small><input id="studioNameInput" type="text" placeholder="Ex: MiShiro Studio" /></label>
          <label><small>Artista</small><input id="artistNameInput" type="text" placeholder="Ex: Camilli" /></label>
          <label><small>Contato</small><input id="studioContactInput" type="text" placeholder="WhatsApp / Instagram" /></label>
          <label><small>Sinal sugerido (%)</small><input id="bookingSignalInput" type="text" inputmode="decimal" placeholder="30" /></label>
        </div>
      </article>

      <article class="studio-pro-card">
        <span>Presets rápidos</span>
        <div class="preset-grid" id="studioPresetGrid">
          ${Object.entries(PRESETS).map(([id, preset]) => `<button type="button" data-studio-preset="${id}">${preset.label}</button>`).join("")}
        </div>
        <p class="studio-pro-note">Aplica duração, margem, desconto e observação base sem apagar os itens já adicionados.</p>
      </article>

      <article class="studio-pro-card studio-score-card">
        <span>Saúde do orçamento</span>
        <strong id="budgetHealthScore">0%</strong>
        <div class="health-track"><i id="budgetHealthBar"></i></div>
        <p id="budgetHealthText">Preencha os dados principais para avaliar.</p>
      </article>
    </div>

    <div class="studio-pro-grid compact">
      <article class="studio-pro-card">
        <span>Checklist de atendimento</span>
        <ul class="studio-checklist" id="studioChecklist"></ul>
      </article>
      <article class="studio-pro-card">
        <span>Ações comerciais</span>
        <div class="studio-action-stack">
          <button class="secondary-button" id="copyClientMessageButton" type="button"><i data-lucide="messages-square" aria-hidden="true"></i>Copiar mensagem para cliente</button>
          <button class="ghost-button" id="copyBudgetSummaryButton" type="button"><i data-lucide="clipboard-copy" aria-hidden="true"></i>Copiar resumo interno</button>
        </div>
        <p class="studio-copy-feedback" id="studioCopyFeedback" aria-live="polite"></p>
      </article>
    </div>
  `;
  budgetFormCard.insertAdjacentElement("afterbegin", panel);

  panelElements = {
    panel,
    checklist: panel.querySelector("#studioChecklist"),
    score: panel.querySelector("#budgetHealthScore"),
    bar: panel.querySelector("#budgetHealthBar"),
    text: panel.querySelector("#budgetHealthText"),
    feedback: panel.querySelector("#studioCopyFeedback")
  };
  refreshIcons();
}

function injectCommandPalette() {
  if (document.querySelector("#commandPaletteDialog")) {
    return;
  }

  commandDialog = document.createElement("dialog");
  commandDialog.id = "commandPaletteDialog";
  commandDialog.className = "command-palette-dialog";
  commandDialog.innerHTML = `
    <section class="command-palette-card">
      <header>
        <div>
          <span>Comando rápido</span>
          <h3>Navegue e aja sem procurar botões</h3>
        </div>
        <button class="ghost-button" type="button" data-close-command><i data-lucide="x" aria-hidden="true"></i></button>
      </header>
      <label class="command-search-field">
        <i data-lucide="search" aria-hidden="true"></i>
        <input id="commandSearchInput" type="search" placeholder="Digite: estoque, pdf, cliente, relatório..." autocomplete="off" />
      </label>
      <div class="command-list" id="commandList"></div>
    </section>
  `;
  document.body.append(commandDialog);
  commandSearchInput = commandDialog.querySelector("#commandSearchInput");
  commandList = commandDialog.querySelector("#commandList");
  renderCommandList(COMMANDS);
  refreshIcons();
}

function bindStudioEvents() {
  document.querySelector("#studioPresetGrid")?.addEventListener("click", (event) => {
    const presetButton = event.target.closest("[data-studio-preset]");

    if (presetButton) {
      applyPreset(presetButton.dataset.studioPreset);
    }
  });

  document.querySelector("#openCommandPaletteButton")?.addEventListener("click", openCommandPalette);
  document.querySelector("#copyClientMessageButton")?.addEventListener("click", () => copyText(createClientMessage(), "Mensagem do cliente copiada."));
  document.querySelector("#copyBudgetSummaryButton")?.addEventListener("click", () => copyText(createInternalSummary(), "Resumo interno copiado."));

  ["#studioNameInput", "#artistNameInput", "#studioContactInput", "#bookingSignalInput"].forEach((selector) => {
    document.querySelector(selector)?.addEventListener("input", saveStudioProfile);
  });

  ["#budgetNameInput", "#clientNameInput", "#hourlyRateInput", "#sessionDurationInput", "#profitMarginInput", "#discountPercentInput", "#tattooSizeInput", "#tattooColorsInput", "#clientPdfNotesInput"].forEach((selector) => {
    document.querySelector(selector)?.addEventListener("input", updateBudgetIntelligence);
  });

  document.querySelector("#referenceImageInput")?.addEventListener("change", () => window.setTimeout(updateBudgetIntelligence, 120));
  document.querySelector("#removeReferenceImageButton")?.addEventListener("click", () => window.setTimeout(updateBudgetIntelligence, 120));
  document.querySelector("#stockPickerList")?.addEventListener("click", () => window.setTimeout(updateBudgetIntelligence, 120));
  document.querySelector("#cartList")?.addEventListener("click", () => window.setTimeout(updateBudgetIntelligence, 120));
  document.querySelector("#cartList")?.addEventListener("change", () => window.setTimeout(updateBudgetIntelligence, 120));

  commandDialog?.addEventListener("click", (event) => {
    if (event.target === commandDialog || event.target.closest("[data-close-command]")) {
      closeCommandPalette();
    }

    const commandButton = event.target.closest("[data-command-id]");

    if (commandButton) {
      runCommand(commandButton.dataset.commandId);
    }
  });

  commandSearchInput?.addEventListener("input", () => {
    const query = normalizeSearch(commandSearchInput.value);
    const filteredCommands = COMMANDS.filter((command) => normalizeSearch(`${command.label} ${command.hint}`).includes(query));
    renderCommandList(filteredCommands);
  });

  document.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      openCommandPalette();
    }

    if (event.key === "Escape" && commandDialog?.open) {
      closeCommandPalette();
    }
  });
}

function applyPreset(presetId) {
  const preset = PRESETS[presetId];

  if (!preset) {
    return;
  }

  setInputValue("#sessionDurationInput", preset.duration);
  setInputValue("#profitMarginInput", preset.margin);
  setInputValue("#discountPercentInput", preset.discount);
  setInputValue("#clientPdfNotesInput", preset.note);
  showFeedback(`Preset aplicado: ${preset.label}.`);
  updateBudgetIntelligence();
}

function updateBudgetIntelligence() {
  const state = readScreenState();
  const checks = [
    { label: "Cliente informado", done: Boolean(state.clientName), hint: "Preencha o nome do cliente." },
    { label: "Projeto nomeado", done: Boolean(state.budgetName), hint: "Dê um nome claro para o orçamento." },
    { label: "Imagem de referência", done: state.hasReferenceImage, hint: "Anexe a referência para o PDF do cliente." },
    { label: "Itens adicionados", done: state.itemCount > 0, hint: "Adicione ao menos um insumo ao orçamento." },
    { label: "Tempo e hora definidos", done: state.duration > 0 && state.hourlyRate > 0, hint: "Informe duração e valor da hora." },
    { label: "Valor final calculado", done: state.finalPrice > 0, hint: "Confirme se o valor final apareceu corretamente." }
  ];
  const completed = checks.filter((check) => check.done).length;
  const score = Math.round((completed / checks.length) * 100);

  if (panelElements.score) {
    panelElements.score.textContent = `${score}%`;
  }

  if (panelElements.bar) {
    panelElements.bar.style.width = `${score}%`;
  }

  if (panelElements.text) {
    panelElements.text.textContent = createHealthMessage(score, state);
  }

  if (panelElements.checklist) {
    panelElements.checklist.innerHTML = checks.map((check) => `
      <li class="${check.done ? "is-done" : ""}">
        <i data-lucide="${check.done ? "check-circle-2" : "circle"}" aria-hidden="true"></i>
        <div><strong>${check.label}</strong><span>${check.done ? "Concluído" : check.hint}</span></div>
      </li>
    `).join("");
    refreshIcons();
  }
}

function createHealthMessage(score, state) {
  if (score >= 90) {
    return "Orçamento pronto para fechamento e exportação.";
  }

  if (score >= 65) {
    return "Boa base. Revise os pontos pendentes antes de enviar ao cliente.";
  }

  if (state.finalPrice === 0) {
    return "Ainda falta preço real. Preencha mão de obra e itens para evitar proposta vazia.";
  }

  return "Orçamento incompleto. Use o checklist para finalizar sem esquecer dados importantes.";
}

function readScreenState() {
  return {
    budgetName: getInputText("#budgetNameInput"),
    clientName: getInputText("#clientNameInput"),
    hourlyRate: parseNumber(getInputText("#hourlyRateInput")),
    duration: parseNumber(getInputText("#sessionDurationInput")),
    margin: parseNumber(getInputText("#profitMarginInput")),
    discount: parseNumber(getInputText("#discountPercentInput")),
    tattooSize: getInputText("#tattooSizeInput"),
    tattooColors: getInputText("#tattooColorsInput"),
    finalPriceText: document.querySelector("#finalPriceValue")?.textContent?.trim() || "R$ 0,00",
    finalPrice: parseCurrency(document.querySelector("#finalPriceValue")?.textContent),
    materialCostText: document.querySelector("#materialTotalValue")?.textContent?.trim() || "R$ 0,00",
    laborCostText: document.querySelector("#laborTotalValue")?.textContent?.trim() || "R$ 0,00",
    hasReferenceImage: !document.querySelector("#referencePreview")?.hidden,
    itemCount: document.querySelectorAll("#cartList .cart-line").length
  };
}

function createClientMessage() {
  const state = readScreenState();
  const profile = readStudioProfile();
  const signalPercent = Math.min(Math.max(parseNumber(profile.bookingSignalPercent), 0), 100);
  const signalValue = signalPercent > 0 ? parseCurrency(state.finalPriceText) * (signalPercent / 100) : 0;
  const parts = [
    `Oi${state.clientName ? `, ${state.clientName}` : ""}! Tudo bem?`,
    `Segue a proposta para ${state.budgetName || "sua tatuagem"}.`,
    state.tattooSize ? `Medida: ${state.tattooSize}.` : "Medida: a definir.",
    state.tattooColors ? `Cores: ${state.tattooColors}.` : "Cores: a definir.",
    `Valor final: ${state.finalPriceText}.`,
    signalValue > 0 ? `Sinal sugerido para reservar: ${formatCurrency(signalValue)} (${signalPercent}%).` : "",
    profile.studioName ? `Atenciosamente, ${profile.studioName}.` : ""
  ];
  return parts.filter(Boolean).join("\n");
}

function createInternalSummary() {
  const state = readScreenState();
  return [
    `Resumo interno - ${state.budgetName || "Orçamento"}`,
    `Cliente: ${state.clientName || "Não informado"}`,
    `Itens no orçamento: ${state.itemCount}`,
    `Insumos: ${state.materialCostText}`,
    `Mão de obra: ${state.laborCostText}`,
    `Tempo estimado: ${state.duration || 0}h`,
    `Margem: ${state.margin || 0}%`,
    `Desconto: ${state.discount || 0}%`,
    `Valor final: ${state.finalPriceText}`
  ].join("\n");
}

async function copyText(text, successMessage) {
  try {
    await navigator.clipboard.writeText(text);
    showFeedback(successMessage);
  } catch {
    showFeedback("Não foi possível copiar automaticamente. Selecione e copie manualmente.");
    window.prompt("Copie o texto abaixo:", text);
  }
}

function showFeedback(message) {
  if (!panelElements.feedback) {
    return;
  }

  panelElements.feedback.textContent = message;
  window.clearTimeout(showFeedback.timeoutId);
  showFeedback.timeoutId = window.setTimeout(() => {
    panelElements.feedback.textContent = "";
  }, 3600);
}

function openCommandPalette() {
  if (!commandDialog) {
    return;
  }

  commandDialog.showModal();
  commandSearchInput.value = "";
  renderCommandList(COMMANDS);
  window.setTimeout(() => commandSearchInput.focus(), 40);
}

function closeCommandPalette() {
  commandDialog?.close();
}

function renderCommandList(commands) {
  if (!commandList) {
    return;
  }

  commandList.innerHTML = commands.length
    ? commands.map((command) => `
      <button type="button" data-command-id="${command.id}">
        <strong>${command.label}</strong>
        <span>${command.hint}</span>
      </button>
    `).join("")
    : `<p class="command-empty">Nenhum comando encontrado.</p>`;
}

function runCommand(commandId) {
  const command = COMMANDS.find((item) => item.id === commandId);

  if (!command) {
    return;
  }

  closeCommandPalette();
  command.action();
}

function loadStudioProfile() {
  const profile = readStudioProfile();
  setPlainValue("#studioNameInput", profile.studioName);
  setPlainValue("#artistNameInput", profile.artistName);
  setPlainValue("#studioContactInput", profile.studioContact);
  setPlainValue("#bookingSignalInput", profile.bookingSignalPercent);
}

function saveStudioProfile() {
  const profile = {
    studioName: getInputText("#studioNameInput"),
    artistName: getInputText("#artistNameInput"),
    studioContact: getInputText("#studioContactInput"),
    bookingSignalPercent: getInputText("#bookingSignalInput")
  };
  localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
}

function readStudioProfile() {
  try {
    return JSON.parse(localStorage.getItem(PROFILE_STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function clickScreen(screenName) {
  document.querySelector(`[data-screen-target="${screenName}"]`)?.click();
}

function focusField(selector) {
  clickScreen("budget");
  window.setTimeout(() => {
    const field = document.querySelector(selector);

    if (field?.click && field.type === "file") {
      field.click();
      return;
    }

    field?.focus();
  }, 180);
}

function setInputValue(selector, value) {
  const input = document.querySelector(selector);

  if (!input) {
    return;
  }

  input.value = value;
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

function setPlainValue(selector, value) {
  const input = document.querySelector(selector);

  if (input) {
    input.value = value || "";
  }
}

function getInputText(selector) {
  return String(document.querySelector(selector)?.value || "").trim();
}

function parseNumber(value) {
  const normalized = String(value || "").replace(/\s/g, "").replace(/[^0-9,.-]/g, "");
  const parsed = Number.parseFloat(normalized.includes(",") ? normalized.replace(/\./g, "").replace(",", ".") : normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseCurrency(value) {
  return parseNumber(String(value || "").replace("R$", ""));
}

function formatCurrency(value) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);
}

function normalizeSearch(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function refreshIcons() {
  if (window.lucide && typeof window.lucide.createIcons === "function") {
    window.lucide.createIcons({ attrs: { "stroke-width": 2, "aria-hidden": "true" } });
  }
}
