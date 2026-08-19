import { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { EmptyState } from '@/components/EmptyState';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ScreenGate } from '@/components/ScreenGate';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { cardRadius, cardShadow } from '@/constants/layout';
import { formatQty } from '@/lib/format';
import { hasPermission } from '@/lib/permissions';
import { getSession } from '@/lib/rbac';
import { adjustStock, fetchInventory } from '@/lib/shopData';
import type { InventoryRow } from '@/types/models';

export default function InventoryScreen() {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const canManage = hasPermission(getSession(), 'inventory.manage');
  const [rows, setRows] = useState<InventoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState<InventoryRow | null>(null);
  const [qty, setQty] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await fetchInventory());
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <ScreenGate permission="inventory.view">
      <View style={[styles.screen, { backgroundColor: colors.background }]}>
        <FlatList
          data={rows}
          keyExtractor={(item) => item.variantId}
          refreshing={loading}
          onRefresh={() => void load()}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          ListEmptyComponent={loading ? null : <EmptyState title="No inventory" />}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => {
                if (!canManage) return;
                setEdit(item);
                setQty(String(item.stockQty));
              }}
              style={[styles.row, cardShadow, { backgroundColor: colors.card }]}>
              <Text style={[styles.name, { color: colors.text }]}>{item.name}</Text>
              <Text style={[styles.meta, { color: colors.muted }]}>
                {item.detail || 'Default'}  ·  Stock {formatQty(item.stockQty)}
              </Text>
            </Pressable>
          )}
        />
        <Modal visible={!!edit} transparent animationType="fade" onRequestClose={() => setEdit(null)}>
          <Pressable style={styles.backdrop} onPress={() => setEdit(null)}>
            <Pressable style={[styles.sheet, { backgroundColor: colors.card }]} onPress={() => {}}>
              <Text style={[styles.name, { color: colors.text }]}>{edit?.name}</Text>
              <TextInput
                value={qty}
                onChangeText={setQty}
                keyboardType="decimal-pad"
                style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              />
              <PrimaryButton
                label="Save stock"
                color={colors.tint}
                onPress={async () => {
                  if (!edit) return;
                  try {
                    await adjustStock(edit.variantId, Number(qty) || 0);
                    setEdit(null);
                    void load();
                  } catch (err) {
                    Alert.alert(err instanceof Error ? err.message : "Couldn't save.");
                  }
                }}
              />
            </Pressable>
          </Pressable>
        </Modal>
      </View>
    </ScreenGate>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  list: { padding: 16 },
  row: { borderRadius: cardRadius, padding: 16, minHeight: 64, justifyContent: 'center' },
  name: { fontSize: 16, fontWeight: '700' },
  meta: { marginTop: 4, fontSize: 13 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', padding: 24 },
  sheet: { borderRadius: 18, padding: 16, gap: 12 },
  input: { minHeight: 52, borderWidth: 1, borderRadius: 14, paddingHorizontal: 12, fontSize: 16 },
});
