export function calculateBudgetTotals(budget, context) {
  const materialCost = budget.items.reduce((total, cartItem) => {
    const inventoryItem = context.findInventoryItem(cartItem.inventoryItemId);
    return inventoryItem ? total + context.calculateLineSubtotal(inventoryItem, cartItem.quantityUsed) : total;
  }, 0);
  const laborCost = context.normalizeNumber(budget.hourlyRate) * context.normalizeNumber(budget.sessionDuration);
  const totalCost = materialCost + laborCost;
  const marginCost = totalCost * (context.normalizeNumber(budget.profitMarginPercent) / 100);
  const suggestedPrice = totalCost + marginCost;
  const discountAmount = suggestedPrice * (context.normalizePercent(budget.discountPercent) / 100);
  const finalPrice = Math.max(suggestedPrice - discountAmount, 0);

  return {
    materialCost: context.roundMoneyValue(materialCost),
    laborCost: context.roundMoneyValue(laborCost),
    totalCost: context.roundMoneyValue(totalCost),
    marginCost: context.roundMoneyValue(marginCost),
    suggestedPrice: context.roundMoneyValue(suggestedPrice),
    discountAmount: context.roundMoneyValue(discountAmount),
    finalPrice: context.roundMoneyValue(finalPrice)
  };
}
