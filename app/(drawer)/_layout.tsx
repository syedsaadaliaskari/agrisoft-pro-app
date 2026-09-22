import { Redirect, Stack } from 'expo-router';
import { useEffect, useState } from 'react';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { font, typeScale } from '@/constants/theme';
import { subscribeLocale, tNav } from '@/lib/i18n';
import { getSession, subscribeSession } from '@/lib/rbac';

export default function AppLayout() {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
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
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.header },
        headerTintColor: colors.text,
        headerTitleStyle: { ...font, fontWeight: '600', fontSize: typeScale.title },
        headerShadowVisible: false,
        headerBackTitle: 'Back',
        contentStyle: { backgroundColor: colors.background },
      }}>
      <Stack.Screen name="index" options={{ title: tNav('Dashboard'), headerBackVisible: false }} />
      <Stack.Screen name="menu/[group]" options={{ title: tNav('Dashboard') }} />
      <Stack.Screen name="sales/index" options={{ title: tNav('Sale') }} />
      <Stack.Screen name="sales/returns" options={{ title: tNav('Sale return') }} />
      <Stack.Screen name="purchases/index" options={{ title: tNav('Purchase') }} />
      <Stack.Screen name="purchases/returns" options={{ title: tNav('Purchase return') }} />
      <Stack.Screen name="parties/customers" options={{ title: tNav('Customers') }} />
      <Stack.Screen name="parties/vendors" options={{ title: tNav('Vendors') }} />
      <Stack.Screen name="catalog/units" options={{ title: tNav('Units') }} />
      <Stack.Screen name="catalog/categories" options={{ title: tNav('Categories') }} />
      <Stack.Screen name="catalog/products" options={{ title: tNav('Products') }} />
      <Stack.Screen name="catalog/inventory" options={{ title: tNav('Inventory') }} />
      <Stack.Screen name="transactions/journal" options={{ title: 'Journal' }} />
      <Stack.Screen name="transactions/receive" options={{ title: tNav('Receive payment') }} />
      <Stack.Screen name="transactions/pay" options={{ title: tNav('Make payment') }} />
      <Stack.Screen name="transactions/expense" options={{ title: tNav('Expense') }} />
      <Stack.Screen name="transactions/income" options={{ title: tNav('Income') }} />
      <Stack.Screen name="transactions/owner-draw" options={{ title: tNav('Owner draw') }} />
      <Stack.Screen name="ledgers/accounts" options={{ title: tNav('Accounts ledger') }} />
      <Stack.Screen name="ledgers/customers" options={{ title: tNav('Customer ledger') }} />
      <Stack.Screen name="ledgers/vendors" options={{ title: tNav('Vendor ledger') }} />
      <Stack.Screen name="ledgers/expenses" options={{ title: tNav('Expense ledger') }} />
      <Stack.Screen name="ledgers/income" options={{ title: tNav('Income ledger') }} />
      <Stack.Screen name="reports/sales" options={{ title: tNav('Sales report') }} />
      <Stack.Screen name="reports/purchases" options={{ title: tNav('Purchase report') }} />
      <Stack.Screen name="reports/profit" options={{ title: tNav('Profit & loss') }} />
      <Stack.Screen name="reports/stock" options={{ title: tNav('Stock report') }} />
      <Stack.Screen name="reports/tax" options={{ title: tNav('Tax report') }} />
      <Stack.Screen name="reports/deleted" options={{ title: tNav('Deleted') }} />
      <Stack.Screen name="setup/taxes" options={{ title: tNav('Taxes') }} />
      <Stack.Screen name="setup/discounts" options={{ title: tNav('Discounts') }} />
      <Stack.Screen name="setup/additions" options={{ title: tNav('Additions') }} />
      <Stack.Screen name="platform/licenses" options={{ title: tNav('Activated list') }} />
      <Stack.Screen name="platform/messages" options={{ title: tNav('Messages') }} />
      <Stack.Screen name="settings/index" options={{ title: tNav('Settings') }} />
      <Stack.Screen name="settings/license" options={{ title: tNav('License') }} />
      <Stack.Screen name="settings/users" options={{ title: tNav('Users & roles') }} />
      <Stack.Screen name="settings/password" options={{ title: tNav('Update password') }} />
      <Stack.Screen name="settings/backup" options={{ title: tNav('Backup') }} />
      <Stack.Screen name="settings/audit" options={{ title: tNav('Audit') }} />
    </Stack>
  );
}
