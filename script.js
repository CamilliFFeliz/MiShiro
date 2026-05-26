const STORAGE_KEY = "CALCULADORA_TATTOO_LOCAL_STATE_V1";
const CURRENCY_FORMATTER = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL"
});
const NUMBER_FORMATTER = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 2
});

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
  items: []
};

const elementReferences = {};
let applicationState = loadApplicationState();
let activeScreen = "inventory";
let inventorySearchTerm = "";
let budgetSearchTerm = "";

function initializeApplication() {
  bindElementReferences();
  bindEventListeners();
  renderApplication();
  registerServiceWorker();
}

function bindElementReferences() {
  elementReferences.budgetNameInput = document.querySelector("#budgetNameInput");
  elementReferences.budgetSearchInput = document.querySelector("#budgetSearchInput");
  elementReferences.budgetTotalValue = document.querySelector("#budgetTotalValue");
  elementReferences.cartList = document.querySelector("#cartList");
  elementReferences.closeImportModalButton = document.querySelector("#closeImportModalButton");
  elementReferences.closeItemModalButton = document.querySelector("#closeItemModalButton");
  elementReferences.createBudgetButton = document.querySelector("#createBudgetButton");
  elementReferences.currentPageTitle = document.querySelector("#currentPageTitle");
  elementReferences.currentStockInput = document.querySelector("#currentStockInput");
  elementReferences.csvFileInput = document.querySelector("#csvFileInput");
  elementReferences.drawer = document.querySelector("#drawer");
  elementReferences.drawerBackdrop = document.querySelector("#drawerBackdrop");
  elementReferences.exportInvoiceButton = document.querySelector("#exportInvoiceButton");
  elementReferences.importFeedback = document.querySelector("#importFeedback");
  elementReferences.importForm = document.querySelector("#importForm");
  elementReferences.importModal = document.querySelector("#importModal");
  elementReferences.inventoryGrid = document.querySelector("#inventoryGrid");
  elementReferences.inventorySearchInput = document.querySelector("#inventorySearchInput");
  elementReferences.invoiceDocument = document.querySelector("#invoiceDocument");
  elementReferences.itemCategoryInput = document.querySelector("#itemCategoryInput");
  elementReferences.itemForm = document.querySelector("#itemForm");
  elementReferences.itemModal = document.querySelector("#itemModal");
  elementReferences.itemNameInput = document.querySelector("#itemNameInput");
  elementReferences.openDrawerButton = document.querySelector("#openDrawerButton");
  elementReferences.openItemModalButton = document.querySelector("#openItemModalButton");
  elementReferences.packageQuantityInput = document.querySelector("#packageQuantityInput");
  elementReferences.purchasePriceInput = document.querySelector("#purchasePriceInput");
  elementReferences.screens = document.querySelectorAll("[data-screen]");
  elementReferences.stockPickerList = document.querySelector("#stockPickerList");
  elementReferences.unitCostPreview = document.querySelector("#unitCostPreview");
  elementReferences.unitMeasureInput = document.querySelector("#unitMeasureInput");
}

function bindEventListeners() {
  elementReferences.openDrawerButton.addEventListener("click", openDrawer);
  elementReferences.drawerBackdrop.addEventListener("click", closeDrawer);
  elementReferences.closeItemModalButton.addEventListener("click", () => closeModal(elementReferences.itemModal));
  elementReferences.closeImportModalButton.addEventListener("click", () => closeModal(elementReferences.importModal));
  elementReferences.openItemModalButton.addEventListener("click", openItemModal);

  document.querySelectorAll("[data-drawer-action]").forEach((drawerLink) => {
    drawerLink.addEventListener("click", () => handleDrawerAction(drawerLink.dataset.drawerAction));
  });

  elementReferences.inventorySearchInput.addEventListener("input", (event) => {
    inventorySearchTerm = event.target.value;
    renderInventory();
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

  closeDrawer();
}

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

function createInitialState() {
  return {
    inventoryItems: DEFAULT_INVENTORY_ITEMS.map((item) => ({ ...item })),
    budgets: [{ ...DEFAULT_BUDGET, items: [] }],
    activeBudgetId: DEFAULT_BUDGET.id
  };
}

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

function normalizeBudget(budget) {
  return {
    id: budget.id || createEntityId("budget"),
    name: String(budget.name || budget.projectName || "Novo orçamento"),
    items: Array.isArray(budget.items) ? budget.items.map(normalizeBudgetItem) : []
  };
}

function normalizeBudgetItem(item) {
  return {
    id: item.id || createEntityId("cart"),
    inventoryItemId: item.inventoryItemId,
    quantityUsed: normalizeNumber(item.quantityUsed)
  };
}

function saveApplicationState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(applicationState));
}

