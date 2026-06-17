export const CATEGORY_ALL = "Todos";
export const CATEGORY_NEEDLES = "Agulhas e Cartuchos";
export const CATEGORY_INKS = "Tintas";
export const CATEGORY_PASTES = "Pastosos";
export const CATEGORY_DISPOSABLES = "Biossegurança e Descartáveis";
export const CATEGORY_CLEANING = "Limpeza e Finalização";
export const CATEGORY_LINEAR = "Materiais de Extensão";
export const PURCHASE_MODE_BOX = "box";
export const PURCHASE_MODE_SINGLE = "single";
export const MEASURE_UNIT = "un";
export const MEASURE_ML = "ml";
export const MEASURE_GRAM = "g";
export const MEASURE_METER = "m";
export const INTEGER_STEP = 1;
export const DECIMAL_STEP = 0.5;

export const UNIT_PURCHASE_CATEGORIES = [CATEGORY_NEEDLES, CATEGORY_DISPOSABLES, CATEGORY_CLEANING];
export const CATEGORY_ORDER = [CATEGORY_ALL, CATEGORY_NEEDLES, CATEGORY_INKS, CATEGORY_PASTES, CATEGORY_DISPOSABLES, CATEGORY_CLEANING, CATEGORY_LINEAR];
export const BUSINESS_CATEGORIES = CATEGORY_ORDER.filter((category) => category !== CATEGORY_ALL);

