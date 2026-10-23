import { useCallback, useEffect, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { EmptyState } from '@/components/EmptyState';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ScreenGate } from '@/components/ScreenGate';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { cardRadius, cardShadow } from '@/constants/layout';
import { hasPermission } from '@/lib/permissions';
import { getSession } from '@/lib/rbac';
import { listUnits, subscribeErp, upsertNamed } from '@/lib/erp';

export default function UnitsScreen() {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const canManage = hasPermission(getSession(), 'products.manage');
  const [rows, setRows] = useState(listUnits());
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [shortName, setShortName] = useState('');
  const [equalsKg, setEqualsKg] = useState('');
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => setRows(listUnits()), []);
  useEffect(() => subscribeErp(refresh), [refresh]);

  const openNew = () => {
    setEditingId(null);
    setName('');
    setShortName('');
    setEqualsKg('');
    setError(null);
    setOpen(true);
  };

  return (
    <ScreenGate permission="products.view">
      <View style={[styles.screen, { backgroundColor: colors.background }]}>
        {canManage ? (
          <View style={styles.head}>
            <PrimaryButton label="New unit" color={colors.tint} onPress={openNew} />
          </View>
        ) : null}
        {error && !open ? <Text style={[styles.err, { color: colors.danger }]}>{error}</Text> : null}
        <FlatList
          data={rows}
          keyExtractor={(item) => item.id}
          onRefresh={refresh}
          refreshing={false}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          ListEmptyComponent={<EmptyState title="No units" />}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => {
                if (!canManage) return;
                setEditingId(item.id);
                setName(item.name);
                setShortName(item.shortName || '');
                setEqualsKg(item.equalsKg == null ? '' : String(item.equalsKg));
                setError(null);
                setOpen(true);
              }}
              style={[styles.row, cardShadow, { backgroundColor: colors.card }]}>
              <Text style={[styles.name, { color: colors.text }]}>{item.name}</Text>
              <Text style={[styles.meta, { color: colors.muted }]}>
                {item.shortName || ''}
                {item.equalsKg ? ` · ${item.equalsKg} kg` : ''}
              </Text>
            </Pressable>
          )}
        />
        <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
          <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
            <Pressable style={[styles.sheet, { backgroundColor: colors.card }]} onPress={() => {}}>
              <Text style={[styles.name, { color: colors.text }]}>{editingId ? 'Edit unit' : 'New unit'}</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Name"
                placeholderTextColor={colors.muted}
                style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              />
              <TextInput
                value={shortName}
                onChangeText={setShortName}
                placeholder="Short name"
                placeholderTextColor={colors.muted}
                style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              />
              <TextInput
                value={equalsKg}
                onChangeText={setEqualsKg}
                placeholder="Equals kg"
                placeholderTextColor={colors.muted}
                keyboardType="decimal-pad"
                style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              />
              {error ? <Text style={{ color: colors.danger, fontWeight: '700' }}>{error}</Text> : null}
              <PrimaryButton
                label="Save"
                color={colors.tint}
                disabled={!name.trim()}
                onPress={() => {
                  const parsed = equalsKg.trim() ? Number(equalsKg) : null;
                  if (parsed != null && (!(parsed > 0) || Number.isNaN(parsed))) {
                    setError('Equals kg must be greater than 0');
                    return;
                  }
                  void upsertNamed('units', {
                    id: editingId ?? undefined,
                    name: name.trim(),
                    shortName: shortName.trim() || name.trim().slice(0, 6),
                    equalsKg: parsed,
                  })
                    .then(() => {
                      setOpen(false);
                      setError(null);
                      refresh();
                    })
                    .catch((err) => setError(err instanceof Error ? err.message : "Couldn't save."));
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
  head: { padding: 16, paddingBottom: 8 },
  list: { padding: 16, paddingBottom: 32 },
  row: { borderRadius: cardRadius, padding: 16, minHeight: 64, justifyContent: 'center' },
  name: { fontSize: 16, fontWeight: '700' },
  meta: { marginTop: 4, fontSize: 13 },
  err: { paddingHorizontal: 16, fontWeight: '600' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', padding: 24 },
  sheet: { borderRadius: 18, padding: 16, gap: 12 },
  input: { minHeight: 52, borderWidth: 1, borderRadius: 14, paddingHorizontal: 12, fontSize: 16 },
});
