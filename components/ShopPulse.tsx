import { Href, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { cardRadius, cardShadow } from '@/constants/layout';
import { moneyText, overline } from '@/constants/theme';
import { dashboardSummary, money, subscribeErp } from '@/lib/erp';
import { subscribeLocale, t } from '@/lib/i18n';
import { isSuperAdminUser } from '@/lib/permissions';
import { getSession } from '@/lib/rbac';
import { fetchCloudLicenses } from '@/lib/vendorLicensesCloud';
import { licenseEnded } from '@/lib/vendorLicenseUi';

export function ShopPulse() {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const router = useRouter();
  const user = getSession();
  const vendor = isSuperAdminUser(user);
  const [, tick] = useState(0);
  const [licenseCounts, setLicenseCounts] = useState({ all: 0, active: 0, ended: 0 });

  useEffect(() => {
    const a = subscribeErp(() => tick((n) => n + 1));
    const b = subscribeLocale(() => tick((n) => n + 1));
    return () => {
      a();
      b();
    };
  }, []);

  useEffect(() => {
    if (!vendor) return;
    void fetchCloudLicenses()
      .then((rows) => {
        setLicenseCounts({
          all: rows.length,
          active: rows.filter((row) => !licenseEnded(row)).length,
          ended: rows.filter((row) => licenseEnded(row)).length,
        });
      })
      .catch(() => setLicenseCounts({ all: 0, active: 0, ended: 0 }));
  }, [vendor]);

  const dash = dashboardSummary();

  return (
    <View style={[styles.card, cardShadow, { backgroundColor: colors.card }]}>
      {vendor ? (
        <View style={styles.grid}>
          <PulseCell label="All" value={String(licenseCounts.all)} color={colors.text} />
          <PulseCell label="Active" value={String(licenseCounts.active)} color={colors.success} />
          <PulseCell label="Ended" value={String(licenseCounts.ended)} color={colors.danger} />
        </View>
      ) : (
        <View style={styles.grid}>
          <PulseCell
            label={t('home.cash')}
            value={money(dash.cashBalance)}
            color={colors.text}
            onPress={() => router.push('/ledgers/accounts' as Href)}
          />
          <PulseCell
            label={t('home.bank')}
            value={money(dash.bankBalance)}
            color={colors.info}
            onPress={() => router.push('/ledgers/accounts' as Href)}
          />
          <PulseCell
            label={t('pulse.ownerDraw')}
            value={money(dash.ownerDraw)}
            color={colors.text}
            onPress={() => router.push('/transactions/owner-draw' as Href)}
          />
          <PulseCell
            label={t('pulse.todayPl')}
            value={money(dash.todayProfit)}
            color={dash.todayProfit < 0 ? colors.danger : colors.success}
            onPress={() => router.push('/reports/profit' as Href)}
          />
        </View>
      )}
    </View>
  );
}

function PulseCell({
  label,
  value,
  color,
  onPress,
}: {
  label: string;
  value: string;
  color: string;
  onPress?: () => void;
}) {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={[styles.cell, { backgroundColor: colors.soft, borderColor: colors.border }]}>
      <Text style={[styles.cellLabel, { color: colors.muted }]} numberOfLines={1}>
        {label}
      </Text>
      <Text style={[styles.cellValue, { color }]} numberOfLines={1}>
        {value}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: cardRadius,
    padding: 12,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cell: {
    width: '47%',
    flexGrow: 1,
    minHeight: 56,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    justifyContent: 'center',
  },
  cellLabel: { ...overline, marginBottom: 4 },
  cellValue: { ...moneyText, fontSize: 16, fontWeight: '700' },
});
