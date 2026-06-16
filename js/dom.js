import { calculateBudgetTotals as calculateBudgetTotalsCore } from "./budget.js";
import { calculateLineSubtotal as calculateLineSubtotalCore, calculateRawUnitCost as calculateRawUnitCostCore, calculateTotalInventoryValue as calculateTotalInventoryValueCore, calculateUnitCost as calculateUnitCostCore } from "./inventory.js";
import { exportBudgetPdf } from "./pdf.js";
import { createReactiveState, loadAppState as loadPersistedAppState, scheduleSaveAppState } from "./state.js";
import { readStorageItem, writeStorageItem } from "./utils.js";

const STORAGE_KEY = "CALCULADORA_TATTOO_STATE_V5";
const THEME_STORAGE_KEY = "CALCULADORA_TATTOO_THEME";
const LEGACY_STORAGE_KEYS = [
  "CALCULADORA_TATTOO_LOCAL_STATE_V1",
  "CALCULADORA_TATTOO_STATE_V2",
  "CALCULADORA_TATTOO_STATE_V3"
];
const THEME_DARK = "dark";
const THEME_LIGHT = "light";
const THEME_META_COLORS = {
  [THEME_DARK]: "#2D0B40",
  [THEME_LIGHT]: "#F6F7FB"
};
const CATEGORY_ALL = "Todos";
const CATEGORY_NEEDLES = "Agulhas e Cartuchos";
const CATEGORY_INKS = "Tintas";
const CATEGORY_PASTES = "Pastosos";
const CATEGORY_DISPOSABLES = "Biossegurança e Descartáveis";
const CATEGORY_CLEANING = "Limpeza e Finalização";
const CATEGORY_LINEAR = "Materiais de Extensão";
const UNIT_PURCHASE_CATEGORIES = [CATEGORY_NEEDLES, CATEGORY_DISPOSABLES, CATEGORY_CLEANING];
const CALCULATION_UNIT_BOX = "unitBox";
const CALCULATION_FRACTIONAL = "fractional";
const PURCHASE_MODE_BOX = "box";
const PURCHASE_MODE_SINGLE = "single";
const MEASURE_UNIT = "un";
const MEASURE_ML = "ml";
const MEASURE_GRAM = "g";
const MEASURE_METER = "m";
const INTEGER_STEP = 1;
const DECIMAL_STEP = 0.5;
const MAX_IMAGE_SIZE_BYTES = 8000000;
const LOW_STOCK_THRESHOLD = 2;
const BACKUP_APP_NAME = "CalculadoraTattoo";
const BACKUP_SCHEMA = "calculadora-tattoo-inventory-backup";
const BACKUP_VERSION = 1;
const BACKUP_FILE_PREFIX = "backup_estoque";
const REFERENCE_STOCK_CREATED_AT = "2026-05-29T00:00:00.000Z";
const SCREEN_META = {
  home: { title: "Início", eyebrow: "Visão geral" },
  reports: { title: "Relatórios", eyebrow: "Indicadores" },
  inventory: { title: "Estoque", eyebrow: "Banco local" },
  budget: { title: "Orçamento", eyebrow: "Ficha do cliente" }
};
const CURRENCY_FORMATTER = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL"
});
const NUMBER_FORMATTER = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2
});
const CATEGORY_ICON_MAP = {
  [CATEGORY_ALL]: "layout-grid",
  [CATEGORY_NEEDLES]: "package",
  [CATEGORY_INKS]: "droplets",
  [CATEGORY_PASTES]: "paintbrush",
  [CATEGORY_DISPOSABLES]: "shield-check",
  [CATEGORY_CLEANING]: "sparkles",
  [CATEGORY_LINEAR]: "ruler"
};
const CATEGORY_DEFINITIONS = {
  [CATEGORY_NEEDLES]: {
    label: CATEGORY_NEEDLES,
    helper: "Cartuchos por caixa ou por unidade, com quantidade real em estoque.",
    calculationType: CALCULATION_UNIT_BOX,
    defaultMeasure: MEASURE_UNIT,
    fields: [
      { key: "brand", label: "Marca", type: "text", placeholder: "Ex: White Head", required: true },
      { key: "lineType", label: "Linha/Tipo", type: "text", placeholder: "Ex: RL, RS, MG", required: true },
      { key: "numbering", label: "Numeração", type: "text", placeholder: "Ex: 0310, 0712", required: true },
      { key: "purchaseMode", label: "Formato de compra", type: "select", required: true, options: [
        { value: PURCHASE_MODE_BOX, label: "Por Caixa" },
        { value: PURCHASE_MODE_SINGLE, label: "Por Unidade" }
      ] },
      { key: "packageQuantity", label: "Quantidade na caixa", type: "number", inputMode: "numeric", placeholder: "20", required: true, visibleWhen: { key: "purchaseMode", value: PURCHASE_MODE_BOX } },
      { key: "packagePrice", label: "Preço da caixa", type: "currency", inputMode: "decimal", placeholder: "300,00", required: true, visibleWhen: { key: "purchaseMode", value: PURCHASE_MODE_BOX } },
      { key: "singleUnitPrice", label: "Preço unitário pago", type: "currency", inputMode: "decimal", placeholder: "15,00", required: true, visibleWhen: { key: "purchaseMode", value: PURCHASE_MODE_SINGLE } },
      { key: "stockQuantity", label: "Quantidade em estoque", type: "number", inputMode: "numeric", placeholder: "5", required: true }
    ]
  },
  [CATEGORY_INKS]: {
    label: CATEGORY_INKS,
    helper: "Tintas em frasco, uso fracionado em ml.",
    calculationType: CALCULATION_FRACTIONAL,
    defaultMeasure: MEASURE_ML,
    fields: [
      { key: "name", label: "Nome", type: "text", placeholder: "Ex: Tinta preta linha", required: true },
      { key: "brand", label: "Marca", type: "text", placeholder: "Ex: Dynamic", required: false },
      { key: "color", label: "Cor", type: "text", placeholder: "Ex: Preto", required: true },
      { key: "packageQuantity", label: "Tamanho do frasco (ml)", type: "number", inputMode: "decimal", placeholder: "30", required: true },
      { key: "packagePrice", label: "Preço do frasco", type: "currency", inputMode: "decimal", placeholder: "100,00", required: true },
      { key: "stockQuantity", label: "Quantidade de frascos em estoque", type: "number", inputMode: "numeric", placeholder: "3", required: true }
    ]
  },
  [CATEGORY_PASTES]: {
    label: CATEGORY_PASTES,
    helper: "Vaselina, transfer e pomadas em g ou ml.",
    calculationType: CALCULATION_FRACTIONAL,
    defaultMeasure: MEASURE_GRAM,
    fields: [
      { key: "name", label: "Nome", type: "text", placeholder: "Ex: Vaselina, transfer, pomada", required: true },
      { key: "brand", label: "Marca", type: "text", placeholder: "Ex: Electric Ink", required: false },
      { key: "packageQuantity", label: "Tamanho da embalagem", type: "measure", inputMode: "decimal", placeholder: "500", required: true, options: [MEASURE_GRAM, MEASURE_ML] },
      { key: "packagePrice", label: "Preço da embalagem", type: "currency", inputMode: "decimal", placeholder: "35,00", required: true },
      { key: "stockQuantity", label: "Quantidade de embalagens em estoque", type: "number", inputMode: "numeric", placeholder: "2", required: true }
    ]
  },
  [CATEGORY_DISPOSABLES]: {
    label: CATEGORY_DISPOSABLES,
    helper: "Pacote/caixa ou unidade solta, uso sempre unitário.",
    calculationType: CALCULATION_UNIT_BOX,
    defaultMeasure: MEASURE_UNIT,
    fields: [
      { key: "name", label: "Nome", type: "text", placeholder: "Ex: Luva, batoque, folha estêncil", required: true },
      { key: "brand", label: "Marca", type: "text", placeholder: "Ex: Supermax", required: false },
      { key: "purchaseMode", label: "Formato de compra", type: "select", required: true, options: [
        { value: PURCHASE_MODE_BOX, label: "Comprado por Pacote/Caixa" },
        { value: PURCHASE_MODE_SINGLE, label: "Comprado por Unidade" }
      ] },
      { key: "packageQuantity", label: "Qtd no pacote/caixa", type: "number", inputMode: "numeric", placeholder: "100", required: true, visibleWhen: { key: "purchaseMode", value: PURCHASE_MODE_BOX } },
      { key: "packagePrice", label: "Preço do pacote", type: "currency", inputMode: "decimal", placeholder: "50,00", required: true, visibleWhen: { key: "purchaseMode", value: PURCHASE_MODE_BOX } },
      { key: "singleUnitPrice", label: "Preço unitário", type: "currency", inputMode: "decimal", placeholder: "4,50", required: true, visibleWhen: { key: "purchaseMode", value: PURCHASE_MODE_SINGLE } },
      { key: "stockQuantity", label: "Quantidade em estoque", type: "number", inputMode: "numeric", placeholder: "15", required: true }
    ]
  },
  [CATEGORY_CLEANING]: {
    label: CATEGORY_CLEANING,
    helper: "Itens de limpeza, transferência e finalização cobrados por uso, folha ou porção.",
    calculationType: CALCULATION_UNIT_BOX,
    defaultMeasure: MEASURE_UNIT,
    fields: [
      { key: "name", label: "Nome", type: "text", placeholder: "Ex: Papel toalha, transfer, manteiga", required: true },
      { key: "brand", label: "Marca", type: "text", placeholder: "Ex: Hornet, Reilly, Spirit", required: false },
      { key: "purchaseMode", label: "Formato de compra", type: "select", required: true, options: [
        { value: PURCHASE_MODE_BOX, label: "Comprado por Pacote/Caixa" },
        { value: PURCHASE_MODE_SINGLE, label: "Comprado por Uso/Unidade" }
      ] },
      { key: "packageQuantity", label: "Qtd no pacote/embalagem", type: "number", inputMode: "numeric", placeholder: "20", required: true, visibleWhen: { key: "purchaseMode", value: PURCHASE_MODE_BOX } },
      { key: "packagePrice", label: "Preço do pacote/embalagem", type: "currency", inputMode: "decimal", placeholder: "35,00", required: true, visibleWhen: { key: "purchaseMode", value: PURCHASE_MODE_BOX } },
      { key: "singleUnitPrice", label: "Preço por uso/unidade", type: "currency", inputMode: "decimal", placeholder: "3,00", required: true, visibleWhen: { key: "purchaseMode", value: PURCHASE_MODE_SINGLE } },
      { key: "stockQuantity", label: "Quantidade em estoque", type: "number", inputMode: "numeric", placeholder: "10", required: true }
    ]
  },
  [CATEGORY_LINEAR]: {
    label: CATEGORY_LINEAR,
    helper: "Rolos medidos exclusivamente por metros.",
    calculationType: CALCULATION_FRACTIONAL,
    defaultMeasure: MEASURE_METER,
    fields: [
      { key: "name", label: "Nome", type: "text", placeholder: "Ex: Plástico filme, bandagem", required: true },
      { key: "brand", label: "Marca", type: "text", placeholder: "Ex: Marca do rolo", required: false },
      { key: "packageQuantity", label: "Tamanho do rolo em metros", type: "number", inputMode: "decimal", placeholder: "30", required: true },
      { key: "packagePrice", label: "Preço do rolo", type: "currency", inputMode: "decimal", placeholder: "25,00", required: true },
      { key: "stockQuantity", label: "Quantidade de rolos em estoque", type: "number", inputMode: "numeric", placeholder: "2", required: true }
    ]
  }
};
const CATEGORY_ORDER = [
  CATEGORY_ALL,
  CATEGORY_NEEDLES,
  CATEGORY_INKS,
  CATEGORY_PASTES,
  CATEGORY_DISPOSABLES,
  CATEGORY_CLEANING,
  CATEGORY_LINEAR
];
const DEFAULT_REFERENCE_STOCK = [
  {
    id: "reference-cartucho-rl-uso-medio",
    category: CATEGORY_NEEDLES,
    name: "Cartucho RL (Traço)",
    brand: "",
    lineType: "Cartucho RL (Traço)",
    numbering: "",
    purchaseMode: PURCHASE_MODE_SINGLE,
    packageQuantity: 1,
    packagePrice: 15,
    stockQuantity: 20,
    measureUnit: MEASURE_UNIT,
    calculationType: CALCULATION_UNIT_BOX,
    createdAt: REFERENCE_STOCK_CREATED_AT,
    updatedAt: REFERENCE_STOCK_CREATED_AT
  },
  {
    id: "reference-cartucho-rm-mg-uso-medio",
    category: CATEGORY_NEEDLES,
    name: "Cartucho RM/MG (Pintura/Sombra)",
    brand: "",
    lineType: "Cartucho RM/MG (Pintura/Sombra)",
    numbering: "",
    purchaseMode: PURCHASE_MODE_SINGLE,
    packageQuantity: 1,
    packagePrice: 15,
    stockQuantity: 20,
    measureUnit: MEASURE_UNIT,
    calculationType: CALCULATION_UNIT_BOX,
    createdAt: REFERENCE_STOCK_CREATED_AT,
    updatedAt: REFERENCE_STOCK_CREATED_AT
  },
  {
    id: "reference-agulha-tradicional-haste",
    category: CATEGORY_NEEDLES,
    name: "Agulha Tradicional Haste",
    brand: "",
    lineType: "Agulha Tradicional Haste",
    numbering: "",
    purchaseMode: PURCHASE_MODE_SINGLE,
    packageQuantity: 1,
    packagePrice: 3,
    stockQuantity: 50,
    measureUnit: MEASURE_UNIT,
    calculationType: CALCULATION_UNIT_BOX,
    createdAt: REFERENCE_STOCK_CREATED_AT,
    updatedAt: REFERENCE_STOCK_CREATED_AT
  },
  {
    id: "reference-aston-premium-rl-caixa",
    category: CATEGORY_NEEDLES,
    name: "Aston Premium Cartucho RL 1007RL",
    brand: "Aston Premium",
    lineType: "Cartucho RL",
    numbering: "1007RL",
    purchaseMode: PURCHASE_MODE_BOX,
    packageQuantity: 20,
    packagePrice: 122,
    stockQuantity: 1,
    measureUnit: MEASURE_UNIT,
    calculationType: CALCULATION_UNIT_BOX,
    createdAt: REFERENCE_STOCK_CREATED_AT,
    updatedAt: REFERENCE_STOCK_CREATED_AT
  },
  {
    id: "reference-radiant-mr-caixa",
    category: CATEGORY_NEEDLES,
    name: "Radiant Cartucho Magnum Round MR",
    brand: "Radiant",
    lineType: "Cartucho Magnum Round",
    numbering: "MR 0.30",
    purchaseMode: PURCHASE_MODE_BOX,
    packageQuantity: 20,
    packagePrice: 150,
    stockQuantity: 1,
    measureUnit: MEASURE_UNIT,
    calculationType: CALCULATION_UNIT_BOX,
    createdAt: REFERENCE_STOCK_CREATED_AT,
    updatedAt: REFERENCE_STOCK_CREATED_AT
  },
  {
    id: "reference-kwadron-rl-caixa",
    category: CATEGORY_NEEDLES,
    name: "Kwadron Cartucho RL",
    brand: "Kwadron",
    lineType: "Cartucho RL",
    numbering: "Traço",
    purchaseMode: PURCHASE_MODE_BOX,
    packageQuantity: 20,
    packagePrice: 200,
    stockQuantity: 1,
    measureUnit: MEASURE_UNIT,
    calculationType: CALCULATION_UNIT_BOX,
    createdAt: REFERENCE_STOCK_CREATED_AT,
    updatedAt: REFERENCE_STOCK_CREATED_AT
  },
  {
    id: "reference-tinta-preta-linha",
    category: CATEGORY_INKS,
    name: "Tinta Preta Linha (Black Lining)",
    brand: "Dynamic Color Co",
    color: "Preto Linha",
    packageQuantity: 240,
    packagePrice: 419.9,
    stockQuantity: 1,
    measureUnit: MEASURE_ML,
    calculationType: CALCULATION_FRACTIONAL,
    createdAt: REFERENCE_STOCK_CREATED_AT,
    updatedAt: REFERENCE_STOCK_CREATED_AT
  },
  {
    id: "reference-tinta-preta-preenchimento",
    category: CATEGORY_INKS,
    name: "Tinta Preta Preenchimento",
    brand: "The Ink",
    color: "Maximum's Black",
    packageQuantity: 260,
    packagePrice: 235,
    stockQuantity: 1,
    measureUnit: MEASURE_ML,
    calculationType: CALCULATION_FRACTIONAL,
    createdAt: REFERENCE_STOCK_CREATED_AT,
    updatedAt: REFERENCE_STOCK_CREATED_AT
  },
  {
    id: "reference-tinta-colorida",
    category: CATEGORY_INKS,
    name: "Tinta Colorida",
    brand: "Electric Ink",
    color: "Cores variadas",
    packageQuantity: 30,
    packagePrice: 78,
    stockQuantity: 4,
    measureUnit: MEASURE_ML,
    calculationType: CALCULATION_FRACTIONAL,
    createdAt: REFERENCE_STOCK_CREATED_AT,
    updatedAt: REFERENCE_STOCK_CREATED_AT
  },
  {
    id: "reference-electric-raven-black-30ml",
    category: CATEGORY_INKS,
    name: "Tinta Raven Black 30ml",
    brand: "Electric Ink",
    color: "Raven Black",
    packageQuantity: 30,
    packagePrice: 85,
    stockQuantity: 1,
    measureUnit: MEASURE_ML,
    calculationType: CALCULATION_FRACTIONAL,
    createdAt: REFERENCE_STOCK_CREATED_AT,
    updatedAt: REFERENCE_STOCK_CREATED_AT
  },
  {
    id: "reference-iron-works-colorida-30ml",
    category: CATEGORY_INKS,
    name: "Tinta Colorida 30ml",
    brand: "Iron Works",
    color: "Cores variadas",
    packageQuantity: 30,
    packagePrice: 93.5,
    stockQuantity: 3,
    measureUnit: MEASURE_ML,
    calculationType: CALCULATION_FRACTIONAL,
    createdAt: REFERENCE_STOCK_CREATED_AT,
    updatedAt: REFERENCE_STOCK_CREATED_AT
  },
  {
    id: "reference-par-luvas-nitrilicas",
    category: CATEGORY_DISPOSABLES,
    name: "Par de Luvas Nitrílicas",
    brand: "",
    purchaseMode: PURCHASE_MODE_SINGLE,
    packageQuantity: 1,
    packagePrice: 2.5,
    stockQuantity: 50,
    measureUnit: MEASURE_UNIT,
    calculationType: CALCULATION_UNIT_BOX,
    createdAt: REFERENCE_STOCK_CREATED_AT,
    updatedAt: REFERENCE_STOCK_CREATED_AT
  },
  {
    id: "reference-mascara-descartavel",
    category: CATEGORY_DISPOSABLES,
    name: "Máscara Descartável",
    brand: "",
    purchaseMode: PURCHASE_MODE_SINGLE,
    packageQuantity: 1,
    packagePrice: 1,
    stockQuantity: 50,
    measureUnit: MEASURE_UNIT,
    calculationType: CALCULATION_UNIT_BOX,
    createdAt: REFERENCE_STOCK_CREATED_AT,
    updatedAt: REFERENCE_STOCK_CREATED_AT
  },
  {
    id: "reference-protetor-maca-lencol",
    category: CATEGORY_DISPOSABLES,
    name: "Protetor de Maca (Lençol)",
    brand: "",
    purchaseMode: PURCHASE_MODE_SINGLE,
    packageQuantity: 1,
    packagePrice: 3.5,
    stockQuantity: 20,
    measureUnit: MEASURE_UNIT,
    calculationType: CALCULATION_UNIT_BOX,
    createdAt: REFERENCE_STOCK_CREATED_AT,
    updatedAt: REFERENCE_STOCK_CREATED_AT
  },
  {
    id: "reference-plastico-filme-uso",
    category: CATEGORY_DISPOSABLES,
    name: "Plástico Filme (Uso na maca/bancada)",
    brand: "",
    purchaseMode: PURCHASE_MODE_SINGLE,
    packageQuantity: 1,
    packagePrice: 2,
    stockQuantity: 30,
    measureUnit: MEASURE_UNIT,
    calculationType: CALCULATION_UNIT_BOX,
    createdAt: REFERENCE_STOCK_CREATED_AT,
    updatedAt: REFERENCE_STOCK_CREATED_AT
  },
  {
    id: "reference-batoques-pmg",
    category: CATEGORY_DISPOSABLES,
    name: "Batoques P/M/G",
    brand: "",
    purchaseMode: PURCHASE_MODE_SINGLE,
    packageQuantity: 1,
    packagePrice: 0.5,
    stockQuantity: 100,
    measureUnit: MEASURE_UNIT,
    calculationType: CALCULATION_UNIT_BOX,
    createdAt: REFERENCE_STOCK_CREATED_AT,
    updatedAt: REFERENCE_STOCK_CREATED_AT
  },
  {
    id: "reference-luvas-nitrilicas-caixa",
    category: CATEGORY_DISPOSABLES,
    name: "Par de Luvas Nitrílicas Caixa 100",
    brand: "Descarpack",
    purchaseMode: PURCHASE_MODE_BOX,
    packageQuantity: 50,
    packagePrice: 39.45,
    stockQuantity: 1,
    measureUnit: MEASURE_UNIT,
    calculationType: CALCULATION_UNIT_BOX,
    createdAt: REFERENCE_STOCK_CREATED_AT,
    updatedAt: REFERENCE_STOCK_CREATED_AT
  },
  {
    id: "reference-mascaras-caixa-50",
    category: CATEGORY_DISPOSABLES,
    name: "Máscara Tripla TNT Caixa 50",
    brand: "Descarpack",
    purchaseMode: PURCHASE_MODE_BOX,
    packageQuantity: 50,
    packagePrice: 14.19,
    stockQuantity: 1,
    measureUnit: MEASURE_UNIT,
    calculationType: CALCULATION_UNIT_BOX,
    createdAt: REFERENCE_STOCK_CREATED_AT,
    updatedAt: REFERENCE_STOCK_CREATED_AT
  },
  {
    id: "reference-batoque-jordan-100",
    category: CATEGORY_DISPOSABLES,
    name: "Batoque Solto P 100 unidades",
    brand: "Jordan Tattoo Supply",
    purchaseMode: PURCHASE_MODE_BOX,
    packageQuantity: 100,
    packagePrice: 7,
    stockQuantity: 1,
    measureUnit: MEASURE_UNIT,
    calculationType: CALCULATION_UNIT_BOX,
    createdAt: REFERENCE_STOCK_CREATED_AT,
    updatedAt: REFERENCE_STOCK_CREATED_AT
  },
  {
    id: "reference-papel-toalha-uso-medio",
    category: CATEGORY_CLEANING,
    name: "Papel Toalha (Uso médio)",
    brand: "",
    purchaseMode: PURCHASE_MODE_SINGLE,
    packageQuantity: 1,
    packagePrice: 3,
    stockQuantity: 30,
    measureUnit: MEASURE_UNIT,
    calculationType: CALCULATION_UNIT_BOX,
    createdAt: REFERENCE_STOCK_CREATED_AT,
    updatedAt: REFERENCE_STOCK_CREATED_AT
  },
  {
    id: "reference-vaselina-manteiga-porcao",
    category: CATEGORY_CLEANING,
    name: "Vaselina / Manteiga Deslizante",
    brand: "",
    purchaseMode: PURCHASE_MODE_SINGLE,
    packageQuantity: 1,
    packagePrice: 3,
    stockQuantity: 30,
    measureUnit: MEASURE_UNIT,
    calculationType: CALCULATION_UNIT_BOX,
    createdAt: REFERENCE_STOCK_CREATED_AT,
    updatedAt: REFERENCE_STOCK_CREATED_AT
  },
  {
    id: "reference-papel-hectografico-folha",
    category: CATEGORY_CLEANING,
    name: "Papel Hectográfico (Transfer)",
    brand: "",
    purchaseMode: PURCHASE_MODE_SINGLE,
    packageQuantity: 1,
    packagePrice: 3.5,
    stockQuantity: 20,
    measureUnit: MEASURE_UNIT,
    calculationType: CALCULATION_UNIT_BOX,
    createdAt: REFERENCE_STOCK_CREATED_AT,
    updatedAt: REFERENCE_STOCK_CREATED_AT
  },
  {
    id: "reference-papel-hectografico-u20-20",
    category: CATEGORY_CLEANING,
    name: "Papel Hectográfico Roxo U20",
    brand: "U20",
    purchaseMode: PURCHASE_MODE_BOX,
    packageQuantity: 20,
    packagePrice: 25.99,
    stockQuantity: 1,
    measureUnit: MEASURE_UNIT,
    calculationType: CALCULATION_UNIT_BOX,
    createdAt: REFERENCE_STOCK_CREATED_AT,
    updatedAt: REFERENCE_STOCK_CREATED_AT
  },
  {
    id: "reference-papel-toalha-elite-1000",
    category: CATEGORY_CLEANING,
    name: "Papel Toalha Interfolha 1000 folhas",
    brand: "Elite",
    purchaseMode: PURCHASE_MODE_BOX,
    packageQuantity: 1000,
    packagePrice: 24.9,
    stockQuantity: 1,
    measureUnit: MEASURE_UNIT,
    calculationType: CALCULATION_UNIT_BOX,
    createdAt: REFERENCE_STOCK_CREATED_AT,
    updatedAt: REFERENCE_STOCK_CREATED_AT
  },
  {
    id: "reference-vaselina-hornet-500g",
    category: CATEGORY_PASTES,
    name: "Vaselina Hornet White Premium 500g",
    brand: "Hornet",
    packageQuantity: 500,
    packagePrice: 65,
    stockQuantity: 1,
    measureUnit: MEASURE_GRAM,
    calculationType: CALCULATION_FRACTIONAL,
    createdAt: REFERENCE_STOCK_CREATED_AT,
    updatedAt: REFERENCE_STOCK_CREATED_AT
  },
  {
    id: "reference-manteiga-reilly-500g",
    category: CATEGORY_PASTES,
    name: "Manteiga Blend Especial Reilly 500g",
    brand: "Reilly Tattoo",
    packageQuantity: 500,
    packagePrice: 89,
    stockQuantity: 1,
    measureUnit: MEASURE_GRAM,
    calculationType: CALCULATION_FRACTIONAL,
    createdAt: REFERENCE_STOCK_CREATED_AT,
    updatedAt: REFERENCE_STOCK_CREATED_AT
  },
  {
    id: "reference-plastico-filme-pvc-300m",
    category: CATEGORY_LINEAR,
    name: "Plástico Filme PVC 28cm x 300m",
    brand: "Tecfilm",
    packageQuantity: 300,
    packagePrice: 30.51,
    stockQuantity: 1,
    measureUnit: MEASURE_METER,
    calculationType: CALCULATION_FRACTIONAL,
    createdAt: REFERENCE_STOCK_CREATED_AT,
    updatedAt: REFERENCE_STOCK_CREATED_AT
  },
  {
    id: "reference-tropicalderm-filme-5m",
    category: CATEGORY_LINEAR,
    name: "Filme Protetor Para Tatuagem 10cm x 5m",
    brand: "TropicalDerm",
    packageQuantity: 5,
    packagePrice: 130,
    stockQuantity: 1,
    measureUnit: MEASURE_METER,
    calculationType: CALCULATION_FRACTIONAL,
    createdAt: REFERENCE_STOCK_CREATED_AT,
    updatedAt: REFERENCE_STOCK_CREATED_AT
  }
];
const REFERENCE_PASTE_ITEM_IDS = new Set([
  "reference-sabonete-liquido",
  "reference-transfer"
]);
const REFERENCE_PASTE_ITEM_NAMES = new Set([
  "sabonete liquido",
  "transfer"
]);
const DEFAULT_BUDGET = {
  id: "budget-default",
  name: "Novo orçamento",
  clientName: "",
  hourlyRate: 0,
  sessionDuration: 0,
  profitMarginPercent: 0,
  discountPercent: 0,
  referenceImage: "",
  referenceImageName: "",
  items: []
};

