const STORAGE_KEY = "CALCULADORA_TATTOO_LOCAL_STATE_V1";
const CURRENCY_FORMATTER = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL"
});
const NUMBER_FORMATTER = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 2
});
const DESKTOP_MEDIA_QUERY = window.matchMedia("(min-width: 1024px)");
const CATEGORY_ALL_VALUE = "Todos";
const BASE_INVENTORY_CATEGORIES = [
  CATEGORY_ALL_VALUE,
  "Cartuchos",
  "Tintas",
  "Biossegurança",
  "Descartáveis",
  "Outros"
];

const DEFAULT_INVENTORY_ITEMS = [
  {
    id: "item-cartucho-rl0310",
    name: "Cartucho White Head RL0310",
    category: "Cartuchos",
    unitMeasure: "unid",
    packageQuantity: 20,
    purchasePrice: 300,
    currentStock: 20
  },
  {
    id: "item-tinta-preta",
    name: "Tinta preta linha",
    category: "Tintas",
    unitMeasure: "ml",
    packageQuantity: 30,
    purchasePrice: 100,
    currentStock: 30
  },
  {
    id: "item-luvas",
    name: "Luvas nitrílicas",
    category: "Biossegurança",
    unitMeasure: "unid",
    packageQuantity: 100,
    purchasePrice: 50,
    currentStock: 100
  },
  {
    id: "item-stencil",
    name: "Folha stencil",
    category: "Descartáveis",
    unitMeasure: "folhas",
    packageQuantity: 1,
    purchasePrice: 4.5,
    currentStock: 8
  }
];

const DEFAULT_BUDGET = {
  id: "budget-default",
  name: "Novo orçamento",
  hourlyRate: 0,
  sessionHours: 0,
  items: []
};

const elementReferences = {};
let applicationState = loadApplicationState();
let activeScreen = "inventory";
let inventorySearchTerm = "";
let budgetSearchTerm = "";
let activeInventoryCategory = CATEGORY_ALL_VALUE;
let editingInventoryItemId = null;

/**
 * Inicializa a aplicacao, conecta eventos e renderiza a primeira tela.
 * @returns {void}
 */
function initializeApplication() {
  bindElementReferences();
  bindEventListeners();
  syncDrawerForViewport();
  renderApplication();
  registerServiceWorker();
}

/**
 * Armazena referencias dos elementos principais da interface.
 * @returns {void}
 */
function bindElementReferences() {
  elementReferences.budgetNameInput = document.querySelector("#budgetNameInput");
  elementReferences.budgetSearchInput = document.querySelector("#budgetSearchInput");
  elementReferences.budgetTotalValue = document.querySelector("#budgetTotalValue");
  elementReferences.cartList = document.querySelector("#cartList");
  elementReferences.categoryFilterList = document.querySelector("#categoryFilterList");
  elementReferences.closeImportModalButton = document.querySelector("#closeImportModalButton");
  elementReferences.closeItemModalButton = document.querySelector("#closeItemModalButton");
  elementReferences.createBudgetButton = document.querySelector("#createBudgetButton");
  elementReferences.currentPageTitle = document.querySelector("#currentPageTitle");
  elementReferences.currentStockInput = document.querySelector("#currentStockInput");
  elementReferences.csvFileInput = document.querySelector("#csvFileInput");
  elementReferences.drawer = document.querySelector("#drawer");
  elementReferences.drawerBackdrop = document.querySelector("#drawerBackdrop");
  elementReferences.drawerLinks = document.querySelectorAll("[data-drawer-action]");
  elementReferences.exportInvoiceButton = document.querySelector("#exportInvoiceButton");
  elementReferences.budgetItemCounter = document.querySelector("#budgetItemCounter");
  elementReferences.hourlyRateInput = document.querySelector("#hourlyRateInput");
  elementReferences.importFeedback = document.querySelector("#importFeedback");
  elementReferences.importForm = document.querySelector("#importForm");
  elementReferences.importModal = document.querySelector("#importModal");
  elementReferences.inventoryCounter = document.querySelector("#inventoryCounter");
  elementReferences.inventoryGrid = document.querySelector("#inventoryGrid");
  elementReferences.inventorySearchInput = document.querySelector("#inventorySearchInput");
  elementReferences.invoiceDocument = document.querySelector("#invoiceDocument");
  elementReferences.itemCategoryInput = document.querySelector("#itemCategoryInput");
  elementReferences.itemForm = document.querySelector("#itemForm");
  elementReferences.itemModalKicker = document.querySelector("#itemModalKicker");
  elementReferences.itemModalTitle = document.querySelector("#itemModalTitle");
  elementReferences.itemModal = document.querySelector("#itemModal");
  elementReferences.itemNameInput = document.querySelector("#itemNameInput");
  elementReferences.itemSubmitButton = document.querySelector("#itemSubmitButton");
  elementReferences.laborCostValue = document.querySelector("#laborCostValue");
  elementReferences.materialCostValue = document.querySelector("#materialCostValue");
  elementReferences.openDrawerButton = document.querySelector("#openDrawerButton");
  elementReferences.openItemModalButton = document.querySelector("#openItemModalButton");
  elementReferences.packageQuantityInput = document.querySelector("#packageQuantityInput");
  elementReferences.purchasePriceInput = document.querySelector("#purchasePriceInput");
  elementReferences.screens = document.querySelectorAll("[data-screen]");
  elementReferences.sessionHoursInput = document.querySelector("#sessionHoursInput");
  elementReferences.stockPickerList = document.querySelector("#stockPickerList");
  elementReferences.unitCostPreview = document.querySelector("#unitCostPreview");
  elementReferences.unitMeasureInput = document.querySelector("#unitMeasureInput");
}

/**
 * Conecta os eventos de navegacao, formularios e listas dinamicas.
 * @returns {void}
 */
