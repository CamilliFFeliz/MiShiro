const STORAGE_KEY = "tattooCalculatorV1";

const DEFAULT_ITEMS = [
  { name: "Sabonete Líquido", packageQty: 400, unit: "ml", packagePrice: 37 },
  { name: "Bandagem", packageQty: 4.5, unit: "metros", packagePrice: 10 },
  { name: "Lâmina", packageQty: 7, unit: "unid", packagePrice: 7 },
  { name: "Batoque", packageQty: 50, unit: "unid", packagePrice: 30 },
  { name: "Agulhas", packageQty: 1, unit: "unid", packagePrice: 15 },
  { name: "Vaselina", packageQty: 150, unit: "gramas", packagePrice: 30 },
  { name: "Transfer", packageQty: 30, unit: "ml", packagePrice: 28 },
  { name: "Folha Estêncil", packageQty: 1, unit: "folha", packagePrice: 4.5 },
  { name: "Papel Toalha", packageQty: 200, unit: "folhas", packagePrice: 12 },
  { name: "Máscara", packageQty: 100, unit: "unid", packagePrice: 25 },
  { name: "Plástico Filme", packageQty: 70, unit: "metros", packagePrice: 15 },
  { name: "Palito Descartável", packageQty: 100, unit: "unid", packagePrice: 6 },
  { name: "Luvas", packageQty: 100, unit: "unid", packagePrice: 30 },
  { name: "Tinta Preto Linha", packageQty: 20, unit: "ml", packagePrice: 50 },
  { name: "Tinta Preto Tribal", packageQty: 20, unit: "ml", packagePrice: 50 },
  { name: "Tinta Raven Clow", packageQty: 20, unit: "ml", packagePrice: 79 },
  { name: "Tinta Color", packageQty: 20, unit: "ml", packagePrice: 50 }
];

const brlFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL"
});

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric"
});

let state = loadState();
let searchTerm = "";

const quoteList = document.querySelector("#quoteList");
const summaryGrid = document.querySelector("#summaryGrid");
const itemsTableBody = document.querySelector("#itemsTableBody");
const emptyStateTemplate = document.querySelector("#emptyStateTemplate");

const quoteTitle = document.querySelector("#quoteTitle");
const clientName = document.querySelector("#clientName");
const quoteDate = document.querySelector("#quoteDate");
const quoteNotes = document.querySelector("#quoteNotes");
const laborHours = document.querySelector("#laborHours");
const hourlyRate = document.querySelector("#hourlyRate");
const marginPercent = document.querySelector("#marginPercent");
const itemSearch = document.querySelector("#itemSearch");

function uid() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }

  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function createDefaultItems() {
  return DEFAULT_ITEMS.map((item) => ({
    id: uid(),
    name: item.name,
    packageQty: item.packageQty,
    unit: item.unit,
    packagePrice: item.packagePrice,
    quantityUsed: 0
  }));
}

function createQuote(title = "Nova ficha", items = createDefaultItems()) {
  const now = new Date().toISOString();

  return {
    id: uid(),
    title,
    client: "",
    date: todayISO(),
    notes: "",
    laborHours: 1,
    hourlyRate: 25,
    marginPercent: 100,
    items: items.map((item) => ({ ...item, id: uid(), quantityUsed: Number(item.quantityUsed) || 0 })),
    createdAt: now,
    updatedAt: now
  };
}

function initialState() {
  const firstQuote = createQuote("Ficha base da planilha", createDefaultItems());

  return {
    activeQuoteId: firstQuote.id,
    quotes: [firstQuote]
  };
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    return initialState();
  }

  try {
    const parsed = JSON.parse(raw);

    if (!parsed.quotes || !Array.isArray(parsed.quotes) || parsed.quotes.length === 0) {
      return initialState();
    }

    return parsed;
  } catch (error) {
    console.warn("Não foi possível carregar os dados salvos. Restaurando dados iniciais.", error);
    return initialState();
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function getActiveQuote() {
  return state.quotes.find((quote) => quote.id === state.activeQuoteId) || state.quotes[0];
}

function normalizeNumber(value) {
  const parsed = Number(String(value).replace(",", "."));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function formatBRL(value) {
  return brlFormatter.format(Number.isFinite(value) ? value : 0);
}

function formatNumber(value, decimals = 2) {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals
  }).format(Number.isFinite(value) ? value : 0);
}

