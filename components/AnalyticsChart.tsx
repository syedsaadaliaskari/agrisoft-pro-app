import { useId, useMemo, useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop } from 'react-native-svg';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { font, moneyText, overline, typeScale } from '@/constants/theme';
import { money } from '@/lib/erp';
import type { DayPoint } from '@/lib/dashboard';

type Props = {
  points: DayPoint[];
  compare?: DayPoint[];
  tint: string;
  compareTint?: string;
  primaryLabel?: string;
  compareLabel?: string;
  selectedIndex: number | null;
  onSelect: (index: number | null) => void;
};

function smoothPath(xs: number[], ys: number[]): string {
  if (xs.length === 0) return '';
  if (xs.length === 1) return `M ${xs[0]} ${ys[0]}`;
  let d = `M ${xs[0]} ${ys[0]}`;
  for (let i = 0; i < xs.length - 1; i += 1) {
    const x0 = xs[i - 1] ?? xs[i];
    const y0 = ys[i - 1] ?? ys[i];
    const x1 = xs[i];
    const y1 = ys[i];
    const x2 = xs[i + 1];
    const y2 = ys[i + 1];
    const x3 = xs[i + 2] ?? x2;
    const y3 = ys[i + 2] ?? y2;
    const c1x = x1 + (x2 - x0) / 6;
    const c1y = y1 + (y2 - y0) / 6;
    const c2x = x2 - (x3 - x1) / 6;
    const c2y = y2 - (y3 - y1) / 6;
    d += ` C ${c1x} ${c1y} ${c2x} ${c2y} ${x2} ${y2}`;
  }
  return d;
}