function bindEventListeners() {
  elementReferences.openDrawerButton.addEventListener("click", openDrawer);
  elementReferences.drawerBackdrop.addEventListener("click", closeDrawer);
  elementReferences.closeItemModalButton.addEventListener("click", () => closeModal(elementReferences.itemModal));
  elementReferences.closeImportModalButton.addEventListener("click", () => closeModal(elementReferences.importModal));
  elementReferences.openItemModalButton.addEventListener("click", openItemModal);

  elementReferences.drawerLinks.forEach((drawerLink) => {
    drawerLink.addEventListener("click", () => handleDrawerAction(drawerLink.dataset.drawerAction));
  });

  if (typeof DESKTOP_MEDIA_QUERY.addEventListener === "function") {
    DESKTOP_MEDIA_QUERY.addEventListener("change", syncDrawerForViewport);
  } else {
    DESKTOP_MEDIA_QUERY.addListener(syncDrawerForViewport);
  }

  elementReferences.inventorySearchInput.addEventListener("input", (event) => {
    inventorySearchTerm = event.target.value;
    renderInventory();
  });

  elementReferences.categoryFilterList.addEventListener("click", (event) => {
    const categoryButton = event.target.closest("[data-category-filter]");

    if (!categoryButton) {
      return;
    }

    setActiveInventoryCategory(categoryButton.dataset.categoryFilter);
  });

  elementReferences.inventoryGrid.addEventListener("click", (event) => {
    const editButton = event.target.closest("[data-edit-inventory-item]");
    const deleteButton = event.target.closest("[data-delete-inventory-item]");
    const inventoryCard = event.target.closest("[data-inventory-item-id]");

    if (!inventoryCard) {
      return;
    }

    if (editButton) {
      openItemModal(inventoryCard.dataset.inventoryItemId);
      return;
    }

    if (deleteButton) {
      deleteInventoryItem(inventoryCard.dataset.inventoryItemId);
    }
  });

  elementReferences.budgetSearchInput.addEventListener("input", (event) => {
    budgetSearchTerm = event.target.value;
    renderStockPicker();
  });

  elementReferences.budgetNameInput.addEventListener("input", (event) => {
    getActiveBudget().name = event.target.value;
    saveApplicationState();
    renderBudget();
  });

  [
    elementReferences.hourlyRateInput,
    elementReferences.sessionHoursInput
  ].forEach((inputElement) => {
    inputElement.addEventListener("input", updateBudgetLaborFromForm);
  });

  [
    elementReferences.packageQuantityInput,
    elementReferences.purchasePriceInput
  ].forEach((inputElement) => {
    inputElement.addEventListener("input", updateUnitCostPreview);
  });

  elementReferences.itemForm.addEventListener("submit", (event) => {
    event.preventDefault();
    saveInventoryItemFromForm();
  });

  elementReferences.importForm.addEventListener("submit", (event) => {
    event.preventDefault();
    importInventoryFromCsv();
  });

  elementReferences.stockPickerList.addEventListener("click", (event) => {
    const addButton = event.target.closest("[data-add-inventory-item]");

    if (!addButton) {
      return;
    }

    const pickerCard = addButton.closest("[data-inventory-item-id]");
    const quantityInput = pickerCard.querySelector("[data-picker-quantity]");
    addItemToBudget(pickerCard.dataset.inventoryItemId, quantityInput.value);
  });

  elementReferences.cartList.addEventListener("input", (event) => {
    if (!event.target.matches("[data-cart-quantity]")) {
      return;
    }

    const cartCard = event.target.closest("[data-cart-item-id]");
    updateBudgetItemQuantity(cartCard.dataset.cartItemId, event.target.value);
  });

  elementReferences.cartList.addEventListener("click", (event) => {
    const removeButton = event.target.closest("[data-remove-cart-item]");

    if (!removeButton) {
      return;
    }

    const cartCard = removeButton.closest("[data-cart-item-id]");
    removeBudgetItem(cartCard.dataset.cartItemId);
  });

  elementReferences.exportInvoiceButton.addEventListener("click", exportInvoicePdf);
  elementReferences.createBudgetButton.addEventListener("click", createNewBudget);
}

/**
 * Executa a acao selecionada no menu lateral.
 * @param {string} actionName Nome semantico da acao do drawer.
 * @returns {void}
 */
function handleDrawerAction(actionName) {
  if (actionName === "inventory" || actionName === "budgets") {
    setActiveScreen(actionName);
  }

  if (actionName === "import") {
    openImportModal();
  }

  if (actionName === "backup") {
    exportBackup();
  }

  if (!DESKTOP_MEDIA_QUERY.matches) {
    closeDrawer();
  } else {
    syncDrawerForViewport();
  }
}

/**
 * Carrega o estado persistido no localStorage.
 * @returns {{inventoryItems: Array<object>, budgets: Array<object>, activeBudgetId: string}} Estado normalizado da aplicacao.
 */
function loadApplicationState() {
  const savedState = localStorage.getItem(STORAGE_KEY);

  if (!savedState) {
    return createInitialState();
  }

  try {
    return normalizeApplicationState(JSON.parse(savedState));
  } catch {
    return createInitialState();
  }
}

/**
 * Cria o estado padrao usado na primeira visita.
 * @returns {{inventoryItems: Array<object>, budgets: Array<object>, activeBudgetId: string}} Estado inicial.
 */
function createInitialState() {
  return {
    inventoryItems: DEFAULT_INVENTORY_ITEMS.map((item) => ({ ...item })),
    budgets: [{ ...DEFAULT_BUDGET, items: [] }],
    activeBudgetId: DEFAULT_BUDGET.id
  };
}

/**
 * Normaliza um estado bruto vindo do localStorage.
 * @param {object} rawState Estado sem garantias de formato.
 * @returns {{inventoryItems: Array<object>, budgets: Array<object>, activeBudgetId: string}} Estado validado.
 */
function normalizeApplicationState(rawState) {
  const inventoryItems = Array.isArray(rawState.inventoryItems)
    ? rawState.inventoryItems.map(normalizeInventoryItem)
    : DEFAULT_INVENTORY_ITEMS;
  const budgets = Array.isArray(rawState.budgets) && rawState.budgets.length > 0
    ? rawState.budgets.map(normalizeBudget)
    : [DEFAULT_BUDGET];
  const activeBudgetId = budgets.some((budget) => budget.id === rawState.activeBudgetId)
    ? rawState.activeBudgetId
    : budgets[0].id;

  return {
    inventoryItems,
    budgets,
    activeBudgetId
  };
}

/**
 * Normaliza um item de estoque para o formato atual do app.
 * @param {object} item Item bruto de estoque.
 * @returns {object} Item de estoque normalizado.
 */
