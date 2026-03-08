import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, FlatList, Modal, Alert, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useProductsStore } from '../store';
import { COLORS, FONTS, RADIUS, SHADOWS, SPACING } from '../constants/theme';
import { CategoryChip, StockBadge, Button, EmptyState } from '../components/ui';
import { CATEGORIES, Product } from '../types';
import * as DB from '../database/db';

const clp = (n: number) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(Math.round(n));

const EMOJI_OPTIONS = [
  // Panadería y dulces
  '🍪', '🧁', '🍰', '🎂', '🍩', '🍫', '🍬', '🍭', '🍦', '🍧', '🍨', '🧇', '🥐', '🍞', '🥖', '🥨',
  // Snacks y bebidas
  '🍿', '🥜', '🧃', '🥤', '☕', '🍵', '🧋', '🍺', '🥛', '🧉',
  // Alimentos frescos
  '🥩', '🍗', '🥚', '🧀', '🥕', '🍅', '🥦', '🌽', '🍎', '🍌', '🍋', '🥑', '🫙', '🥫',
  // Limpieza y hogar
  '🧴', '🧹', '🧺', '🧻', '🪣', '🧼', '🪥', '🫧',
  // Electrónica y papelería
  '💻', '📱', '🖥️', '🎧', '🖱️', '⌨️', '🖨️', '🔋', '📷', '📓', '📌', '📦',
  // Otros
  '🛒', '🎁', '🧸', '🪴', '🕯️', '🔑', '👕', '👟',
];

