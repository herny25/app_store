import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ViewStyle, TextStyle, ActivityIndicator,
} from 'react-native';
import { COLORS, FONTS, RADIUS, SHADOWS, SPACING } from '../constants/theme';
import { StockStatus, getStockStatus, Product } from '../types';

// ─── Stock Badge ───────────────────────────────────────────────

interface StockBadgeProps {
  product: Product;
  showCount?: boolean;
}

export function StockBadge({ product, showCount = true }: StockBadgeProps) {
  const status = getStockStatus(product);
  const configs: Record<StockStatus, { bg: string; color: string; label: string }> = {
    ok: { bg: COLORS.greenPale, color: COLORS.greenText, label: `${product.stock} en stock` },
    low: { bg: COLORS.yellowPale, color: COLORS.yellowText, label: `${product.stock} restantes` },
    critical: { bg: COLORS.redPale, color: COLORS.redText, label: product.stock === 0 ? 'Sin stock' : `${product.stock} restantes` },
  };
  const cfg = configs[status];

  return (
    <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
      <Text style={[styles.badgeText, { color: cfg.color }]}>
        {showCount ? cfg.label : ({ ok: 'OK', low: 'Bajo', critical: 'Crítico' } as Record<StockStatus, string>)[status]}
      </Text>
    </View>
  );
}

// ─── Stock Dot ─────────────────────────────────────────────────

export function StockDot({ status }: { status: StockStatus }) {
  const colors: Record<StockStatus, string> = {
    ok: COLORS.green,
    low: COLORS.yellow,
    critical: COLORS.red,
  };
  return <View style={[styles.dot, { backgroundColor: colors[status] }]} />;
}

// ─── Category Chip ─────────────────────────────────────────────

interface ChipProps {
  label: string;
  active: boolean;
  onPress: () => void;
  style?: ViewStyle;
}

export function CategoryChip({ label, active, onPress, style }: ChipProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.chip,
        active ? styles.chipActive : styles.chipInactive,
        style,
      ]}
      activeOpacity={0.75}
    >
      <Text style={[styles.chipText, active ? styles.chipTextActive : styles.chipTextInactive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// ─── Metric Card ───────────────────────────────────────────────

interface MetricCardProps {
  emoji: string;
  value: string;
  label: string;
  bgColor?: string;
  style?: ViewStyle;
}

export function MetricCard({ emoji, value, label, bgColor = COLORS.bluePale, style }: MetricCardProps) {
  return (
    <View style={[styles.metricCard, style]}>
      <View style={[styles.metricIcon, { backgroundColor: bgColor }]}>
        <Text style={{ fontSize: 16 }}>{emoji}</Text>
      </View>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

// ─── Section Header ────────────────────────────────────────────

interface SectionHeaderProps {
  title: string;
  action?: string;
  onAction?: () => void;
}

export function SectionHeader({ title, action, onAction }: SectionHeaderProps) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action && (
        <TouchableOpacity onPress={onAction}>
          <Text style={styles.sectionAction}>{action}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Primary Button ────────────────────────────────────────────

interface ButtonProps {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
  style?: ViewStyle;
  icon?: string;
}

export function Button({ label, onPress, loading, disabled, variant = 'primary', style, icon }: ButtonProps) {
  const variantStyles: Record<string, ViewStyle> = {
    primary: { backgroundColor: COLORS.blue },
    secondary: { backgroundColor: COLORS.bluePale, borderWidth: 1, borderColor: COLORS.border },
    danger: { backgroundColor: COLORS.red },
  };
  const textColors: Record<string, string> = {
    primary: COLORS.white,
    secondary: COLORS.blue,
    danger: COLORS.white,
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[styles.btn, variantStyles[variant], disabled && styles.btnDisabled, style]}
      activeOpacity={0.85}
    >
      {loading ? (
        <ActivityIndicator color={textColors[variant]} size="small" />
      ) : (
        <View style={styles.btnInner}>
          {icon && <Text style={[styles.btnIcon]}>{icon}</Text>}
          <Text style={[styles.btnText, { color: textColors[variant] }]}>{label}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

// ─── Empty State ───────────────────────────────────────────────

export function EmptyState({ emoji, title, subtitle }: { emoji: string; title: string; subtitle?: string }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyEmoji}>{emoji}</Text>
      <Text style={styles.emptyTitle}>{title}</Text>
      {subtitle && <Text style={styles.emptySubtitle}>{subtitle}</Text>}
    </View>
  );
}

// ─── Divider ──────────────────────────────────────────────────

export function Divider({ style }: { style?: ViewStyle }) {
  return <View style={[styles.divider, style]} />;
}

// ─── Styles ───────────────────────────────────────────────────

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
  badgeText: {
    fontSize: 10,
    fontFamily: FONTS.semiBold,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: RADIUS.full,
    borderWidth: 1.5,
  },
  chipActive: {
    backgroundColor: COLORS.blue,
    borderColor: COLORS.blue,
  },
  chipInactive: {
    backgroundColor: COLORS.white,
    borderColor: COLORS.border,
  },
  chipText: {
    fontSize: 12,
    fontFamily: FONTS.medium,
    lineHeight: 16,
  },
  chipTextActive: { color: COLORS.white },
  chipTextInactive: { color: COLORS.text2 },
  metricCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  metricIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  metricValue: {
    fontFamily: FONTS.bold,
    fontSize: 20,
    color: COLORS.text,
    marginBottom: 2,
  },
  metricLabel: {
    fontFamily: FONTS.medium,
    fontSize: 11,
    color: COLORS.text3,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: COLORS.text,
  },
  sectionAction: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: COLORS.blue,
  },
  btn: {
    borderRadius: RADIUS.md,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.blue,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  btnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  btnIcon: {
    fontSize: 16,
  },
  btnText: {
    fontFamily: FONTS.bold,
    fontSize: 14,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
  },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontFamily: FONTS.bold, fontSize: 16, color: COLORS.text, textAlign: 'center', marginBottom: 6 },
  emptySubtitle: { fontFamily: FONTS.regular, fontSize: 13, color: COLORS.text3, textAlign: 'center' },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
  },
});
