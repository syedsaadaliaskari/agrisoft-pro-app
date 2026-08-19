import { Redirect } from 'expo-router';
import { Drawer, DrawerToggleButton } from 'expo-router/drawer';
import { useEffect, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ShopDrawerContent } from '@/components/ShopDrawer';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { getSession, subscribeSession } from '@/lib/rbac';

export default function DrawerLayout() {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const insets = useSafeAreaInsets();
  const [, setTick] = useState(0);
  useEffect(() => subscribeSession(() => setTick((n) => n + 1)), []);
  if (!getSession()) {
    return <Redirect href="/login" />;
  }

  return (
    <Drawer
      drawerContent={(props) => <ShopDrawerContent {...props} />}
      screenOptions={{
        headerStyle: { backgroundColor: colors.header },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '700' },
        headerLeft: () => <DrawerToggleButton tintColor={colors.text} />,
        drawerStyle: { width: 300, paddingTop: insets.top, backgroundColor: colors.header },
        sceneStyle: { backgroundColor: colors.background },
      }}>
      <Drawer.Screen name="index" options={{ title: 'Dashboard' }} />
      <Drawer.Screen name="sales/index" options={{ title: 'Sale' }} />
      <Drawer.Screen name="sales/returns" options={{ title: 'Sale return' }} />
      <Drawer.Screen name="purchases/index" options={{ title: 'Purchase' }} />
      <Drawer.Screen name="purchases/returns" options={{ title: 'Purchase return' }} />
      <Drawer.Screen name="parties/customers" options={{ title: 'Customers' }} />
      <Drawer.Screen name="parties/vendors" options={{ title: 'Vendors' }} />
      <Drawer.Screen name="catalog/units" options={{ title: 'Units' }} />
      <Drawer.Screen name="catalog/categories" options={{ title: 'Categories' }} />
      <Drawer.Screen name="catalog/products" options={{ title: 'Products' }} />
      <Drawer.Screen name="catalog/inventory" options={{ title: 'Inventory' }} />
      <Drawer.Screen name="ledgers/accounts" options={{ title: 'Accounts ledger' }} />
      <Drawer.Screen name="ledgers/customers" options={{ title: 'Customer ledger' }} />
      <Drawer.Screen name="ledgers/vendors" options={{ title: 'Vendor ledger' }} />
      <Drawer.Screen name="ledgers/expenses" options={{ title: 'Expense ledger' }} />
      <Drawer.Screen name="ledgers/income" options={{ title: 'Income ledger' }} />
      <Drawer.Screen name="reports/sales" options={{ title: 'Sales report' }} />
      <Drawer.Screen name="reports/purchases" options={{ title: 'Purchase report' }} />
      <Drawer.Screen name="reports/profit" options={{ title: 'Profit & loss' }} />
      <Drawer.Screen name="reports/stock" options={{ title: 'Stock report' }} />
      <Drawer.Screen name="reports/tax" options={{ title: 'Tax report' }} />
      <Drawer.Screen name="reports/deleted" options={{ title: 'Deleted' }} />
      <Drawer.Screen name="platform/licenses" options={{ title: 'Activated list' }} />
      <Drawer.Screen name="settings/index" options={{ title: 'Settings' }} />
      <Drawer.Screen name="settings/license" options={{ title: 'License' }} />
      <Drawer.Screen name="settings/users" options={{ title: 'Users & roles' }} />
      <Drawer.Screen name="settings/password" options={{ title: 'Update password' }} />
    </Drawer>
  );
}
