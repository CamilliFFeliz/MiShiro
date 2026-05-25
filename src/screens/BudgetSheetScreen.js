import React, { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from "react-native";

import { BudgetItemRow } from "../components/BudgetItemRow";
import { InputField } from "../components/InputField";
import { MetricCard } from "../components/MetricCard";
import { colors, radii, shadows, spacing, typography } from "../styles/theme";
import { formatCurrency, normalizeNumber } from "../utils/calculations";

export function BudgetSheetScreen({
  budgetQuantities,
  laborSettings,
  onChangeBudgetQuantity,
  onToggleBudgetItem,
  onUpdateLaborSetting,
  supplies,
  totals
}) {
  const [clientName, setClientName] = useState("");
  const [sessionNotes, setSessionNotes] = useState("");
  const { width } = useWindowDimensions();
  const isTablet = width >= 720;

  const selectedSupplies = useMemo(() => {
    return supplies.filter((supply) => normalizeNumber(budgetQuantities[supply.id]) > 0);
  }, [budgetQuantities, supplies]);

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.titleBlock}>
        <Text style={styles.screenTitle}>Ficha de orcamento</Text>
        <Text style={styles.screenDescription}>
          Selecione os insumos usados na sessao e ajuste mao de obra para fechar o valor em tempo real.
        </Text>
      </View>

      <View style={[styles.formPanel, isTablet && styles.tabletFormPanel]}>
        <InputField
          label="Cliente"
          onChangeText={setClientName}
          placeholder="Nome do cliente"
          style={isTablet && styles.flexField}
          value={clientName}
        />
        <InputField
          keyboardType="decimal-pad"
          label="Horas"
          onChangeText={(value) => onUpdateLaborSetting("laborHours", value)}
          style={isTablet && styles.compactField}
          value={laborSettings.laborHours}
        />
        <InputField
          keyboardType="decimal-pad"
          label="Valor/hora"
          onChangeText={(value) => onUpdateLaborSetting("hourlyRate", value)}
          style={isTablet && styles.compactField}
          value={laborSettings.hourlyRate}
        />
        <InputField
          keyboardType="decimal-pad"
          label="Margem (%)"
          onChangeText={(value) => onUpdateLaborSetting("profitMarginPercent", value)}
          style={isTablet && styles.compactField}
          value={laborSettings.profitMarginPercent}
        />
      </View>

      <View style={styles.notesPanel}>
        <Text style={styles.notesLabel}>Descricao da sessao</Text>
        <TextInput
          multiline
          onChangeText={setSessionNotes}
          placeholder="Tamanho, regiao do corpo, estilo, retoque previsto..."
          placeholderTextColor={colors.muted}
          selectionColor={colors.primary700}
          style={styles.notesInput}
          textAlignVertical="top"
          value={sessionNotes}
        />
      </View>

      <View style={styles.metricGrid}>
        <MetricCard label="Materiais" value={formatCurrency(totals.materialTotal)} />
        <MetricCard label="Mao de obra" value={formatCurrency(totals.laborTotal)} />
        <MetricCard label="Lucro" value={formatCurrency(totals.profitTotal)} tone="soft" />
        <MetricCard label="Cobrar" value={formatCurrency(totals.finalPrice)} tone="strong" />
      </View>

      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>Itens da sessao</Text>
          <Text style={styles.sectionSubtitle}>{totals.selectedItems} selecionados</Text>
        </View>
      </View>

      <View style={styles.itemList}>
        {supplies.map((supply) => (
          <BudgetItemRow
            key={supply.id}
            onChangeQuantity={onChangeBudgetQuantity}
            onToggle={onToggleBudgetItem}
            quantity={normalizeNumber(budgetQuantities[supply.id])}
            supply={supply}
          />
        ))}
      </View>

      <View style={styles.finalPanel}>
        <View style={styles.finalCopy}>
          <Text style={styles.finalLabel}>Resumo da ficha</Text>
          <Text style={styles.finalMeta}>
            {selectedSupplies.length} insumos + {laborSettings.laborHours}h de atendimento
          </Text>
        </View>
        <Text style={styles.finalValue}>{formatCurrency(totals.finalPrice)}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    gap: spacing.lg,
    paddingBottom: spacing.xxl,
    paddingTop: spacing.lg
  },
  titleBlock: {
    gap: spacing.xs
  },
  screenTitle: {
    color: colors.text,
    fontSize: typography.title,
    fontWeight: "900"
  },
  screenDescription: {
    color: colors.muted,
    fontSize: typography.body,
    lineHeight: 22
  },
  formPanel: {
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg,
    ...shadows.card
  },
  tabletFormPanel: {
    flexDirection: "row",
    flexWrap: "wrap"
  },
  flexField: {
    flex: 1,
    minWidth: 260
  },
  compactField: {
    width: 128
  },
  notesPanel: {
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.lg,
    ...shadows.card
  },
  notesLabel: {
    color: colors.text,
    fontSize: typography.small,
    fontWeight: "900"
  },
  notesInput: {
    color: colors.text,
    fontSize: typography.body,
    minHeight: 88,
    padding: 0
  },
  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md
  },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  sectionTitle: {
    color: colors.text,
    fontSize: typography.subtitle,
    fontWeight: "900"
  },
  sectionSubtitle: {
    color: colors.muted,
    fontSize: typography.small,
    fontWeight: "800",
    marginTop: spacing.xs
  },
  itemList: {
    gap: spacing.md
  },
  finalPanel: {
    alignItems: "center",
    backgroundColor: colors.primary950,
    borderRadius: radii.xl,
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
    padding: spacing.lg,
    ...shadows.raised
  },
  finalCopy: {
    flex: 1
  },
  finalLabel: {
    color: colors.primary100,
    fontSize: typography.small,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  finalMeta: {
    color: colors.primary300,
    fontSize: typography.small,
    fontWeight: "700",
    marginTop: spacing.xs
  },
  finalValue: {
    color: colors.white,
    flexShrink: 0,
    fontSize: 24,
    fontWeight: "900"
  }
});