const dom = {};
let appState = null;
let activeTheme = getInitialTheme();
let activeScreen = getInitialScreen();
let activeInventoryCategory = CATEGORY_ALL;
let activeBudgetCategory = CATEGORY_ALL;
let inventorySearchTerm = "";
let budgetSearchTerm = "";
let selectedFormCategory = CATEGORY_NEEDLES;
let editingItemId = null;
let backupStatusTimeoutId = 0;
let isReactiveRenderingEnabled = false;
let pendingRenderAreas = new Set();
let reactiveRenderFrameId = 0;

export async function initializeApp() {
  bindDomReferences();
  appState = createReactiveState(await loadPersistedAppState({
    storageKey: STORAGE_KEY,
    legacyStorageKeys: LEGACY_STORAGE_KEYS,
    createInitialState,
    normalizeAppState
  }), handleReactiveStateChange);
  applyTheme(activeTheme);
  bindEvents();
  renderApp();
  isReactiveRenderingEnabled = true;
}

function bindDomReferences() {
  dom.sidebar = document.querySelector("#sidebar");
  dom.drawerBackdrop = document.querySelector("#drawerBackdrop");
  dom.openSidebarButton = document.querySelector("#openSidebarButton");
  dom.navLinks = document.querySelectorAll("[data-screen-target]");
  dom.homeActions = document.querySelectorAll("[data-home-action]");
  dom.pageTitle = document.querySelector("#pageTitle");
  dom.pageEyebrow = document.querySelector("#pageEyebrow");
  dom.themeColorMeta = document.querySelector("#themeColorMeta");
  dom.themeToggleButton = document.querySelector("#themeToggleButton");
  dom.themeToggleLabel = document.querySelector("#themeToggleLabel");
  dom.screens = document.querySelectorAll("[data-screen]");
  dom.quickNewItemButton = document.querySelector("#quickNewItemButton");
  dom.openItemModalButton = document.querySelector("#openItemModalButton");
  dom.itemModal = document.querySelector("#itemModal");
  dom.itemForm = document.querySelector("#itemForm");
  dom.itemModalEyebrow = document.querySelector("#itemModalEyebrow");
  dom.itemModalTitle = document.querySelector("#itemModalTitle");
  dom.closeItemModalButton = document.querySelector("#closeItemModalButton");
  dom.categoryChoiceGrid = document.querySelector("#categoryChoiceGrid");
  dom.dynamicFormTitle = document.querySelector("#dynamicFormTitle");
  dom.dynamicFieldsGrid = document.querySelector("#dynamicFieldsGrid");
  dom.unitCostPreview = document.querySelector("#unitCostPreview");
  dom.inventoryCounter = document.querySelector("#inventoryCounter");
  dom.inventorySearchInput = document.querySelector("#inventorySearchInput");
  dom.clearInventorySearchButton = document.querySelector("#clearInventorySearchButton");
  dom.inventoryCategoryFilters = document.querySelector("#inventoryCategoryFilters");
  dom.inventoryGrid = document.querySelector("#inventoryGrid");
  dom.budgetCounter = document.querySelector("#budgetCounter");
  dom.budgetNameInput = document.querySelector("#budgetNameInput");
  dom.clientNameInput = document.querySelector("#clientNameInput");
  dom.hourlyRateInput = document.querySelector("#hourlyRateInput");
  dom.sessionDurationInput = document.querySelector("#sessionDurationInput");
  dom.profitMarginInput = document.querySelector("#profitMarginInput");
  dom.discountPercentInput = document.querySelector("#discountPercentInput");
  dom.referenceImageInput = document.querySelector("#referenceImageInput");
  dom.removeReferenceImageButton = document.querySelector("#removeReferenceImageButton");
  dom.referencePreview = document.querySelector("#referencePreview");
  dom.materialTotalValue = document.querySelector("#materialTotalValue");
  dom.laborTotalValue = document.querySelector("#laborTotalValue");
  dom.budgetTotalValue = document.querySelector("#budgetTotalValue");
  dom.suggestedPriceValue = document.querySelector("#suggestedPriceValue");
  dom.discountAmountValue = document.querySelector("#discountAmountValue");
  dom.finalPriceValue = document.querySelector("#finalPriceValue");
  dom.duplicateBudgetButton = document.querySelector("#duplicateBudgetButton");
  dom.newBudgetButton = document.querySelector("#newBudgetButton");
  dom.exportPdfButton = document.querySelector("#exportPdfButton");
  dom.clearBudgetSearchButton = document.querySelector("#clearBudgetSearchButton");
  dom.budgetSearchInput = document.querySelector("#budgetSearchInput");
  dom.budgetCategoryFilters = document.querySelector("#budgetCategoryFilters");
  dom.stockPickerList = document.querySelector("#stockPickerList");
  dom.cartList = document.querySelector("#cartList");
  dom.invoiceDocument = document.querySelector("#invoiceDocument");
  dom.exportInventoryBackupButton = document.querySelector("#exportInventoryBackupButton");
  dom.importInventoryBackupButton = document.querySelector("#importInventoryBackupButton");
  dom.inventoryBackupFileInput = document.querySelector("#inventoryBackupFileInput");
  dom.restoreReferenceStockButton = document.querySelector("#restoreReferenceStockButton");
  dom.backupStatus = document.querySelector("#backupStatus");
  dom.reportsInventoryCounter = document.querySelector("#reportsInventoryCounter");
  dom.dashboardTotalInvestedValue = document.querySelector("#dashboardTotalInvestedValue");
  dom.dashboardTopCategoryName = document.querySelector("#dashboardTopCategoryName");
  dom.dashboardTopCategoryValue = document.querySelector("#dashboardTopCategoryValue");
  dom.dashboardBudgetCount = document.querySelector("#dashboardBudgetCount");
  dom.dashboardBudgetInsight = document.querySelector("#dashboardBudgetInsight");
  dom.dashboardCategoryChart = document.querySelector("#dashboardCategoryChart");
}