export const CATEGORY_DEFINITIONS = {
  [CATEGORY_NEEDLES]: {
    helper: "Cartuchos por caixa ou por unidade, com uso sempre inteiro no orçamento.",
    defaultMeasure: MEASURE_UNIT,
    fields: [
      { key: "brand", label: "Marca", type: "text", placeholder: "Ex: White Head", required: true },
      { key: "lineType", label: "Linha/Tipo", type: "text", placeholder: "Ex: RL, RS, MG", required: true },
      { key: "numbering", label: "Numeração", type: "text", placeholder: "Ex: 0310, 0712", required: true },
      { key: "purchaseMode", label: "Formato de compra", type: "select", required: true, options: [{ value: PURCHASE_MODE_BOX, label: "Por caixa" }, { value: PURCHASE_MODE_SINGLE, label: "Por unidade" }] },
      { key: "packageQuantity", label: "Quantidade na caixa", type: "number", inputMode: "numeric", placeholder: "20", required: true, visibleWhen: { key: "purchaseMode", value: PURCHASE_MODE_BOX } },
      { key: "packagePrice", label: "Preço da caixa", type: "currency", inputMode: "decimal", placeholder: "300,00", required: true, visibleWhen: { key: "purchaseMode", value: PURCHASE_MODE_BOX } },
      { key: "singleUnitPrice", label: "Preço unitário pago", type: "currency", inputMode: "decimal", placeholder: "15,00", required: true, visibleWhen: { key: "purchaseMode", value: PURCHASE_MODE_SINGLE } },
      { key: "stockQuantity", label: "Quantidade em estoque", type: "number", inputMode: "numeric", placeholder: "5", required: true }
    ]
  },
  [CATEGORY_INKS]: {
    helper: "Tintas por frasco, com uso fracionado em ml.",
    defaultMeasure: MEASURE_ML,
    fields: [
      { key: "name", label: "Nome", type: "text", placeholder: "Ex: Tinta preta linha", required: true },
      { key: "brand", label: "Marca", type: "text", placeholder: "Ex: Dynamic" },
      { key: "color", label: "Cor", type: "text", placeholder: "Ex: Preto", required: true },
      { key: "packageQuantity", label: "Tamanho do frasco (ml)", type: "number", inputMode: "decimal", placeholder: "30", required: true },
      { key: "packagePrice", label: "Preço do frasco", type: "currency", inputMode: "decimal", placeholder: "100,00", required: true },
      { key: "stockQuantity", label: "Quantidade de frascos em estoque", type: "number", inputMode: "numeric", placeholder: "3", required: true }
    ]
  },
  [CATEGORY_PASTES]: {
    helper: "Vaselina, transfer e pomadas em g ou ml.",
    defaultMeasure: MEASURE_GRAM,
    fields: [
      { key: "name", label: "Nome", type: "text", placeholder: "Ex: Vaselina, transfer, pomada", required: true },
      { key: "brand", label: "Marca", type: "text", placeholder: "Ex: Electric Ink" },
      { key: "packageQuantity", label: "Tamanho da embalagem", type: "measure", inputMode: "decimal", placeholder: "500", required: true, options: [MEASURE_GRAM, MEASURE_ML] },
      { key: "packagePrice", label: "Preço da embalagem", type: "currency", inputMode: "decimal", placeholder: "35,00", required: true },
      { key: "stockQuantity", label: "Quantidade de embalagens em estoque", type: "number", inputMode: "numeric", placeholder: "2", required: true }
    ]
  },
  [CATEGORY_DISPOSABLES]: {
    helper: "Pacote/caixa ou unidade solta, com uso unitário.",
    defaultMeasure: MEASURE_UNIT,
    fields: [
      { key: "name", label: "Nome", type: "text", placeholder: "Ex: Luva, batoque, folha stencil", required: true },
      { key: "brand", label: "Marca", type: "text", placeholder: "Ex: Supermax" },
      { key: "purchaseMode", label: "Formato de compra", type: "select", required: true, options: [{ value: PURCHASE_MODE_BOX, label: "Comprado por pacote/caixa" }, { value: PURCHASE_MODE_SINGLE, label: "Comprado por unidade" }] },
      { key: "packageQuantity", label: "Qtd. no pacote/caixa", type: "number", inputMode: "numeric", placeholder: "100", required: true, visibleWhen: { key: "purchaseMode", value: PURCHASE_MODE_BOX } },
      { key: "packagePrice", label: "Preço do pacote", type: "currency", inputMode: "decimal", placeholder: "50,00", required: true, visibleWhen: { key: "purchaseMode", value: PURCHASE_MODE_BOX } },
      { key: "singleUnitPrice", label: "Preço unitário", type: "currency", inputMode: "decimal", placeholder: "4,50", required: true, visibleWhen: { key: "purchaseMode", value: PURCHASE_MODE_SINGLE } },
      { key: "stockQuantity", label: "Quantidade em estoque", type: "number", inputMode: "numeric", placeholder: "15", required: true }
    ]
  },
  [CATEGORY_CLEANING]: {
    helper: "Limpeza, transferência e finalização por uso, folha ou porção.",
    defaultMeasure: MEASURE_UNIT,
    fields: [
      { key: "name", label: "Nome", type: "text", placeholder: "Ex: Papel toalha, transfer, manteiga", required: true },
      { key: "brand", label: "Marca", type: "text", placeholder: "Ex: Hornet, Reilly, Spirit" },
      { key: "purchaseMode", label: "Formato de compra", type: "select", required: true, options: [{ value: PURCHASE_MODE_BOX, label: "Comprado por pacote/caixa" }, { value: PURCHASE_MODE_SINGLE, label: "Comprado por uso/unidade" }] },
      { key: "packageQuantity", label: "Qtd. no pacote/embalagem", type: "number", inputMode: "numeric", placeholder: "20", required: true, visibleWhen: { key: "purchaseMode", value: PURCHASE_MODE_BOX } },
      { key: "packagePrice", label: "Preço do pacote/embalagem", type: "currency", inputMode: "decimal", placeholder: "35,00", required: true, visibleWhen: { key: "purchaseMode", value: PURCHASE_MODE_BOX } },
      { key: "singleUnitPrice", label: "Preço por uso/unidade", type: "currency", inputMode: "decimal", placeholder: "3,00", required: true, visibleWhen: { key: "purchaseMode", value: PURCHASE_MODE_SINGLE } },
      { key: "stockQuantity", label: "Quantidade em estoque", type: "number", inputMode: "numeric", placeholder: "10", required: true }
    ]
  },
  [CATEGORY_LINEAR]: {
    helper: "Rolos medidos por metro.",
    defaultMeasure: MEASURE_METER,
    fields: [
      { key: "name", label: "Nome", type: "text", placeholder: "Ex: Plástico filme, bandagem", required: true },
      { key: "brand", label: "Marca", type: "text", placeholder: "Ex: Marca do rolo" },
      { key: "packageQuantity", label: "Tamanho do rolo em metros", type: "number", inputMode: "decimal", placeholder: "30", required: true },
      { key: "packagePrice", label: "Preço do rolo", type: "currency", inputMode: "decimal", placeholder: "25,00", required: true },
      { key: "stockQuantity", label: "Quantidade de rolos em estoque", type: "number", inputMode: "numeric", placeholder: "2", required: true }
    ]
  }
};

