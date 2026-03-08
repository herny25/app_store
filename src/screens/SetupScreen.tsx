import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useSettingsStore } from '../store';
import { COLORS, FONTS, RADIUS, SHADOWS, SPACING } from '../constants/theme';

export default function SetupScreen() {
  const { save } = useSettingsStore();
  const [storeName, setStoreName] = useState('');
  const [ownerName, setOwnerName] = useState('');

  const canSave = storeName.trim().length > 0 && ownerName.trim().length > 0;

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo area */}
        <View style={styles.logoArea}>
          <View style={styles.logoIcon}>
            <Text style={styles.logoEmoji}>🏪</Text>
          </View>
          <Text style={styles.appName}>RetailFlow</Text>
          <Text style={styles.tagline}>Tu punto de venta inteligente</Text>
        </View>

        {/* Form card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Configura tu tienda</Text>
          <Text style={styles.cardSubtitle}>
            Solo tardarás un momento. Puedes cambiar esto después.
          </Text>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Nombre de la tienda</Text>
            <TextInput
              style={styles.input}
              placeholder="ej. Tienda La Esquina"
              placeholderTextColor={COLORS.text3}
              value={storeName}
              onChangeText={setStoreName}
              autoCapitalize="words"
              returnKeyType="next"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Tu nombre</Text>
            <TextInput
              style={styles.input}
              placeholder="ej. María García"
              placeholderTextColor={COLORS.text3}
              value={ownerName}
              onChangeText={setOwnerName}
              autoCapitalize="words"
              returnKeyType="done"
              onSubmitEditing={() => canSave && save(storeName, ownerName)}
            />
          </View>

          <TouchableOpacity
            style={[styles.btn, !canSave && styles.btnDisabled]}
            onPress={() => save(storeName, ownerName)}
            disabled={!canSave}
            activeOpacity={0.85}
          >
            <Text style={styles.btnText}>Comenzar</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.blue,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
    paddingVertical: 48,
  },

  // Logo
  logoArea: {
    alignItems: 'center',
    marginBottom: 36,
  },
  logoIcon: {
    width: 72,
    height: 72,
    borderRadius: RADIUS.xl,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  logoEmoji: {
    fontSize: 34,
  },
  appName: {
    fontFamily: FONTS.extraBold,
    fontSize: 30,
    color: COLORS.white,
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  tagline: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
  },

  // Card
  card: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.xl,
    padding: SPACING.xxl,
    ...SHADOWS.lg,
  },
  cardTitle: {
    fontFamily: FONTS.bold,
    fontSize: 20,
    color: COLORS.text,
    marginBottom: 6,
  },
  cardSubtitle: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.text3,
    marginBottom: 28,
    lineHeight: 19,
  },

  // Form
  fieldGroup: {
    marginBottom: 18,
  },
  label: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: COLORS.text2,
    marginBottom: 6,
  },
  input: {
    height: 48,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 14,
    fontFamily: FONTS.regular,
    fontSize: 15,
    color: COLORS.text,
    backgroundColor: COLORS.bg,
  },

  // Button
  btn: {
    marginTop: 8,
    height: 52,
    backgroundColor: COLORS.blue,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.blue,
  },
  btnDisabled: {
    backgroundColor: COLORS.text3,
    shadowOpacity: 0,
    elevation: 0,
  },
  btnText: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: COLORS.white,
  },
});