function renderApplication() {
  renderActiveScreen();
  renderInventory();
  renderBudget();
  updateUnitCostPreview();
}

function renderActiveScreen() {
  elementReferences.screens.forEach((screenElement) => {
    screenElement.classList.toggle("is-active", screenElement.dataset.screen === activeScreen);
  });

  elementReferences.currentPageTitle.textContent = activeScreen === "inventory" ? "Estoque" : "Orçamentos";
  elementReferences.openItemModalButton.hidden = activeScreen !== "inventory";
}

function renderInventory() {
  const filteredItems = getFilteredInventoryItems(inventorySearchTerm);

  if (filteredItems.length === 0) {
    elementReferences.inventoryGrid.innerHTML = createEmptyStateHtml("Nenhum insumo encontrado.");
    return;
  }

  elementReferences.inventoryGrid.innerHTML = filteredItems.map(createInventoryCardHtml).join("");
}

function createInventoryCardHtml(item) {
  const unitCost = calculateUnitCost(item);
  const stockPercentage = calculateStockPercentage(item);

  return `
    <article class="inventory-card" data-inventory-item-id="${escapeHtml(item.id)}">
      <div class="product-topline">
        <span class="category-pill">${escapeHtml(item.category)}</span>
        <span class="unit-tag">por ${escapeHtml(item.unitMeasure)}</span>
      </div>

      <div class="product-title">
        <h3>${escapeHtml(item.name)}</h3>
        <span>${formatNumber(item.packageQuantity)} ${escapeHtml(item.unitMeasure)} por embalagem</span>
      </div>

      <div class="product-footer">
        <div class="unit-price">
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
          <span>Nível do estoque</span>
          <strong>${formatNumber(stockPercentage)}%</strong>
        </div>
        <span class="stock-meter-track">
          <span class="stock-meter-fill" style="width: ${stockPercentage}%"></span>
        </span>
      </div>
    </article>
  `;
}

function renderBudget() {
  const activeBudget = getActiveBudget();
  const totals = calculateBudgetTotals(activeBudget);

  elementReferences.budgetNameInput.value = activeBudget.name;
  elementReferences.budgetTotalValue.textContent = formatCurrency(totals.totalCost);
  renderStockPicker();
  renderCart();
}

function renderStockPicker() {
  const filteredItems = getFilteredInventoryItems(budgetSearchTerm);

  if (filteredItems.length === 0) {
    elementReferences.stockPickerList.innerHTML = createEmptyStateHtml("Nenhum item disponível no estoque.");
    return;
  }

  elementReferences.stockPickerList.innerHTML = filteredItems.map((item) => `
    <article class="picker-card" data-inventory-item-id="${escapeHtml(item.id)}">
      <div>
        <h3>${escapeHtml(item.name)}</h3>
        <span>${escapeHtml(item.category)} · ${formatCurrency(calculateUnitCost(item))}/${escapeHtml(item.unitMeasure)}</span>
      </div>

      <div class="picker-action-row">
        <input data-picker-quantity type="text" inputmode="decimal" placeholder="${escapeHtml(item.unitMeasure)}" />
        <button class="primary-button" type="button" data-add-inventory-item>Adicionar</button>
      </div>
    </article>
  `).join("");
}

