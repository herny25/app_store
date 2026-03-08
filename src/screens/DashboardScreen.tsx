import React, { useCallback, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, RefreshControl, StatusBar,
  Modal, TextInput, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useDashboardStore, useProductsStore, useSettingsStore } from '../store';
import { COLORS, FONTS, RADIUS, SHADOWS, SPACING } from '../constants/theme';
import { MetricCard, SectionHeader, StockBadge, EmptyState } from '../components/ui';
import { BarChart } from '../components/charts';
import { getStockStatus } from '../types';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return '¡Buenos días';
  if (h < 20) return '¡Buenas tardes';
  return '¡Buenas noches';
}

export default function DashboardScreen() {
  const { metrics, loading, refresh } = useDashboardStore();
  const { load: loadProducts } = useProductsStore();
  const { storeName, ownerName, save } = useSettingsStore();

  const [editVisible, setEditVisible] = useState(false);
  const [editStore, setEditStore] = useState('');
  const [editOwner, setEditOwner] = useState('');

  useFocusEffect(
    useCallback(() => {
      refresh();
      loadProducts();
    }, [])
  );

  const fmt = (n: number) =>
    new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(Math.round(n));

  const openEdit = () => {
    setEditStore(storeName);
    setEditOwner(ownerName);
    setEditVisible(true);
  };

  const saveEdit = () => {
    if (!editStore.trim() || !editOwner.trim()) {
      Alert.alert('Inválido', 'Completa ambos campos.');
      return;
    }
    save(editStore, editOwner);
    setEditVisible(false);
  };

  if (!metrics) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loading}>
          <Text style={styles.loadingText}>Cargando...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const {
    todayRevenue, todayTransactions, todayItemsSold, averageBasket,
    weeklyAverageBasket, revenueChange, weeklyData, topProducts, lowStockAlerts,
  } = metrics;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.blue} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={refresh}
            tintColor={COLORS.white}
          />
        }
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.headerBg} />
          <View style={styles.headerContent}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={styles.greetingSub}>
                {new Date().toLocaleDateString('es-ES', { weekday: 'long', month: 'short', day: 'numeric' })} · {storeName} Abierta
              </Text>
              <Text style={styles.greeting}>{getGreeting()}, {ownerName}! 👋</Text>
            </View>
            <TouchableOpacity style={styles.avatar} onPress={openEdit} activeOpacity={0.8}>
              <Text style={styles.avatarText}>{ownerName.charAt(0).toUpperCase()}</Text>
            </TouchableOpacity>
          </View>

          {/* Revenue card */}
          <View style={styles.revenueCard}>
            <Text style={styles.revenueLabel}>INGRESOS HOY</Text>
            <Text style={styles.revenueAmount}>{fmt(todayRevenue)}</Text>
            <View style={[styles.revBadge, { backgroundColor: revenueChange >= 0 ? 'rgba(0,200,150,0.25)' : 'rgba(255,59,92,0.25)' }]}>
              <Text style={[styles.revBadgeText, { color: revenueChange >= 0 ? '#7DFFD8' : '#FFB3C0' }]}>
                {revenueChange >= 0 ? '↑' : '↓'} {Math.abs(revenueChange).toFixed(1)}% vs ayer
              </Text>
            </View>
          </View>
        </View>

        {/* ── Metrics Grid ── */}
        <View style={styles.body}>
          <View style={styles.metricsGrid}>
            <View style={styles.metricsRow}>
              <MetricCard emoji="🧾" value={todayTransactions.toString()} label="Transacciones" bgColor={COLORS.bluePale} style={styles.metricCardItem} />
              <MetricCard emoji="📦" value={todayItemsSold.toString()} label="Vendidos" bgColor={COLORS.greenPale} style={styles.metricCardItem} />
            </View>
            <View style={styles.metricsRow}>
              <MetricCard emoji="📊" value={fmt(averageBasket)} label="Ticket Medio" bgColor={COLORS.yellowPale} style={styles.metricCardItem} />
              <MetricCard emoji="📈" value={fmt(weeklyAverageBasket)} label="Ticket Semanal" bgColor={COLORS.orangePale} style={styles.metricCardItem} />
            </View>
          </View>

          {/* ── Weekly Chart ── */}
          <View style={styles.card}>
            <SectionHeader
              title="Ventas Semanales"
              action={`${weeklyData[0]?.day} – ${weeklyData[6]?.day}`}
            />
            <BarChart data={weeklyData} height={80} />
          </View>

          {/* ── Top Products ── */}
          <View style={styles.card}>
            <SectionHeader title="Mejores Productos"/>
            {topProducts.length === 0 ? (
              <EmptyState emoji="📊" title="Sin ventas aún" subtitle="Realiza tu primera venta para ver los mejores productos" />
            ) : (
              topProducts.map((p, idx) => (
                <View key={idx} style={[styles.topRow, idx < topProducts.length - 1 && styles.topRowBorder]}>
                  <Text style={styles.rank}>#{idx + 1}</Text>
                  <View style={[styles.productThumb, { backgroundColor: ['#FFF1EB', '#EEF2FF', '#E6FBF5'][idx] }]}>
                    <Text style={{ fontSize: 18 }}>{p.emoji}</Text>
                  </View>
                  <View style={styles.productInfo}>
                    <Text style={styles.productName}>{p.name}</Text>
                    <Text style={styles.productUnits}>{p.units} unidades</Text>
                  </View>
                  <Text style={styles.productRevenue}>{fmt(p.revenue)}</Text>
                </View>
              ))
            )}
          </View>

          {/* ── Alerts ── */}
          {lowStockAlerts.length > 0 && (
            <View>
              <SectionHeader title="⚠️ Alertas de Stock" />
              <View style={styles.card}>
                {lowStockAlerts.map((p, idx) => {
                  const status = getStockStatus(p);
                  const dotColor = status === 'critical' ? COLORS.red : COLORS.yellow;
                  return (
                    <View key={p.id} style={[styles.alertRow, idx < lowStockAlerts.length - 1 && styles.topRowBorder]}>
                      <View style={[styles.alertDot, { backgroundColor: dotColor }]} />
                      <View style={styles.alertInfo}>
                        <Text style={styles.alertName}>{p.name}</Text>
                        <Text style={styles.alertStock}>{p.stock} unidades restantes</Text>
                      </View>
                      <StockBadge product={p} showCount={false} />
                    </View>
                  );
                })}
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* ── Edit profile modal ── */}
      <Modal visible={editVisible} transparent animationType="fade" onRequestClose={() => setEditVisible(false)}>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Editar perfil</Text>

            <Text style={styles.modalLabel}>Nombre de la tienda</Text>
            <TextInput
              style={styles.modalInput}
              value={editStore}
              onChangeText={setEditStore}
              autoCapitalize="words"
              returnKeyType="next"
            />

            <Text style={styles.modalLabel}>Tu nombre</Text>
            <TextInput
              style={styles.modalInput}
              value={editOwner}
              onChangeText={setEditOwner}
              autoCapitalize="words"
              returnKeyType="done"
              onSubmitEditing={saveEdit}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setEditVisible(false)}>
                <Text style={styles.modalBtnCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalBtnSave} onPress={saveEdit}>
                <Text style={styles.modalBtnSaveText}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.blue },
  scroll: { flex: 1, backgroundColor: COLORS.bg },
  content: { paddingBottom: 100 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { fontFamily: FONTS.medium, color: COLORS.text3 },

  // Header
  header: {
    backgroundColor: COLORS.blue,
    paddingHorizontal: SPACING.xl,
    paddingTop: 16,
    paddingBottom: 28,
    overflow: 'hidden',
  },
  headerBg: {
    position: 'absolute',
    top: -40, right: -40,
    width: 180, height: 180,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 90,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  greetingSub: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: 'rgba(255,255,255,0.75)',
    marginBottom: 2,
  },
  greeting: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    color: COLORS.white,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  avatarText: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: COLORS.white,
  },
  revenueCard: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: RADIUS.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  revenueLabel: {
    fontFamily: FONTS.medium,
    fontSize: 11,
    color: 'rgba(255,255,255,0.75)',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  revenueAmount: {
    fontFamily: FONTS.extraBold,
    fontSize: 32,
    color: COLORS.white,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  revBadge: {
    alignSelf: 'flex-start',
    borderRadius: RADIUS.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  revBadgeText: {
    fontFamily: FONTS.semiBold,
    fontSize: 11,
  },

  // Body
  body: { padding: SPACING.xl, gap: 16 },
  metricsGrid: {
    gap: 12,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  metricCardItem: {
    flex: 1,
  },

  card: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },

  // Top products
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 9,
  },
  topRowBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.border },
  rank: { fontFamily: FONTS.bold, fontSize: 11, color: COLORS.text3, width: 18 },
  productThumb: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productInfo: { flex: 1 },
  productName: { fontFamily: FONTS.medium, fontSize: 12, color: COLORS.text },
  productUnits: { fontFamily: FONTS.regular, fontSize: 11, color: COLORS.text3 },
  productRevenue: { fontFamily: FONTS.bold, fontSize: 13, color: COLORS.text },

  // Edit modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(13,17,23,0.55)',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
  },
  modalCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.xl,
    padding: SPACING.xxl,
    ...SHADOWS.lg,
  },
  modalTitle: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    color: COLORS.text,
    marginBottom: 20,
  },
  modalLabel: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: COLORS.text2,
    marginBottom: 6,
  },
  modalInput: {
    height: 46,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 14,
    fontFamily: FONTS.regular,
    fontSize: 15,
    color: COLORS.text,
    backgroundColor: COLORS.bg,
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  modalBtnCancel: {
    flex: 1,
    height: 46,
    borderRadius: RADIUS.sm,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnCancelText: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: COLORS.text2,
  },
  modalBtnSave: {
    flex: 1,
    height: 46,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.blue,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.blue,
  },
  modalBtnSaveText: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: COLORS.white,
  },

  // Alerts
  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 9,
  },
  alertDot: { width: 8, height: 8, borderRadius: 4 },
  alertInfo: { flex: 1 },
  alertName: { fontFamily: FONTS.medium, fontSize: 12, color: COLORS.text },
  alertStock: { fontFamily: FONTS.regular, fontSize: 11, color: COLORS.text3 },
});
