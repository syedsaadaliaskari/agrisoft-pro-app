import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';

import { PrimaryButton } from '@/components/PrimaryButton';
import { SearchBar } from '@/components/SearchBar';
import { StatusBanner } from '@/components/StatusBanner';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { cardRadius, cardShadow } from '@/constants/layout';
import {
  createSale,
  fetchCustomers,
  fetchProducts,
  matchesCustomerSearch,
  matchesSellableSearch,
  sellableRows,
} from '@/lib/api';
import { formatMoney, formatQty } from '@/lib/format';
import type { Customer, PaymentMode, SellableRow } from '@/types/models';

type CartLine = SellableRow & { quantity: number };

export default function NewSaleScreen() {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [catalog, setCatalog] = useState<SellableRow[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [mode, setMode] = useState<PaymentMode>('cash');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pickCustomer, setPickCustomer] = useState(false);
  const [customerQuery, setCustomerQuery] = useState('');

  const load = useCallback(async () => {
    try {
      const [products, rows] = await Promise.all([fetchProducts(), fetchCustomers()]);
      setCatalog(sellableRows(products));
      setCustomers(rows.filter((row) => row.is_active !== false));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load products.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = useMemo(
    () => catalog.filter((row) => matchesSellableSearch(row, query) && !cart.some((line) => line.variantId === row.variantId)),
    [catalog, cart, query],
  );
  const visibleCustomers = useMemo(
    () => customers.filter((row) => matchesCustomerSearch(row, customerQuery)),
    [customers, customerQuery],
  );
  const total = cart.reduce((sum, line) => sum + line.quantity * line.salePrice, 0);

  const add = (row: SellableRow) => {
    if (row.stockQty <= 0) return;
    setCart((current) => [...current, { ...row, quantity: 1 }]);
    setQuery('');
  };

  const setQty = (variantId: string, quantity: number) => {
    setCart((current) =>
      current
        .map((line) =>
          line.variantId === variantId
            ? { ...line, quantity: Math.min(line.stockQty, Math.max(0, quantity)) }
            : line,
        )
        .filter((line) => line.quantity > 0),
    );
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await createSale({
        customerId: customer?.id ?? null,
        paymentMode: mode,
        items: cart.map((line) => ({
          variantId: line.variantId,
          productName: line.name,
          size: line.detail.includes('·') ? line.detail.split('·')[0]?.trim() || null : line.detail || null,
          color: line.detail.includes('·') ? line.detail.split('·')[1]?.trim() || null : null,
          quantity: line.quantity,
          unitPrice: line.salePrice,
          costPrice: line.costPrice,
        })),
      });
      router.replace('/(tabs)/sales');
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save this sale.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'New sale' }} />
      <View style={[styles.screen, { backgroundColor: colors.background }]}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {error ? <StatusBanner tone="error" title={error} /> : null}

          <Text style={[styles.section, { color: colors.text }]}>Products</Text>
          <SearchBar value={query} onChangeText={setQuery} placeholder="Search products" />
          {visible.slice(0, query.trim() ? 8 : 6).map((row) => (
            <Pressable
              key={row.variantId}
              onPress={() => add(row)}
              style={[styles.pick, cardShadow, { backgroundColor: colors.card }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.name, { color: colors.text }]}>{row.name}</Text>
                <Text style={[styles.meta, { color: colors.muted }]}>
                  {row.detail || 'Default'}  ·  Stock {formatQty(row.stockQty)}  ·  {formatMoney(row.salePrice)}
                </Text>
              </View>
            </Pressable>
          ))}

          {cart.map((line) => (
            <View key={line.variantId} style={[styles.pick, cardShadow, { backgroundColor: colors.card }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.name, { color: colors.text }]}>{line.name}</Text>
                <Text style={[styles.meta, { color: colors.muted }]}>
                  {formatMoney(line.salePrice)}  ·  {formatMoney(line.quantity * line.salePrice)}
                </Text>
              </View>
              <View style={styles.stepper}>
                <Pressable onPress={() => setQty(line.variantId, line.quantity - 1)} style={[styles.step, { borderColor: colors.border }]}>
                  <Text style={[styles.stepText, { color: colors.text }]}>-</Text>
                </Pressable>
                <Text style={[styles.qty, { color: colors.text }]}>{line.quantity}</Text>
                <Pressable
                  onPress={() => setQty(line.variantId, line.quantity + 1)}
                  style={[styles.step, { borderColor: colors.border }]}>
                  <Text style={[styles.stepText, { color: colors.text }]}>+</Text>
                </Pressable>
              </View>
            </View>
          ))}

          <Text style={[styles.section, { color: colors.text }]}>Customer</Text>
          <Pressable
            onPress={() => setPickCustomer(true)}
            style={[styles.pick, cardShadow, { backgroundColor: colors.card }]}>
            <Text style={[styles.name, { color: customer ? colors.text : colors.muted }]}>
              {customer?.name ?? 'Optional for cash'}
            </Text>
          </Pressable>

          <Text style={[styles.section, { color: colors.text }]}>Payment</Text>
          <View style={styles.modes}>
            {(['cash', 'bank', 'credit'] as PaymentMode[]).map((key) => (
              <Pressable
                key={key}
                onPress={() => setMode(key)}
                style={[
                  styles.mode,
                  {
                    backgroundColor: mode === key ? colors.tint : colors.card,
                    borderColor: mode === key ? colors.tint : colors.border,
                  },
                ]}>
                <Text style={[styles.modeLabel, { color: mode === key ? '#fff' : colors.text }]}>
                  {key === 'cash' ? 'Cash' : key === 'bank' ? 'Bank' : 'Credit'}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={[styles.totalCard, cardShadow, { backgroundColor: colors.card }]}>
            <Text style={[styles.meta, { color: colors.muted }]}>Total</Text>
            <Text style={[styles.total, { color: colors.text }]}>{formatMoney(total)}</Text>
          </View>

          <PrimaryButton
            label={saving ? 'Saving…' : 'Save sale'}
            color={colors.tint}
            disabled={saving || cart.length === 0 || (mode === 'credit' && !customer)}
            onPress={() => void save()}
          />
        </ScrollView>
      </View>

      <Modal visible={pickCustomer} animationType="slide" onRequestClose={() => setPickCustomer(false)}>
        <View style={[styles.screen, { backgroundColor: colors.background, paddingTop: 56 }]}>
          <View style={styles.modalHead}>
            <Text style={[styles.section, { color: colors.text, marginBottom: 0 }]}>Customers</Text>
            <Pressable onPress={() => setPickCustomer(false)}>
              <Text style={{ color: colors.tint, fontWeight: '700', fontSize: 16 }}>Done</Text>
            </Pressable>
          </View>
          <View style={{ paddingHorizontal: 16 }}>
            <SearchBar value={customerQuery} onChangeText={setCustomerQuery} />
          </View>
          <FlatList
            data={visibleCustomers}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 16, gap: 10 }}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => {
                  setCustomer(item);
                  setPickCustomer(false);
                }}
                style={[styles.pick, cardShadow, { backgroundColor: colors.card }]}>
                <Text style={[styles.name, { color: colors.text }]}>{item.name}</Text>
              </Pressable>
            )}
          />
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 16, gap: 10, paddingBottom: 40 },
  section: { fontSize: 16, fontWeight: '700', marginTop: 8, marginBottom: 2 },
  pick: {
    borderRadius: cardRadius,
    paddingHorizontal: 14,
    paddingVertical: 14,
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  name: { fontSize: 16, fontWeight: '600' },
  meta: { fontSize: 13, marginTop: 3 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  step: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: { fontSize: 18, fontWeight: '700' },
  qty: { minWidth: 20, textAlign: 'center', fontSize: 16, fontWeight: '700' },
  modes: { flexDirection: 'row', gap: 8 },
  mode: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeLabel: { fontSize: 14, fontWeight: '700' },
  totalCard: { borderRadius: cardRadius, padding: 16 },
  total: { fontSize: 28, fontWeight: '800', marginTop: 4 },
  modalHead: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
