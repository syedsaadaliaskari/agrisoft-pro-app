import { Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { EmptyState } from '@/components/EmptyState';
import { StatusBanner } from '@/components/StatusBanner';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { fetchCustomer } from '@/lib/api';
import { displayOrDash, formatMoney } from '@/lib/format';
import type { Customer } from '@/types/models';

function Field({ label, value }: { label: string; value: string }) {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  return (
    <View style={[styles.field, { borderBottomColor: colors.border }]}>
      <Text style={[styles.fieldLabel, { color: colors.muted }]}>{label}</Text>
      <Text style={[styles.fieldValue, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

export default function CustomerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const row = await fetchCustomer(id);
      setCustomer(row);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load this customer.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <>
      <Stack.Screen options={{ title: customer?.name ?? 'Customer' }} />
      <ScrollView
        style={[styles.screen, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.tint} />
        }>
        {error ? <StatusBanner tone="error" title="Could not load customer" detail={error} /> : null}

        {!loading && !error && !customer ? (
          <EmptyState title="Customer not found" detail="It may have been removed, or it belongs to another shop." />
        ) : null}

        {customer ? (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.name, { color: colors.text }]}>{customer.name}</Text>
            <Text style={[styles.status, { color: customer.is_active === false ? colors.warning : colors.tint }]}>
              {customer.is_active === false ? 'Inactive' : 'Active'}
            </Text>
            <Field label="Phone" value={displayOrDash(customer.phone)} />
            <Field label="Email" value={displayOrDash(customer.email)} />
            <Field label="Address" value={displayOrDash(customer.address)} />
            <Field label="City" value={displayOrDash(customer.city)} />
            <Field
              label="Opening balance"
              value={`${formatMoney(customer.opening_balance)}${customer.balance_type ? ` (${customer.balance_type})` : ''}`}
            />
            <Field label="Credit limit" value={formatMoney(customer.credit_limit)} />
            <Field label="Code" value={displayOrDash(customer.code)} />
          </View>
        ) : null}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: {
    padding: 16,
    paddingBottom: 40,
    gap: 12,
  },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
  },
  status: {
    marginTop: 4,
    marginBottom: 8,
    fontSize: 14,
    fontWeight: '600',
  },
  field: {
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: 56,
    justifyContent: 'center',
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  fieldValue: {
    fontSize: 16,
    lineHeight: 22,
  },
});