function normalizeInventoryItem(item) {
  return {
    id: item.id || createEntityId("item"),
    name: String(item.name || "Novo item"),
    category: String(item.category || "Outros"),
    unitMeasure: normalizeUnitMeasure(item.unitMeasure || item.unitLabel || "unid"),
    packageQuantity: normalizeNumber(item.packageQuantity),
    purchasePrice: normalizeNumber(item.purchasePrice || item.packagePrice),
    currentStock: normalizeNumber(item.currentStock),
    createdAt: item.createdAt || new Date().toISOString()
  };
}

/**
 * Normaliza um orcamento salvo ou importado.
 * @param {object} budget Orcamento bruto.
 * @returns {object} Orcamento normalizado.
 */
function normalizeBudget(budget) {
  return {
    id: budget.id || createEntityId("budget"),
    name: String(budget.name || budget.projectName || "Novo orçamento"),
    hourlyRate: normalizeNumber(budget.hourlyRate ?? budget.laborHourlyRate ?? budget.valorMaoDeObra),
    sessionHours: normalizeNumber(budget.sessionHours ?? budget.laborHours ?? budget.tempoSessao),
    items: Array.isArray(budget.items) ? budget.items.map(normalizeBudgetItem) : []
  };
}

/**
 * Normaliza um item selecionado dentro do orcamento.
 * @param {object} item Item bruto do carrinho/orcamento.
 * @returns {object} Item de orcamento normalizado.
 */
function normalizeBudgetItem(item) {
  return {
    id: item.id || createEntityId("cart"),
    inventoryItemId: item.inventoryItemId,
    quantityUsed: normalizeNumber(item.quantityUsed)
  };
}

/**
 * Persiste o estado atual no localStorage.
 * @returns {void}
 */
function saveApplicationState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(applicationState));
}

/**
 * Renderiza todas as areas dependentes do estado.
 * @returns {void}
 */
function renderApplication() {
  renderActiveScreen();
  renderCategoryFilters();
  renderInventory();
  renderBudget();
  updateUnitCostPreview();
}

/**
 * Alterna a tela ativa e sincroniza titulo, FAB e menu lateral.
 * @returns {void}
 */
function renderActiveScreen() {
  elementReferences.screens.forEach((screenElement) => {
    screenElement.classList.toggle("is-active", screenElement.dataset.screen === activeScreen);
  });

  elementReferences.drawerLinks.forEach((drawerLink) => {
    drawerLink.classList.toggle("is-active", drawerLink.dataset.drawerAction === activeScreen);
  });

  elementReferences.currentPageTitle.textContent = activeScreen === "inventory" ? "Estoque" : "Orçamentos";
  elementReferences.openItemModalButton.hidden = activeScreen !== "inventory";
}

/**
 * Renderiza a vitrine de estoque com base na busca atual.
 * @returns {void}
 */
function renderInventory() {
  const filteredItems = getFilteredInventoryItems(inventorySearchTerm, activeInventoryCategory);
  elementReferences.inventoryCounter.textContent = formatCounter(filteredItems.length, applicationState.inventoryItems.length);

  if (filteredItems.length === 0) {
    elementReferences.inventoryGrid.innerHTML = createEmptyStateHtml("Nenhum insumo encontrado.");
    return;
  }

  elementReferences.inventoryGrid.innerHTML = filteredItems.map(createInventoryCardHtml).join("");
}

/**
 * Renderiza os chips de filtro por categoria do estoque.
 * @returns {void}
 */
function renderCategoryFilters() {
  const categories = getInventoryCategories();

  if (!categories.includes(activeInventoryCategory)) {
    activeInventoryCategory = CATEGORY_ALL_VALUE;
  }

  elementReferences.categoryFilterList.innerHTML = categories.map((categoryName) => {
    const categoryTotal = countInventoryItemsByCategory(categoryName);
    const isActive = categoryName === activeInventoryCategory;

    return `
      <button class="filter-chip ${isActive ? "is-active" : ""}" type="button" data-category-filter="${escapeHtml(categoryName)}">
        <span>${escapeHtml(categoryName)}</span>
        <strong>${formatCounter(categoryTotal, applicationState.inventoryItems.length)}</strong>
      </button>
    `;
  }).join("");
}

/**
 * Cria o HTML de um card premium de estoque.
 * @param {object} item Item de estoque normalizado.
 * @returns {string} HTML seguro do card.
 */
function createInventoryCardHtml(item) {
  const unitCost = calculateUnitCost(item);
  const stockPercentage = calculateStockPercentage(item);
  const stockStatus = getStockStatus(stockPercentage);
  const productInitial = getProductInitial(item.name);

  return `
    <article class="inventory-card ${stockStatus.className}" data-inventory-item-id="${escapeHtml(item.id)}">
      <div class="product-topline">
        <div class="product-tags">
          <span class="category-pill">${escapeHtml(item.category)}</span>
          <span class="unit-tag">por ${escapeHtml(item.unitMeasure)}</span>
        </div>
        <details class="product-options">
          <summary aria-label="Abrir opções do item">⋯</summary>
          <div class="product-options-menu">
            <button type="button" data-edit-inventory-item>Editar</button>
            <button type="button" data-delete-inventory-item>Excluir</button>
          </div>
        </details>
      </div>

      <div class="product-card-hero">
        <div class="product-mark" aria-hidden="true">${escapeHtml(productInitial)}</div>
        <div class="product-title">
          <h3>${escapeHtml(item.name)}</h3>
          <span>${formatNumber(item.packageQuantity)} ${escapeHtml(item.unitMeasure)} por embalagem</span>
        </div>
      </div>

      <div class="product-details-grid">
        <div class="unit-price is-featured">
          <span>Unidade fracionada</span>
          <strong>${formatCurrency(unitCost)}</strong>
        </div>
        <div class="unit-price">
          <span>Estoque</span>
          <strong>${formatNumber(item.currentStock)}</strong>
        </div>
      </div>

      <div class="stock-meter">
        <div class="stock-meter-text">
          <span>${stockStatus.label}</span>
          <strong>${formatNumber(stockPercentage)}%</strong>
        </div>
        <span class="stock-meter-track">
          <span class="stock-meter-fill" style="width: ${stockPercentage}%"></span>
        </span>
      </div>
    </article>
  `;
}

/**
 * Renderiza os dados resumidos do orcamento ativo.
 * @returns {void}
 */
