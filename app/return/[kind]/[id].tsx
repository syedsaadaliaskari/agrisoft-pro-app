import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';

import { Card, Field } from '@/components/FormKit';
import { PrimaryButton } from '@/components/PrimaryButton';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import {
  createPurchaseReturn,
  createSaleReturn,
  getPurchase,
  getSale,
  money,
  subscribeErp,
} from '@/lib/erp';

export default function ReturnDocScreen() {
  const { kind, id } = useLocalSearchParams<{ kind: string; id: string }>();
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const router = useRouter();
  const [, tick] = useState(0);
  useEffect(() => subscribeErp(() => tick((n) => n + 1)), []);
  const sale = kind === 'sale' ? getSale(id) : null;
  const purchase = kind === 'purchase' ? getPurchase(id) : null;
  const source = sale ?? purchase;
  const [qty, setQty] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      <Stack.Screen options={{ title: kind === 'sale' ? 'Sale return' : 'Purchase return' }} />
      <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: 16, gap: 12 }}>
        {!source ? (
          <Text style={{ color: colors.muted }}>Document not found.</Text>
        ) : (
          <Card title={sale ? sale.invoiceNo : purchase?.invoiceNo}>
            {source.items.map((line) => (
              <View key={line.variantId} style={{ gap: 6 }}>
                <Text style={{ color: colors.text, fontWeight: '800' }}>
                  {line.productName} · sold {line.quantity} · {money(line.unitPrice)}
                </Text>
                <Field
                  label="Return qty"
                  value={qty[line.variantId] ?? String(line.quantity)}
                  onChangeText={(v) => setQty((c) => ({ ...c, [line.variantId]: v }))}
                  keyboardType="decimal-pad"
                />
              </View>
            ))}
            {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}
            <PrimaryButton
              label="Save return"
              color={colors.tint}
              onPress={async () => {
                setError(null);
                try {
                  const items = source.items
                    .map((line) => ({ variantId: line.variantId, quantity: Number(qty[line.variantId] ?? line.quantity) }))
                    .filter((l) => l.quantity > 0);
                  if (kind === 'sale') await createSaleReturn({ saleId: source.id, items });
                  else await createPurchaseReturn({ purchaseId: source.id, items });
                  router.back();
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Couldn't save.");
                }
              }}
            />
          </Card>
        )}
      </ScrollView>
    </>
  );
}
