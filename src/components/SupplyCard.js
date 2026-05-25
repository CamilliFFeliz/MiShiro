import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors, radii, shadows, spacing, typography } from "../styles/theme";
import { formatCurrency, getUnitCost } from "../utils/calculations";
import { InputField } from "./InputField";
import { PrimaryButton } from "./PrimaryButton";

export function SupplyCard({ onRemove, onUpdate, supply }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.titleGroup}>
          <Text style={styles.category}>{supply.category}</Text>
          <Text numberOfLines={2} style={styles.name}>
            {supply.name}
          </Text>
        </View>
        <View style={styles.unitCostPill}>
          <Text style={styles.unitCostLabel}>Custo/un</Text>
          <Text style={styles.unitCostValue}>{formatCurrency(getUnitCost(supply))}</Text>
        </View>
      </View>

      <View style={styles.fieldGrid}>
        <InputField
          label="Material"
          onChangeText={(value) => onUpdate(supply.id, "name", value)}
          style={styles.fullField}
          value={supply.name}
        />
        <InputField
          label="Categoria"
          onChangeText={(value) => onUpdate(supply.id, "category", value)}
          style={styles.halfField}
          value={supply.category}
        />
        <InputField
          keyboardType="decimal-pad"
          label="Qtd. pacote"
          onChangeText={(value) => onUpdate(supply.id, "packageQuantity", value)}
          style={styles.halfField}
          value={supply.packageQuantity}
        />
        <InputField
          label="Unidade"
          onChangeText={(value) => onUpdate(supply.id, "unitLabel", value)}
          style={styles.halfField}
          value={supply.unitLabel}
        />
        <InputField
          keyboardType="decimal-pad"
          label="Preco pacote"
          onChangeText={(value) => onUpdate(supply.id, "packagePrice", value)}
          style={styles.wideField}
          value={supply.packagePrice}
        />
      </View>

      <PrimaryButton label="Remover insumo" onPress={() => onRemove(supply.id)} tone="danger" />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.lg,
    padding: spacing.lg,
    ...shadows.card
  },
  cardHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between"
  },
  titleGroup: {
    flex: 1
  },
  category: {
    color: colors.primary700,
    fontSize: typography.micro,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  name: {
    color: colors.text,
    fontSize: typography.subtitle,
    fontWeight: "900",
    lineHeight: 23,
    marginTop: spacing.xs
  },
  unitCostPill: {
    alignItems: "flex-end",
    backgroundColor: colors.primary50,
    borderRadius: radii.md,
    minWidth: 116,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  unitCostLabel: {
    color: colors.muted,
    fontSize: typography.micro,
    fontWeight: "800"
  },
  unitCostValue: {
    color: colors.primary800,
    fontSize: typography.body,
    fontWeight: "900",
    marginTop: spacing.xs
  },
  fieldGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md
  },
  fullField: {
    flexBasis: "100%",
    flexGrow: 1
  },
  halfField: {
    flexBasis: "47%",
    flexGrow: 1,
    minWidth: 132
  },
  wideField: {
    flexBasis: "100%",
    flexGrow: 1
  }
});