function renderBudget() {
  const activeBudget = getActiveBudget();
  const totals = calculateBudgetTotals(activeBudget);

  elementReferences.budgetNameInput.value = activeBudget.name;
  elementReferences.hourlyRateInput.value = formatEditableNumber(activeBudget.hourlyRate);
  elementReferences.sessionHoursInput.value = formatEditableNumber(activeBudget.sessionHours);
  renderBudgetTotals(totals);
  renderStockPicker();
  renderCart();
}

/**
 * Renderiza os totais financeiros do orcamento ativo.
 * @param {{materialCost: number, laborCost: number, totalCost: number}} totals Totais calculados.
 * @returns {void}
 */
function renderBudgetTotals(totals) {
  elementReferences.materialCostValue.textContent = formatCurrency(totals.materialCost);
  elementReferences.laborCostValue.textContent = formatCurrency(totals.laborCost);
  elementReferences.budgetTotalValue.textContent = formatCurrency(totals.totalCost);
}

/**
 * Renderiza os itens de estoque disponiveis para adicionar ao orcamento.
 * @returns {void}
 */
function renderStockPicker() {
  const filteredItems = getFilteredInventoryItems(budgetSearchTerm, CATEGORY_ALL_VALUE);

  if (filteredItems.length === 0) {
    elementReferences.stockPickerList.innerHTML = createEmptyStateHtml("Nenhum item disponível no estoque.");
    return;
  }

  elementReferences.stockPickerList.innerHTML = filteredItems.map((item) => {
    const unitCost = calculateUnitCost(item);
    const productInitial = getProductInitial(item.name);
    const stockStatus = getStockStatus(calculateStockPercentage(item));

    return `
    <article class="picker-card ${stockStatus.className}" data-inventory-item-id="${escapeHtml(item.id)}">
      <div class="picker-card-main">
        <div class="product-mark product-mark-small" aria-hidden="true">${escapeHtml(productInitial)}</div>
        <div>
          <h3>${escapeHtml(item.name)}</h3>
          <span>${escapeHtml(item.category)} · ${formatCurrency(unitCost)}/${escapeHtml(item.unitMeasure)}</span>
        </div>
      </div>

      <div class="picker-action-row">
        <label class="compact-field">
          <span>Usar</span>
          <input data-picker-quantity type="text" inputmode="decimal" placeholder="${escapeHtml(item.unitMeasure)}" />
        </label>
        <button class="primary-button" type="button" data-add-inventory-item>Adicionar</button>
      </div>
    </article>
    `;
  }).join("");
}

/**
 * Renderiza os itens ja adicionados ao orcamento ativo.
 * @returns {void}
 */
function renderCart() {
  const activeBudget = getActiveBudget();
  const visibleItems = activeBudget.items
    .map((cartItem) => ({
      cartItem,
      inventoryItem: findInventoryItemById(cartItem.inventoryItemId)
    }))
    .filter((entry) => entry.inventoryItem);
  elementReferences.budgetItemCounter.textContent = formatCounter(visibleItems.length, applicationState.inventoryItems.length);

  if (visibleItems.length === 0) {
    elementReferences.cartList.innerHTML = createEmptyStateHtml("Nenhum item no orçamento.");
    return;
  }

  elementReferences.cartList.innerHTML = visibleItems.map(({ cartItem, inventoryItem }) => {
    const unitCost = calculateUnitCost(inventoryItem);
    const subtotal = calculateLineSubtotal(inventoryItem, cartItem.quantityUsed);

    return `
      <article class="cart-card" data-cart-item-id="${escapeHtml(cartItem.id)}">
        <div class="cart-card-header">
          <div>
            <h3>${escapeHtml(inventoryItem.name)}</h3>
            <span>${escapeHtml(inventoryItem.category)} · ${escapeHtml(inventoryItem.unitMeasure)}</span>
          </div>
          <strong>${formatCurrency(subtotal)}</strong>
        </div>

        <div class="cart-calculation">
          <span>${formatCurrency(unitCost)}</span>
          <span>x</span>
          <span>${formatNumber(cartItem.quantityUsed)} ${escapeHtml(inventoryItem.unitMeasure)}</span>
        </div>

        <label class="cart-quantity-field">
          <span>Quantidade usada</span>
          <input class="cart-quantity-input" data-cart-quantity type="text" inputmode="decimal" value="${escapeHtml(formatEditableNumber(cartItem.quantityUsed))}" />
        </label>

        <button class="danger-button" type="button" data-remove-cart-item>Remover</button>
      </article>
    `;
  }).join("");
}

/**
 * Abre o menu lateral em telas moveis.
 * @returns {void}
 */
function openDrawer() {
  elementReferences.drawer.classList.add("is-open");
  elementReferences.drawer.setAttribute("aria-hidden", "false");
  elementReferences.drawerBackdrop.hidden = false;
}

/**
 * Fecha o menu lateral em telas moveis.
 * @returns {void}
 */
function closeDrawer() {
  elementReferences.drawer.classList.remove("is-open");
  elementReferences.drawer.setAttribute("aria-hidden", "true");
  elementReferences.drawerBackdrop.hidden = true;
}

/**
 * Sincroniza o estado acessivel do drawer conforme o tamanho da tela.
 * @returns {void}
 */
function syncDrawerForViewport() {
  if (DESKTOP_MEDIA_QUERY.matches) {
    elementReferences.drawer.classList.remove("is-open");
    elementReferences.drawer.setAttribute("aria-hidden", "false");
    elementReferences.drawerBackdrop.hidden = true;
    return;
  }

  elementReferences.drawer.setAttribute("aria-hidden", elementReferences.drawer.classList.contains("is-open") ? "false" : "true");
}

/**
 * Define a tela ativa da SPA.
 * @param {string} screenName Nome da tela alvo.
 * @returns {void}
 */
function setActiveScreen(screenName) {
  activeScreen = screenName;
  renderActiveScreen();
}

/**
 * Abre o modal de cadastro ou edicao de insumo.
 * @param {string=} inventoryItemId Identificador opcional para edicao.
 * @returns {void}
 */
function openItemModal(inventoryItemId) {
  const inventoryItem = inventoryItemId ? findInventoryItemById(inventoryItemId) : null;

  if (inventoryItem) {
    populateItemFormForEditing(inventoryItem);
  } else {
    resetItemFormForCreation();
  }

  updateUnitCostPreview();
  openModal(elementReferences.itemModal);
  elementReferences.itemNameInput.focus();
}