function bindEvents() {
  dom.openSidebarButton.addEventListener("click", openSidebar);
  dom.drawerBackdrop.addEventListener("click", closeSidebar);
  dom.themeToggleButton.addEventListener("click", toggleTheme);
  dom.navLinks.forEach((navLink) => {
    navLink.addEventListener("click", () => setActiveScreen(navLink.dataset.screenTarget));
  });
  dom.homeActions.forEach((homeAction) => {
    homeAction.addEventListener("click", () => setActiveScreen(homeAction.dataset.homeAction));
  });
  dom.quickNewItemButton.addEventListener("click", () => openItemModal());
  dom.openItemModalButton.addEventListener("click", () => openItemModal());
  dom.closeItemModalButton.addEventListener("click", () => closeModal(dom.itemModal));
  dom.categoryChoiceGrid.addEventListener("click", handleCategoryChoiceClick);
  dom.dynamicFieldsGrid.addEventListener("input", updateUnitCostPreview);
  dom.dynamicFieldsGrid.addEventListener("change", handleDynamicFieldsChange);
  dom.itemForm.addEventListener("submit", handleItemFormSubmit);
  dom.inventorySearchInput.addEventListener("input", (event) => {
    inventorySearchTerm = event.target.value;
    renderInventory();
  });
  dom.clearInventorySearchButton.addEventListener("click", () => {
    inventorySearchTerm = "";
    dom.inventorySearchInput.value = "";
    renderInventory();
  });
  dom.inventoryCategoryFilters.addEventListener("click", handleInventoryFilterClick);
  dom.inventoryGrid.addEventListener("click", handleInventoryGridClick);
  dom.budgetNameInput.addEventListener("input", updateBudgetIdentity);
  dom.clientNameInput.addEventListener("input", updateBudgetIdentity);
  dom.hourlyRateInput.addEventListener("input", updateBudgetLabor);
  dom.sessionDurationInput.addEventListener("input", updateBudgetLabor);
  dom.profitMarginInput.addEventListener("input", updateBudgetProfitMargin);
  dom.discountPercentInput.addEventListener("input", updateBudgetDiscount);
  dom.referenceImageInput.addEventListener("change", handleReferenceImageChange);
  dom.removeReferenceImageButton.addEventListener("click", removeReferenceImage);
  dom.duplicateBudgetButton.addEventListener("click", duplicateActiveBudget);
  dom.newBudgetButton.addEventListener("click", createNewBudget);
  dom.exportPdfButton.addEventListener("click", exportPdf);
  dom.budgetSearchInput.addEventListener("input", (event) => {
    budgetSearchTerm = event.target.value;
    renderStockPicker();
  });
  dom.clearBudgetSearchButton.addEventListener("click", () => {
    budgetSearchTerm = "";
    dom.budgetSearchInput.value = "";
    renderStockPicker();
  });
  dom.budgetCategoryFilters.addEventListener("click", handleBudgetFilterClick);
  dom.stockPickerList.addEventListener("click", handleStockPickerClick);
  dom.stockPickerList.addEventListener("change", handlePickerQuantityChange);
  dom.cartList.addEventListener("click", handleCartClick);
  dom.cartList.addEventListener("change", handleCartQuantityChange);
  dom.exportInventoryBackupButton.addEventListener("click", exportInventoryToJSON);
  dom.importInventoryBackupButton.addEventListener("click", () => dom.inventoryBackupFileInput.click());
  dom.inventoryBackupFileInput.addEventListener("change", handleInventoryBackupFileChange);
  dom.restoreReferenceStockButton.addEventListener("click", restoreReferenceStock);
}


