import React from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { colors, radii, spacing, typography } from "../styles/theme";
import { formatCurrency, formatQuantity, getSupplyUsageCost, getUnitCost } from "../utils/calculations";

export function BudgetItemRow({ onChangeQuantity, onToggle, quantity, supply }) {
  const isSelected = quantity > 0;
  const usageTotal = getSupplyUsageCost(supply, quantity);

  return (
    <View style={[styles.row, isSelected && styles.selectedRow]}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: isSelected }}
        hitSlop={8}
        onPress={() => onToggle(supply.id)}
        style={[styles.checkButton, isSelected && styles.selectedCheckButton]}
      >
        <Text style={[styles.checkMark, isSelected && styles.selectedCheckMark]}>
          {isSelected ? "\u2713" : ""}
        </Text>
      </Pressable>

      <View style={styles.infoColumn}>
        <Text numberOfLines={1} style={styles.itemName}>
          {supply.name}
        </Text>
        <Text style={styles.itemMeta}>
          {formatCurrency(getUnitCost(supply))} por {supply.unitLabel}
        </Text>
      </View>

      <View style={styles.quantityGroup}>
        <TextInput
          keyboardType="decimal-pad"
          onChangeText={(value) => onChangeQuantity(supply.id, value)}
          placeholder="0"
          placeholderTextColor={colors.muted}
          selectionColor={colors.primary700}
          style={styles.quantityInput}
          value={quantity ? String(formatQuantity(quantity)) : ""}
        />
        <Text style={styles.quantityUnit}>{supply.unitLabel}</Text>
      </View>

      <Text style={styles.itemTotal}>{formatCurrency(usageTotal)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: "center",
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderRadius: radii.lg,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 76,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md
  },
  selectedRow: {
    backgroundColor: colors.primary50,
    borderColor: colors.primary300
  },
  checkButton: {
    alignItems: "center",
    borderColor: colors.line,
    borderRadius: radii.sm,
    borderWidth: 2,
    height: 30,
    justifyContent: "center",
    width: 30
  },
  selectedCheckButton: {
    backgroundColor: colors.primary700,
    borderColor: colors.primary700
  },
  checkMark: {
    color: colors.white,
    fontSize: typography.body,
    fontWeight: "900"
  },
  selectedCheckMark: {
    color: colors.white
  },
  infoColumn: {
    flex: 1,
    minWidth: 0
  },
  itemName: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: "900"
  },
  itemMeta: {
    color: colors.muted,
    fontSize: typography.small,
    fontWeight: "700",
    marginTop: spacing.xs
  },
  quantityGroup: {
    alignItems: "center",
    gap: spacing.xs,
    minWidth: 72
  },
  quantityInput: {
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderRadius: radii.md,
    borderWidth: 1,
    color: colors.text,
    fontSize: typography.body,
    fontWeight: "900",
    minHeight: 44,
    paddingHorizontal: spacing.sm,
    textAlign: "center",
    width: 70
  },
  quantityUnit: {
    color: colors.muted,
    fontSize: typography.micro,
    fontWeight: "800"
  },
  itemTotal: {
    color: colors.primary800,
    fontSize: typography.body,
    fontWeight: "900",
    minWidth: 76,
    textAlign: "right"
  }
});