function renderCart() {
  const activeBudget = getActiveBudget();
  const visibleItems = activeBudget.items
    .map((cartItem) => ({
      cartItem,
      inventoryItem: findInventoryItemById(cartItem.inventoryItemId)
    }))
    .filter((entry) => entry.inventoryItem);

  if (visibleItems.length === 0) {
    elementReferences.cartList.innerHTML = createEmptyStateHtml("Nenhum item no orçamento.");
    return;
  }

  elementReferences.cartList.innerHTML = visibleItems.map(({ cartItem, inventoryItem }) => {
    const unitCost = calculateUnitCost(inventoryItem);
    const subtotal = calculateLineSubtotal(inventoryItem, cartItem.quantityUsed);

    return `
      <article class="cart-card" data-cart-item-id="${escapeHtml(cartItem.id)}">
        <div>
          <h3>${escapeHtml(inventoryItem.name)}</h3>
          <span>${formatCurrency(unitCost)} x ${formatNumber(cartItem.quantityUsed)} ${escapeHtml(inventoryItem.unitMeasure)}</span>
        </div>

        <input class="cart-quantity-input" data-cart-quantity type="text" inputmode="decimal" value="${escapeHtml(formatEditableNumber(cartItem.quantityUsed))}" />

        <div class="cart-line">
          <span>Subtotal</span>
          <strong>${formatCurrency(subtotal)}</strong>
        </div>

        <button class="danger-button" type="button" data-remove-cart-item>Remover</button>
      </article>
    `;
  }).join("");
}

function openDrawer() {
  elementReferences.drawer.classList.add("is-open");
  elementReferences.drawer.setAttribute("aria-hidden", "false");
  elementReferences.drawerBackdrop.hidden = false;
}

function closeDrawer() {
  elementReferences.drawer.classList.remove("is-open");
  elementReferences.drawer.setAttribute("aria-hidden", "true");
  elementReferences.drawerBackdrop.hidden = true;
}

function setActiveScreen(screenName) {
  activeScreen = screenName;
  renderActiveScreen();
}

function openItemModal() {
  elementReferences.itemForm.reset();
  elementReferences.unitMeasureInput.value = "ml";
  updateUnitCostPreview();
  openModal(elementReferences.itemModal);
  elementReferences.itemNameInput.focus();
}

function openImportModal() {
  elementReferences.importForm.reset();
  elementReferences.importFeedback.textContent = "Aguardando arquivo";
  openModal(elementReferences.importModal);
}

function openModal(modalElement) {
  if (typeof modalElement.showModal === "function") {
    modalElement.showModal();
    return;
  }

  modalElement.setAttribute("open", "");
}

function closeModal(modalElement) {
  if (typeof modalElement.close === "function" && modalElement.open) {
    modalElement.close();
    return;
  }

  modalElement.removeAttribute("open");
}

function saveInventoryItemFromForm() {
  const newItem = {
    id: createEntityId("item"),
    name: elementReferences.itemNameInput.value.trim(),
    category: elementReferences.itemCategoryInput.value,
    unitMeasure: normalizeUnitMeasure(elementReferences.unitMeasureInput.value),
    packageQuantity: normalizeNumber(elementReferences.packageQuantityInput.value),
    purchasePrice: normalizeNumber(elementReferences.purchasePriceInput.value),
    currentStock: normalizeNumber(elementReferences.currentStockInput.value),
    createdAt: new Date().toISOString()
  };

  if (!newItem.name || newItem.packageQuantity <= 0 || newItem.purchasePrice <= 0) {
    elementReferences.itemForm.reportValidity();
    return;
  }

  applicationState.inventoryItems.unshift(newItem);
  saveApplicationState();
  closeModal(elementReferences.itemModal);
  renderApplication();
}

function updateUnitCostPreview() {
  const previewItem = {
    packageQuantity: elementReferences.packageQuantityInput.value,
    purchasePrice: elementReferences.purchasePriceInput.value
  };

  elementReferences.unitCostPreview.textContent = formatCurrency(calculateUnitCost(previewItem));
}

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

function removeBudgetItem(cartItemId) {
  const activeBudget = getActiveBudget();
  activeBudget.items = activeBudget.items.filter((item) => item.id !== cartItemId);
  saveApplicationState();
  renderBudget();
}

function createNewBudget() {
  const newBudget = {
    id: createEntityId("budget"),
    name: "Novo orçamento",
    items: []
  };

  applicationState.budgets.unshift(newBudget);
  applicationState.activeBudgetId = newBudget.id;
  saveApplicationState();
  renderBudget();
}