/**
 * Prepara o formulario de insumo para criar um novo registro.
 * @returns {void}
 */
function resetItemFormForCreation() {
  editingInventoryItemId = null;
  elementReferences.itemForm.reset();
  elementReferences.unitMeasureInput.value = "ml";
  elementReferences.itemModalKicker.textContent = "Novo insumo";
  elementReferences.itemModalTitle.textContent = "Adicionar item";
  elementReferences.itemSubmitButton.textContent = "Salvar item";
}

/**
 * Preenche o formulario de insumo com dados de um item existente.
 * @param {object} inventoryItem Item de estoque que sera editado.
 * @returns {void}
 */
function populateItemFormForEditing(inventoryItem) {
  editingInventoryItemId = inventoryItem.id;
  ensureCategoryOptionExists(inventoryItem.category);
  elementReferences.itemNameInput.value = inventoryItem.name;
  elementReferences.itemCategoryInput.value = inventoryItem.category;
  elementReferences.packageQuantityInput.value = formatEditableNumber(inventoryItem.packageQuantity);
  elementReferences.unitMeasureInput.value = inventoryItem.unitMeasure;
  elementReferences.purchasePriceInput.value = formatEditableNumber(inventoryItem.purchasePrice);
  elementReferences.currentStockInput.value = formatEditableNumber(inventoryItem.currentStock);
  elementReferences.itemModalKicker.textContent = "Editar insumo";
  elementReferences.itemModalTitle.textContent = "Atualizar item";
  elementReferences.itemSubmitButton.textContent = "Salvar alterações";
}

/**
 * Garante que uma categoria existente no estoque apareca no select de edicao.
 * @param {string} categoryName Categoria que precisa estar disponivel.
 * @returns {void}
 */
function ensureCategoryOptionExists(categoryName) {
  const categoryExists = [...elementReferences.itemCategoryInput.options]
    .some((optionElement) => optionElement.value === categoryName);

  if (categoryExists) {
    return;
  }

  const categoryOption = document.createElement("option");
  categoryOption.value = categoryName;
  categoryOption.textContent = categoryName;
  elementReferences.itemCategoryInput.append(categoryOption);
}

/**
 * Abre o modal de importacao CSV.
 * @returns {void}
 */
function openImportModal() {
  elementReferences.importForm.reset();
  elementReferences.importFeedback.textContent = formatCounter(0, 0);
  openModal(elementReferences.importModal);
}

/**
 * Abre um dialog, com fallback para navegadores sem showModal.
 * @param {HTMLDialogElement} modalElement Dialog que sera aberto.
 * @returns {void}
 */
function openModal(modalElement) {
  if (typeof modalElement.showModal === "function") {
    modalElement.showModal();
    return;
  }

  modalElement.setAttribute("open", "");
}

/**
 * Fecha um dialog, com fallback para navegadores sem close.
 * @param {HTMLDialogElement} modalElement Dialog que sera fechado.
 * @returns {void}
 */
function closeModal(modalElement) {
  if (typeof modalElement.close === "function" && modalElement.open) {
    modalElement.close();
    return;
  }

  modalElement.removeAttribute("open");
}

/**
 * Salva um insumo novo ou atualiza um insumo existente a partir do formulario.
 * @returns {void}
 */
function saveInventoryItemFromForm() {
  const inventoryItem = {
    id: editingInventoryItemId || createEntityId("item"),
    name: elementReferences.itemNameInput.value.trim(),
    category: elementReferences.itemCategoryInput.value,
    unitMeasure: normalizeUnitMeasure(elementReferences.unitMeasureInput.value),
    packageQuantity: normalizeNumber(elementReferences.packageQuantityInput.value),
    purchasePrice: normalizeNumber(elementReferences.purchasePriceInput.value),
    currentStock: normalizeNumber(elementReferences.currentStockInput.value),
    createdAt: new Date().toISOString()
  };

  if (!inventoryItem.name || inventoryItem.packageQuantity <= 0 || inventoryItem.purchasePrice <= 0) {
    elementReferences.itemForm.reportValidity();
    return;
  }

  if (editingInventoryItemId) {
    updateInventoryItem(inventoryItem);
  } else {
    applicationState.inventoryItems.unshift(inventoryItem);
  }

  saveApplicationState();
  closeModal(elementReferences.itemModal);
  editingInventoryItemId = null;
  renderCategoryFilters();
  renderApplication();
}

/**
 * Atualiza um insumo existente no estado local.
 * @param {object} updatedItem Item de estoque com dados atualizados.
 * @returns {void}
 */
function updateInventoryItem(updatedItem) {
  applicationState.inventoryItems = applicationState.inventoryItems.map((inventoryItem) => (
    inventoryItem.id === updatedItem.id
      ? {
        ...inventoryItem,
        ...updatedItem,
        createdAt: inventoryItem.createdAt || updatedItem.createdAt
      }
      : inventoryItem
  ));
}

/**
 * Exclui um insumo do estoque e remove suas referencias dos orcamentos.
 * @param {string} inventoryItemId Identificador do insumo.
 * @returns {void}
 */
function deleteInventoryItem(inventoryItemId) {
  const inventoryItem = findInventoryItemById(inventoryItemId);

  if (!inventoryItem) {
    return;
  }

  const shouldDeleteItem = window.confirm(`Excluir "${inventoryItem.name}" do estoque?`);

  if (!shouldDeleteItem) {
    return;
  }

  applicationState.inventoryItems = applicationState.inventoryItems.filter((item) => item.id !== inventoryItemId);
  applicationState.budgets = applicationState.budgets.map((budget) => ({
    ...budget,
    items: budget.items.filter((cartItem) => cartItem.inventoryItemId !== inventoryItemId)
  }));

  saveApplicationState();
  renderApplication();
}

/**
 * Define a categoria ativa usada na filtragem do estoque.
 * @param {string} categoryName Nome da categoria selecionada.
 * @returns {void}
 */
function setActiveInventoryCategory(categoryName) {
  activeInventoryCategory = categoryName || CATEGORY_ALL_VALUE;
  renderCategoryFilters();
  renderInventory();
}

/**
 * Atualiza os dados de mao de obra do orcamento ativo.
 * @returns {void}
 */
