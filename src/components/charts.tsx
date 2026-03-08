import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, FONTS } from '../constants/theme';

interface BarChartProps {
  data: { day: string; revenue: number }[];
  height?: number;
}

export function BarChart({ data, height = 80 }: BarChartProps) {
  const maxVal = Math.max(...data.map(d => d.revenue), 1);
  const todayIdx = data.length - 1;

  return (
    <View style={styles.container}>
      {data.map((item, idx) => {
        const barHeight = Math.max(8, (item.revenue / maxVal) * height);
        const isToday = idx === todayIdx;
        return (
          <View key={idx} style={styles.barWrap}>
            <View
              style={[
                styles.bar,
                {
                  height: barHeight,
                  backgroundColor: isToday ? COLORS.blue : COLORS.bluePale,
                },
              ]}
            />
            <Text style={[styles.label, isToday && styles.labelActive]}>
              {item.day.charAt(0)}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

interface MiniLineChartProps {
  data: { day: string; revenue: number }[];
  color?: string;
}

export function MiniBarChart({ data, color = COLORS.blue }: MiniLineChartProps) {
  const maxVal = Math.max(...data.map(d => d.revenue), 1);
  const height = 56;

  return (
    <View style={[styles.container, { height, alignItems: 'flex-end' }]}>
      {data.map((item, idx) => {
        const barH = Math.max(6, (item.revenue / maxVal) * height);
        const isHighest = item.revenue === Math.max(...data.map(d => d.revenue));
        return (
          <View key={idx} style={[styles.barWrap, { flex: 1 }]}>
            <View
              style={{
                width: '80%',
                height: barH,
                backgroundColor: isHighest ? color : COLORS.bluePale,
                borderRadius: 4,
              }}
            />
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
  },
  barWrap: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  bar: {
    width: '100%',
    borderRadius: 6,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
  },
  label: {
    fontSize: 9,
    fontFamily: FONTS.medium,
    color: COLORS.text3,
  },
  labelActive: {
    color: COLORS.blue,
    fontFamily: FONTS.bold,
  },
});
