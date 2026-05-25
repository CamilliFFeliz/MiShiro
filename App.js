import React, { useMemo, useState } from "react";
import { SafeAreaView, StatusBar, StyleSheet, View } from "react-native";

import { AppHeader } from "./src/components/AppHeader";
import { SegmentedNavigation } from "./src/components/SegmentedNavigation";
import { DEFAULT_LABOR_SETTINGS, DEFAULT_SUPPLIES } from "./src/data/defaultSupplies";
import { BudgetSheetScreen } from "./src/screens/BudgetSheetScreen";
import { SuppliesScreen } from "./src/screens/SuppliesScreen";
import { colors, spacing } from "./src/styles/theme";
import {
  buildBudgetQuantities,
  calculateBudgetTotals,
  normalizeNumber
} from "./src/utils/calculations";

const SCREEN_TABS = [
  { id: "supplies", label: "Insumos" },
  { id: "budget", label: "Orcamento" }
];

export default function App() {
  const [activeScreen, setActiveScreen] = useState("budget");
  const [supplies, setSupplies] = useState(DEFAULT_SUPPLIES);
  const [budgetQuantities, setBudgetQuantities] = useState(() => buildBudgetQuantities(DEFAULT_SUPPLIES));
  const [laborSettings, setLaborSettings] = useState(DEFAULT_LABOR_SETTINGS);

  const totals = useMemo(
    () => calculateBudgetTotals(supplies, budgetQuantities, laborSettings),
    [budgetQuantities, laborSettings, supplies]
  );

  function handleAddSupply(supplyDraft) {
    const createdSupply = {
      id: `supply-${Date.now()}`,
      name: supplyDraft.name.trim() || "Novo insumo",
      category: supplyDraft.category.trim() || "Geral",
      packageQuantity: normalizeNumber(supplyDraft.packageQuantity),
      unitLabel: supplyDraft.unitLabel.trim() || "un",
      packagePrice: normalizeNumber(supplyDraft.packagePrice)
    };

    setSupplies((currentSupplies) => [createdSupply, ...currentSupplies]);
    setBudgetQuantities((currentQuantities) => ({
      ...currentQuantities,
      [createdSupply.id]: 0
    }));
  }

  function handleUpdateSupply(supplyId, fieldName, rawValue) {
    setSupplies((currentSupplies) =>
      currentSupplies.map((supply) => {
        if (supply.id !== supplyId) {
          return supply;
        }

        if (["packageQuantity", "packagePrice"].includes(fieldName)) {
          return {
            ...supply,
            [fieldName]: normalizeNumber(rawValue)
          };
        }

        return {
          ...supply,
          [fieldName]: rawValue
        };
      })
    );
  }

  function handleRemoveSupply(supplyId) {
    setSupplies((currentSupplies) => currentSupplies.filter((supply) => supply.id !== supplyId));
    setBudgetQuantities((currentQuantities) => {
      const nextQuantities = { ...currentQuantities };
      delete nextQuantities[supplyId];
      return nextQuantities;
    });
  }

  function handleChangeBudgetQuantity(supplyId, rawValue) {
    setBudgetQuantities((currentQuantities) => ({
      ...currentQuantities,
      [supplyId]: normalizeNumber(rawValue)
    }));
  }

  function handleToggleBudgetItem(supplyId) {
    setBudgetQuantities((currentQuantities) => {
      const currentQuantity = normalizeNumber(currentQuantities[supplyId]);

      return {
        ...currentQuantities,
        [supplyId]: currentQuantity > 0 ? 0 : 1
      };
    });
  }

  function handleUpdateLaborSetting(fieldName, rawValue) {
    setLaborSettings((currentSettings) => ({
      ...currentSettings,
      [fieldName]: normalizeNumber(rawValue)
    }));
  }

  const screenContent =
    activeScreen === "supplies" ? (
      <SuppliesScreen
        onAddSupply={handleAddSupply}
        onRemoveSupply={handleRemoveSupply}
        onUpdateSupply={handleUpdateSupply}
        supplies={supplies}
      />
    ) : (
      <BudgetSheetScreen
        budgetQuantities={budgetQuantities}
        laborSettings={laborSettings}
        onChangeBudgetQuantity={handleChangeBudgetQuantity}
        onToggleBudgetItem={handleToggleBudgetItem}
        onUpdateLaborSetting={handleUpdateLaborSetting}
        supplies={supplies}
        totals={totals}
      />
    );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary900} />
      <View style={styles.appContainer}>
        <AppHeader totals={totals} />
        <SegmentedNavigation activeTab={activeScreen} onChangeTab={setActiveScreen} tabs={SCREEN_TABS} />
        <View style={styles.screenContainer}>{screenContent}</View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.primary950
  },
  appContainer: {
    flex: 1,
    backgroundColor: colors.background
  },
  screenContainer: {
    flex: 1,
    paddingHorizontal: spacing.lg
  }
});
