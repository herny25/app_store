import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ScrollView, Modal, Alert, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, FONTS, RADIUS, SHADOWS, SPACING } from '../constants/theme';
import { EmptyState, Button } from '../components/ui';
import { Sale } from '../types';
import { MiniBarChart } from '../components/charts';
import * as DB from '../database/db';

// Nuevas importaciones para el PDF
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

type DateFilter = 'today' | 'week' | 'month' | 'all';
type PaymentFilter = 'all' | 'cash' | 'card' | 'transfer';

const STATUS_CONFIG = {
  completed: { bg: COLORS.greenPale, color: COLORS.greenText, label: 'Completado' },
  refunded: { bg: COLORS.redPale, color: COLORS.redText, label: 'Reembolsado' },
  pending: { bg: COLORS.yellowPale, color: COLORS.yellowText, label: 'Pendiente' },
};

const METHOD_OPTIONS: { key: PaymentFilter; label: string; icon: string }[] = [
  { key: 'all',      label: 'Todos',           icon: '📋' },
  { key: 'cash',     label: 'Efectivo',         icon: '💵' },
  { key: 'card',     label: 'Tarjeta',          icon: '💳' },
  { key: 'transfer', label: 'Transferencia',    icon: '🏦' },
];

const METHOD_LABELS: Record<string, string> = {
  cash: 'Efectivo',
  card: 'Tarjeta',
  transfer: 'Transferencia',
};

const clp = (n: number) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(Math.round(n));

const fmtShort = (n: number) =>
  n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `$${(n / 1000).toFixed(0)}K` : clp(n);

// Helper extraído para reutilizar la lógica de fechas
const getDateRange = (filter: DateFilter) => {
  const now = new Date();
  let from: string;
  const to = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();

  if (filter === 'today') {
    from = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  } else if (filter === 'week') {
    const d = new Date(now);
    d.setDate(d.getDate() - 6);
    from = new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString();
  } else if (filter === 'month') {
    from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  } else {
    from = '2020-01-01T00:00:00.000Z'; // O la fecha de inicio de tu negocio
  }
  return { from, to };
};