export default function ProductsScreen() {
  const { products, load, setSearch, setCategory, selectedCategory, search, filtered, refresh } = useProductsStore();
  const [modalVisible, setModalVisible] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [form, setForm] = useState({ name: '', category: 'Electrónica', price: '', cost: '', stock: '', minStock: '10', emoji: '📦' });
  const [restockProduct, setRestockProduct] = useState<Product | null>(null);
  const [restockQty, setRestockQty] = useState('');

  useFocusEffect(useCallback(() => { load(); }, []));

  const openAdd = () => {
    setEditProduct(null);
    setForm({ name: '', category: 'Electrónica', price: '', cost: '', stock: '', minStock: '10', emoji: '📦' });
    setModalVisible(true);
  };

  const openEdit = (p: Product) => {
    setEditProduct(p);
    setForm({
      name: p.name,
      category: p.category,
      price: p.price.toString(),
      cost: p.cost.toString(),
      stock: p.stock.toString(),
      minStock: p.minStock.toString(),
      emoji: p.emoji,
    });
    setModalVisible(true);
  };

  const handleSave = () => {
    if (!form.name.trim() || !form.price) {
      Alert.alert('Validación', 'El nombre y el precio son obligatorios');
      return;
    }
    const id = editProduct?.id ?? `p_${Date.now()}`;
    const productData = {
      id,
      name: form.name.trim(),
      category: form.category,
      price: parseFloat(form.price) || 0,
      cost: parseFloat(form.cost) || 0,
      stock: parseInt(form.stock) || 0,
      minStock: parseInt(form.minStock) || 10,
      emoji: form.emoji,
    };

    if (editProduct) {
      DB.updateProduct(productData);
    } else {
      DB.createProduct(productData);
    }
    refresh();
    setModalVisible(false);
  };

  const openRestock = (p: Product) => {
    setRestockProduct(p);
    setRestockQty('');
  };

  const handleRestock = () => {
    if (!restockProduct) return;
    const qty = parseInt(restockQty);
    if (!qty || qty <= 0) {
      Alert.alert('Inválido', 'Ingresa una cantidad válida');
      return;
    }
    DB.updateProduct({ ...restockProduct, stock: restockProduct.stock + qty });
    refresh();
    setRestockProduct(null);
  };

  const handleDelete = (p: Product) => {
    Alert.alert('Eliminar Producto', `¿Eliminar "${p.name}" del inventario?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: () => { DB.deleteProduct(p.id); refresh(); },
      },
    ]);
  };

  const displayedProducts = filtered();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Productos</Text>
          <Text style={styles.count}>{products.length} artículos</Text>
        </View>
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar productos..."
            placeholderTextColor={COLORS.text3}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Text style={{ color: COLORS.text3, fontSize: 16 }}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Category Chips */}
      <View style={styles.chipsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {CATEGORIES.map(cat => (
            <CategoryChip
              key={cat}
              label={cat}
              active={selectedCategory === cat}
              onPress={() => setCategory(cat)}
            />
          ))}
        </ScrollView>
      </View>

      {/* Products List */}
      <FlatList
        data={displayedProducts}
        keyExtractor={i => i.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState emoji="📭" title="Sin resultados" subtitle="Prueba otra búsqueda o categoría" />
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.productCard} onLongPress={() => openEdit(item)} activeOpacity={0.9}>
            <View style={[styles.productImg, { backgroundColor: getEmojiBackground(item.emoji) }]}>
              <Text style={{ fontSize: 26 }}>{item.emoji}</Text>
            </View>
            <View style={styles.productDetails}>
              <Text style={styles.productTitle} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.productCat}>{item.category}</Text>
              <View style={styles.productMeta}>
                <Text style={styles.productPrice}>{clp(item.price)}</Text>
                <StockBadge product={item} />
              </View>
            </View>
            <View style={styles.productActions}>
              <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(item)}>
                <Text style={{ color: COLORS.text3, fontSize: 13 }}>✏️</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.addBtn}
                onPress={() => openRestock(item)}
              >
                <Text style={styles.addBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        )}
      />

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={openAdd} activeOpacity={0.85}>
        <Text style={{ color: COLORS.white, fontSize: 26, lineHeight: 30 }}>+</Text>
      </TouchableOpacity>

      {/* Restock Modal */}
      <Modal visible={!!restockProduct} animationType="fade" transparent onRequestClose={() => setRestockProduct(null)}>
        <View style={styles.restockOverlay}>
          <View style={styles.restockCard}>
            <Text style={styles.restockTitle}>Ingresar Stock</Text>
            <View style={styles.restockProductRow}>
              <Text style={{ fontSize: 32 }}>{restockProduct?.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.restockProductName}>{restockProduct?.name}</Text>
                <Text style={styles.restockCurrent}>Stock actual: {restockProduct?.stock} unidades</Text>
              </View>
            </View>
            <Text style={styles.fieldLabel}>Unidades a ingresar</Text>
            <TextInput
              style={styles.textInput}
              placeholder="0"
              placeholderTextColor={COLORS.text3}
              keyboardType="number-pad"
              value={restockQty}
              onChangeText={setRestockQty}
              autoFocus
            />
            <View style={styles.row}>
              <Button label="Cancelar" onPress={() => setRestockProduct(null)} variant="secondary" style={{ flex: 1 }} />
              <Button label="Confirmar" onPress={handleRestock} style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      </Modal>

      {/* Add/Edit Modal */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{editProduct ? 'Editar Producto' : 'Nuevo Producto'}</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={{ color: COLORS.text3, fontSize: 22 }}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            {/* Emoji picker */}
            <Text style={styles.fieldLabel}>Emoji</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.emojiRow}>
              {EMOJI_OPTIONS.map(e => (
                <TouchableOpacity
                  key={e}
                  style={[styles.emojiOption, form.emoji === e && styles.emojiSelected]}
                  onPress={() => setForm(f => ({ ...f, emoji: e }))}
                >
                  <Text style={{ fontSize: 22 }}>{e}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.fieldLabel}>Nombre del Producto *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="ej. Café Premium"
              placeholderTextColor={COLORS.text3}
              value={form.name}
              onChangeText={v => setForm(f => ({ ...f, name: v }))}
            />

            <Text style={styles.fieldLabel}>Categoría</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {CATEGORIES.filter(c => c !== 'Todos').map(cat => (
                  <CategoryChip
                    key={cat}
                    label={cat}
                    active={form.category === cat}
                    onPress={() => setForm(f => ({ ...f, category: cat }))}
                  />
                ))}
              </View>
            </ScrollView>

            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Precio de Venta *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="0.00"
                  placeholderTextColor={COLORS.text3}
                  keyboardType="decimal-pad"
                  value={form.price}
                  onChangeText={v => setForm(f => ({ ...f, price: v }))}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Precio de Compra</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="0.00"
                  placeholderTextColor={COLORS.text3}
                  keyboardType="decimal-pad"
                  value={form.cost}
                  onChangeText={v => setForm(f => ({ ...f, cost: v }))}
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Stock</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="0"
                  placeholderTextColor={COLORS.text3}
                  keyboardType="number-pad"
                  value={form.stock}
                  onChangeText={v => setForm(f => ({ ...f, stock: v }))}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Stock Mínimo</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="10"
                  placeholderTextColor={COLORS.text3}
                  keyboardType="number-pad"
                  value={form.minStock}
                  onChangeText={v => setForm(f => ({ ...f, minStock: v }))}
                />
              </View>
            </View>

            <Button label={editProduct ? 'Guardar Cambios' : 'Añadir Producto'} onPress={handleSave} style={{ marginTop: 8 }} />

            {editProduct && (
              <Button
                label="Eliminar Producto"
                onPress={() => { setModalVisible(false); handleDelete(editProduct!); }}
                variant="danger"
                style={{ marginTop: 10 }}
              />
            )}
            <View style={{ height: 40 }} />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

function getEmojiBackground(emoji: string): string {
  const map: Record<string, string> = {
    '☕': '#FFF1EB', '💻': '#EEF2FF', '🎧': '#E6FBF5', '🖱️': '#FFF0F3',
    '📓': '#FFFAE6', '📱': '#F0FFF4', '🔋': '#EEF2FF', '🍵': '#E6FBF5',
    '📌': '#FFF1EB', '🧽': '#E6FBF5', '🥤': '#EEF2FF', '📷': '#FFF0F3',
  };
  return map[emoji] ?? COLORS.bluePale;
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: { fontFamily: FONTS.extraBold, fontSize: 22, color: COLORS.text },
  count: { fontFamily: FONTS.medium, fontSize: 12, color: COLORS.text3 },
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
  searchIcon: { fontSize: 14 },
  searchInput: {
    flex: 1,
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.text,
  },
  chipsContainer: {
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  chips: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: SPACING.xl,
    paddingVertical: 12,
  },
  list: { padding: SPACING.xl, gap: 10, paddingBottom: 100 },
  productCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
    marginBottom: 10,
  },
  productImg: {
    width: 56,
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productDetails: { flex: 1 },
  productTitle: { fontFamily: FONTS.semiBold, fontSize: 13, color: COLORS.text, marginBottom: 2 },
  productCat: { fontFamily: FONTS.regular, fontSize: 11, color: COLORS.text3, marginBottom: 6 },
  productMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  productPrice: { fontFamily: FONTS.bold, fontSize: 14, color: COLORS.text },
  productActions: { gap: 8, alignItems: 'center' },
  editBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.bg,
  },
  addBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: COLORS.bluePale,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnText: { color: COLORS.blue, fontSize: 20, fontFamily: FONTS.bold, lineHeight: 24 },
  fab: {
    position: 'absolute',
    bottom: 90,
    right: 20,
    width: 54,
    height: 54,
    borderRadius: 16,
    backgroundColor: COLORS.blue,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.blue,
  },
  // Modal
  modal: { flex: 1, backgroundColor: COLORS.white },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: { fontFamily: FONTS.extraBold, fontSize: 20, color: COLORS.text },
  modalBody: { paddingHorizontal: SPACING.xl, paddingTop: 16 },
  fieldLabel: { fontFamily: FONTS.semiBold, fontSize: 12, color: COLORS.text2, marginBottom: 6, marginTop: 4 },
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
  row: { flexDirection: 'row', gap: 12 },
  restockOverlay: {
    flex: 1,
    backgroundColor: 'rgba(13,17,23,0.55)',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
  },
  restockCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.xl,
    padding: SPACING.xxl,
    ...SHADOWS.lg,
  },
  restockTitle: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    color: COLORS.text,
    marginBottom: 16,
  },
  restockProductRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.bg,
    borderRadius: RADIUS.md,
    padding: 12,
    marginBottom: 16,
  },
  restockProductName: {
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    color: COLORS.text,
  },
  restockCurrent: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.text3,
    marginTop: 2,
  },
  emojiRow: { marginBottom: 16 },
  emojiOption: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  emojiSelected: {
    borderColor: COLORS.blue,
    backgroundColor: COLORS.bluePale,
  },
});