function updateBudgetLaborFromForm() {
  const activeBudget = getActiveBudget();

  activeBudget.hourlyRate = normalizeNumber(elementReferences.hourlyRateInput.value);
  activeBudget.sessionHours = normalizeNumber(elementReferences.sessionHoursInput.value);
  saveApplicationState();
  renderBudgetTotals(calculateBudgetTotals(activeBudget));
}

/**
 * Atualiza o preview do custo unitario no formulario de estoque.
 * @returns {void}
 */
function updateUnitCostPreview() {
  const previewItem = {
    packageQuantity: elementReferences.packageQuantityInput.value,
    purchasePrice: elementReferences.purchasePriceInput.value
  };

  elementReferences.unitCostPreview.textContent = formatCurrency(calculateUnitCost(previewItem));
}

/**
 * Adiciona um item de estoque ao orcamento ativo.
 * @param {string} inventoryItemId Identificador do item de estoque.
 * @param {string|number} rawQuantity Quantidade informada pelo usuario.
 * @returns {void}
 */
function addItemToBudget(inventoryItemId, rawQuantity) {
  const inventoryItem = findInventoryItemById(inventoryItemId);
  const quantityUsed = normalizeNumber(rawQuantity);

  if (!inventoryItem || quantityUsed <= 0) {
    return;
  }

  const activeBudget = getActiveBudget();
  const existingItem = activeBudget.items.find((cartItem) => cartItem.inventoryItemId === inventoryItemId);

  if (existingItem) {
    existingItem.quantityUsed += quantityUsed;
  } else {
    activeBudget.items.push({
      id: createEntityId("cart"),
      inventoryItemId,
      quantityUsed
    });
  }

  saveApplicationState();
  renderBudget();
}

/**
 * Atualiza a quantidade usada de um item do orcamento.
 * @param {string} cartItemId Identificador do item no orcamento.
 * @param {string|number} rawQuantity Quantidade digitada.
 * @returns {void}
 */
function updateBudgetItemQuantity(cartItemId, rawQuantity) {
  const activeBudget = getActiveBudget();
  const cartItem = activeBudget.items.find((item) => item.id === cartItemId);

  if (!cartItem) {
    return;
  }

  cartItem.quantityUsed = normalizeNumber(rawQuantity);
  saveApplicationState();
  renderBudget();
}

/**
 * Remove um item do orcamento ativo.
 * @param {string} cartItemId Identificador do item no orcamento.
 * @returns {void}
 */
function removeBudgetItem(cartItemId) {
  const activeBudget = getActiveBudget();
  activeBudget.items = activeBudget.items.filter((item) => item.id !== cartItemId);
  saveApplicationState();
  renderBudget();
}

/**
 * Cria um novo orcamento vazio e o define como ativo.
 * @returns {void}
 */
function createNewBudget() {
  const newBudget = {
    id: createEntityId("budget"),
    name: "Novo orçamento",
    hourlyRate: 0,
    sessionHours: 0,
    items: []
  };

  applicationState.budgets.unshift(newBudget);
  applicationState.activeBudgetId = newBudget.id;
  saveApplicationState();
  renderBudget();
}

/**
 * Le um arquivo CSV local e adiciona os itens importados ao estoque.
 * @returns {void}
 */
function importInventoryFromCsv() {
  const selectedFile = elementReferences.csvFileInput.files[0];

  if (!selectedFile) {
    return;
  }

  const fileReader = new FileReader();

  elementReferences.importFeedback.textContent = formatCounter(0, 0);

  fileReader.onprogress = handleCsvReadProgress;

  fileReader.onload = () => {
    const importedItems = parseCsvInventory(String(fileReader.result || ""));
    applicationState.inventoryItems = [...importedItems, ...applicationState.inventoryItems];
    saveApplicationState();
    elementReferences.importFeedback.textContent = `${formatCounter(importedItems.length, importedItems.length)} itens importados`;
    renderApplication();
  };

  fileReader.readAsText(selectedFile, "utf-8");
}

/**
 * Atualiza o feedback de progresso da leitura do CSV.
 * @param {ProgressEvent<FileReader>} event Evento de progresso da File API.
 * @returns {void}
 */
function handleCsvReadProgress(event) {
  if (!event.lengthComputable) {
    return;
  }

  elementReferences.importFeedback.textContent = `${formatCounter(event.loaded, event.total)} bytes`;
}

/**
 * Converte texto CSV em itens de estoque normalizados.
 * @param {string} csvText Conteudo bruto do arquivo CSV.
 * @returns {Array<object>} Lista de itens importaveis.
 */
function parseCsvInventory(csvText) {
  const rows = parseCsvRows(csvText).filter((row) => row.some(Boolean));
  const headerRow = rows[0] || [];
  const hasHeader = headerRow.some((cell) => normalizeSearchText(cell).includes("nome"));
  const dataRows = hasHeader ? rows.slice(1) : rows;

  return dataRows.map((row) => {
    const itemName = row[0] || "Item importado";
    const packageQuantity = normalizeNumber(row[2] || row[1]);

    return {
      id: createEntityId("item"),
      name: itemName,
      category: row[1] || "Outros",
      packageQuantity,
      unitMeasure: normalizeUnitMeasure(row[3] || "unid"),
      purchasePrice: normalizeNumber(row[4]),
      currentStock: normalizeNumber(row[5] || packageQuantity),
      createdAt: new Date().toISOString()
    };
  }).filter((item) => item.packageQuantity > 0);
}

/**
 * Quebra o conteudo CSV em linhas e celulas simples.
 * @param {string} csvText Conteudo bruto do CSV.
 * @returns {Array<Array<string>>} Linhas e colunas do CSV.
 */
function parseCsvRows(csvText) {
  const delimiter = csvText.includes(";") ? ";" : ",";
  return csvText
    .split(/\r?\n/)
    .map((line) => line.split(delimiter).map((cell) => cell.trim().replace(/^"|"$/g, "")));
}

/**
 * Exporta o estado atual como arquivo JSON de backup.
 * @returns {void}
 */
function exportBackup() {
  const backupBlob = new Blob([JSON.stringify(applicationState, null, 2)], { type: "application/json" });
  const downloadUrl = URL.createObjectURL(backupBlob);
  const anchorElement = document.createElement("a");

  anchorElement.href = downloadUrl;
  anchorElement.download = `calculadora-tattoo-backup-${new Date().toISOString().slice(0, 10)}.json`;
  anchorElement.click();
  URL.revokeObjectURL(downloadUrl);
}