export function AnalyticsChart({
  points,
  compare,
  tint,
  compareTint,
  primaryLabel,
  compareLabel,
  selectedIndex,
  onSelect,
}: Props) {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const gid = useId().replace(/:/g, '');
  const second = compareTint ?? colors.danger;
  const [width, setWidth] = useState(0);
  const height = 168;
  const padL = 8;
  const padR = 8;
  const padT = 16;
  const padB = 28;

  const layout = useMemo(() => {
    const innerW = Math.max(1, width - padL - padR);
    const innerH = height - padT - padB;
    const values = points.map((p) => p.total);
    const compareValues = compare?.map((p) => p.total) ?? [];
    const max = Math.max(1, ...values, ...compareValues);
    const n = Math.max(1, points.length - 1);
    const xs = points.map((_, i) => padL + (i / n) * innerW);
    const ys = values.map((v) => padT + innerH - (v / max) * innerH);
    const cys = compareValues.map((v) => padT + innerH - (v / max) * innerH);
    const line = smoothPath(xs, ys);
    const area = line
      ? `${line} L ${xs[xs.length - 1]} ${padT + innerH} L ${xs[0]} ${padT + innerH} Z`
      : '';
    const prev = compare && compare.length === points.length ? smoothPath(xs, cys) : '';
    const prevArea = prev
      ? `${prev} L ${xs[xs.length - 1]} ${padT + innerH} L ${xs[0]} ${padT + innerH} Z`
      : '';
    const ticks = [0.25, 0.5, 0.75].map((t) => padT + innerH * (1 - t));
    return { xs, ys, cys, line, area, prev, prevArea, ticks, innerH };
  }, [compare, points, width]);

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  const active = selectedIndex != null ? points[selectedIndex] : null;
  const activeCompare = selectedIndex != null ? compare?.[selectedIndex] : null;

  return (
    <View onLayout={onLayout}>
      {primaryLabel && compareLabel ? (
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: tint }]} />
            <Text style={[styles.legendText, { color: tint }]}>{primaryLabel}</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: second }]} />
            <Text style={[styles.legendText, { color: second }]}>{compareLabel}</Text>
          </View>
        </View>
      ) : null}
      {width > 0 ? (
        <Pressable
          onPress={(evt) => {
            const x = evt.nativeEvent.locationX;
            let nearest = 0;
            let best = Infinity;
            layout.xs.forEach((px, i) => {
              const d = Math.abs(px - x);
              if (d < best) {
                best = d;
                nearest = i;
              }
            });
            onSelect(selectedIndex === nearest ? null : nearest);
          }}>
          <Svg width={width} height={height}>
            <Defs>
              <LinearGradient id={`fillA-${gid}`} x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={tint} stopOpacity="0.28" />
                <Stop offset="1" stopColor={tint} stopOpacity="0.02" />
              </LinearGradient>
              <LinearGradient id={`fillB-${gid}`} x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={second} stopOpacity="0.22" />
                <Stop offset="1" stopColor={second} stopOpacity="0.02" />
              </LinearGradient>
            </Defs>
            {layout.ticks.map((y) => (
              <Line
                key={y}
                x1={padL}
                x2={width - padR}
                y1={y}
                y2={y}
                stroke={colors.border}
                strokeDasharray="4 6"
                strokeWidth={1}
              />
            ))}
            {layout.prevArea ? <Path d={layout.prevArea} fill={`url(#fillB-${gid})`} /> : null}
            {layout.area ? <Path d={layout.area} fill={`url(#fillA-${gid})`} /> : null}
            {layout.prev ? (
              <Path d={layout.prev} fill="none" stroke={second} strokeWidth={2.5} strokeLinecap="round" />
            ) : null}
            {layout.line ? (
              <Path d={layout.line} fill="none" stroke={tint} strokeWidth={2.5} strokeLinecap="round" />
            ) : null}
            {selectedIndex != null && layout.xs[selectedIndex] != null ? (
              <>
                <Line
                  x1={layout.xs[selectedIndex]}
                  x2={layout.xs[selectedIndex]}
                  y1={padT}
                  y2={padT + layout.innerH}
                  stroke={tint}
                  strokeWidth={1}
                  opacity={0.4}
                />
                <Circle
                  cx={layout.xs[selectedIndex]}
                  cy={layout.ys[selectedIndex]}
                  r={6}
                  fill={colors.card}
                  stroke={tint}
                  strokeWidth={3}
                />
                {layout.cys[selectedIndex] != null ? (
                  <Circle
                    cx={layout.xs[selectedIndex]}
                    cy={layout.cys[selectedIndex]}
                    r={6}
                    fill={colors.card}
                    stroke={second}
                    strokeWidth={3}
                  />
                ) : null}
              </>
            ) : null}
          </Svg>
        </Pressable>
      ) : (
        <View style={{ height }} />
      )}

      <View style={styles.labels}>
        {points.map((point, i) => {
          const show = points.length <= 7 || i === 0 || i === points.length - 1 || i % 7 === 0;
          if (!show) return null;
          return (
            <Text
              key={point.date}
              style={[
                styles.label,
                {
                  color: selectedIndex === i ? tint : colors.muted,
                  fontWeight: selectedIndex === i ? '700' : '500',
                },
              ]}>
              {point.label}
            </Text>
          );
        })}
      </View>

      {active ? (
        <View style={[styles.tooltip, { backgroundColor: colors.tintSoft }]}>
          <Text style={[styles.tooltipLabel, { color: colors.muted }]}>{active.label}</Text>
          <Text style={[styles.tooltipValue, { color: tint }]}>
            {primaryLabel ? `${primaryLabel}  ` : ''}
            {money(active.total)}
          </Text>
          {activeCompare ? (
            <Text style={[styles.tooltipValue, { color: second }]}>
              {compareLabel ? `${compareLabel}  ` : ''}
              {money(activeCompare.total)}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  legend: { flexDirection: 'row', gap: 16, marginBottom: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: typeScale.label, fontWeight: '600' },
  labels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  label: {
    ...font,
    fontSize: 11,
    textAlign: 'center',
  },
  tooltip: {
    marginTop: 10,
    alignSelf: 'flex-start',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 2,
  },
  tooltipLabel: { ...overline },
  tooltipValue: { ...moneyText, fontSize: 14, fontWeight: '700' },
});