function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getUnitCost(item) {
  const packageQty = normalizeNumber(item.packageQty);
  const packagePrice = normalizeNumber(item.packagePrice);

  if (packageQty <= 0) {
    return 0;
  }

  return packagePrice / packageQty;
}

function getItemTotal(item) {
  return normalizeNumber(item.quantityUsed) * getUnitCost(item);
}

function calculateQuote(quote) {
  const materialTotal = quote.items.reduce((sum, item) => sum + getItemTotal(item), 0);
  const laborTotal = normalizeNumber(quote.laborHours) * normalizeNumber(quote.hourlyRate);
  const costTotal = materialTotal + laborTotal;
  const profit = costTotal * (normalizeNumber(quote.marginPercent) / 100);
  const finalPrice = costTotal + profit;

  return {
    materialTotal,
    laborTotal,
    costTotal,
    profit,
    finalPrice
  };
}

function render() {
  const quote = getActiveQuote();

  if (!quote) {
    return;
  }

  state.activeQuoteId = quote.id;
  renderQuoteList();
  renderQuoteForm(quote);
  renderSummary(quote);
  renderItemsTable(quote);
}

function renderQuoteList() {
  quoteList.innerHTML = state.quotes
    .map((quote) => {
      const totals = calculateQuote(quote);
      const date = quote.date ? dateFormatter.format(new Date(`${quote.date}T00:00:00`)) : "Sem data";
      const activeClass = quote.id === state.activeQuoteId ? "active" : "";

      return `
        <button class="quote-card ${activeClass}" data-select-quote="${quote.id}">
          <strong>${escapeHTML(quote.title || "Ficha sem nome")}</strong>
          <span>
            <small>${escapeHTML(date)}</small>
            <small>${formatBRL(totals.finalPrice)}</small>
          </span>
        </button>
      `;
    })
    .join("");
}

function renderQuoteForm(quote) {
  quoteTitle.value = quote.title || "";
  clientName.value = quote.client || "";
  quoteDate.value = quote.date || todayISO();
  quoteNotes.value = quote.notes || "";
  laborHours.value = normalizeNumber(quote.laborHours);
  hourlyRate.value = normalizeNumber(quote.hourlyRate);
  marginPercent.value = normalizeNumber(quote.marginPercent);
}

function renderSummary(quote) {
  const totals = calculateQuote(quote);

  summaryGrid.innerHTML = `
    <article class="summary-card">
      <small>Total materiais</small>
      <strong>${formatBRL(totals.materialTotal)}</strong>
    </article>
    <article class="summary-card">
      <small>Mão de obra</small>
      <strong>${formatBRL(totals.laborTotal)}</strong>
    </article>
    <article class="summary-card">
      <small>Custo total</small>
      <strong>${formatBRL(totals.costTotal)}</strong>
    </article>
    <article class="summary-card">
      <small>Lucro</small>
      <strong>${formatBRL(totals.profit)}</strong>
    </article>
    <article class="summary-card highlight">
      <small>Cobrar</small>
      <strong>${formatBRL(totals.finalPrice)}</strong>
    </article>
  `;
}

function renderItemsTable(quote) {
  const filteredItems = quote.items.filter((item) => {
    const target = `${item.name} ${item.unit}`.toLowerCase();
    return target.includes(searchTerm.trim().toLowerCase());
  });

  if (filteredItems.length === 0) {
    const empty = emptyStateTemplate.content.cloneNode(true);
    itemsTableBody.innerHTML = `<tr><td colspan="8"></td></tr>`;
    itemsTableBody.querySelector("td").appendChild(empty);
    return;
  }

  itemsTableBody.innerHTML = filteredItems
    .map((item) => `
      <tr data-item-row="${item.id}">
        <td>
          <input class="product-input" type="text" value="${escapeHTML(item.name)}" data-item-field="name" data-item-id="${item.id}" />
        </td>
        <td>
          <input type="number" min="0" step="0.01" value="${normalizeNumber(item.packageQty)}" data-item-field="packageQty" data-item-id="${item.id}" />
        </td>
        <td>
          <input type="text" value="${escapeHTML(item.unit)}" data-item-field="unit" data-item-id="${item.id}" />
        </td>
        <td>
          <input type="number" min="0" step="0.01" value="${normalizeNumber(item.packagePrice)}" data-item-field="packagePrice" data-item-id="${item.id}" />
        </td>
        <td>
          <span class="readonly-pill">${formatBRL(getUnitCost(item))}</span>
        </td>
        <td>
          <input type="number" min="0" step="0.01" value="${normalizeNumber(item.quantityUsed)}" data-item-field="quantityUsed" data-item-id="${item.id}" />
        </td>
        <td>
          <span class="readonly-pill row-total">${formatBRL(getItemTotal(item))}</span>
        </td>
        <td>
          <button class="icon-btn" title="Remover item" data-remove-item="${item.id}">×</button>
        </td>
      </tr>
    `)
    .join("");
}

