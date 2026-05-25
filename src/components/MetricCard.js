import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors, radii, shadows, spacing, typography } from "../styles/theme";

export function MetricCard({ label, value, tone = "light" }) {
  const isStrong = tone === "strong";
  const isSoft = tone === "soft";

  return (
    <View style={[styles.card, isStrong && styles.strongCard, isSoft && styles.softCard]}>
      <Text style={[styles.label, isStrong && styles.strongLabel]}>{label}</Text>
      <Text style={[styles.value, isStrong && styles.strongValue]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderRadius: radii.lg,
    borderWidth: 1,
    flexGrow: 1,
    minWidth: 148,
    padding: spacing.lg,
    ...shadows.card
  },
  softCard: {
    backgroundColor: colors.primary50
  },
  strongCard: {
    backgroundColor: colors.primary800,
    borderColor: colors.primary800
  },
  label: {
    color: colors.muted,
    fontSize: typography.small,
    fontWeight: "800"
  },
  strongLabel: {
    color: colors.primary100
  },
  value: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "900",
    marginTop: spacing.sm
  },
  strongValue: {
    color: colors.white
  }
});
