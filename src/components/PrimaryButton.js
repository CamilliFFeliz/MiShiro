import React from "react";
import { Pressable, StyleSheet, Text } from "react-native";

import { colors, radii, shadows, spacing, typography } from "../styles/theme";

export function PrimaryButton({ label, onPress, tone = "primary", style }) {
  const isDanger = tone === "danger";
  const isQuiet = tone === "quiet";

  return (
    <Pressable
      accessibilityRole="button"
      hitSlop={8}
      onPress={onPress}
      style={[styles.button, isDanger && styles.dangerButton, isQuiet && styles.quietButton, style]}
    >
      <Text style={[styles.label, isDanger && styles.dangerLabel, isQuiet && styles.quietLabel]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    backgroundColor: colors.primary700,
    borderRadius: radii.md,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    ...shadows.raised
  },
  dangerButton: {
    backgroundColor: colors.dangerSoft,
    shadowOpacity: 0,
    elevation: 0
  },
  quietButton: {
    backgroundColor: colors.primary50,
    borderColor: colors.line,
    borderWidth: 1,
    shadowOpacity: 0,
    elevation: 0
  },
  label: {
    color: colors.white,
    fontSize: typography.body,
    fontWeight: "900"
  },
  dangerLabel: {
    color: colors.danger
  },
  quietLabel: {
    color: colors.primary800
  }
});
