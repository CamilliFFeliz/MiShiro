export function normalizeNumber(value) {
  const rawValue = String(value == null ? "" : value).trim();
  const numericText = rawValue.replace(/\s/g, "").replace(/[R$]/g, "");
  const lastCommaIndex = numericText.lastIndexOf(",");
  const lastDotIndex = numericText.lastIndexOf(".");
  let normalizedValue = numericText;

  if (lastCommaIndex > -1 && lastDotIndex > -1) {
    normalizedValue = lastCommaIndex > lastDotIndex
      ? numericText.replace(/\./g, "").replace(",", ".")
      : numericText.replace(/,/g, "");
  } else if (lastCommaIndex > -1) {
    normalizedValue = numericText.replace(",", ".");
  }

  const parsedValue = Number(normalizedValue);

  if (!Number.isFinite(parsedValue) || parsedValue < 0) {
    return 0;
  }

  return parsedValue;
}

export function calculateUnitCost(inventoryItem) {
  const packageQuantity = normalizeNumber(inventoryItem.packageQuantity);
  const packagePrice = normalizeNumber(inventoryItem.packagePrice ?? inventoryItem.purchasePrice);
  const categoryName = normalizeCategoryName(inventoryItem.category);

  if (["cartucho", "cartuchos"].includes(categoryName)) {
    return packagePrice;
  }

  if (packageQuantity <= 0) {
    return 0;
  }

  return packagePrice / packageQuantity;
}

function normalizeCategoryName(categoryName) {
  return String(categoryName || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

export function calculateMaterialCost(inventoryItem, quantityUsed) {
  return calculateUnitCost(inventoryItem) * normalizeNumber(quantityUsed);
}

export function calculateTotalCost({ inventoryData = [], projectData = {} } = {}) {
  const materialUsage = projectData.materialUsage || {};
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
    .filter((projectItem) => projectItem.quantityUsed > 0);

  const materialTotal = selectedItems.reduce((total, projectItem) => total + projectItem.materialCost, 0);
  const laborHours = normalizeNumber(projectData.laborHours);
  const hourlyRate = normalizeNumber(projectData.hourlyRate);
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