export default function HistoryScreen() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [dateFilter, setDateFilter] = useState<DateFilter>('week');
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('all');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [weeklyData, setWeeklyData] = useState<{ day: string; revenue: number }[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados para el Modal del PDF
  const [pdfModalVisible, setPdfModalVisible] = useState(false);
  const [pdfDateFilter, setPdfDateFilter] = useState<DateFilter>('today');
  const [pdfPaymentFilter, setPdfPaymentFilter] = useState<PaymentFilter>('all');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const loadSales = useCallback(() => {
    setLoading(true);
    try {
      const { from, to } = getDateRange(dateFilter);
      const data = DB.getSalesByDateRange(from, to);
      setSales(data);
    } finally {
      setLoading(false);
    }
  }, [dateFilter]);

  useFocusEffect(useCallback(() => { loadSales(); }, [loadSales]));
  useEffect(() => { loadSales(); }, [dateFilter]);

  const filteredSales = paymentFilter === 'all'
    ? sales
    : sales.filter(s => s.paymentMethod === paymentFilter);

  // Recalcular chart semanal reflejando el filtro de método de pago activo
  useEffect(() => {
    const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const weekly: { day: string; revenue: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString();
      const dayEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59).toISOString();
      const dayRevenue = filteredSales
        .filter(s => s.createdAt >= dayStart && s.createdAt <= dayEnd && s.status !== 'refunded')
        .reduce((sum, s) => sum + s.total, 0);
      weekly.push({ day: days[d.getDay()], revenue: dayRevenue });
    }
    setWeeklyData(weekly);
  }, [sales, paymentFilter]);

  const completedSales = filteredSales.filter(s => s.status !== 'refunded');
  const totalRevenue = completedSales.reduce((sum, s) => sum + s.total, 0);
  const totalTransactions = completedSales.length;
  const avgOrder = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;
  const totalItems = completedSales.reduce((sum, s) => sum + s.items.reduce((is, i) => is + i.quantity, 0), 0);

  const fmtDate = (iso: string) => {
    const d = new Date(iso);
    const today = new Date();
    const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
    const time = d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
    if (d.toDateString() === today.toDateString()) return `Hoy ${time}`;
    if (d.toDateString() === yesterday.toDateString()) return `Ayer ${time}`;
    return d.toLocaleDateString('es-CL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  const handleRefund = (sale: Sale) => {
    if (sale.status !== 'completed') return;
    Alert.alert('Reembolsar Venta', `¿Reembolsar ${clp(sale.total)} y restaurar stock?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Reembolsar', style: 'destructive',
        onPress: () => {
          DB.refundSale(sale.id);
          loadSales();
          setSelectedSale(null);
        },
      },
    ]);
  };

  // --- Lógica de Generación de PDF ---
  const generatePDF = async () => {
    setIsGeneratingPdf(true);
    try {
      // 1. Obtener los datos frescos de la BD para el PDF
      const { from, to } = getDateRange(pdfDateFilter);
      let pdfData = DB.getSalesByDateRange(from, to);
      
      // 2. Filtrar por método de pago si no es 'all'
      if (pdfPaymentFilter !== 'all') {
        pdfData = pdfData.filter(s => s.paymentMethod === pdfPaymentFilter);
      }

      // Calcular totales para el reporte
      const reportCompleted = pdfData.filter(s => s.status !== 'refunded');
      const reportTotal = reportCompleted.reduce((sum, s) => sum + s.total, 0);

      // 3. Crear el HTML
      const htmlContent = `
        <html>
          <head>
            <style>
              body { font-family: 'Helvetica', 'Arial', sans-serif; padding: 20px; color: #333; }
              h1 { color: #2C3E50; text-align: center; border-bottom: 2px solid #ECF0F1; padding-bottom: 10px; }
              .summary { background: #F8F9F9; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
              .summary p { margin: 5px 0; font-size: 14px; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #3498DB; color: white; }
              .refunded { color: #E74C3C; text-decoration: line-through; }
              .total-row { font-weight: bold; background-color: #EAEDED; }
            </style>
          </head>
          <body>
            <h1>Reporte de Ventas</h1>
            <div class="summary">
              <p><strong>Filtro de Fecha:</strong> ${ { today: 'Hoy', week: 'Última Semana', month: 'Este Mes', all: 'Histórico' }[pdfDateFilter] }</p>
              <p><strong>Método de Pago:</strong> ${ METHOD_LABELS[pdfPaymentFilter] ?? 'Todos' }</p>
              <p><strong>Total Generado:</strong> ${clp(reportTotal)}</p>
              <p><strong>Transacciones Validas:</strong> ${reportCompleted.length}</p>
              <p><strong>Fecha de emisión:</strong> ${new Date().toLocaleString('es-CL')}</p>
            </div>
            <table>
              <tr>
                <th>ID Pedido</th>
                <th>Fecha y Hora</th>
                <th>Método</th>
                <th>Estado</th>
                <th>Total</th>
              </tr>
              ${pdfData.map(s => `
                <tr class="${s.status === 'refunded' ? 'refunded' : ''}">
                  <td>#${s.saleNumber}</td>
                  <td>${new Date(s.createdAt).toLocaleString('es-CL')}</td>
                  <td>${METHOD_LABELS[s.paymentMethod] ?? s.paymentMethod}</td>
                  <td>${STATUS_CONFIG[s.status]?.label ?? s.status}</td>
                  <td>${clp(s.total)}</td>
                </tr>
              `).join('')}
            </table>
          </body>
        </html>
      `;

      // 4. Generar e Imprimir/Compartir
      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      await Sharing.shareAsync(uri, { dialogTitle: 'Guardar o Compartir PDF' });
      setPdfModalVisible(false);

    } catch (error) {
      Alert.alert('Error', 'Hubo un problema generando el PDF');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />

      {/* Header */}
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={styles.title}>Historial de Ventas</Text>
          {/* Botón de PDF en el Header */}
          <TouchableOpacity style={styles.pdfHeaderButton} onPress={() => setPdfModalVisible(true)}>
            <Text style={{ fontSize: 18 }}>📄</Text>
          </TouchableOpacity>
        </View>

        {/* Date filter tabs */}
        <View style={styles.filterTabs}>
          {(['today', 'week', 'month', 'all'] as DateFilter[]).map(f => (
            <TouchableOpacity
              key={f}
              style={[styles.filterTab, dateFilter === f && styles.filterTabActive]}
              onPress={() => setDateFilter(f)}
            >
              <Text style={[styles.filterTabText, dateFilter === f && styles.filterTabTextActive]}>
                {{ today: 'Hoy', week: 'Semana', month: 'Mes', all: 'Todo' }[f]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Payment method filter chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.methodChips}>
          {METHOD_OPTIONS.map(m => (
            <TouchableOpacity
              key={m.key}
              style={[styles.methodChip, paymentFilter === m.key && styles.methodChipActive]}
              onPress={() => setPaymentFilter(m.key)}
            >
              <Text style={styles.methodChipIcon}>{m.icon}</Text>
              <Text style={[styles.methodChipText, paymentFilter === m.key && styles.methodChipTextActive]}>
                {m.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={filteredSales}
        keyExtractor={i => i.id}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          loading
            ? <EmptyState emoji="⏳" title="Cargando..." />
            : <EmptyState emoji="📭" title="Sin ventas" subtitle="Prueba otro período o método de pago" />
        }
        ListHeaderComponent={
          <View style={styles.listHeader}>
            {/* Summary grid */}
            <View style={styles.summaryGrid}>
              <View style={[styles.summaryCard, { flex: 1 }]}>
                <Text style={[styles.summaryVal, { color: COLORS.blue }]}>{fmtShort(totalRevenue)}</Text>
                <Text style={styles.summaryLabel}>Ingresos Totales</Text>
              </View>
              <View style={[styles.summaryCard, { flex: 1 }]}>
                <Text style={[styles.summaryVal, { color: COLORS.green }]}>{totalTransactions}</Text>
                <Text style={styles.summaryLabel}>Transacciones</Text>
              </View>
            </View>
            <View style={styles.summaryGrid}>
              <View style={[styles.summaryCard, { flex: 1 }]}>
                <Text style={[styles.summaryVal, { color: COLORS.orange }]}>{fmtShort(avgOrder)}</Text>
                <Text style={styles.summaryLabel}>Ticket Medio</Text>
              </View>
              <View style={[styles.summaryCard, { flex: 1 }]}>
                <Text style={[styles.summaryVal, { color: COLORS.text }]}>{totalItems}</Text>
                <Text style={styles.summaryLabel}>Artículos</Text>
              </View>
            </View>

            {/* Trend chart — only when showing all payment methods */}
            {paymentFilter === 'all' && weeklyData.length > 0 && (
              <View style={styles.chartCard}>
                <View style={styles.chartHeader}>
                  <Text style={styles.chartTitle}>Tendencia semanal</Text>
                </View>
                <MiniBarChart data={weeklyData} />
                <View style={styles.chartLabels}>
                  {weeklyData.map((d, i) => (
                    <Text key={i} style={styles.chartLabel}>{d.day.charAt(0)}</Text>
                  ))}
                </View>
              </View>
            )}

            {/* Payment breakdown when all methods */}
            {paymentFilter === 'all' && sales.length > 0 && (
              <View style={styles.breakdownCard}>
                <Text style={styles.breakdownTitle}>Por método de pago</Text>
                {METHOD_OPTIONS.filter(m => m.key !== 'all').map(m => {
                  const methodSales = completedSales.filter(s => s.paymentMethod === m.key);
                  const methodTotal = methodSales.reduce((sum, s) => sum + s.total, 0);
                  const pct = totalRevenue > 0 ? (methodTotal / totalRevenue) * 100 : 0;
                  if (methodSales.length === 0) return null;
                  return (
                    <View key={m.key} style={styles.breakdownRow}>
                      <Text style={styles.breakdownIcon}>{m.icon}</Text>
                      <View style={styles.breakdownInfo}>
                        <View style={styles.breakdownTopRow}>
                          <Text style={styles.breakdownLabel}>{m.label}</Text>
                          <Text style={styles.breakdownAmt}>{clp(methodTotal)}</Text>
                        </View>
                        <View style={styles.breakdownBarBg}>
                          <View style={[styles.breakdownBarFill, { width: `${pct.toFixed(0)}%` as `${number}%` }]} />
                        </View>
                        <Text style={styles.breakdownSub}>{methodSales.length} transacciones · {pct.toFixed(0)}%</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            {/* List title */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text style={styles.listSectionTitle}>
                Transacciones ({filteredSales.length})
                {paymentFilter !== 'all' && ` · ${METHOD_OPTIONS.find(m => m.key === paymentFilter)?.icon} ${METHOD_LABELS[paymentFilter]}`}
              </Text>
            </View>
          </View>
        }
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const cfg = STATUS_CONFIG[item.status];
          const method = METHOD_OPTIONS.find(m => m.key === item.paymentMethod);
          return (
            <TouchableOpacity style={styles.saleItem} onPress={() => setSelectedSale(item)} activeOpacity={0.8}>
              <View style={[styles.saleIcon, { backgroundColor: item.status === 'refunded' ? COLORS.redPale : COLORS.bluePale }]}>
                <Text style={{ fontSize: 18 }}>🧾</Text>
              </View>
              <View style={styles.saleInfo}>
                <Text style={styles.saleId}>Pedido #{item.saleNumber}</Text>
                <Text style={styles.saleMeta}>
                  {fmtDate(item.createdAt)} · {item.items.length} art. · {method?.icon}
                </Text>
              </View>
              <View style={styles.saleRight}>
                <Text style={styles.saleAmount}>{clp(item.total)}</Text>
                <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
                  <Text style={[styles.statusBadgeText, { color: cfg.color }]}>{cfg.label}</Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
      />

      {/* Sale Detail Modal */}
      <Modal visible={!!selectedSale} animationType="slide" presentationStyle="pageSheet">
        {selectedSale && (
          <SafeAreaView style={styles.modal}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Pedido #{selectedSale.saleNumber}</Text>
                <Text style={styles.modalSub}>
                  {new Date(selectedSale.createdAt).toLocaleString('es-CL', { dateStyle: 'medium', timeStyle: 'short' })}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedSale(null)}>
                <Text style={{ color: COLORS.text3, fontSize: 22 }}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ padding: SPACING.xl }}>
              {/* Status + Method */}
              <View style={styles.saleDetailMeta}>
                <View style={[styles.statusBadge, { backgroundColor: STATUS_CONFIG[selectedSale.status].bg }]}>
                  <Text style={[styles.statusBadgeText, { color: STATUS_CONFIG[selectedSale.status].color }]}>
                    {STATUS_CONFIG[selectedSale.status].label}
                  </Text>
                </View>
                <Text style={styles.saleDetailMethod}>
                  {METHOD_OPTIONS.find(m => m.key === selectedSale.paymentMethod)?.icon}{' '}
                  {METHOD_LABELS[selectedSale.paymentMethod] ?? selectedSale.paymentMethod}
                </Text>
              </View>

              {/* Items */}
              <Text style={styles.fieldLabel}>Artículos</Text>
              <View style={styles.itemsCard}>
                {selectedSale.items.map((item, idx) => (
                  <View key={idx} style={[styles.saleDetailItem, idx < selectedSale.items.length - 1 && styles.saleDetailItemBorder]}>
                    <Text style={styles.saleDetailItemName}>{item.productName}</Text>
                    <Text style={styles.saleDetailItemQty}>×{item.quantity}</Text>
                    <Text style={styles.saleDetailItemPrice}>{clp(item.subtotal)}</Text>
                  </View>
                ))}
              </View>

              {/* Totals */}
              <View style={styles.totalsCard}>
                <View style={styles.totalRowItem}>
                  <Text style={styles.totalRowLabel}>Subtotal</Text>
                  <Text style={styles.totalRowVal}>{clp(selectedSale.subtotal)}</Text>
                </View>
                {selectedSale.discount > 0 && (
                  <View style={styles.totalRowItem}>
                    <Text style={styles.totalRowLabel}>Descuento</Text>
                    <Text style={[styles.totalRowVal, { color: COLORS.green }]}>−{clp(selectedSale.discount)}</Text>
                  </View>
                )}
                <View style={[styles.totalRowItem, { borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 10, marginTop: 4 }]}>
                  <Text style={[styles.totalRowLabel, { fontFamily: FONTS.bold, fontSize: 16, color: COLORS.text }]}>Total</Text>
                  <Text style={[styles.totalRowVal, { fontFamily: FONTS.extraBold, fontSize: 22, color: COLORS.blue }]}>
                    {clp(selectedSale.total)}
                  </Text>
                </View>
              </View>

              {selectedSale.status === 'completed' && (
                <Button
                  label="Reembolsar Venta"
                  onPress={() => handleRefund(selectedSale)}
                  variant="danger"
                  style={{ marginTop: 8 }}
                />
              )}
            </ScrollView>
          </SafeAreaView>
        )}
      </Modal>

      {/* PDF Generation Modal */}
      <Modal visible={pdfModalVisible} animationType="fade" transparent={true}>
        <View style={styles.pdfModalOverlay}>
          <View style={styles.pdfModalCard}>
            <View style={styles.pdfModalHeader}>
              <Text style={styles.pdfModalTitle}>Generar Reporte PDF</Text>
              <TouchableOpacity onPress={() => setPdfModalVisible(false)}>
                <Text style={{ color: COLORS.text3, fontSize: 20 }}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.fieldLabel}>Rango de Fechas</Text>
            <View style={styles.pdfFiltersGrid}>
              {(['today', 'week', 'month', 'all'] as DateFilter[]).map(f => (
                <TouchableOpacity
                  key={f}
                  style={[styles.pdfFilterBtn, pdfDateFilter === f && styles.pdfFilterBtnActive]}
                  onPress={() => setPdfDateFilter(f)}
                >
                  <Text style={[styles.pdfFilterBtnText, pdfDateFilter === f && styles.pdfFilterBtnTextActive]}>
                    {{ today: 'Día', week: 'Semana', month: 'Mes', all: 'Todo' }[f]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Método de Pago</Text>
            <View style={styles.pdfFiltersGrid}>
              {METHOD_OPTIONS.map(m => (
                <TouchableOpacity
                  key={m.key}
                  style={[styles.pdfFilterBtn, pdfPaymentFilter === m.key && styles.pdfFilterBtnActive]}
                  onPress={() => setPdfPaymentFilter(m.key)}
                >
                  <Text style={[styles.pdfFilterBtnText, pdfPaymentFilter === m.key && styles.pdfFilterBtnTextActive]}>
                    {m.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Button
              label={isGeneratingPdf ? "Generando..." : "Crear y Compartir PDF"}
              onPress={generatePDF}
              style={{ marginTop: 20 }}
              disabled={isGeneratingPdf}
            />
          </View>
        </View>
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
    paddingBottom: 0,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: { fontFamily: FONTS.extraBold, fontSize: 22, color: COLORS.text, marginBottom: 12 },
  
  // Icono PDF en el header
  pdfHeaderButton: {
    backgroundColor: COLORS.bg,
    padding: 8,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12,
  },

  // Date filter tabs
  filterTabs: {
    flexDirection: 'row',
    backgroundColor: COLORS.bg,
    borderRadius: 10,
    padding: 3,
    marginBottom: 12,
  },
  filterTab: { flex: 1, paddingVertical: 7, borderRadius: 8, alignItems: 'center' },
  filterTabActive: { backgroundColor: COLORS.white, ...SHADOWS.sm },
  filterTabText: { fontFamily: FONTS.medium, fontSize: 12, color: COLORS.text3 },
  filterTabTextActive: { fontFamily: FONTS.semiBold, fontSize: 12, color: COLORS.text },

  // Payment method chips
  methodChips: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 12,
  },
  methodChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.bg,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  methodChipActive: {
    backgroundColor: COLORS.bluePale,
    borderColor: COLORS.blue,
  },
  methodChipIcon: { fontSize: 13 },
  methodChipText: { fontFamily: FONTS.medium, fontSize: 12, color: COLORS.text3 },
  methodChipTextActive: { fontFamily: FONTS.semiBold, color: COLORS.blue },

  list: { padding: SPACING.xl, paddingBottom: 100 },
  listHeader: { gap: 10, marginBottom: 8 },
  listSectionTitle: { fontFamily: FONTS.bold, fontSize: 14, color: COLORS.text },

  summaryGrid: { flexDirection: 'row', gap: 10 },
  summaryCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  summaryVal: { fontFamily: FONTS.extraBold, fontSize: 22, lineHeight: 24, marginBottom: 3 },
  summaryLabel: { fontFamily: FONTS.regular, fontSize: 11, color: COLORS.text3 },

  chartCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  chartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  chartTitle: { fontFamily: FONTS.bold, fontSize: 13, color: COLORS.text },
  chartLabels: { flexDirection: 'row', marginTop: 6 },
  chartLabel: { flex: 1, textAlign: 'center', fontFamily: FONTS.medium, fontSize: 9, color: COLORS.text3 },

  // Payment breakdown
  breakdownCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
    gap: 12,
  },
  breakdownTitle: { fontFamily: FONTS.bold, fontSize: 13, color: COLORS.text },
  breakdownRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  breakdownIcon: { fontSize: 20, marginTop: 2 },
  breakdownInfo: { flex: 1 },
  breakdownTopRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  breakdownLabel: { fontFamily: FONTS.semiBold, fontSize: 13, color: COLORS.text },
  breakdownAmt: { fontFamily: FONTS.bold, fontSize: 13, color: COLORS.text },
  breakdownBarBg: { height: 4, backgroundColor: COLORS.border, borderRadius: 2, marginBottom: 4 },
  breakdownBarFill: { height: 4, backgroundColor: COLORS.blue, borderRadius: 2 },
  breakdownSub: { fontFamily: FONTS.regular, fontSize: 11, color: COLORS.text3 },

  saleItem: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 8,
    ...SHADOWS.sm,
  },
  saleIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  saleInfo: { flex: 1 },
  saleId: { fontFamily: FONTS.semiBold, fontSize: 13, color: COLORS.text, marginBottom: 2 },
  saleMeta: { fontFamily: FONTS.regular, fontSize: 11, color: COLORS.text3 },
  saleRight: { alignItems: 'flex-end' },
  saleAmount: { fontFamily: FONTS.bold, fontSize: 14, color: COLORS.text, marginBottom: 3 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: RADIUS.full },
  statusBadgeText: { fontFamily: FONTS.semiBold, fontSize: 10 },

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
  modalSub: { fontFamily: FONTS.regular, fontSize: 12, color: COLORS.text3, marginTop: 2 },
  saleDetailMeta: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
  saleDetailMethod: { fontFamily: FONTS.medium, fontSize: 13, color: COLORS.text2 },
  fieldLabel: { fontFamily: FONTS.semiBold, fontSize: 12, color: COLORS.text2, marginBottom: 8, marginTop: 12 },
  itemsCard: {
    backgroundColor: COLORS.bg,
    borderRadius: RADIUS.md,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 14,
  },
  saleDetailItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  saleDetailItemBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.border },
  saleDetailItemName: { flex: 1, fontFamily: FONTS.medium, fontSize: 13, color: COLORS.text },
  saleDetailItemQty: { fontFamily: FONTS.regular, fontSize: 12, color: COLORS.text3, marginRight: 12 },
  saleDetailItemPrice: { fontFamily: FONTS.bold, fontSize: 13, color: COLORS.text },
  totalsCard: {
    backgroundColor: COLORS.bg,
    borderRadius: RADIUS.md,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 14,
  },
  totalRowItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  totalRowLabel: { fontFamily: FONTS.regular, fontSize: 13, color: COLORS.text2 },
  totalRowVal: { fontFamily: FONTS.semiBold, fontSize: 14, color: COLORS.text },

  // Estilos del nuevo Modal PDF
  pdfModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  pdfModalCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    ...SHADOWS.md,
  },
  pdfModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  pdfModalTitle: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    color: COLORS.text,
  },
  pdfFiltersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  pdfFilterBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: COLORS.bg,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  pdfFilterBtnActive: {
    backgroundColor: COLORS.bluePale,
    borderColor: COLORS.blue,
  },
  pdfFilterBtnText: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: COLORS.text2,
  },
  pdfFilterBtnTextActive: {
    fontFamily: FONTS.semiBold,
    color: COLORS.blue,
  },
});