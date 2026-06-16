export function calculateBudgetTotals(budget, context) {
  const budgetItems = Array.isArray(budget?.items) ? budget.items : [];
  const materialCost = budgetItems.reduce((total, cartItem) => {
    const inventoryItem = context.findInventoryItem(cartItem.inventoryItemId);
    return inventoryItem ? total + context.calculateLineSubtotal(inventoryItem, cartItem.quantityUsed) : total;
  }, 0);
  const hourlyRate = Math.max(context.normalizeNumber(budget?.hourlyRate), 0);
  const sessionDuration = Math.max(context.normalizeNumber(budget?.sessionDuration), 0);
  const profitMarginPercent = context.normalizePercent(budget?.profitMarginPercent);
  const discountPercent = context.normalizePercent(budget?.discountPercent);
  const laborCost = hourlyRate * sessionDuration;
  const totalCost = materialCost + laborCost;
  const marginCost = totalCost * (profitMarginPercent / 100);
  const suggestedPrice = totalCost + marginCost;
  const discountAmount = suggestedPrice * (discountPercent / 100);
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