function getInitialScreen() {
  const hashScreen = sanitizeText(window.location.hash).replace(/^#/, "");
  const queryScreen = new URLSearchParams(window.location.search).get("screen");
  const requestedScreen = sanitizeText(queryScreen || hashScreen);
  return Object.prototype.hasOwnProperty.call(SCREEN_META, requestedScreen) ? requestedScreen : "home";
}

function getInitialTheme() {
  const storedTheme = readStorageItem(THEME_STORAGE_KEY);

  if ([THEME_DARK, THEME_LIGHT].includes(storedTheme)) {
    return storedTheme;
  }

  if (document.documentElement.dataset.theme === THEME_LIGHT) {
    return THEME_LIGHT;
  }

  return THEME_DARK;
}

function toggleTheme() {
  activeTheme = activeTheme === THEME_DARK ? THEME_LIGHT : THEME_DARK;
  writeStorageItem(THEME_STORAGE_KEY, activeTheme);
  applyTheme(activeTheme);
}

function applyTheme(themeName) {
  const normalizedTheme = themeName === THEME_LIGHT ? THEME_LIGHT : THEME_DARK;
  activeTheme = normalizedTheme;
  document.documentElement.dataset.theme = normalizedTheme;

  if (dom.themeColorMeta) {
    dom.themeColorMeta.setAttribute("content", THEME_META_COLORS[normalizedTheme]);
  }

  if (dom.themeToggleButton) {
    const isLightTheme = normalizedTheme === THEME_LIGHT;
    dom.themeToggleButton.setAttribute("aria-pressed", String(isLightTheme));
    dom.themeToggleButton.setAttribute("aria-label", `Alternar para tema ${isLightTheme ? "escuro" : "claro"}`);
    dom.themeToggleButton.innerHTML = `${createIconHtml(isLightTheme ? "sun" : "moon")}<span id="themeToggleLabel">${isLightTheme ? "Claro" : "Escuro"}</span>`;
    dom.themeToggleLabel = document.querySelector("#themeToggleLabel");
  }

  renderLucideIcons();
}

function handleReactiveStateChange(path) {
  if (!isReactiveRenderingEnabled || !appState) {
    return;
  }

  scheduleSaveAppState(appState);
  pendingRenderAreas.add(getRenderAreaForStatePath(path));

  if (!reactiveRenderFrameId) {
    reactiveRenderFrameId = window.requestAnimationFrame(flushReactiveRenders);
  }
}

function getRenderAreaForStatePath(path) {
  const rootKey = path[0];

  if (rootKey === "inventoryItems") {
    return "inventory";
  }

  if (rootKey === "budgets" || rootKey === "activeBudgetId") {
    return "budget";
  }

  return "app";
}

function flushReactiveRenders() {
  const renderAreas = new Set(pendingRenderAreas);
  pendingRenderAreas = new Set();
  reactiveRenderFrameId = 0;

  if (renderAreas.has("app")) {
    renderApp();
    return;
  }

  if (renderAreas.has("inventory")) {
    renderInventoryFilters();
    renderBudgetFilters();
    renderInventory();
    renderStockPicker();
    renderDashboard();
  }

  if (renderAreas.has("budget")) {
    renderBudget();
    renderDashboard();
  }
}

function createInitialState() {
  return {
    inventoryItems: createReferenceStockItems(),
    budgets: [{ ...DEFAULT_BUDGET, items: [] }],
    activeBudgetId: DEFAULT_BUDGET.id
  };
}

function normalizeAppState(rawState) {
  const inventorySource = Array.isArray(rawState.inventoryItems) ? rawState.inventoryItems : DEFAULT_REFERENCE_STOCK;
  const budgetsSource = Array.isArray(rawState.budgets) && rawState.budgets.length > 0 ? rawState.budgets : [DEFAULT_BUDGET];
  const budgets = budgetsSource.map(normalizeBudget);
  const activeBudgetId = budgets.some((budget) => budget.id === rawState.activeBudgetId) ? rawState.activeBudgetId : budgets[0].id;

  return {
    inventoryItems: inventorySource.map(normalizeInventoryItem),
    budgets,
    activeBudgetId
  };
}

function normalizeInventoryItem(item) {
  const category = getCorrectedInventoryCategory(item);
  const categoryDefinition = CATEGORY_DEFINITIONS[category];
  const purchaseMode = getNormalizedPurchaseMode(item, category);
  const measureUnit = getNormalizedMeasureUnit(item, category, categoryDefinition.defaultMeasure);
  const packageQuantity = getNormalizedPackageQuantity(item, category, purchaseMode);
  const packagePrice = getNormalizedPackagePrice(item, category, purchaseMode);
  const stockQuantity = getNormalizedStockQuantity(item);
  const normalizedName = getNormalizedItemName(item, category);

  return {
    id: item.id || createId("item"),
    category,
    name: normalizedName,
    brand: sanitizeText(item.brand || item.marca),
    lineType: sanitizeText(item.lineType || item.cartridgeType || item.tipo),
    numbering: sanitizeText(item.numbering || item.cartridgeNumber || item.numeracao || item.numbering),
    color: sanitizeText(item.color || item.colorName || item.coloration || item.coloracao),
    purchaseMode,
    packageQuantity,
    packagePrice,
    stockQuantity,
    unitPrice: calculateRawUnitCost(packagePrice, packageQuantity),
    measureUnit,
    calculationType: categoryDefinition.calculationType,
    createdAt: item.createdAt || new Date().toISOString(),
    updatedAt: item.updatedAt || item.createdAt || new Date().toISOString()
  };
}

/**
 * Applies targeted category corrections for reference stock created by older app builds.
 * @param {object} item - Raw inventory item before normalization.
 * @returns {string} Supported inventory category.
 */
function getCorrectedInventoryCategory(item) {
  const category = normalizeCategory(item.category);
  const itemId = sanitizeText(item.id);
  const itemName = normalizeSearch(item.name || item.nome || item.description || item.descricao);

  if (REFERENCE_PASTE_ITEM_IDS.has(itemId) || (category === CATEGORY_INKS && REFERENCE_PASTE_ITEM_NAMES.has(itemName))) {
    return CATEGORY_PASTES;
  }

  return category;
}


function getNormalizedItemName(item, category) {
  if (category === CATEGORY_NEEDLES) {
    const brand = sanitizeText(item.brand || item.marca);
    const lineType = sanitizeText(item.lineType || item.cartridgeType || item.tipo);
    const numbering = sanitizeText(item.numbering || item.cartridgeNumber || item.numeracao);
    return [brand, lineType, numbering].filter(Boolean).join(" ") || "Cartucho sem identificação";
  }

  return sanitizeText(item.name || item.nome || item.description || item.descricao) || "Novo item";
}

function getNormalizedPurchaseMode(item, category) {
  if (!UNIT_PURCHASE_CATEGORIES.includes(category)) {
    return "";
  }

  const rawPurchaseMode = sanitizeText(item.purchaseMode).toLowerCase();
  const isSingle = rawPurchaseMode === PURCHASE_MODE_SINGLE || rawPurchaseMode === "unit" || rawPurchaseMode === "single" || rawPurchaseMode.includes("unidade") || rawPurchaseMode.includes("avul");
  const isBox = rawPurchaseMode === PURCHASE_MODE_BOX || rawPurchaseMode === "caixa" || rawPurchaseMode === "pacote" || rawPurchaseMode.includes("box") || rawPurchaseMode.includes("pacote");

  if (isSingle) {
    return PURCHASE_MODE_SINGLE;
  }

  if (isBox) {
    return PURCHASE_MODE_BOX;
  }

  return normalizeNumber(item.packageQuantity || item.quantity || item.quantidade) <= 1 ? PURCHASE_MODE_SINGLE : PURCHASE_MODE_BOX;
}


function getNormalizedPackageQuantity(item, category, purchaseMode = "") {
  if (purchaseMode === PURCHASE_MODE_SINGLE) {
    return 1;
  }

  const value = normalizeNumber(item.packageQuantity || item.currentStock || item.quantity || item.quantidade);
  return value > 0 ? value : 1;
}


function getNormalizedPackagePrice(item, category, purchaseMode = "") {
  if (purchaseMode === PURCHASE_MODE_SINGLE) {
    const unitPrice = normalizeNumber(item.singleUnitPrice || item.unitPrice || item.packagePrice || item.purchasePrice || item.valor || item.price);
    return unitPrice > 0 ? unitPrice : 0;
  }

  const explicitPackagePrice = normalizeNumber(item.packagePrice);

  if (explicitPackagePrice > 0) {
    return explicitPackagePrice;
  }

  const legacyPurchasePrice = normalizeNumber(item.purchasePrice || item.valor || item.price);

  if (category === CATEGORY_NEEDLES && legacyPurchasePrice > 0 && !item.packagePrice) {
    return legacyPurchasePrice * getNormalizedPackageQuantity(item, category, purchaseMode);
  }

  return legacyPurchasePrice > 0 ? legacyPurchasePrice : 0;
}



function getNormalizedStockQuantity(item) {
  const stockQuantity = normalizeNumber(item.stockQuantity || item.inventoryQuantity || item.quantityInStock || item.qtdEstoque || item.estoque);
  if (stockQuantity > 0) {
    return stockQuantity;
  }
  return 1;
}

function getNormalizedMeasureUnit(item, category, fallbackUnit) {
  if (UNIT_PURCHASE_CATEGORIES.includes(category)) {
    return MEASURE_UNIT;
  }

  if (category === CATEGORY_INKS) {
    return MEASURE_ML;
  }

  if (category === CATEGORY_LINEAR) {
    return MEASURE_METER;
  }

  return normalizeMeasureUnit(item.measureUnit || item.unitMeasure || item.unitLabel || item.tipoUnidade, fallbackUnit);
}

function normalizeBudget(budget) {
  return {
    id: budget.id || createId("budget"),
    name: sanitizeText(budget.name || budget.projectName) || "Novo orçamento",
    clientName: sanitizeText(budget.clientName || budget.customerName || budget.nomeCliente),
    hourlyRate: normalizeNumber(budget.hourlyRate || budget.laborHourlyRate || budget.valorHora),
    sessionDuration: normalizeNumber(budget.sessionDuration || budget.sessionHours || budget.laborHours || budget.duracao),
    profitMarginPercent: normalizeNumber(budget.profitMarginPercent || budget.marginPercent || budget.margemLucro),
    discountPercent: normalizePercent(budget.discountPercent || budget.descontoPercentual || budget.desconto),
    referenceImage: isImageDataUrl(budget.referenceImage || budget.tattooImage) ? (budget.referenceImage || budget.tattooImage) : "",
    referenceImageName: sanitizeText(budget.referenceImageName || budget.tattooImageName),
    items: Array.isArray(budget.items) ? budget.items.map(normalizeBudgetItem) : []
  };
}

function normalizeBudgetItem(item) {
  return {
    id: item.id || createId("cart"),
    inventoryItemId: item.inventoryItemId,
    quantityUsed: normalizeNumber(item.quantityUsed)
  };
}

function createReferenceStockItems() {
  return DEFAULT_REFERENCE_STOCK.map((item) => normalizeInventoryItem({ ...item }));
}

/**
 * Converts the current inventory collection into the official backup payload.
 * @param {Array<object>} inventoryItems - Inventory items currently persisted by the app.
 * @returns {{appName: string, schema: string, version: number, exportedAt: string, itemCount: number, inventoryItems: Array<object>}} Structured JSON-safe backup payload.
 */
function createInventoryBackupPayload(inventoryItems) {
  const normalizedItems = inventoryItems.map((item) => createSerializableInventoryItem(item));

  return {
    appName: BACKUP_APP_NAME,
    schema: BACKUP_SCHEMA,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    itemCount: normalizedItems.length,
    inventoryItems: normalizedItems
  };
}

/**
 * Converts an inventory item into the canonical JSON-safe backup shape.
 * @param {object} item - Inventory item saved by the app.
 * @returns {object} Serializable inventory item with normalized calculation fields.
 */
function createSerializableInventoryItem(item) {
  const normalizedItem = normalizeInventoryItem(item);

  return {
    id: normalizedItem.id,
    category: normalizedItem.category,
    name: normalizedItem.name,
    brand: normalizedItem.brand,
    lineType: normalizedItem.lineType,
    numbering: normalizedItem.numbering,
    color: normalizedItem.color,
    purchaseMode: normalizedItem.purchaseMode,
    packageQuantity: normalizedItem.packageQuantity,
    packagePrice: normalizedItem.packagePrice,
    stockQuantity: normalizedItem.stockQuantity,
    unitPrice: normalizedItem.unitPrice,
    measureUnit: normalizedItem.measureUnit,
    calculationType: normalizedItem.calculationType,
    createdAt: normalizedItem.createdAt,
    updatedAt: normalizedItem.updatedAt
  };
}

/**
 * Parses and validates an uploaded CalculadoraTattoo inventory backup.
 * @param {string} rawBackupData - Raw JSON text loaded through the File API.
 * @returns {Array<object>} Normalized inventory items ready to persist.
 * @throws {Error} Throws when the file does not match the official backup schema.
 */
function parseInventoryBackupPayload(rawBackupData) {
  const parsedPayload = JSON.parse(rawBackupData);

  if (!isValidInventoryBackupPayload(parsedPayload)) {
    throw new Error("Invalid inventory backup.");
  }

  return parsedPayload.inventoryItems.map((item) => normalizeInventoryItem(item));
}

function isValidInventoryBackupPayload(payload) {
  if (!payload || typeof payload !== "object") {
    return false;
  }

  const hasValidHeader = payload.appName === BACKUP_APP_NAME
    && payload.schema === BACKUP_SCHEMA
    && payload.version === BACKUP_VERSION
    && Array.isArray(payload.inventoryItems);

  if (!hasValidHeader) {
    return false;
  }

  if (Number.isFinite(payload.itemCount) && payload.itemCount !== payload.inventoryItems.length) {
    return false;
  }

  return payload.inventoryItems.every(isValidBackupInventoryItem);
}

function isValidBackupInventoryItem(item) {
  if (!item || typeof item !== "object") {
    return false;
  }

  const category = sanitizeText(item.category);
  const hasSupportedCategory = getBusinessCategories().includes(category);
  const hasRequiredNumbers = normalizeNumber(item.packageQuantity) > 0
    && normalizeNumber(item.packagePrice) > 0
    && normalizeNumber(item.stockQuantity) > 0;

  if (!hasSupportedCategory || !sanitizeText(item.name) || !hasRequiredNumbers) {
    return false;
  }

  if (UNIT_PURCHASE_CATEGORIES.includes(category)) {
    return [PURCHASE_MODE_BOX, PURCHASE_MODE_SINGLE].includes(sanitizeText(item.purchaseMode));
  }

  return [MEASURE_ML, MEASURE_GRAM, MEASURE_METER].includes(sanitizeText(item.measureUnit));
}

/**
 * Exports all current inventory items as a validated JSON backup file.
 * @returns {void}
 */
function exportInventoryToJSON() {
  const backupPayload = createInventoryBackupPayload(appState.inventoryItems);
  const backupContent = JSON.stringify(backupPayload, null, 2);
  const backupFileName = `${BACKUP_FILE_PREFIX}_${formatBackupTimestamp(new Date())}.json`;
  downloadTextFile(backupFileName, backupContent, "application/json");
  showBackupStatus(`${backupPayload.itemCount} ${backupPayload.itemCount === 1 ? "item exportado" : "itens exportados"}.`);
}

/**
 * Imports an official CalculadoraTattoo inventory backup file from the File API.
 * @param {File} backupFile - JSON file selected by the user.
 * @returns {Promise<Array<object>>} Promise resolved with normalized inventory items.
 */
function importInventoryFromJSON(backupFile) {
  return new Promise((resolve, reject) => {
    if (!backupFile || !backupFile.name.toLowerCase().endsWith(".json")) {
      reject(new Error("Invalid backup file."));
      return;
    }

    const fileReader = new FileReader();
    fileReader.addEventListener("load", () => {
      try {
        resolve(parseInventoryBackupPayload(String(fileReader.result || "")));
      } catch (error) {
        reject(error);
      }
    });
    fileReader.addEventListener("error", () => reject(new Error("Backup reading failed.")));
    fileReader.readAsText(backupFile);
  });
}

function handleInventoryBackupFileChange(event) {
  const backupFile = event.target.files?.[0];

  if (!backupFile) {
    return;
  }

  importInventoryFromJSON(backupFile)
    .then((inventoryItems) => {
      applyImportedInventoryItems(inventoryItems);
      showBackupStatus(`${inventoryItems.length} ${inventoryItems.length === 1 ? "item importado" : "itens importados"}.`);
    })
    .catch(() => {
      showBackupStatus("Backup invalido ou incompatível.");
    })
    .finally(() => {
      event.target.value = "";
    });
}

function applyImportedInventoryItems(inventoryItems) {
  appState.inventoryItems = inventoryItems.map((item) => normalizeInventoryItem(item));
  synchronizeBudgetsWithInventory();
  activeInventoryCategory = CATEGORY_ALL;
  activeBudgetCategory = CATEGORY_ALL;
  inventorySearchTerm = "";
  budgetSearchTerm = "";
  dom.inventorySearchInput.value = "";
  dom.budgetSearchInput.value = "";
  saveAppState();
  renderApp();
}

function restoreReferenceStock() {
  const shouldRestore = window.confirm("Restaurar o estoque base vai substituir o estoque atual. Deseja continuar?");

  if (!shouldRestore) {
    return;
  }

  applyImportedInventoryItems(createReferenceStockItems());
  showBackupStatus(`${DEFAULT_REFERENCE_STOCK.length} itens restaurados.`);
  closeSidebar();
}

function synchronizeBudgetsWithInventory() {
  const availableInventoryIds = new Set(appState.inventoryItems.map((item) => item.id));
  appState.budgets = appState.budgets.map((budget) => ({
    ...budget,
    items: budget.items.filter((cartItem) => availableInventoryIds.has(cartItem.inventoryItemId))
  }));
}

function downloadTextFile(fileName, content, mimeType) {
  const fileBlob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const fileUrl = URL.createObjectURL(fileBlob);
  const downloadLink = document.createElement("a");
  downloadLink.href = fileUrl;
  downloadLink.download = fileName;
  downloadLink.rel = "noopener";
  document.body.append(downloadLink);
  downloadLink.click();
  downloadLink.remove();
  URL.revokeObjectURL(fileUrl);
}

function formatBackupTimestamp(date) {
  const dateParts = [
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate(),
    date.getHours(),
    date.getMinutes(),
    date.getSeconds()
  ];

  return dateParts.map((datePart) => String(datePart).padStart(2, "0")).join("_");
}

function showBackupStatus(message) {
  if (!dom.backupStatus) {
    return;
  }

  window.clearTimeout(backupStatusTimeoutId);
  dom.backupStatus.textContent = message;
  backupStatusTimeoutId = window.setTimeout(() => {
    dom.backupStatus.textContent = "";
  }, 4200);
}

function saveAppState() {
  scheduleSaveAppState(appState);
}

function renderApp() {
  renderActiveScreen();
  renderCategoryChoices();
  renderDynamicForm();
  renderInventoryFilters();
  renderBudgetFilters();
  renderInventory();
  renderBudget();
  renderDashboard();
  renderLucideIcons();
}

function renderActiveScreen() {
  const screenMeta = SCREEN_META[activeScreen] || SCREEN_META.home;
  dom.pageTitle.textContent = screenMeta.title;
  dom.pageEyebrow.textContent = screenMeta.eyebrow;
  dom.screens.forEach((screen) => {
    screen.classList.toggle("is-active", screen.dataset.screen === activeScreen);
  });
  dom.navLinks.forEach((navLink) => {
    navLink.classList.toggle("is-active", navLink.dataset.screenTarget === activeScreen);
  });
  dom.quickNewItemButton.hidden = activeScreen !== "inventory";
}

function renderCategoryChoices() {
  dom.categoryChoiceGrid.innerHTML = getBusinessCategories().map((categoryName) => {
    const categoryDefinition = CATEGORY_DEFINITIONS[categoryName];
    const isActive = selectedFormCategory === categoryName;
    return `
      <button class="category-choice ${isActive ? "is-active" : ""}" type="button" data-form-category="${escapeHtml(categoryName)}">
        <span class="category-choice-icon">${createIconHtml(getCategoryIconName(categoryName))}</span>
        <strong>${escapeHtml(categoryDefinition.label)}</strong>
        <span>${escapeHtml(categoryDefinition.helper)}</span>
      </button>
    `;
  }).join("");
  renderLucideIcons();
}

function renderDynamicForm(item = null) {
  const categoryDefinition = CATEGORY_DEFINITIONS[selectedFormCategory];
  const formData = readDynamicFormData();
  const renderItem = item || createVirtualItemFromFormData(formData);
  dom.dynamicFormTitle.textContent = `${categoryDefinition.label}: ficha específica`;
  dom.dynamicFieldsGrid.innerHTML = categoryDefinition.fields
    .filter((field) => isFieldVisible(field, renderItem, formData))
    .map((field) => createDynamicFieldHtml(field, renderItem))
    .join("");
  updateUnitCostPreview();
}

function createVirtualItemFromFormData(formData) {
  return {
    ...formData,
    measureUnit: formData.measureUnit,
    purchaseMode: formData.purchaseMode || PURCHASE_MODE_BOX
  };
}

function isFieldVisible(field, item, formData) {
  if (!field.visibleWhen) {
    return true;
  }

  const currentValue = sanitizeText(formData[field.visibleWhen.key] || item?.[field.visibleWhen.key] || PURCHASE_MODE_BOX);
  return currentValue === field.visibleWhen.value;
}

function createDynamicFieldHtml(field, item) {
  const value = getFieldValueForRender(field, item);
  const requiredAttribute = field.required ? "required" : "";
  const inputMode = field.inputMode ? `inputmode="${escapeHtml(field.inputMode)}"` : "";

  if (field.type === "select") {
    const selectedValue = sanitizeText(value || field.options[0]?.value);
    return `
      <label class="form-field">
        <span>${escapeHtml(field.label)}</span>
        <select data-item-field="${escapeHtml(field.key)}" ${requiredAttribute}>
          ${field.options.map((option) => `<option value="${escapeHtml(option.value)}" ${option.value === selectedValue ? "selected" : ""}>${escapeHtml(option.label)}</option>`).join("")}
        </select>
      </label>
    `;
  }

  if (field.type === "measure") {
    const selectedUnit = item?.measureUnit || CATEGORY_DEFINITIONS[selectedFormCategory].defaultMeasure;
    return `
      <label class="form-field measure-field">
        <span>${escapeHtml(field.label)}</span>
        <div class="measure-input-group">
          <input data-item-field="${escapeHtml(field.key)}" type="text" ${inputMode} placeholder="${escapeHtml(field.placeholder)}" value="${escapeHtml(value)}" ${requiredAttribute} />
          <select data-item-field="measureUnit" aria-label="Unidade de medida">
            ${field.options.map((optionValue) => `<option value="${escapeHtml(optionValue)}" ${optionValue === selectedUnit ? "selected" : ""}>${escapeHtml(getMeasureLabel(optionValue))}</option>`).join("")}
          </select>
        </div>
      </label>
    `;
  }

  return `
    <label class="form-field">
      <span>${escapeHtml(field.label)}</span>
      <input data-item-field="${escapeHtml(field.key)}" type="text" ${inputMode} placeholder="${escapeHtml(field.placeholder)}" value="${escapeHtml(value)}" ${requiredAttribute} />
    </label>
  `;
}

function getFieldValueForRender(field, item) {
  if (!item) {
    return "";
  }

  if (field.key === "packagePrice") {
    return formatEditableNumber(item.packagePrice);
  }

  if (field.key === "unitPrice") {
    return formatEditableNumber(calculateUnitCost(item));
  }

  if (field.key === "singleUnitPrice") {
    return item.singleUnitPrice ? formatEditableNumber(item.singleUnitPrice) : formatEditableNumber(calculateUnitCost(item));
  }

  if (field.key === "purchaseMode") {
    return item.purchaseMode || PURCHASE_MODE_BOX;
  }

  if (field.key === "packageQuantity") {
    return formatEditableNumber(item.packageQuantity);
  }

  return item[field.key] || "";
}

function renderInventoryFilters() {
  renderFilterGroup(dom.inventoryCategoryFilters, activeInventoryCategory, "inventory-category");
}

function renderBudgetFilters() {
  renderFilterGroup(dom.budgetCategoryFilters, activeBudgetCategory, "budget-category");
}

function renderFilterGroup(container, activeCategory, dataAttributeName) {
  const categories = CATEGORY_ORDER.filter((categoryName) => categoryName === CATEGORY_ALL || appState.inventoryItems.some((item) => item.category === categoryName));
  const safeCategories = categories.length > 1 ? categories : CATEGORY_ORDER;

  container.innerHTML = safeCategories.map((categoryName) => {
    const categoryCount = countItemsByCategory(categoryName);
    const isActive = categoryName === activeCategory;
    return `
      <button class="filter-chip ${isActive ? "is-active" : ""}" type="button" data-${dataAttributeName}="${escapeHtml(categoryName)}">
        ${createIconHtml(getCategoryIconName(categoryName), "chip-icon")}
        <span>${escapeHtml(categoryName)}</span>
        <strong>${formatCompactCount(categoryCount)}</strong>
      </button>
    `;
  }).join("");
  renderLucideIcons();
}

function renderInventory() {
  const filteredItems = getFilteredInventoryItems(inventorySearchTerm, activeInventoryCategory);
  dom.inventoryCounter.textContent = formatItemsCounter(filteredItems.length, appState.inventoryItems.length);

  if (filteredItems.length === 0) {
    dom.inventoryGrid.innerHTML = createEmptyStateHtml("Nenhum item encontrado no estoque.");
    renderLucideIcons();
    return;
  }

  dom.inventoryGrid.innerHTML = filteredItems.map(createInventoryCardHtml).join("");
  renderLucideIcons();
}

function renderDashboard() {
  const dashboardMetrics = calculateDashboardMetrics();
  const topCategory = dashboardMetrics.categoryInvestments[0];
  dom.reportsInventoryCounter.textContent = formatCounter(appState.inventoryItems.length, appState.inventoryItems.length);
  dom.dashboardTotalInvestedValue.textContent = formatCurrency(dashboardMetrics.totalInventoryInvestment);
  dom.dashboardTopCategoryName.textContent = topCategory ? topCategory.category : "Sem dados";
  dom.dashboardTopCategoryValue.textContent = topCategory
    ? `${formatCurrency(topCategory.totalValue)} alocado nesta categoria.`
    : "R$ 0,00 alocado nesta categoria.";
  dom.dashboardBudgetCount.textContent = formatNumber(dashboardMetrics.generatedBudgetCount);
  dom.dashboardBudgetInsight.textContent = dashboardMetrics.generatedBudgetCount > 0
    ? `${formatNumber(dashboardMetrics.generatedBudgetCount)} ${dashboardMetrics.generatedBudgetCount === 1 ? "orçamento preenchido" : "orçamentos preenchidos"} no histórico local.`
    : "Nenhum histórico de orçamento preenchido ainda.";
  dom.dashboardCategoryChart.innerHTML = createDashboardCategoryChartHtml(dashboardMetrics.categoryInvestments);
}

function createDashboardCategoryChartHtml(categoryInvestments) {
  if (categoryInvestments.length === 0) {
    return createEmptyStateHtml("Nenhum investimento em estoque para exibir.");
  }

  const highestValue = Math.max(...categoryInvestments.map((categoryInvestment) => categoryInvestment.totalValue), 1);

  return categoryInvestments.map((categoryInvestment) => {
    const percentageValue = Math.round((categoryInvestment.totalValue / highestValue) * 100);
    return `
      <article class="chart-row">
        <div class="chart-row-heading">
          <strong>${escapeHtml(categoryInvestment.category)}</strong>
          <span>${formatCurrency(categoryInvestment.totalValue)}</span>
        </div>
        <div class="chart-track" aria-hidden="true">
          <span style="width: ${percentageValue}%"></span>
        </div>
      </article>
    `;
  }).join("");
}

function createInventoryCardHtml(item) {
  const unitCost = calculateUnitCost(item);
  const totalValue = calculateTotalInventoryValue(item);
  const specification = getItemSpecification(item);
  const lowStockTag = createLowStockTagHtml(item);

  return `
    <article class="inventory-card" data-inventory-item-id="${escapeHtml(item.id)}">
      <div class="card-topline">
        <span class="category-pill">${createIconHtml(getCategoryIconName(item.category))}${escapeHtml(item.category)}</span>
        <details class="card-menu">
          <summary aria-label="Abrir opções">${createIconHtml("more-horizontal")}</summary>
          <div>
            <button type="button" data-inventory-action="edit">${createIconHtml("pencil")}Editar</button>
            <button type="button" data-inventory-action="delete">${createIconHtml("trash-2")}Excluir</button>
          </div>
        </details>
      </div>
      <div class="inventory-title-row">
        <div class="product-avatar" aria-hidden="true">${escapeHtml(getProductInitial(item))}</div>
        <div>
          <h3>${escapeHtml(item.name)}</h3>
          <span>${escapeHtml(getItemSubtitle(item))}</span>
        </div>
      </div>
      <div class="stock-metric-grid">
        <div class="stock-metric is-featured"><span>Valor financeiro total</span><strong>${formatCurrency(totalValue)}</strong></div>
        <div class="stock-metric">
          <span>${item.category === CATEGORY_NEEDLES ? "Tipo + numeração" : `Custo por ${getMeasureLabel(item.measureUnit)}`}</span>
          <strong>${item.category === CATEGORY_NEEDLES ? escapeHtml(specification) : formatCurrency(unitCost)}</strong>
        </div>
      </div>
      ${lowStockTag}
      <p class="card-note">${escapeHtml(getCalculationDescription(item))}</p>
    </article>
  `;
}

/**
 * Creates low-stock visual indicator for inventory cards.
 * @param {object} item - Normalized inventory item.
 * @returns {string} HTML tag when stock is low, otherwise empty string.
 */
function createLowStockTagHtml(item) {
  if (!isLowStockItem(item)) {
    return "";
  }

  return `
    <span class="low-stock-tag">
      ${createIconHtml("alert-triangle")}
      Estoque Baixo
    </span>
  `;
}

/**
 * Checks whether an item has reached the low-stock threshold.
 * @param {object} item - Normalized inventory item.
 * @returns {boolean} True when stock quantity is at or below threshold.
 */
function isLowStockItem(item) {
  return normalizeNumber(item.stockQuantity) <= LOW_STOCK_THRESHOLD;
}


function renderBudget() {
  const activeBudget = getActiveBudget();
  const budgetTotals = calculateBudgetTotals(activeBudget);
  dom.budgetNameInput.value = activeBudget.name;
  dom.clientNameInput.value = activeBudget.clientName;
  dom.hourlyRateInput.value = activeBudget.hourlyRate > 0 ? formatEditableNumber(activeBudget.hourlyRate) : "";
  dom.sessionDurationInput.value = activeBudget.sessionDuration > 0 ? formatEditableNumber(activeBudget.sessionDuration) : "";
  dom.profitMarginInput.value = activeBudget.profitMarginPercent > 0 ? formatEditableNumber(activeBudget.profitMarginPercent) : "";
  dom.discountPercentInput.value = activeBudget.discountPercent > 0 ? formatEditableNumber(activeBudget.discountPercent) : "";
  dom.materialTotalValue.textContent = formatCurrency(budgetTotals.materialCost);
  dom.laborTotalValue.textContent = formatCurrency(budgetTotals.laborCost);
  dom.budgetTotalValue.textContent = formatCurrency(budgetTotals.totalCost);
  dom.suggestedPriceValue.textContent = formatCurrency(budgetTotals.suggestedPrice);
  dom.discountAmountValue.textContent = formatCurrency(budgetTotals.discountAmount);
  dom.finalPriceValue.textContent = formatCurrency(budgetTotals.finalPrice);
  dom.budgetCounter.textContent = formatItemsCounter(activeBudget.items.length, activeBudget.items.length);
  renderReferencePreview();
  renderStockPicker();
  renderCart();
  renderLucideIcons();
}

function renderReferencePreview() {
  const activeBudget = getActiveBudget();

  if (!activeBudget.referenceImage) {
    dom.referencePreview.hidden = true;
    dom.referencePreview.innerHTML = "";
    return;
  }

  dom.referencePreview.hidden = false;
  dom.referencePreview.innerHTML = `
    <img src="${escapeAttribute(activeBudget.referenceImage)}" alt="Imagem de referência da tatuagem" />
    <figcaption>${escapeHtml(activeBudget.referenceImageName || "Referência adicionada")}</figcaption>
  `;
}

function renderStockPicker() {
  const filteredItems = getFilteredInventoryItems(budgetSearchTerm, activeBudgetCategory);

  if (filteredItems.length === 0) {
    dom.stockPickerList.innerHTML = createEmptyStateHtml("Nenhum insumo encontrado para adicionar ao orçamento.");
    renderLucideIcons();
    return;
  }

  dom.stockPickerList.innerHTML = filteredItems.map((item) => {
    const usageRules = getUsageRules(item);
    const suffix = getMeasureSuffix(item.measureUnit);
    return `
      <article class="picker-card" data-inventory-item-id="${escapeHtml(item.id)}">
        <div class="picker-info">
          <strong>${escapeHtml(item.name)}</strong>
          <span>${escapeHtml(item.category)} · ${escapeHtml(getItemSpecification(item))}</span>
          <small>${formatCurrency(calculateUnitCost(item))} por ${escapeHtml(getMeasureLabel(item.measureUnit))}</small>
        </div>
        <div class="picker-actions">
          <label class="stepper-field">
            <span>Quantidade usada</span>
            <div class="quantity-stepper ${suffix ? "has-suffix" : ""}" data-suffix="${escapeHtml(suffix)}">
              <button type="button" data-picker-step="decrease" aria-label="Diminuir quantidade">${createIconHtml("minus")}</button>
              <input data-picker-quantity type="text" inputmode="${usageRules.inputMode}" value="${formatEditableNumber(usageRules.defaultValue)}" />
              <button type="button" data-picker-step="increase" aria-label="Aumentar quantidade">${createIconHtml("plus")}</button>
            </div>
          </label>
          <button class="primary-button" type="button" data-add-to-budget>${createIconHtml("shopping-cart")}Adicionar</button>
        </div>
      </article>
    `;
  }).join("");
  renderLucideIcons();
}

function renderCart() {
  const activeBudget = getActiveBudget();
  const cartEntries = activeBudget.items
    .map((cartItem) => ({ cartItem, inventoryItem: findInventoryItem(cartItem.inventoryItemId) }))
    .filter((entry) => entry.inventoryItem);

  if (cartEntries.length === 0) {
    dom.cartList.innerHTML = createEmptyStateHtml("Nenhum insumo adicionado ao orçamento.");
    renderLucideIcons();
    return;
  }

  dom.cartList.innerHTML = cartEntries.map(({ cartItem, inventoryItem }) => {
    const suffix = getMeasureSuffix(inventoryItem.measureUnit);
    const subtotal = calculateLineSubtotal(inventoryItem, cartItem.quantityUsed);
    const usageRules = getUsageRules(inventoryItem);
    return `
      <article class="cart-line" data-cart-item-id="${escapeHtml(cartItem.id)}">
        <div>
          <strong>${escapeHtml(inventoryItem.name)}</strong>
          <span>${escapeHtml(getItemSpecification(inventoryItem))} · ${formatCurrency(calculateUnitCost(inventoryItem))}/${escapeHtml(getMeasureLabel(inventoryItem.measureUnit))}</span>
        </div>
        <label class="stepper-field compact-stepper-field">
          <span>Uso</span>
          <div class="quantity-stepper ${suffix ? "has-suffix" : ""}" data-suffix="${escapeHtml(suffix)}">
            <button type="button" data-cart-step="decrease" aria-label="Diminuir quantidade">${createIconHtml("minus")}</button>
            <input data-cart-quantity type="text" inputmode="${usageRules.inputMode}" value="${formatEditableNumber(cartItem.quantityUsed)}" />
            <button type="button" data-cart-step="increase" aria-label="Aumentar quantidade">${createIconHtml("plus")}</button>
          </div>
        </label>
        <strong class="line-subtotal">${formatCurrency(subtotal)}</strong>
        <button class="ghost-button" type="button" data-remove-cart-item>${createIconHtml("trash-2")}Remover</button>
      </article>
    `;
  }).join("");
  renderLucideIcons();
}

function setActiveScreen(screenName) {
  if (!Object.prototype.hasOwnProperty.call(SCREEN_META, screenName)) {
    return;
  }

  activeScreen = screenName;
  renderActiveScreen();
  renderDashboard();
  closeSidebar();
}

function openSidebar() {
  dom.sidebar.classList.add("is-open");
  dom.drawerBackdrop.hidden = false;
}

function closeSidebar() {
  dom.sidebar.classList.remove("is-open");
  dom.drawerBackdrop.hidden = true;
}

function handleDynamicFieldsChange(event) {
  if (event.target.matches('[data-item-field="purchaseMode"]')) {
    renderDynamicForm();
    return;
  }

  updateUnitCostPreview();
}

function handleCategoryChoiceClick(event) {
  const categoryButton = event.target.closest("[data-form-category]");

  if (!categoryButton) {
    return;
  }

  selectedFormCategory = normalizeCategory(categoryButton.dataset.formCategory);
  renderCategoryChoices();
  renderDynamicForm();
}

function handleInventoryFilterClick(event) {
  const filterButton = event.target.closest("[data-inventory-category]");

  if (!filterButton) {
    return;
  }

  activeInventoryCategory = normalizeCategory(filterButton.dataset.inventoryCategory);
  renderInventoryFilters();
  renderInventory();
}

function handleBudgetFilterClick(event) {
  const filterButton = event.target.closest("[data-budget-category]");

  if (!filterButton) {
    return;
  }

  activeBudgetCategory = normalizeCategory(filterButton.dataset.budgetCategory);
  renderBudgetFilters();
  renderStockPicker();
}

function handleInventoryGridClick(event) {
  const actionButton = event.target.closest("[data-inventory-action]");

  if (!actionButton) {
    return;
  }

  const inventoryCard = actionButton.closest("[data-inventory-item-id]");
  const inventoryItemId = inventoryCard?.dataset.inventoryItemId;

  if (!inventoryItemId) {
    return;
  }

  if (actionButton.dataset.inventoryAction === "edit") {
    openItemModal(inventoryItemId);
    return;
  }

  if (actionButton.dataset.inventoryAction === "delete") {
    deleteInventoryItem(inventoryItemId);
  }
}

function handleStockPickerClick(event) {
  const stepButton = event.target.closest("[data-picker-step]");

  if (stepButton) {
    const pickerCard = stepButton.closest("[data-inventory-item-id]");
    const inventoryItem = findInventoryItem(pickerCard?.dataset.inventoryItemId);
    const quantityInput = pickerCard?.querySelector("[data-picker-quantity]");

    if (inventoryItem && quantityInput) {
      quantityInput.value = formatEditableNumber(adjustQuantity(inventoryItem, quantityInput.value, stepButton.dataset.pickerStep, getMinimumQuantity(inventoryItem)));
    }
    return;
  }

  const addButton = event.target.closest("[data-add-to-budget]");

  if (!addButton) {
    return;
  }

  const pickerCard = addButton.closest("[data-inventory-item-id]");
  const quantityInput = pickerCard?.querySelector("[data-picker-quantity]");
  addItemToBudget(pickerCard?.dataset.inventoryItemId, quantityInput?.value);
}

function handlePickerQuantityChange(event) {
  if (!event.target.matches("[data-picker-quantity]")) {
    return;
  }

  const pickerCard = event.target.closest("[data-inventory-item-id]");
  const inventoryItem = findInventoryItem(pickerCard?.dataset.inventoryItemId);

  if (!inventoryItem) {
    return;
  }

  event.target.value = formatEditableNumber(sanitizeUsageQuantity(inventoryItem, event.target.value, getMinimumQuantity(inventoryItem)));
}

function handleCartClick(event) {
  const stepButton = event.target.closest("[data-cart-step]");

  if (stepButton) {
    const cartLine = stepButton.closest("[data-cart-item-id]");
    adjustCartQuantity(cartLine?.dataset.cartItemId, stepButton.dataset.cartStep);
    return;
  }

  const removeButton = event.target.closest("[data-remove-cart-item]");

  if (removeButton) {
    const cartLine = removeButton.closest("[data-cart-item-id]");
    removeCartItem(cartLine?.dataset.cartItemId);
  }
}

function handleCartQuantityChange(event) {
  if (!event.target.matches("[data-cart-quantity]")) {
    return;
  }

  const cartLine = event.target.closest("[data-cart-item-id]");
  updateCartQuantity(cartLine?.dataset.cartItemId, event.target.value);
}

function openItemModal(itemId = null) {
  const item = itemId ? findInventoryItem(itemId) : null;
  editingItemId = item?.id || null;
  selectedFormCategory = item?.category || CATEGORY_NEEDLES;
  dom.itemModalEyebrow.textContent = editingItemId ? "Editar item" : "Novo item";
  dom.itemModalTitle.textContent = editingItemId ? "Atualizar insumo" : "Cadastrar insumo";
  renderCategoryChoices();
  renderDynamicForm(item);
  openModal(dom.itemModal);
}

function closeModal(modalElement) {
  if (typeof modalElement.close === "function" && modalElement.open) {
    modalElement.close();
    return;
  }

  modalElement.removeAttribute("open");
}

function openModal(modalElement) {
  if (typeof modalElement.showModal === "function") {
    modalElement.showModal();
    return;
  }

  modalElement.setAttribute("open", "");
}

function handleItemFormSubmit(event) {
  event.preventDefault();
  const inventoryItem = buildInventoryItemFromForm();

  if (!inventoryItem) {
    dom.itemForm.reportValidity();
    return;
  }

  if (editingItemId) {
    appState.inventoryItems = appState.inventoryItems.map((item) => item.id === editingItemId ? inventoryItem : item);
  } else {
    appState.inventoryItems.unshift(inventoryItem);
  }

  editingItemId = null;
  saveAppState();
  closeModal(dom.itemModal);
  renderApp();
}

function buildInventoryItemFromForm() {
  const categoryDefinition = CATEGORY_DEFINITIONS[selectedFormCategory];
  const fieldData = readDynamicFormData();
  const existingItem = editingItemId ? findInventoryItem(editingItemId) : null;
  const purchaseMode = UNIT_PURCHASE_CATEGORIES.includes(selectedFormCategory) ? sanitizeText(fieldData.purchaseMode || PURCHASE_MODE_BOX) : "";
  const isSinglePurchase = purchaseMode === PURCHASE_MODE_SINGLE;
  const packageQuantity = isSinglePurchase ? 1 : normalizeNumber(fieldData.packageQuantity);
  const packagePrice = isSinglePurchase ? normalizeNumber(fieldData.singleUnitPrice) : normalizeNumber(fieldData.packagePrice);
  const stockQuantity = normalizeNumber(fieldData.stockQuantity);
  const measureUnit = getNormalizedMeasureUnit(fieldData, selectedFormCategory, categoryDefinition.defaultMeasure);

  if (packageQuantity <= 0 || packagePrice <= 0 || stockQuantity <= 0 || !validateRequiredFields(categoryDefinition.fields, fieldData)) {
    return null;
  }

  const baseItem = {
    id: editingItemId || createId("item"),
    category: selectedFormCategory,
    name: buildItemName(selectedFormCategory, fieldData),
    brand: sanitizeText(fieldData.brand),
    lineType: sanitizeText(fieldData.lineType),
    numbering: sanitizeText(fieldData.numbering),
    color: sanitizeText(fieldData.color),
    purchaseMode,
    packageQuantity,
    packagePrice,
    stockQuantity,
    unitPrice: calculateRawUnitCost(packagePrice, packageQuantity),
    measureUnit,
    calculationType: categoryDefinition.calculationType,
    createdAt: existingItem?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  return normalizeInventoryItem(baseItem);
}


function readDynamicFormData() {
  const formData = {};
  dom.dynamicFieldsGrid.querySelectorAll("[data-item-field]").forEach((fieldElement) => {
    formData[fieldElement.dataset.itemField] = fieldElement.value;
  });
  return formData;
}

function validateRequiredFields(fields, fieldData) {
  const virtualItem = createVirtualItemFromFormData(fieldData);
  return fields
    .filter((field) => isFieldVisible(field, virtualItem, fieldData))
    .every((field) => !field.required || sanitizeText(fieldData[field.key] || fieldData.unitPrice));
}

function buildItemName(categoryName, fieldData) {
  if (categoryName === CATEGORY_NEEDLES) {
    return [fieldData.brand, fieldData.lineType, fieldData.numbering].map(sanitizeText).filter(Boolean).join(" ");
  }

  return sanitizeText(fieldData.name);
}

function updateUnitCostPreview() {
  const fieldData = readDynamicFormData();
  const categoryDefinition = CATEGORY_DEFINITIONS[selectedFormCategory];
  const purchaseMode = UNIT_PURCHASE_CATEGORIES.includes(selectedFormCategory) ? sanitizeText(fieldData.purchaseMode || PURCHASE_MODE_BOX) : "";
  const isSinglePurchase = purchaseMode === PURCHASE_MODE_SINGLE;
  const packageQuantity = isSinglePurchase ? 1 : normalizeNumber(fieldData.packageQuantity);
  const packagePrice = isSinglePurchase ? normalizeNumber(fieldData.singleUnitPrice) : normalizeNumber(fieldData.packagePrice);
  const stockQuantity = normalizeNumber(fieldData.stockQuantity);
  const measureUnit = getNormalizedMeasureUnit(fieldData, selectedFormCategory, categoryDefinition.defaultMeasure);
  const unitCost = calculateRawUnitCost(packagePrice, packageQuantity);
  const totalInventoryValue = packagePrice * Math.max(stockQuantity, 0);
  const previewLabel = getPreviewLabel(selectedFormCategory, measureUnit);
  dom.unitCostPreview.innerHTML = `
    <span>${escapeHtml(previewLabel)}</span>
    <strong>${formatCurrency(unitCost)}</strong>
    <small>Valor em estoque: ${formatCurrency(totalInventoryValue)}</small>
  `;
}


function getPreviewLabel(categoryName, measureUnit) {
  if (categoryName === CATEGORY_NEEDLES) {
    return "Custo por cartucho/agulha";
  }

  if ([CATEGORY_DISPOSABLES, CATEGORY_CLEANING].includes(categoryName)) {
    return "Custo por unidade";
  }

  return `Custo por ${getMeasureLabel(measureUnit)}`;
}


function deleteInventoryItem(itemId) {
  appState.inventoryItems = appState.inventoryItems.filter((item) => item.id !== itemId);
  appState.budgets = appState.budgets.map((budget) => ({
    ...budget,
    items: budget.items.filter((cartItem) => cartItem.inventoryItemId !== itemId)
  }));
  saveAppState();
  renderApp();
}

function updateBudgetIdentity() {
  const activeBudget = getActiveBudget();
  activeBudget.name = sanitizeText(dom.budgetNameInput.value) || "Novo orçamento";
  activeBudget.clientName = sanitizeText(dom.clientNameInput.value);
  saveAppState();
  renderDashboard();
}

function updateBudgetLabor() {
  const activeBudget = getActiveBudget();
  activeBudget.hourlyRate = normalizeNumber(dom.hourlyRateInput.value);
  activeBudget.sessionDuration = normalizeNumber(dom.sessionDurationInput.value);
  saveAppState();
  renderBudgetTotalsOnly();
  renderDashboard();
}

/**
 * Persists profit/fixed-cost margin and refreshes budget totals.
 * @returns {void}
 */
function updateBudgetProfitMargin() {
  const activeBudget = getActiveBudget();
  activeBudget.profitMarginPercent = normalizeNumber(dom.profitMarginInput.value);
  saveAppState();
  renderBudgetTotalsOnly();
  renderDashboard();
}

function updateBudgetDiscount() {
  const activeBudget = getActiveBudget();
  activeBudget.discountPercent = normalizePercent(dom.discountPercentInput.value);
  saveAppState();
  renderBudgetTotalsOnly();
  renderDashboard();
}

function renderBudgetTotalsOnly() {
  const totals = calculateBudgetTotals(getActiveBudget());
  dom.materialTotalValue.textContent = formatCurrency(totals.materialCost);
  dom.laborTotalValue.textContent = formatCurrency(totals.laborCost);
  dom.budgetTotalValue.textContent = formatCurrency(totals.totalCost);
  dom.suggestedPriceValue.textContent = formatCurrency(totals.suggestedPrice);
  dom.discountAmountValue.textContent = formatCurrency(totals.discountAmount);
  dom.finalPriceValue.textContent = formatCurrency(totals.finalPrice);
}

function handleReferenceImageChange(event) {
  const imageFile = event.target.files?.[0];

  if (!imageFile || !imageFile.type.startsWith("image/") || imageFile.size > MAX_IMAGE_SIZE_BYTES) {
    event.target.value = "";
    return;
  }

  const reader = new FileReader();
  reader.addEventListener("load", () => {
    const activeBudget = getActiveBudget();
    activeBudget.referenceImage = String(reader.result || "");
    activeBudget.referenceImageName = imageFile.name;
    saveAppState();
    renderReferencePreview();
  });
  reader.readAsDataURL(imageFile);
}

function removeReferenceImage() {
  const activeBudget = getActiveBudget();
  activeBudget.referenceImage = "";
  activeBudget.referenceImageName = "";
  dom.referenceImageInput.value = "";
  saveAppState();
  renderReferencePreview();
}

function createNewBudget() {
  const newBudget = {
    ...DEFAULT_BUDGET,
    id: createId("budget"),
    items: []
  };
  appState.budgets.unshift(newBudget);
  appState.activeBudgetId = newBudget.id;
  saveAppState();
  renderBudget();
  renderDashboard();
}

/**
 * Duplicates the active budget with independent cart item identifiers.
 * @returns {void}
 */
function duplicateActiveBudget() {
  const activeBudget = getActiveBudget();
  const duplicatedBudget = {
    ...activeBudget,
    id: createId("budget"),
    name: `${sanitizeText(activeBudget.name) || DEFAULT_BUDGET.name} - cópia`,
    items: activeBudget.items.map((item) => ({
      ...item,
      id: createId("cart")
    }))
  };
  appState.budgets.unshift(duplicatedBudget);
  appState.activeBudgetId = duplicatedBudget.id;
  saveAppState();
  renderBudget();
  renderDashboard();
}

function addItemToBudget(itemId, rawQuantity) {
  const inventoryItem = findInventoryItem(itemId);

  if (!inventoryItem) {
    return;
  }

  const activeBudget = getActiveBudget();
  const quantityUsed = sanitizeUsageQuantity(inventoryItem, rawQuantity, getMinimumQuantity(inventoryItem));
  const existingCartItem = activeBudget.items.find((cartItem) => cartItem.inventoryItemId === itemId);

  if (existingCartItem) {
    existingCartItem.quantityUsed = sanitizeUsageQuantity(inventoryItem, existingCartItem.quantityUsed + quantityUsed, getMinimumQuantity(inventoryItem));
  } else {
    activeBudget.items.push({
      id: createId("cart"),
      inventoryItemId: itemId,
      quantityUsed
    });
  }

  saveAppState();
  renderBudget();
  renderDashboard();
}

function adjustCartQuantity(cartItemId, action) {
  const activeBudget = getActiveBudget();
  const cartItem = activeBudget.items.find((item) => item.id === cartItemId);
  const inventoryItem = cartItem ? findInventoryItem(cartItem.inventoryItemId) : null;

  if (!cartItem || !inventoryItem) {
    return;
  }

  const minimumValue = 0;
  const nextQuantity = adjustQuantity(inventoryItem, cartItem.quantityUsed, action, minimumValue);

  if (nextQuantity <= 0) {
    activeBudget.items = activeBudget.items.filter((item) => item.id !== cartItemId);
  } else {
    cartItem.quantityUsed = nextQuantity;
  }

  saveAppState();
  renderBudget();
  renderDashboard();
}

function updateCartQuantity(cartItemId, rawQuantity) {
  const activeBudget = getActiveBudget();
  const cartItem = activeBudget.items.find((item) => item.id === cartItemId);
  const inventoryItem = cartItem ? findInventoryItem(cartItem.inventoryItemId) : null;

  if (!cartItem || !inventoryItem) {
    return;
  }

  const quantityUsed = sanitizeUsageQuantity(inventoryItem, rawQuantity, 0);

  if (quantityUsed <= 0) {
    activeBudget.items = activeBudget.items.filter((item) => item.id !== cartItemId);
  } else {
    cartItem.quantityUsed = quantityUsed;
  }

  saveAppState();
  renderBudget();
  renderDashboard();
}

function removeCartItem(cartItemId) {
  const activeBudget = getActiveBudget();
  activeBudget.items = activeBudget.items.filter((item) => item.id !== cartItemId);
  saveAppState();
  renderBudget();
  renderDashboard();
}

function adjustQuantity(item, currentValue, action, minimumValue) {
  const rules = getUsageRules(item);
  const signal = action === "decrease" ? -1 : 1;
  const nextValue = normalizeNumber(currentValue) + (rules.step * signal);
  return sanitizeUsageQuantity(item, nextValue, minimumValue);
}

function sanitizeUsageQuantity(item, rawValue, minimumValue) {
  const quantity = normalizeNumber(rawValue);
  const rules = getUsageRules(item);
  const safeQuantity = Math.max(minimumValue, quantity);

  if (rules.integerOnly) {
    return Math.max(minimumValue, Math.round(safeQuantity));
  }

  return roundDecimal(safeQuantity);
}

function getMinimumQuantity(item) {
  return getUsageRules(item).integerOnly ? 1 : DECIMAL_STEP;
}

function getUsageRules(item) {
  const usesDecimal = isDecimalMeasure(item.measureUnit);
  return {
    step: usesDecimal ? DECIMAL_STEP : INTEGER_STEP,
    defaultValue: usesDecimal ? DECIMAL_STEP : INTEGER_STEP,
    inputMode: usesDecimal ? "decimal" : "numeric",
    integerOnly: !usesDecimal
  };
}

function isDecimalMeasure(measureUnit) {
  return [MEASURE_ML, MEASURE_GRAM, MEASURE_METER].includes(measureUnit);
}

function getActiveBudget() {
  let activeBudget = appState.budgets.find((budget) => budget.id === appState.activeBudgetId);

  if (!activeBudget) {
    activeBudget = appState.budgets[0] || { ...DEFAULT_BUDGET, items: [] };
    appState.activeBudgetId = activeBudget.id;
  }

  return activeBudget;
}

function findInventoryItem(itemId) {
  return appState.inventoryItems.find((item) => item.id === itemId) || null;
}

function getFilteredInventoryItems(searchTerm, categoryFilter) {
  const normalizedSearch = normalizeSearch(searchTerm);
  const normalizedCategory = normalizeCategory(categoryFilter);

  return appState.inventoryItems.filter((item) => {
    const matchesCategory = normalizedCategory === CATEGORY_ALL || item.category === normalizedCategory;
    const matchesSearch = !normalizedSearch || normalizeSearch(getSearchIndex(item)).includes(normalizedSearch);
    return matchesCategory && matchesSearch;
  });
}

function getSearchIndex(item) {
  return [
    item.category,
    item.name,
    item.brand,
    item.lineType,
    item.numbering,
    item.color,
    item.measureUnit,
    getItemSpecification(item)
  ].join(" ");
}

function getBusinessCategories() {
  return CATEGORY_ORDER.filter((categoryName) => categoryName !== CATEGORY_ALL);
}

function countItemsByCategory(categoryName) {
  if (categoryName === CATEGORY_ALL) {
    return appState.inventoryItems.length;
  }

  return appState.inventoryItems.filter((item) => item.category === categoryName).length;
}

function getCounterTotal(categoryName) {
  return categoryName === CATEGORY_ALL ? appState.inventoryItems.length : appState.inventoryItems.length;
}

/**
 * Calculates the usable unit/fraction cost according to the business category.
 * @param {object} item - Normalized inventory item.
 * @returns {number} Cost per unit, ml, gram or linear meter.
 */
function calculateUnitCost(item) {
  return calculateUnitCostCore(item, getInventoryCalculationContext());
}

/**
 * Divides purchase price by package quantity without mutating inputs.
 * @param {number|string} price - Purchase price of the full package.
 * @param {number|string} quantity - Internal package quantity, volume, weight or linear measure.
 * @returns {number} Fractional cost.
 */
function calculateRawUnitCost(price, quantity) {
  return calculateRawUnitCostCore(price, quantity, normalizeNumber);
}

/**
 * Calculates financial value currently locked in stock.
 * @param {object} item - Normalized inventory item.
 * @returns {number} Full purchase price multiplied by closed packages or loose units in stock.
 */
function calculateTotalInventoryValue(item) {
  return calculateTotalInventoryValueCore(item, normalizeNumber);
}

/**
 * Calculates subtotal for one budget line using the exact fractional cost.
 * @param {object} item - Normalized inventory item.
 * @param {number|string} quantityUsed - Quantity used in units, ml, grams or meters.
 * @returns {number} Line subtotal.
 */
function calculateLineSubtotal(item, quantityUsed) {
  return calculateLineSubtotalCore(item, quantityUsed, getInventoryCalculationContext());
}

/**
 * Calculates budget totals and final selling price with optional margin and discount.
 * @param {object} budget - Active budget state.
 * @returns {{materialCost: number, laborCost: number, totalCost: number, marginCost: number, suggestedPrice: number, discountAmount: number, finalPrice: number}} Budget totals.
 */
function calculateBudgetTotals(budget) {
  return calculateBudgetTotalsCore(budget, {
    findInventoryItem,
    calculateLineSubtotal,
    normalizeNumber,
    normalizePercent,
    roundMoneyValue
  });
}

function getInventoryCalculationContext() {
  return {
    normalizeNumber,
    purchaseModeSingle: PURCHASE_MODE_SINGLE,
    unitPurchaseCategories: UNIT_PURCHASE_CATEGORIES,
    supportedCategories: [CATEGORY_NEEDLES, CATEGORY_DISPOSABLES, CATEGORY_CLEANING, CATEGORY_INKS, CATEGORY_PASTES, CATEGORY_LINEAR]
  };
}

function calculateDashboardMetrics() {
  const categoryInvestmentMap = appState.inventoryItems.reduce((investmentMap, item) => {
    const currentValue = investmentMap.get(item.category) || 0;
    investmentMap.set(item.category, currentValue + calculateTotalInventoryValue(item));
    return investmentMap;
  }, new Map());
  const categoryInvestments = Array.from(categoryInvestmentMap, ([category, totalValue]) => ({
    category,
    totalValue
  }))
    .filter((categoryInvestment) => categoryInvestment.totalValue > 0)
    .sort((firstCategory, secondCategory) => secondCategory.totalValue - firstCategory.totalValue);
  const totalInventoryInvestment = categoryInvestments.reduce((totalValue, categoryInvestment) => totalValue + categoryInvestment.totalValue, 0);

  return {
    totalInventoryInvestment,
    categoryInvestments,
    generatedBudgetCount: countGeneratedBudgets()
  };
}

function countGeneratedBudgets() {
  return appState.budgets.filter(isGeneratedBudget).length;
}

function isGeneratedBudget(budget) {
  const budgetName = sanitizeText(budget.name);
  return Boolean(sanitizeText(budget.clientName))
    || Boolean(budgetName && budgetName !== DEFAULT_BUDGET.name)
    || normalizeNumber(budget.hourlyRate) > 0
    || normalizeNumber(budget.sessionDuration) > 0
    || normalizeNumber(budget.profitMarginPercent) > 0
    || normalizeNumber(budget.discountPercent) > 0
    || Boolean(sanitizeText(budget.referenceImage))
    || (Array.isArray(budget.items) && budget.items.length > 0);
}

function getItemSpecification(item) {
  if (item.category === CATEGORY_NEEDLES) {
    return [item.lineType, item.numbering].filter(Boolean).join(" ") || "Sem numeração";
  }

  if (item.category === CATEGORY_INKS && item.color) {
    return item.color;
  }

  return `${formatNumber(item.packageQuantity)} ${getMeasureLabel(item.measureUnit)}`;
}


function getItemSubtitle(item) {
  if (item.category === CATEGORY_NEEDLES) {
    return item.brand || "Marca não informada";
  }

  const brand = item.brand || "Marca não informada";
  const specification = getItemSpecification(item);
  return `${brand} · ${specification}`;
}

function getCalculationDescription(item) {
  const stockQuantity = formatNumber(item.stockQuantity);
  const totalValue = formatCurrency(calculateTotalInventoryValue(item));

  if (item.category === CATEGORY_NEEDLES && item.purchaseMode === PURCHASE_MODE_SINGLE) {
    return `${stockQuantity} unidade(s) em estoque. Valor financeiro total: ${totalValue}.`;
  }

  if (item.category === CATEGORY_NEEDLES) {
    return `${stockQuantity} caixa(s) em estoque. Caixa com ${formatNumber(item.packageQuantity)} unidades. Valor financeiro total: ${totalValue}.`;
  }

  if ([CATEGORY_DISPOSABLES, CATEGORY_CLEANING].includes(item.category) && item.purchaseMode === PURCHASE_MODE_SINGLE) {
    return `${stockQuantity} unidade(s) em estoque. Uso inteiro no orçamento.`;
  }

  if ([CATEGORY_DISPOSABLES, CATEGORY_CLEANING].includes(item.category)) {
    return `${stockQuantity} pacote(s)/caixa(s) em estoque. Pacote com ${formatNumber(item.packageQuantity)} unidades.`;
  }

  if (item.category === CATEGORY_LINEAR) {
    return `${stockQuantity} rolo(s) em estoque. Rolo com ${formatNumber(item.packageQuantity)} metros.`;
  }

  return `${stockQuantity} embalagem(ns) em estoque. Embalagem com ${formatNumber(item.packageQuantity)} ${getMeasureLabel(item.measureUnit)}.`;
}


function getProductInitial(item) {
  const sourceText = item.category === CATEGORY_NEEDLES ? item.lineType || item.name : item.name;
  return sanitizeText(sourceText).slice(0, 2).toUpperCase() || "CT";
}

function getMeasureLabel(measureUnit) {
  const labels = {
    [MEASURE_UNIT]: "unidade",
    [MEASURE_ML]: "ml",
    [MEASURE_GRAM]: "g",
    [MEASURE_METER]: "m"
  };
  return labels[measureUnit] || measureUnit || "unidade";
}


function getMeasureSuffix(measureUnit) {
  const suffixes = {
    [MEASURE_UNIT]: "un",
    [MEASURE_ML]: "ml",
    [MEASURE_GRAM]: "g",
    [MEASURE_METER]: "m"
  };
  return suffixes[measureUnit] || "";
}


function normalizeMeasureUnit(unitValue, fallbackUnit = MEASURE_UNIT) {
  const normalizedValue = sanitizeText(unitValue).toLowerCase();
  const unitMap = {
    unidade: MEASURE_UNIT,
    unidades: MEASURE_UNIT,
    unid: MEASURE_UNIT,
    un: MEASURE_UNIT,
    ml: MEASURE_ML,
    mililitro: MEASURE_ML,
    mililitros: MEASURE_ML,
    grama: MEASURE_GRAM,
    gramas: MEASURE_GRAM,
    g: MEASURE_GRAM,
    metro: MEASURE_METER,
    metros: MEASURE_METER,
    m: MEASURE_METER
  };
  return unitMap[normalizedValue] || fallbackUnit;
}


function normalizeCategory(categoryValue) {
  const normalizedValue = sanitizeText(categoryValue).toLowerCase();
  const categoryMap = {
    todos: CATEGORY_ALL,
    cartucho: CATEGORY_NEEDLES,
    cartuchos: CATEGORY_NEEDLES,
    agulha: CATEGORY_NEEDLES,
    agulhas: CATEGORY_NEEDLES,
    "agulhas e cartuchos": CATEGORY_NEEDLES,
    tinta: CATEGORY_INKS,
    tintas: CATEGORY_INKS,
    "tintas/líquidos": CATEGORY_INKS,
    "tintas/liquidos": CATEGORY_INKS,
    "líquidos": CATEGORY_INKS,
    liquidos: CATEGORY_INKS,
    "líquidos e pastosos": CATEGORY_INKS,
    "liquidos e pastosos": CATEGORY_INKS,
    pastoso: CATEGORY_PASTES,
    pastosos: CATEGORY_PASTES,
    vaselina: CATEGORY_PASTES,
    transfer: CATEGORY_PASTES,
    pomada: CATEGORY_PASTES,
    pomadas: CATEGORY_PASTES,
    biossegurança: CATEGORY_DISPOSABLES,
    biosseguranca: CATEGORY_DISPOSABLES,
    descartável: CATEGORY_DISPOSABLES,
    descartavel: CATEGORY_DISPOSABLES,
    descartáveis: CATEGORY_DISPOSABLES,
    descartaveis: CATEGORY_DISPOSABLES,
    "biossegurança e descartáveis": CATEGORY_DISPOSABLES,
    "biosseguranca e descartaveis": CATEGORY_DISPOSABLES,
    "biossegurança/descartáveis": CATEGORY_DISPOSABLES,
    "biosseguranca/descartaveis": CATEGORY_DISPOSABLES,
    "unidade avulsa direta": CATEGORY_DISPOSABLES,
    avulso: CATEGORY_DISPOSABLES,
    avulsa: CATEGORY_DISPOSABLES,
    outros: CATEGORY_DISPOSABLES,
    limpeza: CATEGORY_CLEANING,
    finalizacao: CATEGORY_CLEANING,
    finalização: CATEGORY_CLEANING,
    "limpeza e finalizacao": CATEGORY_CLEANING,
    "limpeza e finalização": CATEGORY_CLEANING,
    acabamento: CATEGORY_CLEANING,
    hectografico: CATEGORY_CLEANING,
    hectográfico: CATEGORY_CLEANING,
    stencil: CATEGORY_CLEANING,
    "papel toalha": CATEGORY_CLEANING,
    "materiais de área/extensão": CATEGORY_LINEAR,
    "materiais de area/extensao": CATEGORY_LINEAR,
    "materiais de área": CATEGORY_LINEAR,
    "materiais de area": CATEGORY_LINEAR,
    "materiais de extensão": CATEGORY_LINEAR,
    "materiais de extensao": CATEGORY_LINEAR,
    "materiais extensão": CATEGORY_LINEAR,
    rolo: CATEGORY_LINEAR,
    rolos: CATEGORY_LINEAR
  };
  return categoryMap[normalizedValue] || CATEGORY_NEEDLES;
}


function normalizeNumber(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value !== "string") {
    return 0;
  }

  const compactValue = value.replace(/\s/g, "").replace(/[^0-9,.-]/g, "");
  const hasComma = compactValue.includes(",");
  const sanitizedValue = hasComma
    ? compactValue.replace(/\./g, "").replace(",", ".")
    : compactValue;
  const parsedValue = Number.parseFloat(sanitizedValue);
  return Number.isFinite(parsedValue) ? parsedValue : 0;
}

function normalizePercent(value) {
  return Math.min(Math.max(normalizeNumber(value), 0), 100);
}

function normalizeSearch(value) {
  return sanitizeText(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function sanitizeText(value) {
  return String(value || "").trim();
}

function roundDecimal(value) {
  return Math.round((normalizeNumber(value) + Number.EPSILON) * 100) / 100;
}

function roundMoneyValue(value) {
  return roundDecimal(value);
}

function formatCurrency(value) {
  return CURRENCY_FORMATTER.format(normalizeNumber(value));
}

function formatNumber(value) {
  return NUMBER_FORMATTER.format(normalizeNumber(value));
}

function formatEditableNumber(value) {
  const normalizedValue = normalizeNumber(value);
  return normalizedValue > 0 ? String(roundDecimal(normalizedValue)).replace(".", ",") : "";
}

function formatCounter(currentValue, totalValue) {
  return `${normalizeNumber(currentValue)} de ${normalizeNumber(totalValue)}`;
}

function formatCompactCount(value) {
  return String(normalizeNumber(value));
}

function formatItemsCounter(currentValue, totalValue) {
  const current = normalizeNumber(currentValue);
  const total = normalizeNumber(totalValue);

  if (current === total) {
    return `${total} ${total === 1 ? "item" : "itens"}`;
  }

  return `${current} ${current === 1 ? "item" : "itens"} filtrado${current === 1 ? "" : "s"}`;
}

/**
 * Creates Lucide-compatible icon markup with a safe no-script fallback.
 * @param {string} iconName - Lucide icon name.
 * @param {string} className - Optional CSS class.
 * @returns {string} Inline icon placeholder HTML.
 */
function createIconHtml(iconName, className = "") {
  return `<i class="inline-icon ${escapeAttribute(className)}" data-lucide="${escapeAttribute(iconName)}" aria-hidden="true"></i>`;
}

/**
 * Resolves category-specific icon names.
 * @param {string} categoryName - Inventory category name.
 * @returns {string} Lucide icon name.
 */
function getCategoryIconName(categoryName) {
  return CATEGORY_ICON_MAP[categoryName] || "package";
}

/**
 * Safely hydrates Lucide icons when the CDN script is available.
 * @returns {void}
 */
function renderLucideIcons() {
  if (!window.lucide || typeof window.lucide.createIcons !== "function") {
    return;
  }

  window.lucide.createIcons({
    attrs: {
      "stroke-width": 2,
      "aria-hidden": "true"
    }
  });
}

function createEmptyStateHtml(message) {
  return `
    <article class="empty-state">
      <strong>${escapeHtml(message)}</strong>
      <span>Use a busca, altere o filtro ou cadastre um novo item.</span>
    </article>
  `;
}

function createId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function escapeHtml(value) {
  return sanitizeText(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/`/g, "&#096;");
}

function sanitizeFileName(value) {
  return normalizeSearch(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || "orcamento-tattoo";
}

function isImageDataUrl(value) {
  return /^data:image\/(png|jpeg|jpg|webp);base64,/i.test(String(value || ""));
}

function exportPdf() {
  const activeBudget = getActiveBudget();
  const fileName = `${sanitizeFileName(activeBudget.name || "orcamento-tattoo")}.pdf`;
  dom.invoiceDocument.innerHTML = createInvoiceHtml();
  exportBudgetPdf({
    html: dom.invoiceDocument.innerHTML,
    fileName
  });
}

function createInvoiceHtml() {
  const activeBudget = getActiveBudget();
  const totals = calculateBudgetTotals(activeBudget);
  const itemRows = activeBudget.items.map((cartItem) => {
    const inventoryItem = findInventoryItem(cartItem.inventoryItemId);

    if (!inventoryItem) {
      return "";
    }

    return `
      <tr>
        <td>${escapeHtml(inventoryItem.name)}</td>
        <td>${escapeHtml(inventoryItem.category)}</td>
        <td>${escapeHtml(getItemSpecification(inventoryItem))}</td>
        <td>${formatNumber(cartItem.quantityUsed)} ${escapeHtml(getMeasureLabel(inventoryItem.measureUnit))}</td>
        <td>${formatCurrency(calculateUnitCost(inventoryItem))}</td>
        <td>${formatCurrency(calculateLineSubtotal(inventoryItem, cartItem.quantityUsed))}</td>
      </tr>
    `;
  }).join("");
  const referenceImageHtml = activeBudget.referenceImage
    ? `<img class="invoice-reference-image" src="${escapeAttribute(activeBudget.referenceImage)}" alt="Referência da tatuagem" />`
    : `<div class="invoice-reference-placeholder">Sem imagem de referência</div>`;

  return `
    <article class="invoice-page">
      <header class="invoice-header">
        <div>
          <span>CalculadoraTattoo</span>
          <h1>${escapeHtml(activeBudget.name || "Orçamento")}</h1>
          <p>Cliente: <strong>${escapeHtml(activeBudget.clientName || "Não informado")}</strong></p>
        </div>
        ${referenceImageHtml}
      </header>

      <section class="invoice-summary-grid">
        <div><span>Insumos</span><strong>${formatCurrency(totals.materialCost)}</strong></div>
        <div><span>Mão de obra</span><strong>${formatCurrency(totals.laborCost)}</strong></div>
        <div><span>Total</span><strong>${formatCurrency(totals.totalCost)}</strong></div>
        <div><span>Margem</span><strong>${formatNumber(activeBudget.profitMarginPercent)}%</strong></div>
        <div><span>Valor original</span><strong>${formatCurrency(totals.suggestedPrice)}</strong></div>
        <div><span>Desconto</span><strong>${formatNumber(activeBudget.discountPercent)}%</strong></div>
        <div><span>Valor final</span><strong>${formatCurrency(totals.finalPrice)}</strong></div>
      </section>

      <section class="invoice-labor-line">
        <strong>Mão de obra:</strong>
        ${formatNumber(activeBudget.sessionDuration)} h × ${formatCurrency(activeBudget.hourlyRate)} = ${formatCurrency(totals.laborCost)}
        <br />
        <strong>Margem:</strong>
        ${formatNumber(activeBudget.profitMarginPercent)}% = ${formatCurrency(totals.marginCost)}
        <br />
        <strong>Desconto:</strong>
        ${formatNumber(activeBudget.discountPercent)}% = -${formatCurrency(totals.discountAmount)}
      </section>

      <table class="invoice-table">
        <thead>
          <tr>
            <th>Insumo</th>
            <th>Categoria</th>
            <th>Especificação</th>
            <th>Uso</th>
            <th>Custo unitário</th>
            <th>Subtotal</th>
          </tr>
        </thead>
        <tbody>${itemRows || `<tr><td colspan="6">Nenhum item selecionado.</td></tr>`}</tbody>
      </table>

      <footer class="invoice-footer">
        <span>Orçamento gerado localmente no navegador.</span>
        <strong>Valor final: ${formatCurrency(totals.finalPrice)}</strong>
      </footer>
    </article>
  `;
}
