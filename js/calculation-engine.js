export function normalizeNumber(value) {
  const normalizedValue = String(value == null ? "" : value).replace(",", ".").trim();
  const parsedValue = Number(normalizedValue);

  if (!Number.isFinite(parsedValue) || parsedValue < 0) {
    return 0;
  }

  return parsedValue;
}

export function calculateUnitCost(inventoryItem) {
  const packageQuantity = normalizeNumber(inventoryItem.packageQuantity);
  const packagePrice = normalizeNumber(inventoryItem.packagePrice);

  if (packageQuantity <= 0) {
    return 0;
  }

  return packagePrice / packageQuantity;
}

export function calculateMaterialCost(inventoryItem, quantityUsed) {
  return calculateUnitCost(inventoryItem) * normalizeNumber(quantityUsed);
}

export function calculateTotalCost({ inventoryData, budgetSheet }) {
  const materialUsage = budgetSheet.materialUsage || {};
  const selectedItems = inventoryData
    .map((inventoryItem) => {
      const quantityUsed = normalizeNumber(materialUsage[inventoryItem.id]);
      const unitCost = calculateUnitCost(inventoryItem);
      const materialCost = calculateMaterialCost(inventoryItem, quantityUsed);

      return {
        inventoryItem,
        quantityUsed,
        unitCost,
        materialCost
      };
    })
    .filter((budgetItem) => budgetItem.quantityUsed > 0);

  const materialTotal = selectedItems.reduce((total, budgetItem) => total + budgetItem.materialCost, 0);
  const laborHours = normalizeNumber(budgetSheet.laborHours);
  const hourlyRate = normalizeNumber(budgetSheet.hourlyRate);
  const laborTotal = laborHours * hourlyRate;

  return {
    selectedItems,
    selectedItemCount: selectedItems.length,
    materialTotal,
    laborHours,
    hourlyRate,
    laborTotal,
    totalCost: materialTotal + laborTotal
  };
}
