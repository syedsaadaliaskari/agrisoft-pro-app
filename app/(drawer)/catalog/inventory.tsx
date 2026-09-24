import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { CatalogBooks } from '@/components/CatalogBooks';
import { ScreenGate } from '@/components/ScreenGate';
import { SearchBar } from '@/components/SearchBar';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { subscribeErp } from '@/lib/erp';

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
          <CatalogBooks query={query} showProducts={false} />
        </ScrollView>
      </View>
    </ScreenGate>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
});
