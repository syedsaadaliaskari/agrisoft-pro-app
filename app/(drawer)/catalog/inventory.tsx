import { useEffect, useState } from 'react';
import { Alert, FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { EmptyState } from '@/components/EmptyState';
import { ScreenGate } from '@/components/ScreenGate';
import { PrimaryButton } from '@/components/PrimaryButton';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { cardRadius, cardShadow } from '@/constants/layout';
import { adjustStock, inventoryRows, subscribeErp } from '@/lib/erp';
import { hasPermission } from '@/lib/permissions';
import { getSession } from '@/lib/rbac';

export default function InventoryScreen() {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const can = hasPermission(getSession(), 'inventory.manage');
  const [, tick] = useState(0);
  useEffect(() => subscribeErp(() => tick((n) => n + 1)), []);
  const rows = inventoryRows();
  const [edit, setEdit] = useState<(typeof rows)[number] | null>(null);
  const [qty, setQty] = useState('');

  return (
    <ScreenGate permission="inventory.view">
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <FlatList
          data={rows}
          keyExtractor={(item) => item.variantId}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          ListEmptyComponent={<EmptyState title="No inventory" />}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => {
                if (!can) return;
                setEdit(item);
                setQty(String(item.stockQty));
              }}
              style={[styles.row, cardShadow, { backgroundColor: colors.card }]}>
              <Text style={{ color: colors.text, fontWeight: '800' }}>{item.name}</Text>
              <Text style={{ color: item.isLow ? colors.danger : colors.muted }}>
                {item.detail || 'Default'} · Stock {item.stockQty}
                {item.isLow ? ' · low' : ''}
              </Text>
            </Pressable>
          )}
        />
        <Modal visible={!!edit} transparent animationType="fade" onRequestClose={() => setEdit(null)}>
          <Pressable style={styles.backdrop} onPress={() => setEdit(null)}>
            <Pressable style={[styles.sheet, { backgroundColor: colors.card }]} onPress={() => {}}>
              <Text style={{ color: colors.text, fontWeight: '800' }}>{edit?.name}</Text>
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
  row: { borderRadius: cardRadius, padding: 14, gap: 4 },
  backdrop: { flex: 1, backgroundColor: '#0006', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, gap: 12 },
  input: { minHeight: 48, borderWidth: 1, borderRadius: 14, paddingHorizontal: 12 },
});
