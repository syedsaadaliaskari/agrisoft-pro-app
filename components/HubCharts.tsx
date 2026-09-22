import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { AnalyticsChart } from '@/components/AnalyticsChart';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { cardRadius, cardShadow } from '@/constants/layout';
import { font, moneyText, overline, typeScale } from '@/constants/theme';
import { hubInsight, hubTrend, money, shopPieMix, subscribeErp } from '@/lib/erp';

export function HomeCharts() {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const [, tick] = useState(0);
  useEffect(() => subscribeErp(() => tick((n) => n + 1)), []);

  return (
    <View style={[styles.card, cardShadow, { backgroundColor: colors.card }]}>
      <Text style={[styles.cardTitle, { color: colors.muted }]}>This month</Text>
      <PieChart colors={colors} />
    </View>
  );
}

export function GroupWeekChart({ groupKey }: { groupKey: string }) {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const [, tick] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  useEffect(() => subscribeErp(() => tick((n) => n + 1)), []);
  const insight = hubInsight(groupKey);
  const trend = hubTrend(groupKey);
  if (!insight?.series.length && !trend) return null;

  return (
    <View style={styles.stack}>
      {insight?.series.length ? (
        <View style={[styles.card, cardShadow, { backgroundColor: colors.card }]}>
          <Text style={[styles.cardTitle, { color: colors.muted }]}>{insight.seriesTitle}</Text>
          <BarChart
            bars={insight.series}
            palette={weekPalette(colors)}
            track={colors.soft}
            negative={colors.danger}
          />
        </View>
      ) : null}
      {trend ? (
        <View style={[styles.card, cardShadow, { backgroundColor: colors.card }]}>
          <Text style={[styles.cardTitle, { color: colors.muted }]}>{trend.title}</Text>
          <AnalyticsChart
            points={trend.a}
            compare={trend.b}
            tint={colors.success}
            compareTint={colors.danger}
            primaryLabel={trend.aLabel}
            compareLabel={trend.bLabel}
            selectedIndex={selected}
            onSelect={setSelected}
          />
        </View>
      ) : null}
    </View>
  );
}

function weekPalette(colors: (typeof Colors)['light']) {
  return [colors.tint, colors.info, colors.success, colors.warning, colors.tintHover, colors.danger, colors.tint];
}

function pieColor(label: string, colors: (typeof Colors)['light']) {
  if (label === 'Sales') return colors.success;
  if (label === 'Sale return') return colors.danger;
  if (label === 'Purchases') return colors.info;
  if (label === 'Purchase return') return colors.warning;
  if (label === 'Expense') return colors.tintHover;
  if (label === 'Income') return colors.tint;
  return colors.tint;
}

function pieSlice(cx: number, cy: number, r: number, start: number, end: number) {
  const x0 = cx + r * Math.cos(start);
  const y0 = cy + r * Math.sin(start);
  const x1 = cx + r * Math.cos(end);
  const y1 = cy + r * Math.sin(end);
  const large = end - start > Math.PI ? 1 : 0;
  return `M ${cx} ${cy} L ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1} Z`;
}

function PieChart({ colors }: { colors: (typeof Colors)['light'] }) {
  const slices = shopPieMix();
  const total = slices.reduce((sum, slice) => sum + Math.max(0, slice.value), 0);
  const size = 180;
  const cx = size / 2;
  const cy = size / 2;
  const r = 78;
  const paths = useMemo(() => {
    if (total <= 0) return [];
    let angle = -Math.PI / 2;
    return slices
      .filter((slice) => slice.value > 0)
      .map((slice) => {
        const sweep = (slice.value / total) * Math.PI * 2;
        const start = angle;
        const end = angle + Math.max(sweep, 0.02);
        angle = end;
        return {
          label: slice.label,
          d: pieSlice(cx, cy, r, start, end),
          color: pieColor(slice.label, colors),
          full: sweep >= Math.PI * 2 - 0.001,
        };
      });
  }, [colors, slices, total]);

  return (
    <View style={styles.pieWrap}>
      <View style={styles.pieGraphic}>
        <Svg width={size} height={size}>
          {total <= 0 ? (
            <Circle cx={cx} cy={cy} r={r} fill={colors.soft} />
          ) : (
            paths.map((slice) =>
              slice.full ? (
                <Circle key={slice.label} cx={cx} cy={cy} r={r} fill={slice.color} />
              ) : (
                <Path key={slice.label} d={slice.d} fill={slice.color} />
              ),
            )
          )}
          <Circle cx={cx} cy={cy} r={46} fill={colors.card} />
        </Svg>
        <View style={styles.pieCenter} pointerEvents="none">
          <Text style={[styles.pieCenterLabel, { color: colors.muted }]}>Total</Text>
          <Text style={[styles.pieCenterValue, { color: colors.text }]} numberOfLines={1}>
            {money(total)}
          </Text>
        </View>
      </View>
      <View style={styles.legend}>
        {slices.map((slice) => {
          const fill = pieColor(slice.label, colors);
          return (
            <View key={slice.label} style={styles.legendRow}>
              <View style={[styles.legendDot, { backgroundColor: fill }]} />
              <Text style={[styles.legendLabel, { color: fill }]}>{slice.label}</Text>
              <Text style={[styles.legendValue, { color: colors.text }]}>{money(slice.value)}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function BarChart({
  bars,
  palette,
  track,
  negative,
}: {
  bars: { label: string; value: number }[];
  palette: string[];
  track: string;
  negative: string;
}) {
  const peak = Math.max(...bars.map((bar) => Math.abs(bar.value)), 1);
  return (
    <View style={styles.bars}>
      {bars.map((bar, index) => {
        const ratio = Math.abs(bar.value) / peak;
        const height = Math.max(8, Math.round(ratio * 160));
        const fill = bar.value < 0 ? negative : palette[index % palette.length];
        return (
          <View key={`${bar.label}-${index}`} style={styles.barCol}>
            <View style={[styles.barTrack, { backgroundColor: track }]}>
              <View style={[styles.barFill, { height, backgroundColor: fill }]} />
            </View>
            <Text style={[styles.barLabel, { color: fill }]} numberOfLines={1}>
              {bar.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 12 },
  card: { borderRadius: cardRadius, padding: 14, gap: 12 },
  cardTitle: { ...overline },
  pieWrap: { gap: 14, alignItems: 'center' },
  pieGraphic: { width: 180, height: 180, alignItems: 'center', justifyContent: 'center' },
  pieCenter: { position: 'absolute', alignItems: 'center', justifyContent: 'center', width: 90 },
  pieCenterLabel: { ...overline },
  pieCenterValue: { ...moneyText, fontSize: 12, fontWeight: '700' },
  legend: { width: '100%', gap: 8 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { ...font, flex: 1, fontSize: typeScale.label, fontWeight: '600' },
  legendValue: { ...moneyText, fontSize: typeScale.label, fontWeight: '700' },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  barCol: { flex: 1, alignItems: 'center', gap: 6 },
  barTrack: {
    height: 160,
    width: '100%',
    borderRadius: 8,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  barFill: { width: '100%', borderTopLeftRadius: 8, borderTopRightRadius: 8 },
  barLabel: { ...font, fontSize: 10, fontWeight: '600' },
});