/**
 * Prepara o template de invoice e aciona a impressao/PDF do navegador.
 * @returns {void}
 */
function exportInvoicePdf() {
  renderInvoiceDocument();
  window.print();
}

/**
 * Renderiza o documento oculto usado na exportacao em PDF.
 * @returns {void}
 */
function renderInvoiceDocument() {
  const activeBudget = getActiveBudget();
  const totals = calculateBudgetTotals(activeBudget);
  const itemRows = activeBudget.items.map((cartItem) => {
    const inventoryItem = findInventoryItemById(cartItem.inventoryItemId);

    if (!inventoryItem) {
      return "";
    }

    return `
      <tr>
        <td>${escapeHtml(inventoryItem.name)}</td>
        <td>${formatNumber(cartItem.quantityUsed)} ${escapeHtml(inventoryItem.unitMeasure)}</td>
        <td>${formatCurrency(calculateUnitCost(inventoryItem))}</td>
        <td>${formatCurrency(calculateLineSubtotal(inventoryItem, cartItem.quantityUsed))}</td>
      </tr>
    `;
  }).join("");

  elementReferences.invoiceDocument.innerHTML = `
    <article class="invoice-template">
      <header class="invoice-header">
        <div class="invoice-logo-space">Logo</div>
        <div>
          <span>Invoice</span>
          <h2>${escapeHtml(activeBudget.name)}</h2>
          <p>CalculadoraTattoo</p>
        </div>
      </header>

      <section class="invoice-summary-grid">
        <div>
          <span>Data</span>
          <strong>${new Date().toLocaleDateString("pt-BR")}</strong>
        </div>
        <div>
          <span>Materiais</span>
          <strong>${formatCounter(activeBudget.items.length, activeBudget.items.length)}</strong>
        </div>
        <div>
          <span>Insumos</span>
          <strong>${formatCurrency(totals.materialCost)}</strong>
        </div>
        <div>
          <span>Mão de obra</span>
          <strong>${formatCurrency(totals.laborCost)}</strong>
        </div>
        <div>
          <span>Total</span>
          <strong>${formatCurrency(totals.totalCost)}</strong>
        </div>
      </section>

      <section class="invoice-labor-panel">
        <span>Mão de obra</span>
        <strong>${formatNumber(activeBudget.sessionHours)} h x ${formatCurrency(activeBudget.hourlyRate)} = ${formatCurrency(totals.laborCost)}</strong>
      </section>

      <table class="invoice-table">
        <thead>
          <tr>
            <th>Insumo</th>
            <th>Quantidade</th>
            <th>Unidade</th>
            <th>Subtotal</th>
          </tr>
        </thead>
        <tbody>${itemRows || "<tr><td colspan=\"4\">Nenhum item selecionado.</td></tr>"}</tbody>
      </table>

      <section class="invoice-total-panel">
        <span>Resumo financeiro</span>
        <strong>Insumos: ${formatCurrency(totals.materialCost)}</strong>
        <strong>Mão de obra: ${formatCurrency(totals.laborCost)}</strong>
        <strong>Total do orçamento: ${formatCurrency(totals.totalCost)}</strong>
      </section>
    </article>
  `;
}

/**
 * Calcula o custo unitario de um insumo.
 * @param {object} item Item com preco de compra e quantidade por embalagem.
 * @returns {number} Custo por unidade fracionada.
 */
function calculateUnitCost(item) {
  const packageQuantity = normalizeNumber(item.packageQuantity);
  const purchasePrice = normalizeNumber(item.purchasePrice);

  if (packageQuantity <= 0) {
    return 0;
  }

  return purchasePrice / packageQuantity;
}

/**
 * Calcula o subtotal de uma linha do orcamento.
 * @param {object} item Item de estoque usado.
 * @param {string|number} quantityUsed Quantidade usada no orcamento.
 * @returns {number} Subtotal da linha.
 */
function calculateLineSubtotal(item, quantityUsed) {
  return calculateUnitCost(item) * normalizeNumber(quantityUsed);
}

/**
 * Calcula os totais agregados do orcamento.
 * @param {object} budget Orcamento ativo.
 * @returns {{materialCost: number, laborCost: number, totalCost: number}} Totais calculados.
 */
function calculateBudgetTotals(budget) {
  const materialCost = budget.items.reduce((total, cartItem) => {
    const inventoryItem = findInventoryItemById(cartItem.inventoryItemId);
    return inventoryItem ? total + calculateLineSubtotal(inventoryItem, cartItem.quantityUsed) : total;
  }, 0);
  const laborCost = calculateLaborCost(budget);

  return {
    materialCost,
    laborCost,
    totalCost: materialCost + laborCost
  };
}

/**
 * Calcula o valor de mao de obra do orcamento.
 * @param {object} budget Orcamento com horas e valor por hora.
 * @returns {number} Custo total de mao de obra.
 */
function calculateLaborCost(budget) {
  return normalizeNumber(budget.sessionHours) * normalizeNumber(budget.hourlyRate);
}

/**
 * Calcula o percentual de estoque em relacao a uma embalagem completa.
 * @param {object} item Item de estoque.
 * @returns {number} Percentual limitado entre 0 e 100.
 */
function calculateStockPercentage(item) {
  const packageQuantity = normalizeNumber(item.packageQuantity);

  if (packageQuantity <= 0) {
    return 0;
  }

  return Math.max(0, Math.min(100, (normalizeNumber(item.currentStock) / packageQuantity) * 100));
}

/**
 * Define a classe visual e o texto de status do estoque.
 * @param {number} stockPercentage Percentual de estoque disponivel.
 * @returns {{className: string, label: string}} Status visual do estoque.
 */
function getStockStatus(stockPercentage) {
  if (stockPercentage <= 15) {
    return {
      className: "is-stock-critical",
      label: "Estoque crítico"
    };
  }

  if (stockPercentage <= 35) {
    return {
      className: "is-stock-low",
      label: "Reposição sugerida"
    };
  }

  return {
    className: "is-stock-healthy",
    label: "Estoque saudável"
  };
}

/**
 * Extrai a inicial usada como marcador visual do produto.
 * @param {string} name Nome do produto.
 * @returns {string} Inicial em caixa alta.
 */
