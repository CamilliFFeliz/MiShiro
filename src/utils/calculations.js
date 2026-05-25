const CURRENCY_FORMATTER = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL"
});

const NUMBER_FORMATTER = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 2
});

export function normalizeNumber(value) {
  const normalizedValue = String(value ?? "").replace(",", ".");
  const parsedValue = Number(normalizedValue);

  if (!Number.isFinite(parsedValue) || parsedValue < 0) {
    return 0;
  }

  return parsedValue;
}

export function formatCurrency(value) {
  return CURRENCY_FORMATTER.format(Number.isFinite(value) ? value : 0);
}

export function formatQuantity(value) {
  return NUMBER_FORMATTER.format(Number.isFinite(value) ? value : 0);
}

export function getUnitCost(supply) {
  const packageQuantity = normalizeNumber(supply.packageQuantity);

  if (packageQuantity <= 0) {
    return 0;
  }

  return normalizeNumber(supply.packagePrice) / packageQuantity;
}

export function getSupplyUsageCost(supply, quantityUsed) {
  return getUnitCost(supply) * normalizeNumber(quantityUsed);
}

export function buildBudgetQuantities(supplies) {
  return supplies.reduce((quantities, supply) => {
    quantities[supply.id] = 0;
    return quantities;
  }, {});
}

export function calculateBudgetTotals(supplies, budgetQuantities, laborSettings) {
  const materialTotal = supplies.reduce((total, supply) => {
    return total + getSupplyUsageCost(supply, budgetQuantities[supply.id]);
  }, 0);

  const laborTotal = normalizeNumber(laborSettings.laborHours) * normalizeNumber(laborSettings.hourlyRate);
  const baseCost = materialTotal + laborTotal;
  const profitTotal = baseCost * (normalizeNumber(laborSettings.profitMarginPercent) / 100);
  const finalPrice = baseCost + profitTotal;
  const selectedItems = supplies.filter((supply) => normalizeNumber(budgetQuantities[supply.id]) > 0).length;

  return {
    materialTotal,
    laborTotal,
    baseCost,
    profitTotal,
    finalPrice,
    selectedItems
  };
}
