import { Redirect } from 'expo-router';
import { Drawer, DrawerToggleButton } from 'expo-router/drawer';
import { useEffect, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ShopDrawerContent } from '@/components/ShopDrawer';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { sidebarWidth, topbarHeight } from '@/constants/layout';
import { font, typeScale } from '@/constants/theme';
import { subscribeLocale, tNav } from '@/lib/i18n';
import { getSession, subscribeSession } from '@/lib/rbac';

export default function DrawerLayout() {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const insets = useSafeAreaInsets();
  const [, setTick] = useState(0);
  useEffect(() => {
    const a = subscribeSession(() => setTick((n) => n + 1));
    const b = subscribeLocale(() => setTick((n) => n + 1));
    return () => {
      a();
      b();
    };
  }, []);
  if (!getSession()) {
    return <Redirect href="/login" />;
  }

  return (
    <Drawer
      drawerContent={(props) => <ShopDrawerContent {...props}>{null}</ShopDrawerContent>}
      screenOptions={{
        headerStyle: { backgroundColor: colors.header, height: topbarHeight + insets.top },
        headerTintColor: colors.text,
        headerTitleStyle: { ...font, fontWeight: '600', fontSize: typeScale.title },
        headerLeft: () => <DrawerToggleButton tintColor={colors.text} />,
        drawerStyle: { width: sidebarWidth, paddingTop: insets.top, backgroundColor: colors.header, borderRightWidth: 1, borderRightColor: colors.border },
        sceneStyle: { backgroundColor: colors.background },
      }}>
      <Drawer.Screen name="index" options={{ title: tNav('Dashboard') }} />
      <Drawer.Screen name="sales/index" options={{ title: tNav('Sale') }} />
      <Drawer.Screen name="sales/returns" options={{ title: tNav('Sale return') }} />
      <Drawer.Screen name="purchases/index" options={{ title: tNav('Purchase') }} />
      <Drawer.Screen name="purchases/returns" options={{ title: tNav('Purchase return') }} />
      <Drawer.Screen name="parties/customers" options={{ title: tNav('Customers') }} />
      <Drawer.Screen name="parties/vendors" options={{ title: tNav('Vendors') }} />
      <Drawer.Screen name="catalog/units" options={{ title: tNav('Units') }} />
      <Drawer.Screen name="catalog/categories" options={{ title: tNav('Categories') }} />
      <Drawer.Screen name="catalog/products" options={{ title: tNav('Products') }} />
      <Drawer.Screen name="catalog/inventory" options={{ title: tNav('Inventory') }} />
      <Drawer.Screen name="transactions/journal" options={{ title: 'Journal', drawerItemStyle: { display: 'none' } }} />
      <Drawer.Screen name="transactions/receive" options={{ title: tNav('Receive payment') }} />
      <Drawer.Screen name="transactions/pay" options={{ title: tNav('Make payment') }} />
      <Drawer.Screen name="transactions/expense" options={{ title: tNav('Expense') }} />
      <Drawer.Screen name="transactions/income" options={{ title: tNav('Income') }} />
      <Drawer.Screen name="transactions/owner-draw" options={{ title: tNav('Owner draw') }} />
      <Drawer.Screen name="ledgers/accounts" options={{ title: tNav('Accounts ledger') }} />
      <Drawer.Screen name="ledgers/customers" options={{ title: tNav('Customer ledger') }} />
      <Drawer.Screen name="ledgers/vendors" options={{ title: tNav('Vendor ledger') }} />
      <Drawer.Screen name="ledgers/expenses" options={{ title: tNav('Expense ledger') }} />
      <Drawer.Screen name="ledgers/income" options={{ title: tNav('Income ledger') }} />
      <Drawer.Screen name="reports/sales" options={{ title: tNav('Sales report') }} />
      <Drawer.Screen name="reports/purchases" options={{ title: tNav('Purchase report') }} />
      <Drawer.Screen name="reports/profit" options={{ title: tNav('Profit & loss') }} />
      <Drawer.Screen name="reports/stock" options={{ title: tNav('Stock report') }} />
      <Drawer.Screen name="reports/tax" options={{ title: tNav('Tax report') }} />
      <Drawer.Screen name="reports/deleted" options={{ title: tNav('Deleted') }} />
      <Drawer.Screen name="setup/taxes" options={{ title: tNav('Taxes') }} />
      <Drawer.Screen name="setup/discounts" options={{ title: tNav('Discounts') }} />
      <Drawer.Screen name="setup/additions" options={{ title: tNav('Additions') }} />
      <Drawer.Screen name="platform/licenses" options={{ title: tNav('Activated list') }} />
      <Drawer.Screen name="platform/messages" options={{ title: tNav('Messages') }} />
      <Drawer.Screen name="settings/index" options={{ title: tNav('Settings') }} />
      <Drawer.Screen name="settings/license" options={{ title: tNav('License'), drawerItemStyle: { display: 'none' } }} />
      <Drawer.Screen name="settings/users" options={{ title: tNav('Users & roles') }} />
      <Drawer.Screen name="settings/password" options={{ title: tNav('Update password') }} />
      <Drawer.Screen name="settings/backup" options={{ title: tNav('Backup') }} />
      <Drawer.Screen name="settings/audit" options={{ title: tNav('Audit') }} />
    </Drawer>
  );
}
