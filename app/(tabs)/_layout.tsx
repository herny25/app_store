import React from 'react';
import { Tabs } from 'expo-router';
import { View, Text, StyleSheet, Platform, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONTS, RADIUS } from '../../src/constants/theme';
import { useCartStore } from '../../src/store';

const NUM_TABS = 5;

function TabIcon({
  emoji,
  label,
  focused,
  tabWidth,
}: {
  emoji: string;
  label: string;
  focused: boolean;
  tabWidth: number;
}) {
  // Scale emoji and font proportionally to tab width, capped at comfortable sizes
  const emojiSize = Math.min(22, Math.max(16, tabWidth * 0.28));
  const fontSize  = Math.min(10, Math.max(8,  tabWidth * 0.13));

  return (
    <View style={[styles.tabItem, focused && styles.tabItemActive, { width: tabWidth - 8 }]}>
      <Text style={[styles.tabEmoji, { fontSize: emojiSize, lineHeight: emojiSize + 6 }]}>
        {emoji}
      </Text>
      <Text
        style={[styles.tabLabel, focused && styles.tabLabelActive, { fontSize }]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.6}
      >
        {label}
      </Text>
    </View>
  );
}

export default function TabsLayout() {
  const cartCount = useCartStore(s => s.itemCount());
  const insets    = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const tabWidth   = width / NUM_TABS;
  const bottomPad  = Math.max(insets.bottom, 4);
  // Content area needed: emoji (~28px) + gap (2px) + label (~12px) + paddingVertical (8px) = ~50px
  const contentH   = 40;
  const tabBarH    = contentH + bottomPad + 4; // +4 for paddingTop

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          ...styles.tabBar,
          height: tabBarH,
          paddingBottom: bottomPad,
          paddingTop: 4,
        },
        tabBarItemStyle: { flex: 1, paddingHorizontal: 0 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Inicio',
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="🏠" label="Inicio" focused={focused} tabWidth={tabWidth} />
          ),
        }}
      />
      <Tabs.Screen
        name="products"
        options={{
          title: 'Productos',
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="📦" label="Productos" focused={focused} tabWidth={tabWidth} />
          ),
        }}
      />
      <Tabs.Screen
        name="pos"
        options={{
          title: 'POS',
          tabBarIcon: ({ focused }) => (
            <View style={{ position: 'relative' }}>
              <TabIcon emoji="🧾" label="POS" focused={focused} tabWidth={tabWidth} />
              {cartCount > 0 && (
                <View style={styles.cartBadge}>
                  <Text style={styles.cartBadgeText}>{cartCount > 9 ? '9+' : cartCount}</Text>
                </View>
              )}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="inventory"
        options={{
          title: 'Inventario',
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="📋" label="Inventario" focused={focused} tabWidth={tabWidth} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'Historial',
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="🕐" label="Historial" focused={focused} tabWidth={tabWidth} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 0,
    overflow: 'hidden',
  },
  tabItemActive: {
    backgroundColor: COLORS.bluePale,
  },
  tabEmoji: {
    textAlign: 'center',
  },
  tabLabel: {
    fontFamily: FONTS.medium,
    color: COLORS.text3,
    textAlign: 'center',
    width: '100%',
  },
  tabLabelActive: {
    color: COLORS.blue,
    fontFamily: FONTS.semiBold,
  },
  cartBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.orange,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.white,
  },
  cartBadgeText: {
    fontFamily: FONTS.bold,
    fontSize: 8,
    color: COLORS.white,
  },
});