export function normalizeCategory(category) {
  return BUSINESS_CATEGORIES.includes(category) ? category : CATEGORY_NEEDLES;
}

export function isDecimalMeasure(measureUnit) {
  return [MEASURE_ML, MEASURE_GRAM, MEASURE_METER].includes(measureUnit);
}

export function getUsageRules(item) {
  const measureUnit = item?.unidadeMedida || item?.measureUnit || MEASURE_UNIT;
  const usesDecimal = isDecimalMeasure(measureUnit);
  return { step: usesDecimal ? DECIMAL_STEP : INTEGER_STEP, defaultValue: usesDecimal ? DECIMAL_STEP : INTEGER_STEP, inputMode: usesDecimal ? "decimal" : "numeric", integerOnly: !usesDecimal };
}

export function getMeasureLabel(measureUnit) {
  return ({ [MEASURE_UNIT]: "unidade", [MEASURE_ML]: "ml", [MEASURE_GRAM]: "g", [MEASURE_METER]: "metro" })[measureUnit] || measureUnit || "unidade";
}

export function getMeasureSuffix(measureUnit) {
  return ({ [MEASURE_UNIT]: "un", [MEASURE_ML]: "ml", [MEASURE_GRAM]: "g", [MEASURE_METER]: "m" })[measureUnit] || measureUnit || "un";
}

export function getItemSpecification(item) {
  if (!item) return "";
  if ((item.categoria || item.category) === CATEGORY_NEEDLES) return [item.marca || item.brand, item.linhaTipo || item.lineType, item.numeracao || item.numbering].filter(Boolean).join(" ");
  if ((item.categoria || item.category) === CATEGORY_INKS) return [item.marca || item.brand, item.cor || item.color].filter(Boolean).join(" · ");
  return [item.marca || item.brand, item.unidadeMedida || item.measureUnit].filter(Boolean).join(" · ");
}

export function buildItemName(category, data) {
  if (category === CATEGORY_NEEDLES) return [data.brand, data.lineType, data.numbering].map(clean).filter(Boolean).join(" ");
  return clean(data.name) || "Item sem nome";
}

export function normalizeItemPayload(category, data, normalizeNumber) {
  const singlePurchase = UNIT_PURCHASE_CATEGORIES.includes(category) && data.purchaseMode === PURCHASE_MODE_SINGLE;
  const measureUnit = data.measureUnit || CATEGORY_DEFINITIONS[category]?.defaultMeasure || MEASURE_UNIT;
  const packageQuantity = singlePurchase ? 1 : normalizeNumber(data.packageQuantity);
  const packagePrice = singlePurchase ? normalizeNumber(data.singleUnitPrice) : normalizeNumber(data.packagePrice);
  return {
    nome: buildItemName(category, data),
    categoria: category,
    marca: clean(data.brand),
    linhaTipo: clean(data.lineType),
    numeracao: clean(data.numbering),
    cor: clean(data.color),
    unidadeMedida: measureUnit,
    formatoCompra: data.purchaseMode || "",
    precoEmbalagem: packagePrice,
    quantidadeEmbalagem: packageQuantity,
    quantidadeAtual: normalizeNumber(data.stockQuantity),
    quantidadeMinima: normalizeNumber(data.minimumQuantity || 2)
  };
}

export function sanitizeUsageQuantity(item, rawValue, minimumValue, normalizeNumber) {
  const rules = getUsageRules(item);
  const quantity = Math.max(minimumValue, normalizeNumber(rawValue));
  return rules.integerOnly ? Math.max(minimumValue, Math.round(quantity)) : Math.round((quantity + Number.EPSILON) * 100) / 100;
}

export function adjustQuantity(item, currentValue, action, minimumValue, normalizeNumber) {
  const rules = getUsageRules(item);
  const signal = action === "decrease" ? -1 : 1;
  return sanitizeUsageQuantity(item, normalizeNumber(currentValue) + rules.step * signal, minimumValue, normalizeNumber);
}

export function getMinimumQuantity(item) {
  return getUsageRules(item).integerOnly ? INTEGER_STEP : DECIMAL_STEP;
}

function clean(value) {
  return String(value || "").trim();
}
