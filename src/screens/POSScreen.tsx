import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  FlatList, ScrollView, Modal, Alert, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useCartStore, useProductsStore } from '../store';
import { COLORS, FONTS, RADIUS, SHADOWS, SPACING } from '../constants/theme';
import { EmptyState } from '../components/ui';
import { Button } from '../components/ui';
import { CATEGORIES, PaymentMethod } from '../types';
import * as DB from '../database/db';

const PAYMENT_METHODS: { key: PaymentMethod; label: string; icon: string }[] = [
  { key: 'card', label: 'Tarjeta', icon: '💳' },
  { key: 'cash', label: 'Efectivo', icon: '💵' },
  { key: 'transfer', label: 'Transferencia', icon: '🏦' },
];

type ActiveTab = 'products' | 'cart';

export default function POSScreen() {
  const cart = useCartStore();
  const { load, setSearch, setCategory, selectedCategory, search, filtered } = useProductsStore();
  const [activeTab, setActiveTab] = useState<ActiveTab>('products');
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('card');
  const [checkoutVisible, setCheckoutVisible] = useState(false);
  const [successVisible, setSuccessVisible] = useState(false);
  const [lastSaleNumber, setLastSaleNumber] = useState(0);
  const [lastTotal, setLastTotal] = useState(0);

  useFocusEffect(useCallback(() => { load(); }, []));

  const displayedProducts = filtered();
  const itemCount = cart.itemCount();

  const fmt = (n: number) =>
    new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(Math.round(n));

  const handleAddItem = (item: Parameters<typeof cart.addItem>[0]) => {
    cart.addItem(item);
  };

  const handleCheckout = () => {
    if (cart.items.length === 0) {
      Alert.alert('Carrito vacío', 'Añade productos antes de pagar');
      return;
    }
    setCheckoutVisible(true);
  };

  const handlePayment = () => {
    // Validar stock actualizado antes de cobrar
    const stockErrors: string[] = [];
    for (const cartItem of cart.items) {
      const current = DB.getProductById(cartItem.product.id);
      if (current && current.stock < cartItem.quantity) {
        stockErrors.push(`${cartItem.product.name}: solo ${current.stock} en stock`);
      }
    }
    if (stockErrors.length > 0) {
      Alert.alert('Stock insuficiente', stockErrors.join('\n'));
      return;
    }

    const total = cart.total();
    const sale = cart.checkout(selectedMethod);
    setLastSaleNumber(sale.saleNumber);
    setLastTotal(total);
    setCheckoutVisible(false);
    setSuccessVisible(false);
    setTimeout(() => setSuccessVisible(true), 100);
  };

  const handleNewSale = () => {
    setSuccessVisible(false);
    setActiveTab('products');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.dark} />

      {/* ── Header ── */}
      <SafeAreaView style={styles.headerSafe} edges={['top']}>
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>Venta Rápida</Text>
            <TouchableOpacity
              style={styles.orderBadge}
              onPress={() => Alert.alert(
                'Nuevo Pedido',
                '¿Limpiar el pedido actual?',
                [{ text: 'Cancelar', style: 'cancel' }, { text: 'Limpiar', style: 'destructive', onPress: () => { cart.clearCart(); setActiveTab('products'); } }]
              )}
              activeOpacity={0.75}
            >
              <Text style={styles.orderBadgeText}>+ Nuevo Pedido</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.searchBar}>
            <Text style={{ fontSize: 14 }}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Escanear o buscar producto..."
              placeholderTextColor="rgba(255,255,255,0.4)"
              value={search}
              onChangeText={setSearch}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 16 }}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* ── Tab bar ── */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'products' && styles.tabActive]}
            onPress={() => setActiveTab('products')}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, activeTab === 'products' && styles.tabTextActive]}>
              📦  Productos
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'cart' && styles.tabActive]}
            onPress={() => setActiveTab('cart')}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, activeTab === 'cart' && styles.tabTextActive]}>
              🛒  Carrito
            </Text>
            {itemCount > 0 && (
              <View style={styles.tabBadge}>
                <Text style={styles.tabBadgeText}>{itemCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* ── Panel: Productos ── */}
      {activeTab === 'products' && (
        <View style={styles.productsPanel}>
          {/* Category chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.chipsBar}
            contentContainerStyle={styles.chips}
          >
            {CATEGORIES.map(cat => (
              <TouchableOpacity
                key={cat}
                style={[styles.darkChip, selectedCategory === cat && styles.darkChipActive]}
                onPress={() => setCategory(cat)}
              >
                <Text style={[styles.darkChipText, selectedCategory === cat && styles.darkChipTextActive]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Product grid */}
          <FlatList
            data={displayedProducts}
            keyExtractor={i => i.id}
            numColumns={2}
            columnWrapperStyle={styles.gridRow}
            contentContainerStyle={styles.gridContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={{ alignItems: 'center', paddingTop: 48 }}>
                <Text style={{ fontSize: 40, marginBottom: 8 }}>🔍</Text>
                <Text style={{ fontFamily: FONTS.semiBold, fontSize: 15, color: COLORS.white }}>Sin resultados</Text>
              </View>
            }
            renderItem={({ item }) => {
              const inCart = cart.items.find(ci => ci.product.id === item.id);
              return (
                <TouchableOpacity
                  style={[styles.productCard, inCart && styles.productCardSelected]}
                  onPress={() => handleAddItem(item)}
                  activeOpacity={0.8}
                >
                  {inCart && (
                    <View style={styles.cartBadge}>
                      <Text style={styles.cartBadgeText}>{inCart.quantity}</Text>
                    </View>
                  )}
                  <Text style={styles.productEmoji}>{item.emoji}</Text>
                  <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
                  <Text style={styles.productPrice}>{fmt(item.price)}</Text>
                </TouchableOpacity>
              );
            }}
          />

          {/* Floating cart button when items in cart */}
          {itemCount > 0 && (
            <TouchableOpacity
              style={styles.floatingCartBtn}
              onPress={() => setActiveTab('cart')}
              activeOpacity={0.9}
            >
              <Text style={styles.floatingCartText}>🛒  Ver carrito · {fmt(cart.total())}</Text>
              <View style={styles.floatingCartBadge}>
                <Text style={styles.floatingCartBadgeText}>{itemCount}</Text>
              </View>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* ── Panel: Carrito ── */}
      {activeTab === 'cart' && (
        <View style={styles.cartPanel}>
          {cart.items.length === 0 ? (
            <View style={styles.emptyCart}>
              <Text style={{ fontSize: 48, marginBottom: 12 }}>🛒</Text>
              <Text style={styles.emptyCartTitle}>Carrito vacío</Text>
              <Text style={styles.emptyCartSub}>Añade productos desde la pestaña Productos</Text>
              <TouchableOpacity style={styles.goToProductsBtn} onPress={() => setActiveTab('products')}>
                <Text style={styles.goToProductsBtnText}>Ir a Productos →</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <ScrollView
              style={styles.cartScroll}
              contentContainerStyle={styles.cartScrollContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Cart header */}
              <View style={styles.cartHeaderRow}>
                <Text style={styles.cartTitle}>Artículos ({itemCount})</Text>
              </View>

              {/* Items */}
              {cart.items.map(item => (
                <View key={item.product.id} style={styles.cartItem}>
                  <Text style={styles.cartItemEmoji}>{item.product.emoji}</Text>
                  <View style={styles.cartItemInfo}>
                    <Text style={styles.cartItemName} numberOfLines={1}>{item.product.name}</Text>
                    <Text style={styles.cartItemUnit}>{fmt(item.product.price)} c/u</Text>
                  </View>
                  <View style={styles.qtyControl}>
                    <TouchableOpacity
                      style={styles.qtyBtn}
                      onPress={() => cart.updateQuantity(item.product.id, item.quantity - 1)}
                    >
                      <Text style={styles.qtyBtnText}>−</Text>
                    </TouchableOpacity>
                    <Text style={styles.qtyNum}>{item.quantity}</Text>
                    <TouchableOpacity
                      style={styles.qtyBtn}
                      onPress={() => cart.updateQuantity(item.product.id, item.quantity + 1)}
                    >
                      <Text style={styles.qtyBtnText}>+</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.cartItemPrice}>{fmt(item.product.price * item.quantity)}</Text>
                </View>
              ))}

              {/* Divider */}
              <View style={styles.divider} />

              {/* Totals */}
              <View style={styles.totalsCard}>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Subtotal</Text>
                  <Text style={styles.totalValue}>{fmt(cart.subtotal())}</Text>
                </View>
                <View style={[styles.totalRow, styles.totalFinalRow]}>
                  <Text style={styles.totalFinalLabel}>Total a pagar</Text>
                  <Text style={styles.totalFinalValue}>{fmt(cart.total())}</Text>
                </View>
              </View>

              {/* Checkout button */}
              <TouchableOpacity style={styles.checkoutBtn} onPress={handleCheckout} activeOpacity={0.85}>
                <Text style={styles.checkoutBtnText}>Confirmar y Pagar  →</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>
      )}

      {/* ── Checkout Modal ── */}
      <Modal visible={checkoutVisible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.checkoutModal}>
          <View style={styles.checkoutModalHeader}>
            <Text style={styles.checkoutModalTitle}>Confirmar Pago</Text>
            <TouchableOpacity onPress={() => setCheckoutVisible(false)}>
              <Text style={{ color: COLORS.text3, fontSize: 22 }}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: SPACING.xl }}>
            <View style={styles.paymentSummary}>
              <View style={styles.paymentRow}>
                <Text style={styles.paymentLabel}>Artículos ({cart.itemCount()})</Text>
                <Text style={styles.paymentValue}>{fmt(cart.subtotal())}</Text>
              </View>
              <View style={[styles.paymentRow, styles.paymentTotalRow]}>
                <Text style={styles.paymentTotalLabel}>Total a pagar</Text>
                <Text style={styles.paymentTotalValue}>{fmt(cart.total())}</Text>
              </View>
            </View>

            <Text style={styles.fieldLabel}>Método de Pago</Text>
            <View style={styles.paymentMethodsGrid}>
              {PAYMENT_METHODS.map(m => (
                <TouchableOpacity
                  key={m.key}
                  style={[styles.paymentMethodCard, selectedMethod === m.key && styles.paymentMethodCardActive]}
                  onPress={() => setSelectedMethod(m.key)}
                >
                  <Text style={{ fontSize: 28, marginBottom: 6 }}>{m.icon}</Text>
                  <Text style={[styles.paymentMethodLabel, selectedMethod === m.key && styles.paymentMethodLabelActive]}>
                    {m.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Button label={`Pagar ${fmt(cart.total())}`} onPress={handlePayment} icon="✓" style={{ marginTop: 16 }} />
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* ── Success Modal ── */}
      <Modal visible={successVisible} animationType="fade" transparent>
        <View style={styles.successOverlay}>
          <View style={styles.successCard}>
            <Text style={{ fontSize: 64, marginBottom: 8 }}>✅</Text>
            <Text style={styles.successTitle}>¡Pago Exitoso!</Text>
            <Text style={styles.successSub}>Pedido #{lastSaleNumber} completado</Text>
            <Text style={styles.successAmount}>{fmt(lastTotal)}</Text>
            <TouchableOpacity style={styles.newSaleBtn} onPress={handleNewSale}>
              <Text style={styles.newSaleBtnText}>Nueva Venta</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.dark },
  headerSafe: { backgroundColor: COLORS.dark },
  header: {
    backgroundColor: COLORS.dark,
    paddingHorizontal: SPACING.xl,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: { fontFamily: FONTS.bold, fontSize: 20, color: COLORS.white },
  orderBadge: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  orderBadgeText: { fontFamily: FONTS.semiBold, fontSize: 11, color: 'rgba(255,255,255,0.8)' },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  searchInput: {
    flex: 1,
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.white,
  },

  // Tab bar
  tabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.dark2,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: COLORS.blue,
  },
  tabText: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: 'rgba(255,255,255,0.45)',
  },
  tabTextActive: {
    color: COLORS.white,
    fontFamily: FONTS.bold,
  },
  tabBadge: {
    backgroundColor: COLORS.orange,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  tabBadgeText: { fontFamily: FONTS.bold, fontSize: 10, color: COLORS.white },

  // Products panel
  productsPanel: { flex: 1, backgroundColor: COLORS.dark2 },
  chipsBar: {
    backgroundColor: COLORS.dark2,
    flexGrow: 0,
  },
  chips: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: SPACING.xl,
    paddingVertical: 10,
  },
  darkChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    borderWidth: 1.5,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderColor: 'rgba(255,255,255,0.1)',
  },
  darkChipActive: {
    backgroundColor: 'rgba(27,79,255,0.2)',
    borderColor: COLORS.blue,
  },
  darkChipText: { fontFamily: FONTS.medium, fontSize: 12, color: 'rgba(255,255,255,0.6)' },
  darkChipTextActive: { color: COLORS.blueLight },
  gridRow: { gap: 10 },
  gridContent: { padding: 12, paddingBottom: 100 },
  productCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.sm,
    padding: 12,
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 2,
    borderColor: 'transparent',
    ...SHADOWS.sm,
    position: 'relative',
  },
  productCardSelected: {
    borderColor: COLORS.blue,
    backgroundColor: COLORS.bluePale,
  },
  cartBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.orange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartBadgeText: { fontFamily: FONTS.bold, fontSize: 10, color: COLORS.white },
  productEmoji: { fontSize: 28, marginBottom: 6 },
  productName: { fontFamily: FONTS.semiBold, fontSize: 11, color: COLORS.text, textAlign: 'center', marginBottom: 2 },
  productPrice: { fontFamily: FONTS.bold, fontSize: 13, color: COLORS.blue },

  // Floating cart button
  floatingCartBtn: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    backgroundColor: COLORS.blue,
    borderRadius: RADIUS.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 10,
    ...SHADOWS.blue,
  },
  floatingCartText: { fontFamily: FONTS.bold, fontSize: 14, color: COLORS.white, flex: 1, textAlign: 'center' },
  floatingCartBadge: {
    backgroundColor: COLORS.orange,
    borderRadius: 10,
    minWidth: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  floatingCartBadgeText: { fontFamily: FONTS.bold, fontSize: 11, color: COLORS.white },

  // Cart panel
  cartPanel: { flex: 1, backgroundColor: COLORS.dark },
  emptyCart: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  emptyCartTitle: { fontFamily: FONTS.bold, fontSize: 18, color: COLORS.white, marginBottom: 6 },
  emptyCartSub: { fontFamily: FONTS.regular, fontSize: 13, color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginBottom: 24 },
  goToProductsBtn: {
    backgroundColor: COLORS.blue,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 24,
    paddingVertical: 12,
    ...SHADOWS.blue,
  },
  goToProductsBtnText: { fontFamily: FONTS.bold, fontSize: 14, color: COLORS.white },
  cartScroll: { flex: 1 },
  cartScrollContent: { padding: SPACING.xl, paddingBottom: 80 },
  cartHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cartTitle: { fontFamily: FONTS.bold, fontSize: 16, color: COLORS.white },
  clearBtn: { fontFamily: FONTS.medium, fontSize: 12, color: COLORS.red },
  cartItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: RADIUS.sm,
    padding: 12,
    marginBottom: 8,
  },
  cartItemEmoji: { fontSize: 22 },
  cartItemInfo: { flex: 1 },
  cartItemName: { fontFamily: FONTS.medium, fontSize: 13, color: COLORS.white },
  cartItemUnit: { fontFamily: FONTS.regular, fontSize: 11, color: 'rgba(255,255,255,0.4)' },
  qtyControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
  qtyBtn: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnText: { color: COLORS.white, fontSize: 16, lineHeight: 20 },
  qtyNum: { fontFamily: FONTS.bold, fontSize: 14, color: COLORS.white, minWidth: 20, textAlign: 'center' },
  cartItemPrice: { fontFamily: FONTS.bold, fontSize: 14, color: COLORS.green },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginVertical: 16 },
  totalsCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: RADIUS.sm,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  totalLabel: { fontFamily: FONTS.regular, fontSize: 13, color: 'rgba(255,255,255,0.5)' },
  totalValue: { fontFamily: FONTS.semiBold, fontSize: 13, color: 'rgba(255,255,255,0.7)' },
  totalFinalRow: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    paddingTop: 10,
    marginTop: 4,
    marginBottom: 0,
  },
  totalFinalLabel: { fontFamily: FONTS.bold, fontSize: 15, color: COLORS.white },
  totalFinalValue: { fontFamily: FONTS.extraBold, fontSize: 22, color: COLORS.green },
  sectionLabel: {
    fontFamily: FONTS.semiBold,
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  methodsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  methodBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: RADIUS.sm,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  methodBtnActive: {
    backgroundColor: 'rgba(27,79,255,0.25)',
    borderColor: COLORS.blue,
  },
  methodLabel: { fontFamily: FONTS.medium, fontSize: 12, color: 'rgba(255,255,255,0.55)' },
  methodLabelActive: { color: COLORS.blueLight, fontFamily: FONTS.bold },
  checkoutBtn: {
    backgroundColor: COLORS.blue,
    borderRadius: RADIUS.md,
    paddingVertical: 16,
    alignItems: 'center',
    ...SHADOWS.blue,
  },
  checkoutBtnText: { fontFamily: FONTS.bold, fontSize: 15, color: COLORS.white },

  // Checkout modal
  checkoutModal: { flex: 1, backgroundColor: COLORS.white },
  checkoutModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  checkoutModalTitle: { fontFamily: FONTS.extraBold, fontSize: 20, color: COLORS.text },
  paymentSummary: {
    backgroundColor: COLORS.bg,
    borderRadius: RADIUS.md,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  paymentRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  paymentLabel: { fontFamily: FONTS.regular, fontSize: 13, color: COLORS.text2 },
  paymentValue: { fontFamily: FONTS.semiBold, fontSize: 13, color: COLORS.text },
  paymentTotalRow: { borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 8, marginTop: 4, marginBottom: 0 },
  paymentTotalLabel: { fontFamily: FONTS.bold, fontSize: 16, color: COLORS.text },
  paymentTotalValue: { fontFamily: FONTS.extraBold, fontSize: 22, color: COLORS.blue },
  fieldLabel: { fontFamily: FONTS.semiBold, fontSize: 12, color: COLORS.text2, marginBottom: 10 },
  paymentMethodsGrid: { flexDirection: 'row', gap: 12 },
  paymentMethodCard: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: COLORS.bg,
    borderRadius: RADIUS.md,
    padding: 16,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  paymentMethodCardActive: { borderColor: COLORS.blue, backgroundColor: COLORS.bluePale },
  paymentMethodLabel: { fontFamily: FONTS.medium, fontSize: 12, color: COLORS.text2 },
  paymentMethodLabelActive: { color: COLORS.blue, fontFamily: FONTS.bold },

  // Success
  successOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  successCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.xl,
    padding: 32,
    alignItems: 'center',
    width: '100%',
    ...SHADOWS.lg,
  },
  successTitle: { fontFamily: FONTS.extraBold, fontSize: 22, color: COLORS.text, marginBottom: 4 },
  successSub: { fontFamily: FONTS.regular, fontSize: 13, color: COLORS.text3, marginBottom: 8 },
  successAmount: { fontFamily: FONTS.extraBold, fontSize: 36, color: COLORS.green, marginBottom: 4 },
  newSaleBtn: {
    marginTop: 20,
    backgroundColor: COLORS.blue,
    borderRadius: RADIUS.md,
    paddingVertical: 14,
    paddingHorizontal: 32,
    ...SHADOWS.blue,
  },
  newSaleBtnText: { fontFamily: FONTS.bold, fontSize: 14, color: COLORS.white },
});
