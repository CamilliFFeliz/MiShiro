import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors, radii, spacing, typography } from "../styles/theme";
import { formatCurrency } from "../utils/calculations";

export function AppHeader({ totals }) {
  return (
    <View style={styles.header}>
      <View style={styles.brandRow}>
        <View style={styles.logoMark}>
          <Text style={styles.logoText}>CT</Text>
        </View>
        <View style={styles.brandCopy}>
          <Text style={styles.kicker}>CalculadoraTattoo</Text>
          <Text style={styles.title}>Orcamentos rapidos para estudio</Text>
        </View>
      </View>

      <View style={styles.totalPill}>
        <Text style={styles.totalLabel}>Valor sugerido</Text>
        <Text style={styles.totalValue}>{formatCurrency(totals.finalPrice)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: spacing.lg,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    backgroundColor: colors.primary950,
    borderBottomLeftRadius: radii.xl,
    borderBottomRightRadius: radii.xl
  },
  brandRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md
  },
  logoMark: {
    alignItems: "center",
    justifyContent: "center",
    width: 52,
    height: 52,
    borderRadius: radii.lg,
    backgroundColor: colors.primary700
  },
  logoText: {
    color: colors.white,
    fontSize: typography.subtitle,
    fontWeight: "900"
  },
  brandCopy: {
    flex: 1
  },
  kicker: {
    color: colors.primary300,
    fontSize: typography.small,
    fontWeight: "800",
    letterSpacing: 0,
    textTransform: "uppercase"
  },
  title: {
    color: colors.white,
    flexShrink: 1,
    fontSize: 24,
    fontWeight: "900",
    lineHeight: 29,
    marginTop: spacing.xs
  },
  totalPill: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md
  },
  totalLabel: {
    color: colors.muted,
    fontSize: typography.small,
    fontWeight: "800"
  },
  totalValue: {
    color: colors.primary800,
    fontSize: 26,
    fontWeight: "900",
    marginTop: spacing.xs
  }
});
