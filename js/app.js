const STORAGE_KEY = "CALCULADORA_TATTOO_WEB_V1";

const DEFAULT_SUPPLIES = [
  { id: "agulha-round-liner", name: "Agulha Round Liner", packageQuantity: 20, unitLabel: "un", packagePrice: 64.9 },
  { id: "agulha-magnum", name: "Agulha Magnum", packageQuantity: 20, unitLabel: "un", packagePrice: 72 },
  { id: "batoque", name: "Batoque descartavel", packageQuantity: 50, unitLabel: "un", packagePrice: 30 },
  { id: "luvas-nitrilicas", name: "Luvas nitrilicas", packageQuantity: 100, unitLabel: "un", packagePrice: 39.9 },
  { id: "tinta-preta", name: "Tinta preta", packageQuantity: 30, unitLabel: "ml", packagePrice: 58 },
  { id: "gel-transfer", name: "Gel transfer", packageQuantity: 60, unitLabel: "ml", packagePrice: 35 },
  { id: "papel-toalha", name: "Papel toalha", packageQuantity: 200, unitLabel: "folhas", packagePrice: 18 },
  { id: "filme-plastico", name: "Filme plastico", packageQuantity: 70, unitLabel: "m", packagePrice: 16 }
];

const CURRENCY_FORMATTER = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL"
});

const NUMBER_FORMATTER = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 2
});

const DOM = {
  applicationScreens: document.querySelectorAll("[data-screen-panel]"),
  budgetForm: document.querySelector("#budgetForm"),
  budgetItemList: document.querySelector("#budgetItemList"),
  budgetMetricGrid: document.querySelector("#budgetMetricGrid"),
  budgetSearchInput: document.querySelector("#budgetSearchInput"),
  budgetTotalDetail: document.querySelector("#budgetTotalDetail"),
  budgetTotalValue: document.querySelector("#budgetTotalValue"),
  clearBudgetButton: document.querySelector("#clearBudgetButton"),
  clientNameInput: document.querySelector("#clientNameInput"),
  emptyStateTemplate: document.querySelector("#emptyStateTemplate"),
  headerBudgetTotal: document.querySelector("#headerBudgetTotal"),
  inventoryMetricGrid: document.querySelector("#inventoryMetricGrid"),
  inventorySearchInput: document.querySelector("#inventorySearchInput"),
  navigationButtons: document.querySelectorAll("[data-screen-target]"),
  packagePriceInput: document.querySelector("#packagePriceInput"),
  packageQuantityInput: document.querySelector("#packageQuantityInput"),
  resetApplicationButton: document.querySelector("#resetApplicationButton"),
  sessionNameInput: document.querySelector("#sessionNameInput"),
  sessionNotesInput: document.querySelector("#sessionNotesInput"),
  supplyForm: document.querySelector("#supplyForm"),
  supplyList: document.querySelector("#supplyList"),
  supplyNameInput: document.querySelector("#supplyNameInput"),
  unitLabelInput: document.querySelector("#unitLabelInput")
};

let appState = loadApplicationState();
let inventorySearchTerm = "";
let budgetSearchTerm = "";

