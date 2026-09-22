import type { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Href, usePathname, useRouter } from 'expo-router';
import { DrawerContentScrollView } from 'expo-router/drawer';
import { useMemo, useState, useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { font, moneyText, overline, typeScale } from '@/constants/theme';
import { dashboardSummary, getSettings, money, subscribeErp } from '@/lib/erp';
import { filterNavForUser } from '@/lib/nav';
import { isSuperAdminUser } from '@/lib/permissions';
import { getSession, signOut, subscribeSession } from '@/lib/rbac';
import { subscribeLocale, t, tNav } from '@/lib/i18n';
import { fetchCloudLicenses } from '@/lib/vendorLicensesCloud';
import { licenseEnded } from '@/lib/vendorLicenseUi';

type IconName = ComponentProps<typeof Ionicons>['name'];

export function ShopDrawerContent(props: ComponentProps<typeof DrawerContentScrollView>) {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const router = useRouter();
  const pathname = usePathname();
  const user = getSession();
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [, tick] = useState(0);
  const [licenseCounts, setLicenseCounts] = useState({ all: 0, active: 0, ended: 0 });
  useEffect(() => {
    const a = subscribeLocale(() => tick((n) => n + 1));
    const b = subscribeErp(() => tick((n) => n + 1));
    const c = subscribeSession(() => tick((n) => n + 1));
    return () => {
      a();
      b();
      c();
    };
  }, []);
  useEffect(() => {
    if (!isSuperAdminUser(user)) return;
    void fetchCloudLicenses()
      .then((rows) => {
        setLicenseCounts({
          all: rows.length,
          active: rows.filter((row) => !licenseEnded(row)).length,
          ended: rows.filter((row) => licenseEnded(row)).length,
        });
      })
      .catch(() => setLicenseCounts({ all: 0, active: 0, ended: 0 }));
  }, [user]);

  const groups = useMemo(() => filterNavForUser(user), [user]);
  const dash = dashboardSummary();
  const shopName = getSettings().shop_name?.trim() || t('brand.name');
  const vendor = isSuperAdminUser(user);

  return (
    <DrawerContentScrollView {...props} contentContainerStyle={{ paddingBottom: 24 }}>
      <View style={[styles.pulse, { borderColor: colors.border, backgroundColor: colors.card }]}>
        <Text style={[styles.shop, { color: colors.text }]} numberOfLines={1}>
          {vendor ? t('brand.name') : shopName}
        </Text>
        <Text style={[styles.who, { color: colors.muted }]} numberOfLines={1}>
          {user?.fullName} · {user?.roleName}
        </Text>
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

      {groups.map((group) => {
        const expanded = open[group.title] ?? true;
        return (
          <View key={group.title}>
            <Pressable
              onPress={() => setOpen((current) => ({ ...current, [group.title]: !expanded }))}
              style={styles.groupHead}>
              <Ionicons name={group.icon as IconName} size={16} color={colors.muted} />
              <Text style={[styles.groupTitle, { color: colors.muted }]}>{tNav(group.title)}</Text>
              <Ionicons name={expanded ? 'chevron-down' : 'chevron-forward'} size={16} color={colors.muted} />
            </Pressable>
            {expanded
              ? group.items.map((item) => {
                  const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
                  return (
                    <Pressable
                      key={item.href}
                      onPress={() => router.push(item.href as Href)}
                      style={[
                        styles.item,
                        active && { backgroundColor: colors.tintSoft },
                      ]}>
                      <Ionicons name={item.icon as IconName} size={16} color={active ? colors.tint : colors.muted} />
                      <Text style={[styles.itemLabel, { color: active ? colors.tint : colors.muted }]}>
                        {tNav(item.label)}
                      </Text>
                    </Pressable>
                  );
                })
              : null}
          </View>
        );
      })}

      {user ? (
        <Pressable
          onPress={() => {
            void signOut().then(() => router.replace('/login'));
          }}
          style={styles.logout}>
          <Ionicons name="log-out-outline" size={18} color={colors.danger} />
          <Text style={[styles.itemLabel, { color: colors.danger }]}>{t('topbar.logout')}</Text>
        </Pressable>
      ) : null}
    </DrawerContentScrollView>
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
  pulse: {
    marginHorizontal: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    gap: 8,
  },
  shop: { ...font, fontSize: typeScale.section, fontWeight: '600' },
  who: { ...font, fontSize: typeScale.label },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cell: {
    width: '47%',
    flexGrow: 1,
    minHeight: 52,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 8,
    justifyContent: 'center',
  },
  cellLabel: { ...overline, marginBottom: 4 },
  cellValue: { ...moneyText, fontSize: 13, fontWeight: '700' },
  groupHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  groupTitle: { ...overline, flex: 1 },
  item: {
    minHeight: 48,
    marginHorizontal: 8,
    borderRadius: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  itemLabel: { ...font, fontSize: 13, fontWeight: '500' },
  logout: {
    minHeight: 48,
    marginTop: 16,
    marginHorizontal: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
});