function updateActiveQuote(callback) {
  const quote = getActiveQuote();

  if (!quote) {
    return;
  }

  callback(quote);
  quote.updatedAt = new Date().toISOString();
  saveState();
  render();
}

quoteList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-select-quote]");

  if (!button) {
    return;
  }

  state.activeQuoteId = button.dataset.selectQuote;
  saveState();
  render();
});

document.querySelector("#newQuoteBtn").addEventListener("click", () => {
  const newQuote = createQuote(`Ficha ${state.quotes.length + 1}`, createDefaultItems());
  state.quotes.unshift(newQuote);
  state.activeQuoteId = newQuote.id;
  saveState();
  render();
});

document.querySelector("#duplicateQuoteBtn").addEventListener("click", () => {
  const current = getActiveQuote();
  const copy = createQuote(`${current.title || "Ficha"} - cópia`, current.items);
  copy.client = current.client;
  copy.notes = current.notes;
  copy.laborHours = current.laborHours;
  copy.hourlyRate = current.hourlyRate;
  copy.marginPercent = current.marginPercent;
  copy.date = todayISO();

  state.quotes.unshift(copy);
  state.activeQuoteId = copy.id;
  saveState();
  render();
});

document.querySelector("#deleteQuoteBtn").addEventListener("click", () => {
  if (state.quotes.length === 1) {
    alert("Você precisa manter pelo menos uma ficha.");
    return;
  }

  const current = getActiveQuote();
  const confirmed = confirm(`Excluir a ficha "${current.title || "sem nome"}"?`);

  if (!confirmed) {
    return;
  }

  state.quotes = state.quotes.filter((quote) => quote.id !== current.id);
  state.activeQuoteId = state.quotes[0].id;
  saveState();
  render();
});

document.querySelector("#resetAppBtn").addEventListener("click", () => {
  const confirmed = confirm("Isso apaga as fichas salvas neste navegador e restaura os preços iniciais da planilha. Continuar?");

  if (!confirmed) {
    return;
  }

  state = initialState();
  searchTerm = "";
  itemSearch.value = "";
  saveState();
  render();
});

document.querySelector("#clearUsageBtn").addEventListener("click", () => {
  updateActiveQuote((quote) => {
    quote.items = quote.items.map((item) => ({ ...item, quantityUsed: 0 }));
  });
});

document.querySelector("#printQuoteBtn").addEventListener("click", () => {
  window.print();
});

document.querySelector("#addItemBtn").addEventListener("click", () => {
  updateActiveQuote((quote) => {
    quote.items.push({
      id: uid(),
      name: "Novo material",
      packageQty: 1,
      unit: "unid",
      packagePrice: 0,
      quantityUsed: 0
    });
  });
});

itemSearch.addEventListener("input", (event) => {
  searchTerm = event.target.value;
  renderItemsTable(getActiveQuote());
});

document.addEventListener("input", (event) => {
  const quoteField = event.target.dataset.quoteField;
  const numberField = event.target.dataset.numberField;
  const itemField = event.target.dataset.itemField;
  const itemId = event.target.dataset.itemId;

  if (quoteField) {
    updateActiveQuote((quote) => {
      quote[quoteField] = event.target.value;
    });
    return;
  }

  if (numberField) {
    updateActiveQuote((quote) => {
      quote[numberField] = normalizeNumber(event.target.value);
    });
    return;
  }

  if (itemField && itemId) {
    updateActiveQuote((quote) => {
      const item = quote.items.find((entry) => entry.id === itemId);

      if (!item) {
        return;
      }

      if (["packageQty", "packagePrice", "quantityUsed"].includes(itemField)) {
        item[itemField] = normalizeNumber(event.target.value);
      } else {
        item[itemField] = event.target.value;
      }
    });
  }
});

document.addEventListener("click", (event) => {
  const removeId = event.target.dataset.removeItem;

  if (!removeId) {
    return;
  }

  updateActiveQuote((quote) => {
    quote.items = quote.items.filter((item) => item.id !== removeId);
  });
});

saveState();
render();