function createId(prefix) {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return `${prefix}-${window.crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createInitialState() {
  const supplies = DEFAULT_SUPPLIES.map((supply) => ({ ...supply }));

  return {
    activeScreen: "budget",
    supplies,
    budget: {
      sessionName: "",
      clientName: "",
      sessionNotes: "",
      quantities: createEmptyQuantities(supplies)
    }
  };
}

function createEmptyQuantities(supplies) {
  return supplies.reduce((quantities, supply) => {
    quantities[supply.id] = 0;
    return quantities;
  }, {});
}

function loadApplicationState() {
  const savedState = localStorage.getItem(STORAGE_KEY);

  if (!savedState) {
    return createInitialState();
  }

  try {
    const parsedState = JSON.parse(savedState);

    if (!Array.isArray(parsedState.supplies) || !parsedState.budget) {
      return createInitialState();
    }

    return normalizeApplicationState(parsedState);
  } catch (error) {
    return createInitialState();
  }
}

function normalizeApplicationState(state) {
  const supplies = state.supplies.map((supply) => ({
    id: supply.id || createId("supply"),
    name: String(supply.name || "Novo insumo"),
    packageQuantity: normalizeNumber(supply.packageQuantity),
    unitLabel: String(supply.unitLabel || "un"),
    packagePrice: normalizeNumber(supply.packagePrice)
  }));

  const quantities = supplies.reduce((currentQuantities, supply) => {
    const savedQuantity = state.budget.quantities ? state.budget.quantities[supply.id] : 0;
    currentQuantities[supply.id] = normalizeNumber(savedQuantity);
    return currentQuantities;
  }, {});

  return {
    activeScreen: state.activeScreen === "inventory" ? "inventory" : "budget",
    supplies,
    budget: {
      sessionName: String(state.budget.sessionName || ""),
      clientName: String(state.budget.clientName || ""),
      sessionNotes: String(state.budget.sessionNotes || ""),
      quantities
    }
  };
}

function saveApplicationState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
}

function normalizeNumber(value) {
  const normalizedValue = String(value == null ? "" : value).replace(",", ".").trim();
  const parsedValue = Number(normalizedValue);

  if (!Number.isFinite(parsedValue) || parsedValue < 0) {
    return 0;
  }

  return parsedValue;
}

function formatCurrency(value) {
  return CURRENCY_FORMATTER.format(Number.isFinite(value) ? value : 0);
}

function formatNumber(value) {
  return NUMBER_FORMATTER.format(Number.isFinite(value) ? value : 0);
}

function escapeHtml(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getUnitCost(supply) {
  const packageQuantity = normalizeNumber(supply.packageQuantity);

  if (packageQuantity <= 0) {
    return 0;
  }

  return normalizeNumber(supply.packagePrice) / packageQuantity;
}

function getUsageCost(supply, quantityUsed) {
  return getUnitCost(supply) * normalizeNumber(quantityUsed);
}

function calculateInventorySummary() {
  const supplyCount = appState.supplies.length;
  const totalPackageCost = appState.supplies.reduce((total, supply) => total + normalizeNumber(supply.packagePrice), 0);
  const averageUnitCost =
    supplyCount > 0
      ? appState.supplies.reduce((total, supply) => total + getUnitCost(supply), 0) / supplyCount
      : 0;

  return {
    supplyCount,
    totalPackageCost,
    averageUnitCost
  };
}

function calculateBudgetSummary() {
  return appState.supplies.reduce(
    (summary, supply) => {
      const quantityUsed = normalizeNumber(appState.budget.quantities[supply.id]);

      if (quantityUsed > 0) {
        summary.selectedCount += 1;
      }

      summary.totalCost += getUsageCost(supply, quantityUsed);
      return summary;
    },
    {
      selectedCount: 0,
      totalCost: 0
    }
  );
}

function setActiveScreen(screenName) {
  appState.activeScreen = screenName;
  saveApplicationState();
  renderActiveScreen();
}

function renderActiveScreen() {
  DOM.applicationScreens.forEach((screen) => {
    screen.classList.toggle("is-active", screen.dataset.screenPanel === appState.activeScreen);
  });

  DOM.navigationButtons.forEach((button) => {
    const isActive = button.dataset.screenTarget === appState.activeScreen;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-current", isActive ? "page" : "false");
  });
}

function renderApplication() {
  renderActiveScreen();
  renderBudgetForm();
  renderInventorySummary();
  renderSupplyList();
  renderBudgetSummary();
  renderBudgetItemList();
}

function renderBudgetForm() {
  DOM.sessionNameInput.value = appState.budget.sessionName;
  DOM.clientNameInput.value = appState.budget.clientName;
  DOM.sessionNotesInput.value = appState.budget.sessionNotes;
}

function renderInventorySummary() {
  const summary = calculateInventorySummary();

  DOM.inventoryMetricGrid.innerHTML = `
    <article class="metric-card">
      <span>Insumos</span>
      <strong>${summary.supplyCount}</strong>
    </article>
    <article class="metric-card">
      <span>Preco total</span>
      <strong>${formatCurrency(summary.totalPackageCost)}</strong>
    </article>
    <article class="metric-card">
      <span>Media por unidade</span>
      <strong>${formatCurrency(summary.averageUnitCost)}</strong>
    </article>
    <article class="metric-card">
      <span>Selecionados</span>
      <strong>${calculateBudgetSummary().selectedCount}</strong>
    </article>
  `;
}

function renderSupplyList() {
  const filteredSupplies = getFilteredSupplies(inventorySearchTerm);

  if (filteredSupplies.length === 0) {
    renderEmptyState(DOM.supplyList);
    return;
  }

  DOM.supplyList.innerHTML = filteredSupplies.map(createSupplyCardHtml).join("");
}

function getFilteredSupplies(searchTerm) {
  const normalizedSearchTerm = searchTerm.trim().toLowerCase();

  if (!normalizedSearchTerm) {
    return appState.supplies;
  }

  return appState.supplies.filter((supply) => {
    const searchableText = `${supply.name} ${supply.unitLabel}`.toLowerCase();
    return searchableText.includes(normalizedSearchTerm);
  });
}

function createSupplyCardHtml(supply) {
  return `
    <article class="data-card" data-supply-id="${escapeHtml(supply.id)}">
      <div class="card-header">
        <div class="card-title-group">
          <h2>${escapeHtml(supply.name)}</h2>
          <span>${formatNumber(supply.packageQuantity)} ${escapeHtml(supply.unitLabel)} por embalagem</span>
        </div>
        <span class="pill" data-unit-cost>${formatCurrency(getUnitCost(supply))}/un</span>
      </div>

      <div class="editable-grid">
        <label class="field-group">
          <span>Material</span>
          <input type="text" value="${escapeHtml(supply.name)}" data-supply-field="name" />
        </label>
        <label class="field-group">
          <span>Qtd.</span>
          <input type="text" inputmode="decimal" value="${escapeHtml(supply.packageQuantity)}" data-supply-field="packageQuantity" />
        </label>
        <label class="field-group">
          <span>Unidade</span>
          <input type="text" value="${escapeHtml(supply.unitLabel)}" data-supply-field="unitLabel" />
        </label>
        <label class="field-group">
          <span>Preco</span>
          <input type="text" inputmode="decimal" value="${escapeHtml(supply.packagePrice)}" data-supply-field="packagePrice" />
        </label>
      </div>

      <div class="card-actions">
        <button class="button button-danger" type="button" data-remove-supply>Excluir</button>
      </div>
    </article>
  `;
}

function renderBudgetSummary() {
  const summary = calculateBudgetSummary();
  const detailText = `${summary.selectedCount} ${summary.selectedCount === 1 ? "insumo selecionado" : "insumos selecionados"}`;

  DOM.headerBudgetTotal.textContent = formatCurrency(summary.totalCost);
  DOM.budgetTotalValue.textContent = formatCurrency(summary.totalCost);
  DOM.budgetTotalDetail.textContent = detailText;

  DOM.budgetMetricGrid.innerHTML = `
    <article class="metric-card">
      <span>Selecionados</span>
      <strong>${summary.selectedCount}</strong>
    </article>
    <article class="metric-card">
      <span>Total gasto</span>
      <strong>${formatCurrency(summary.totalCost)}</strong>
    </article>
  `;
}

function renderBudgetItemList() {
  const filteredSupplies = getFilteredSupplies(budgetSearchTerm);

  if (filteredSupplies.length === 0) {
    renderEmptyState(DOM.budgetItemList);
    return;
  }

  DOM.budgetItemList.innerHTML = filteredSupplies.map(createBudgetItemHtml).join("");
}

function createBudgetItemHtml(supply) {
  const quantityUsed = normalizeNumber(appState.budget.quantities[supply.id]);
  const isSelected = quantityUsed > 0;

  return `
    <article class="data-card budget-item ${isSelected ? "is-selected" : ""}" data-budget-supply-id="${escapeHtml(supply.id)}">
      <div class="card-header">
        <div class="card-title-group">
          <h3>${escapeHtml(supply.name)}</h3>
          <span>${formatCurrency(getUnitCost(supply))} por ${escapeHtml(supply.unitLabel)}</span>
        </div>
        <span class="pill">${formatCurrency(getUsageCost(supply, quantityUsed))}</span>
      </div>

      <div class="budget-item-control">
        <button class="select-button" type="button" data-toggle-budget-item aria-pressed="${isSelected}">
          ${isSelected ? "Usando" : "Adicionar"}
        </button>
        <label class="quantity-field">
          <span>Qtd.</span>
          <span class="quantity-input-row">
            <input type="text" inputmode="decimal" value="${quantityUsed > 0 ? escapeHtml(quantityUsed) : ""}" placeholder="0" data-budget-quantity />
            <span>${escapeHtml(supply.unitLabel)}</span>
          </span>
        </label>
      </div>

      <div class="line-total">
        <span>Custo neste item</span>
        <strong data-line-total>${formatCurrency(getUsageCost(supply, quantityUsed))}</strong>
      </div>
    </article>
  `;
}

function renderEmptyState(container) {
  const emptyState = DOM.emptyStateTemplate.content.cloneNode(true);
  container.innerHTML = "";
  container.appendChild(emptyState);
}

function addSupplyFromForm() {
  const supplyName = DOM.supplyNameInput.value.trim();
  const packageQuantity = normalizeNumber(DOM.packageQuantityInput.value);
  const unitLabel = DOM.unitLabelInput.value.trim();
  const packagePrice = normalizeNumber(DOM.packagePriceInput.value);

  DOM.packageQuantityInput.setCustomValidity("");

  if (packageQuantity <= 0) {
    DOM.packageQuantityInput.setCustomValidity("Informe uma quantidade maior que zero.");
  }

  if (!supplyName || !unitLabel || packageQuantity <= 0) {
    DOM.supplyForm.reportValidity();
    return;
  }

  const createdSupply = {
    id: createId("supply"),
    name: supplyName,
    packageQuantity,
    unitLabel,
    packagePrice
  };

  appState.supplies.unshift(createdSupply);
  appState.budget.quantities[createdSupply.id] = 0;
  saveApplicationState();
  DOM.supplyForm.reset();
  renderInventorySummary();
  renderSupplyList();
  renderBudgetItemList();
}

function updateSupply(supplyId, fieldName, rawValue) {
  appState.supplies = appState.supplies.map((supply) => {
    if (supply.id !== supplyId) {
      return supply;
    }

    if (["packageQuantity", "packagePrice"].includes(fieldName)) {
      return {
        ...supply,
        [fieldName]: normalizeNumber(rawValue)
      };
    }

    return {
      ...supply,
      [fieldName]: String(rawValue)
    };
  });

  saveApplicationState();
  renderInventorySummary();
  renderSupplyList();
  renderBudgetSummary();
  renderBudgetItemList();
}

function removeSupply(supplyId) {
  appState.supplies = appState.supplies.filter((supply) => supply.id !== supplyId);
  delete appState.budget.quantities[supplyId];
  saveApplicationState();
  renderInventorySummary();
  renderSupplyList();
  renderBudgetSummary();
  renderBudgetItemList();
}

function updateBudgetQuantity(supplyId, rawValue) {
  appState.budget.quantities[supplyId] = normalizeNumber(rawValue);
  saveApplicationState();
  renderInventorySummary();
  renderBudgetSummary();
  updateBudgetItemState(supplyId);
}

function toggleBudgetItem(supplyId) {
  const currentQuantity = normalizeNumber(appState.budget.quantities[supplyId]);
  appState.budget.quantities[supplyId] = currentQuantity > 0 ? 0 : 1;
  saveApplicationState();
  renderInventorySummary();
  renderBudgetSummary();
  renderBudgetItemList();
}

function updateBudgetItemState(supplyId) {
  const supply = appState.supplies.find((item) => item.id === supplyId);
  const budgetItem = Array.from(DOM.budgetItemList.querySelectorAll("[data-budget-supply-id]")).find((item) => {
    return item.dataset.budgetSupplyId === supplyId;
  });

  if (!supply || !budgetItem) {
    return;
  }

  const quantityUsed = normalizeNumber(appState.budget.quantities[supplyId]);
  const isSelected = quantityUsed > 0;
  const lineTotal = budgetItem.querySelector("[data-line-total]");
  const topPill = budgetItem.querySelector(".pill");
  const toggleButton = budgetItem.querySelector("[data-toggle-budget-item]");

  budgetItem.classList.toggle("is-selected", isSelected);
  toggleButton.textContent = isSelected ? "Usando" : "Adicionar";
  toggleButton.setAttribute("aria-pressed", String(isSelected));
  lineTotal.textContent = formatCurrency(getUsageCost(supply, quantityUsed));
  topPill.textContent = formatCurrency(getUsageCost(supply, quantityUsed));
}

function updateBudgetField(fieldName, value) {
  appState.budget[fieldName] = value;
  saveApplicationState();
}

function clearBudget() {
  appState.budget = {
    sessionName: "",
    clientName: "",
    sessionNotes: "",
    quantities: createEmptyQuantities(appState.supplies)
  };

  saveApplicationState();
  renderBudgetForm();
  renderInventorySummary();
  renderBudgetSummary();
  renderBudgetItemList();
}

function resetApplication() {
  const shouldReset = window.confirm("Restaurar os dados padrao e apagar os dados salvos neste navegador?");

  if (!shouldReset) {
    return;
  }

  appState = createInitialState();
  inventorySearchTerm = "";
  budgetSearchTerm = "";
  DOM.inventorySearchInput.value = "";
  DOM.budgetSearchInput.value = "";
  saveApplicationState();
  renderApplication();
}

DOM.navigationButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setActiveScreen(button.dataset.screenTarget);
  });
});

DOM.supplyForm.addEventListener("submit", (event) => {
  event.preventDefault();
  addSupplyFromForm();
});

DOM.supplyList.addEventListener("change", (event) => {
  const supplyCard = event.target.closest("[data-supply-id]");
  const fieldName = event.target.dataset.supplyField;

  if (!supplyCard || !fieldName) {
    return;
  }

  updateSupply(supplyCard.dataset.supplyId, fieldName, event.target.value);
});

DOM.supplyList.addEventListener("click", (event) => {
  const removeButton = event.target.closest("[data-remove-supply]");

  if (!removeButton) {
    return;
  }

  const supplyCard = removeButton.closest("[data-supply-id]");
  removeSupply(supplyCard.dataset.supplyId);
});

DOM.budgetItemList.addEventListener("input", (event) => {
  if (!event.target.matches("[data-budget-quantity]")) {
    return;
  }

  const budgetItem = event.target.closest("[data-budget-supply-id]");
  updateBudgetQuantity(budgetItem.dataset.budgetSupplyId, event.target.value);
});

DOM.budgetItemList.addEventListener("click", (event) => {
  const toggleButton = event.target.closest("[data-toggle-budget-item]");

  if (!toggleButton) {
    return;
  }

  const budgetItem = toggleButton.closest("[data-budget-supply-id]");
  toggleBudgetItem(budgetItem.dataset.budgetSupplyId);
});

DOM.budgetForm.addEventListener("input", (event) => {
  updateBudgetField(event.target.name, event.target.value);
});

DOM.inventorySearchInput.addEventListener("input", (event) => {
  inventorySearchTerm = event.target.value;
  renderSupplyList();
});

DOM.budgetSearchInput.addEventListener("input", (event) => {
  budgetSearchTerm = event.target.value;
  renderBudgetItemList();
});

DOM.clearBudgetButton.addEventListener("click", clearBudget);
DOM.resetApplicationButton.addEventListener("click", resetApplication);

saveApplicationState();
renderApplication();
