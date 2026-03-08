import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, Modal, Alert, ScrollView, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useProductsStore } from '../store';
import { COLORS, FONTS, RADIUS, SHADOWS, SPACING } from '../constants/theme';
import { CategoryChip, SectionHeader, Button, EmptyState } from '../components/ui';
import { Product, StockStatus, getStockStatus } from '../types';
import * as DB from '../database/db';

const FILTER_OPTIONS: { key: string; label: string; color: string }[] = [
  { key: 'all', label: 'Todos', color: COLORS.blue },
  { key: 'critical', label: '🔴 Crítico', color: COLORS.red },
  { key: 'low', label: '🟡 Stock Bajo', color: COLORS.yellow },
  { key: 'ok', label: '🟢 OK', color: COLORS.green },
];

export default function InventoryScreen() {
  const { products, load, refresh, search, setSearch } = useProductsStore();
  const [filter, setFilter] = useState('all');
  const [adjustProduct, setAdjustProduct] = useState<Product | null>(null);
  const [newStockValue, setNewStockValue] = useState('');
  const [adjustReason, setAdjustReason] = useState('Manual adjustment');

  useFocusEffect(useCallback(() => { load(); }, []));

  // Count stats
  const criticalCount = products.filter(p => getStockStatus(p) === 'critical').length;
  const lowCount = products.filter(p => getStockStatus(p) === 'low').length;
  const okCount = products.filter(p => getStockStatus(p) === 'ok').length;

  const filtered = products.filter(p => {
    const matchSearch = search === '' ||
      p.name.toLowerCase().includes(search.toLowerCase());
    const status = getStockStatus(p);
    const matchFilter = filter === 'all' || status === filter;
    return matchSearch && matchFilter;
  });

  const sorted = [...filtered].sort((a, b) => {
    const order: Record<StockStatus, number> = { critical: 0, low: 1, ok: 2 };
    return order[getStockStatus(a)] - order[getStockStatus(b)];
  });

  const handleAdjust = () => {
    if (!adjustProduct) return;
    const val = parseInt(newStockValue);
    if (isNaN(val) || val < 0) {
      Alert.alert('Inválido', 'Ingresa una cantidad válida');
      return;
    }
    DB.updateStock(adjustProduct.id, val, adjustReason);
    refresh();
    setAdjustProduct(null);
  };

  const openAdjust = (p: Product) => {
    setAdjustProduct(p);
    setNewStockValue(p.stock.toString());
    setAdjustReason('Ajuste manual');
  };

  const statusConfig: Record<StockStatus, { border: string; numColor: string; bg: string; btnBg: string; btnColor: string }> = {
    critical: { border: COLORS.red, numColor: COLORS.red, bg: 'transparent', btnBg: COLORS.redPale, btnColor: COLORS.redText },
    low: { border: COLORS.yellow, numColor: COLORS.yellowText, bg: 'transparent', btnBg: COLORS.yellowPale, btnColor: COLORS.yellowText },
    ok: { border: COLORS.green, numColor: COLORS.greenText, bg: 'transparent', btnBg: COLORS.greenPale, btnColor: COLORS.greenText },
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Inventario</Text>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={[styles.statNum, { color: COLORS.text }]}>{products.length}</Text>
            <Text style={styles.statLabel}>Total SKUs</Text>
          </View>
          <View style={[styles.stat, { backgroundColor: COLORS.yellowPale, borderColor: '#FFD966' }]}>
            <Text style={[styles.statNum, { color: COLORS.yellowText }]}>{lowCount}</Text>
            <Text style={styles.statLabel}>Stock Bajo</Text>
          </View>
          <View style={[styles.stat, { backgroundColor: COLORS.redPale, borderColor: '#FFB3C0' }]}>
            <Text style={[styles.statNum, { color: COLORS.red }]}>{criticalCount}</Text>
            <Text style={styles.statLabel}>Crítico</Text>
          </View>
          <View style={[styles.stat, { backgroundColor: COLORS.greenPale, borderColor: '#9FEFDA' }]}>
            <Text style={[styles.statNum, { color: COLORS.greenText }]}>{okCount}</Text>
            <Text style={styles.statLabel}>En Stock</Text>
          </View>
        </View>

        {/* Search */}
        <View style={styles.searchBar}>
          <Text style={{ fontSize: 14 }}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar inventario..."
            placeholderTextColor={COLORS.text3}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      {/* Filter chips */}
      <View style={styles.chipsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {FILTER_OPTIONS.map(opt => (
            <TouchableOpacity
              key={opt.key}
              style={[styles.filterChip, filter === opt.key && { backgroundColor: opt.color + '20', borderColor: opt.color }]}
              onPress={() => setFilter(opt.key)}
            >
              <Text style={[styles.filterChipText, filter === opt.key && { color: opt.color, fontFamily: FONTS.semiBold }]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Inventory List */}
      <FlatList
        data={sorted}
        keyExtractor={i => i.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={<EmptyState emoji="📦" title="Sin resultados" />}
        renderItem={({ item }) => {
          const status = getStockStatus(item);
          const cfg = statusConfig[status];
          const stockPct = Math.min(100, (item.stock / Math.max(item.minStock * 2, 1)) * 100);

          return (
            <View style={[styles.invItem, { borderLeftColor: cfg.border }]}>
              <View style={[styles.dot, { backgroundColor: cfg.border }]} />
              <View style={[styles.invEmoji, { backgroundColor: cfg.btnBg }]}>
                <Text style={{ fontSize: 20 }}>{item.emoji}</Text>
              </View>
              <View style={styles.invInfo}>
                <Text style={styles.invName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.invCat}>{item.category} · Min: {item.minStock}</Text>
              </View>
              <View style={styles.invRight}>
                <Text style={[styles.invStockNum, { color: cfg.numColor }]}>{item.stock}</Text>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${stockPct}%`, backgroundColor: cfg.border }]} />
                </View>
              </View>
              <TouchableOpacity
                style={[styles.adjustBtn, { backgroundColor: cfg.btnBg }]}
                onPress={() => openAdjust(item)}
              >
                <Text style={{ color: cfg.btnColor, fontSize: 16, fontFamily: FONTS.bold }}>+</Text>
              </TouchableOpacity>
            </View>
          );
        }}
      />

      {/* Adjust Modal */}
      <Modal visible={!!adjustProduct} animationType="slide" presentationStyle="pageSheet">
        {adjustProduct && (
          <SafeAreaView style={styles.modal}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Ajustar Stock</Text>
                <Text style={styles.modalSubtitle}>{adjustProduct.emoji} {adjustProduct.name}</Text>
              </View>
              <TouchableOpacity onPress={() => setAdjustProduct(null)}>
                <Text style={{ color: COLORS.text3, fontSize: 22 }}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={{ padding: SPACING.xl }}>
              {/* Current stock info */}
              <View style={styles.currentStockCard}>
                <View style={styles.currentStockItem}>
                  <Text style={styles.currentStockLabel}>Actual</Text>
                  <Text style={[styles.currentStockVal, { color: COLORS.text }]}>{adjustProduct.stock}</Text>
                </View>
                <View style={styles.currentStockItem}>
                  <Text style={styles.currentStockLabel}>Mínimo</Text>
                  <Text style={[styles.currentStockVal, { color: COLORS.yellowText }]}>{adjustProduct.minStock}</Text>
                </View>
                <View style={styles.currentStockItem}>
                  <Text style={styles.currentStockLabel}>Estado</Text>
                  <Text style={[styles.currentStockVal, { color: statusConfig[getStockStatus(adjustProduct)].numColor }]}>
                    {({ ok: 'OK', low: 'Bajo', critical: 'Crítico' } as Record<string, string>)[getStockStatus(adjustProduct)]}
                  </Text>
                </View>
              </View>

              {/* Quick adjust buttons */}
              <Text style={styles.fieldLabel}>Ajuste Rápido</Text>
              <View style={styles.quickRow}>
                {[-10, -5, -1, +1, +5, +10, +20, +50].map(delta => (
                  <TouchableOpacity
                    key={delta}
                    style={[styles.quickBtn, delta > 0 ? styles.quickBtnPos : styles.quickBtnNeg]}
                    onPress={() => setNewStockValue(v => Math.max(0, parseInt(v || '0') + delta).toString())}
                  >
                    <Text style={[styles.quickBtnText, delta > 0 ? { color: COLORS.greenText } : { color: COLORS.redText }]}>
                      {delta > 0 ? `+${delta}` : delta}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.fieldLabel}>Nueva Cantidad</Text>
              <TextInput
                style={styles.textInput}
                value={newStockValue}
                onChangeText={setNewStockValue}
                keyboardType="number-pad"
                placeholder="0"
                placeholderTextColor={COLORS.text3}
              />

              <Text style={styles.fieldLabel}>Motivo</Text>
              <TextInput
                style={[styles.textInput, { height: 80, textAlignVertical: 'top' }]}
                value={adjustReason}
                onChangeText={setAdjustReason}
                multiline
                placeholder="Motivo del ajuste..."
                placeholderTextColor={COLORS.text3}
              />

              <Button label="Guardar Ajuste" onPress={handleAdjust} />
            </View>
          </SafeAreaView>
        )}
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.white },
  header: {
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.xl,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: { fontFamily: FONTS.extraBold, fontSize: 22, color: COLORS.text, marginBottom: 12 },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  stat: {
    flex: 1,
    backgroundColor: COLORS.bg,
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statNum: { fontFamily: FONTS.extraBold, fontSize: 18, lineHeight: 22, marginBottom: 2 },
  statLabel: { fontFamily: FONTS.medium, fontSize: 9, color: COLORS.text3 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.bg,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchInput: { flex: 1, fontFamily: FONTS.regular, fontSize: 13, color: COLORS.text },
  chipsContainer: {
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  chips: { flexDirection: 'row', gap: 8, paddingHorizontal: SPACING.xl, paddingVertical: 10 },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  filterChipText: { fontFamily: FONTS.medium, fontSize: 12, color: COLORS.text2 },
  list: { padding: SPACING.xl, gap: 8, paddingBottom: 100 },
  invItem: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: 12,
    paddingLeft: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderLeftWidth: 3,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 8,
    ...SHADOWS.sm,
  },
  dot: { width: 6, height: 6, borderRadius: 3, flexShrink: 0 },
  invEmoji: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  invInfo: { flex: 1 },
  invName: { fontFamily: FONTS.semiBold, fontSize: 13, color: COLORS.text, marginBottom: 2 },
  invCat: { fontFamily: FONTS.regular, fontSize: 11, color: COLORS.text3 },
  invRight: { alignItems: 'flex-end', gap: 6 },
  invStockNum: { fontFamily: FONTS.bold, fontSize: 18, lineHeight: 20 },
  progressBar: {
    width: 60,
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 2 },
  adjustBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modal: { flex: 1, backgroundColor: COLORS.white },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: SPACING.xl,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: { fontFamily: FONTS.extraBold, fontSize: 20, color: COLORS.text },
  modalSubtitle: { fontFamily: FONTS.medium, fontSize: 13, color: COLORS.text2, marginTop: 2 },
  currentStockCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.bg,
    borderRadius: RADIUS.md,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  currentStockItem: { flex: 1, alignItems: 'center' },
  currentStockLabel: { fontFamily: FONTS.medium, fontSize: 11, color: COLORS.text3, marginBottom: 4 },
  currentStockVal: { fontFamily: FONTS.bold, fontSize: 20 },
  fieldLabel: { fontFamily: FONTS.semiBold, fontSize: 12, color: COLORS.text2, marginBottom: 8 },
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  quickBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  quickBtnPos: { backgroundColor: COLORS.greenPale, borderColor: '#9FEFDA' },
  quickBtnNeg: { backgroundColor: COLORS.redPale, borderColor: '#FFB3C0' },
  quickBtnText: { fontFamily: FONTS.bold, fontSize: 13 },
  textInput: {
    backgroundColor: COLORS.bg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.text,
    marginBottom: 16,
  },
});
