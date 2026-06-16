export function calculateRawUnitCost(price, quantity, normalizeNumber) {
  const normalizedPrice = Math.max(normalizeNumber(price), 0);
  const normalizedQuantity = Math.max(normalizeNumber(quantity), 0);

  if (normalizedPrice <= 0 || normalizedQuantity <= 0) {
    return 0;
  }

  return normalizedPrice / normalizedQuantity;
}

export function calculateUnitCost(item, context) {
  const packagePrice = context.normalizeNumber(item?.packagePrice);
  const packageQuantity = context.normalizeNumber(item?.packageQuantity);

  if (context.unitPurchaseCategories.includes(item?.category) && item?.purchaseMode === context.purchaseModeSingle) {
    return Math.max(packagePrice, 0);
  }

  if (context.supportedCategories.includes(item?.category)) {
    return calculateRawUnitCost(packagePrice, packageQuantity, context.normalizeNumber);
  }

  return calculateRawUnitCost(packagePrice, packageQuantity, context.normalizeNumber);
}

export function calculateTotalInventoryValue(item, normalizeNumber) {
  const packagePrice = Math.max(normalizeNumber(item?.packagePrice), 0);
  const stockQuantity = Math.max(normalizeNumber(item?.stockQuantity), 0);
  return packagePrice * stockQuantity;
}

export function calculateLineSubtotal(item, quantityUsed, context) {
  const safeQuantityUsed = Math.max(context.normalizeNumber(quantityUsed), 0);
  return calculateUnitCost(item, context) * safeQuantityUsed;
}
