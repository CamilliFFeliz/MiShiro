import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, radii, shadows, spacing, typography } from "../styles/theme";

export function SegmentedNavigation({ activeTab, onChangeTab, tabs }) {
  return (
    <View style={styles.container}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;

        return (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
            hitSlop={8}
            key={tab.id}
            onPress={() => onChangeTab(tab.id)}
            style={[styles.tabButton, isActive && styles.activeTabButton]}
          >
            <Text style={[styles.tabLabel, isActive && styles.activeTabLabel]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: "stretch",
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderRadius: radii.lg,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginTop: -spacing.lg,
    padding: spacing.xs,
    ...shadows.card
  },
  tabButton: {
    alignItems: "center",
    borderRadius: radii.md,
    flex: 1,
    justifyContent: "center",
    minHeight: 46,
    paddingHorizontal: spacing.md
  },
  activeTabButton: {
    backgroundColor: colors.primary700
  },
  tabLabel: {
    color: colors.muted,
    fontSize: typography.body,
    fontWeight: "900"
  },
  activeTabLabel: {
    color: colors.white
  }
});
