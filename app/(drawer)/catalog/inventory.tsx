import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { CatalogBooks } from '@/components/CatalogBooks';
import { Card } from '@/components/FormKit';
import { ScreenGate } from '@/components/ScreenGate';
import { SearchBar } from '@/components/SearchBar';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { expiringBatches, subscribeErp } from '@/lib/erp';

export default function InventoryScreen() {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const [, tick] = useState(0);
  useEffect(() => subscribeErp(() => tick((n) => n + 1)), []);
  const [query, setQuery] = useState('');

  return (
    <ScreenGate permission="inventory.view">
      <View style={[styles.screen, { backgroundColor: colors.background }]}>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 40 }}>
          <SearchBar value={query} onChangeText={setQuery} placeholder="Search inventory" />
          <Card title="Batches expiring in 30 days">
            {expiringBatches().length ? (
              expiringBatches().map((row) => (
                <Text key={row.id} style={{ color: colors.text, fontWeight: '700', minHeight: 44 }}>
                  {row.product} · {row.batchNo}
                  {row.manufacturedDate ? ` · Made ${row.manufacturedDate}` : ''} · Expires {row.expiryDate} · Qty {row.qty}
                  {row.unit ? ` ${row.unit}` : ''}
                </Text>
              ))
            ) : (
              <Text style={{ color: colors.muted }}>None</Text>
            )}
          </Card>
          <CatalogBooks query={query} showProducts={false} />
        </ScrollView>
      </View>
    </ScreenGate>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
});