function importInventoryFromCsv() {
  const selectedFile = elementReferences.csvFileInput.files[0];

  if (!selectedFile) {
    return;
  }

  const fileReader = new FileReader();

  fileReader.onload = () => {
    const importedItems = parseCsvInventory(String(fileReader.result || ""));
    applicationState.inventoryItems = [...importedItems, ...applicationState.inventoryItems];
    saveApplicationState();
    elementReferences.importFeedback.textContent = `${importedItems.length} itens importados`;
    renderApplication();
  };

  fileReader.readAsText(selectedFile, "utf-8");
}

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

function parseCsvRows(csvText) {
  const delimiter = csvText.includes(";") ? ";" : ",";
  return csvText
    .split(/\r?\n/)
    .map((line) => line.split(delimiter).map((cell) => cell.trim().replace(/^"|"$/g, "")));
}

function exportBackup() {
  const backupBlob = new Blob([JSON.stringify(applicationState, null, 2)], { type: "application/json" });
  const downloadUrl = URL.createObjectURL(backupBlob);
  const anchorElement = document.createElement("a");

  anchorElement.href = downloadUrl;
  anchorElement.download = `calculadora-tattoo-backup-${new Date().toISOString().slice(0, 10)}.json`;
  anchorElement.click();
  URL.revokeObjectURL(downloadUrl);
}

function exportInvoicePdf() {
  renderInvoiceDocument();
  window.print();
}

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
          <span>Itens</span>
          <strong>${activeBudget.items.length}</strong>
        </div>
        <div>
          <span>Total</span>
          <strong>${formatCurrency(totals.totalCost)}</strong>
        </div>
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
        <strong>Total do orçamento: ${formatCurrency(totals.totalCost)}</strong>
      </section>
    </article>
  `;
}

function calculateUnitCost(item) {
  const packageQuantity = normalizeNumber(item.packageQuantity);
  const purchasePrice = normalizeNumber(item.purchasePrice);

  if (packageQuantity <= 0) {
    return 0;
  }

  return purchasePrice / packageQuantity;
}

function calculateLineSubtotal(item, quantityUsed) {
  return calculateUnitCost(item) * normalizeNumber(quantityUsed);
}

function calculateBudgetTotals(budget) {
  const totalCost = budget.items.reduce((total, cartItem) => {
    const inventoryItem = findInventoryItemById(cartItem.inventoryItemId);
    return inventoryItem ? total + calculateLineSubtotal(inventoryItem, cartItem.quantityUsed) : total;
  }, 0);

  return {
    totalCost
  };
}

function calculateStockPercentage(item) {
  const packageQuantity = normalizeNumber(item.packageQuantity);

  if (packageQuantity <= 0) {
    return 0;
  }

  return Math.max(0, Math.min(100, (normalizeNumber(item.currentStock) / packageQuantity) * 100));
}

function getActiveBudget() {
  return applicationState.budgets.find((budget) => budget.id === applicationState.activeBudgetId) || applicationState.budgets[0];
}

function findInventoryItemById(itemId) {
  return applicationState.inventoryItems.find((item) => item.id === itemId);
}

function getFilteredInventoryItems(searchTerm) {
  const normalizedSearchTerm = normalizeSearchText(searchTerm);

  return applicationState.inventoryItems.filter((item) => {
    const searchableText = normalizeSearchText(`${item.name} ${item.category} ${item.unitMeasure}`);
    return !normalizedSearchTerm || searchableText.includes(normalizedSearchTerm);
  });
}

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

function normalizeSearchText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function createEntityId(prefix) {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return `${prefix}-${window.crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function formatCurrency(value) {
  return CURRENCY_FORMATTER.format(Number.isFinite(value) ? value : 0);
}

function formatNumber(value) {
  return NUMBER_FORMATTER.format(Number.isFinite(value) ? value : 0);
}

function formatEditableNumber(value) {
  return String(normalizeNumber(value)).replace(".", ",");
}

function escapeHtml(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function createEmptyStateHtml(message) {
  return `<article class="empty-state">${escapeHtml(message)}</article>`;
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch(() => {});
  });
}

initializeApplication();
