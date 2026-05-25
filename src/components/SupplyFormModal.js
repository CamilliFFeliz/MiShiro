import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";

import { colors, radii, shadows, spacing, typography } from "../styles/theme";
import { InputField } from "./InputField";
import { PrimaryButton } from "./PrimaryButton";

const EMPTY_SUPPLY_DRAFT = {
  name: "",
  category: "",
  packageQuantity: "",
  unitLabel: "",
  packagePrice: ""
};

export function SupplyFormModal({ isVisible, onClose, onSubmit }) {
  const [draft, setDraft] = useState(EMPTY_SUPPLY_DRAFT);

  function handleChange(fieldName, value) {
    setDraft((currentDraft) => ({
      ...currentDraft,
      [fieldName]: value
    }));
  }

  function handleSubmit() {
    onSubmit(draft);
    setDraft(EMPTY_SUPPLY_DRAFT);
    onClose();
  }

  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={isVisible}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.overlay}
      >
        <Pressable accessibilityRole="button" onPress={onClose} style={styles.backdrop} />
        <View style={styles.sheet}>
          <View style={styles.dragHandle} />
          <ScrollView
            contentContainerStyle={styles.sheetContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.title}>Novo insumo</Text>
            <Text style={styles.subtitle}>Cadastre o custo por pacote para o app calcular o uso por sessao.</Text>

            <View style={styles.formGrid}>
              <InputField
                label="Nome do material"
                onChangeText={(value) => handleChange("name", value)}
                placeholder="Ex.: Batoque grande"
                style={styles.fullField}
                value={draft.name}
              />
              <InputField
                label="Categoria"
                onChangeText={(value) => handleChange("category", value)}
                placeholder="Ex.: Descartaveis"
                style={styles.fieldColumn}
                value={draft.category}
              />
              <InputField
                label="Unidade"
                onChangeText={(value) => handleChange("unitLabel", value)}
                placeholder="un, ml, folhas"
                style={styles.fieldColumn}
                value={draft.unitLabel}
              />
              <InputField
                keyboardType="decimal-pad"
                label="Qtd. pacote"
                onChangeText={(value) => handleChange("packageQuantity", value)}
                placeholder="50"
                style={styles.fieldColumn}
                value={draft.packageQuantity}
              />
              <InputField
                keyboardType="decimal-pad"
                label="Preco pacote"
                onChangeText={(value) => handleChange("packagePrice", value)}
                placeholder="30"
                style={styles.fieldColumn}
                value={draft.packagePrice}
              />
            </View>

            <View style={styles.actions}>
              <PrimaryButton label="Cancelar" onPress={onClose} style={styles.actionButton} tone="quiet" />
              <PrimaryButton label="Adicionar" onPress={handleSubmit} style={styles.actionButton} />
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end"
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(16, 8, 34, 0.56)"
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    maxHeight: "88%",
    padding: spacing.lg,
    ...shadows.raised
  },
  sheetContent: {
    gap: spacing.lg,
    paddingBottom: spacing.sm
  },
  dragHandle: {
    alignSelf: "center",
    backgroundColor: colors.primary300,
    borderRadius: radii.pill,
    height: 5,
    width: 52
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "900"
  },
  subtitle: {
    color: colors.muted,
    fontSize: typography.body,
    lineHeight: 21
  },
  formGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md
  },
  fullField: {
    flexBasis: "100%",
    flexGrow: 1
  },
  fieldColumn: {
    flexBasis: "47%",
    flexGrow: 1,
    minWidth: 132
  },
  actions: {
    flexDirection: "row",
    gap: spacing.md
  },
  actionButton: {
    flex: 1
  }
});