function getProductInitial(name) {
  const normalizedName = String(name || "I").trim();
  return normalizedName.charAt(0).toUpperCase() || "I";
}

/**
 * Retorna o orcamento ativo do estado.
 * @returns {object} Orcamento ativo.
 */
function getActiveBudget() {
  return applicationState.budgets.find((budget) => budget.id === applicationState.activeBudgetId) || applicationState.budgets[0];
}

/**
 * Busca um item de estoque pelo identificador.
 * @param {string} itemId Identificador do item.
 * @returns {object|undefined} Item encontrado.
 */
function findInventoryItemById(itemId) {
  return applicationState.inventoryItems.find((item) => item.id === itemId);
}

/**
 * Filtra itens de estoque por texto de busca e categoria.
 * @param {string} searchTerm Termo digitado pelo usuario.
 * @param {string=} categoryName Categoria selecionada.
 * @returns {Array<object>} Itens filtrados.
 */
function getFilteredInventoryItems(searchTerm, categoryName = CATEGORY_ALL_VALUE) {
  const normalizedSearchTerm = normalizeSearchText(searchTerm);

  return applicationState.inventoryItems.filter((item) => {
    const searchableText = normalizeSearchText(`${item.name} ${item.category} ${item.unitMeasure}`);
    const matchesSearch = !normalizedSearchTerm || searchableText.includes(normalizedSearchTerm);
    const matchesCategory = categoryName === CATEGORY_ALL_VALUE || item.category === categoryName;
    return matchesSearch && matchesCategory;
  });
}

/**
 * Retorna categorias base e categorias cadastradas no estoque.
 * @returns {Array<string>} Categorias sem repeticao.
 */
function getInventoryCategories() {
  const inventoryCategories = applicationState.inventoryItems.map((item) => item.category);
  return [...new Set([...BASE_INVENTORY_CATEGORIES, ...inventoryCategories])];
}

/**
 * Conta quantos itens existem em uma categoria.
 * @param {string} categoryName Categoria avaliada.
 * @returns {number} Quantidade de itens da categoria.
 */
function countInventoryItemsByCategory(categoryName) {
  if (categoryName === CATEGORY_ALL_VALUE) {
    return applicationState.inventoryItems.length;
  }

  return applicationState.inventoryItems.filter((item) => item.category === categoryName).length;
}

/**
 * Normaliza unidades de medida aceitas pela interface.
 * @param {string} unitMeasure Unidade digitada ou selecionada.
 * @returns {string} Unidade normalizada.
 */
function normalizeUnitMeasure(unitMeasure) {
  const normalizedUnit = normalizeSearchText(unitMeasure).replace(/[^a-z0-9]/g, "");

  if (["un", "und", "unid", "unidade", "unidades"].includes(normalizedUnit)) {
    return "unid";
  }

  if (["g", "grama", "gramas"].includes(normalizedUnit)) {
    return "gramas";
  }

  if (["metro", "metros", "m"].includes(normalizedUnit)) {
    return "metros";
  }

  if (["folha", "folhas"].includes(normalizedUnit)) {
    return "folhas";
  }

  if (["ml", "mg"].includes(normalizedUnit)) {
    return normalizedUnit;
  }

  return "unid";
}

/**
 * Converte textos monetarios ou decimais em numero positivo.
 * @param {string|number|null|undefined} value Valor bruto.
 * @returns {number} Numero normalizado.
 */
function normalizeNumber(value) {
  const numericText = String(value == null ? "" : value)
    .trim()
    .replace(/\s/g, "")
    .replace(/[R$]/g, "");
  const lastCommaIndex = numericText.lastIndexOf(",");
  const lastDotIndex = numericText.lastIndexOf(".");
  let normalizedText = numericText;

  if (lastCommaIndex > -1 && lastDotIndex > -1) {
    normalizedText = lastCommaIndex > lastDotIndex
      ? numericText.replace(/\./g, "").replace(",", ".")
      : numericText.replace(/,/g, "");
  } else if (lastCommaIndex > -1) {
    normalizedText = numericText.replace(",", ".");
  }

  const parsedValue = Number(normalizedText);
  return Number.isFinite(parsedValue) && parsedValue >= 0 ? parsedValue : 0;
}

/**
 * Normaliza texto para buscas sem acento e em caixa baixa.
 * @param {string} value Texto bruto.
 * @returns {string} Texto normalizado.
 */
function normalizeSearchText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Cria identificadores unicos para entidades do app.
 * @param {string} prefix Prefixo semantico da entidade.
 * @returns {string} Identificador unico.
 */
function createEntityId(prefix) {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return `${prefix}-${window.crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/**
 * Formata valores monetarios em reais.
 * @param {number} value Valor numerico.
 * @returns {string} Valor formatado em BRL.
 */
function formatCurrency(value) {
  return CURRENCY_FORMATTER.format(Number.isFinite(value) ? value : 0);
}

/**
 * Formata numeros para exibicao curta.
 * @param {number} value Valor numerico.
 * @returns {string} Numero formatado.
 */
function formatNumber(value) {
  return NUMBER_FORMATTER.format(Number.isFinite(value) ? value : 0);
}

/**
 * Formata contadores no padrao obrigatorio Atual de Total.
 * @param {string|number} currentValue Valor atual.
 * @param {string|number} totalValue Valor total.
 * @returns {string} Contador no formato Atual de Total.
 */
function formatCounter(currentValue, totalValue) {
  return `${formatNumber(normalizeNumber(currentValue))} de ${formatNumber(normalizeNumber(totalValue))}`;
}

/**
 * Formata um numero para edicao em campos pt-BR.
 * @param {string|number} value Valor bruto.
 * @returns {string} Valor editavel.
 */
function formatEditableNumber(value) {
  return String(normalizeNumber(value)).replace(".", ",");
}

/**
 * Escapa texto antes de inserir HTML dinamico.
 * @param {unknown} value Valor bruto.
 * @returns {string} Texto seguro para HTML.
 */
function escapeHtml(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Cria o HTML de estado vazio.
 * @param {string} message Mensagem exibida.
 * @returns {string} HTML do estado vazio.
 */
function createEmptyStateHtml(message) {
  return `<article class="empty-state">${escapeHtml(message)}</article>`;
}

/**
 * Registra o service worker de forma silenciosa.
 * @returns {void}
 */
function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch(() => {});
  });
}

initializeApplication();
