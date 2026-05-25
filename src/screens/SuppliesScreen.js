import React, { useMemo, useState } from "react";
import { FlatList, StyleSheet, Text, TextInput, useWindowDimensions, View } from "react-native";

import { MetricCard } from "../components/MetricCard";
import { PrimaryButton } from "../components/PrimaryButton";
import { SupplyCard } from "../components/SupplyCard";
import { SupplyFormModal } from "../components/SupplyFormModal";
import { colors, spacing, typography } from "../styles/theme";
import { formatCurrency, getUnitCost } from "../utils/calculations";

export function SuppliesScreen({ onAddSupply, onRemoveSupply, onUpdateSupply, supplies }) {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const { width } = useWindowDimensions();
  const isTablet = width >= 720;
  const listColumns = isTablet ? 2 : 1;

  const filteredSupplies = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    if (!normalizedSearch) {
      return supplies;
    }

    return supplies.filter((supply) => {
      const searchableText = `${supply.name} ${supply.category} ${supply.unitLabel}`.toLowerCase();
      return searchableText.includes(normalizedSearch);
    });
  }, [searchTerm, supplies]);

  const averageUnitCost =
    supplies.length > 0
      ? supplies.reduce((total, supply) => total + getUnitCost(supply), 0) / supplies.length
      : 0;

  return (
    <View style={styles.screen}>
      <FlatList
        ListHeaderComponent={
          <View style={styles.headerContent}>
            <View style={styles.titleRow}>
              <View style={styles.titleCopy}>
                <Text style={styles.screenTitle}>Insumos</Text>
                <Text style={styles.screenDescription}>
                  Materiais, embalagens e descartaveis com custo por unidade sempre visivel.
                </Text>
              </View>
              <PrimaryButton label="+ Novo" onPress={() => setIsModalVisible(true)} style={styles.addButton} />
            </View>

            <View style={styles.metricRow}>
              <MetricCard label="Itens cadastrados" value={String(supplies.length)} tone="soft" />
              <MetricCard label="Media custo/un" value={formatCurrency(averageUnitCost)} />
            </View>

            <TextInput
              onChangeText={setSearchTerm}
              placeholder="Buscar material, categoria ou unidade"
              placeholderTextColor={colors.muted}
              selectionColor={colors.primary700}
              style={styles.searchInput}
              value={searchTerm}
            />
          </View>
        }
        columnWrapperStyle={isTablet ? styles.tabletColumnWrapper : undefined}
        contentContainerStyle={styles.listContent}
        data={filteredSupplies}
        key={listColumns}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        numColumns={listColumns}
        renderItem={({ item }) => (
          <View style={isTablet ? styles.tabletItem : styles.phoneItem}>
            <SupplyCard onRemove={onRemoveSupply} onUpdate={onUpdateSupply} supply={item} />
          </View>
        )}
        showsVerticalScrollIndicator={false}
      />

      <SupplyFormModal
        isVisible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
        onSubmit={onAddSupply}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1
  },
  listContent: {
    gap: spacing.lg,
    paddingBottom: spacing.xxl,
    paddingTop: spacing.lg
  },
  headerContent: {
    gap: spacing.lg
  },
  titleRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between"
  },
  titleCopy: {
    flex: 1
  },
  screenTitle: {
    color: colors.text,
    fontSize: typography.title,
    fontWeight: "900"
  },
  screenDescription: {
    color: colors.muted,
    fontSize: typography.body,
    lineHeight: 22,
    marginTop: spacing.xs
  },
  addButton: {
    minWidth: 96
  },
  metricRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md
  },
  searchInput: {
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderRadius: 16,
    borderWidth: 1,
    color: colors.text,
    fontSize: typography.body,
    minHeight: 52,
    paddingHorizontal: spacing.lg
  },
  phoneItem: {
    flex: 1
  },
  tabletItem: {
    flex: 1
  },
  tabletColumnWrapper: {
    gap: spacing.lg
  }
});
