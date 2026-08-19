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
import type { NamedRow } from '@/types/models';

type Props = {
  permission: string;
  managePermission?: string;
  title: string;
  load: () => Promise<NamedRow[]>;
  onCreate?: (name: string) => Promise<void>;
  subtitle?: (row: NamedRow) => string;
};

export function NamedMaster({ permission, managePermission, title, load, onCreate, subtitle }: Props) {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const canManage = managePermission ? hasPermission(getSession(), managePermission) : Boolean(onCreate);
  const [rows, setRows] = useState<NamedRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await load());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load this data.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [load]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <ScreenGate permission={permission}>
      <View style={[styles.screen, { backgroundColor: colors.background }]}>
        {canManage && onCreate ? (
          <View style={styles.head}>
            <PrimaryButton label={`Add ${title.toLowerCase()}`} color={colors.tint} onPress={() => setOpen(true)} />
          </View>
        ) : null}
        {error ? (
          <Text style={[styles.err, { color: colors.danger }]}>{error}</Text>
        ) : null}
        <FlatList
          data={rows}
          keyExtractor={(item) => item.id}
          onRefresh={() => void refresh()}
          refreshing={loading}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          ListEmptyComponent={loading ? null : <EmptyState title={`No ${title.toLowerCase()}`} />}
          renderItem={({ item }) => (
            <View style={[styles.row, cardShadow, { backgroundColor: colors.card }]}>
              <Text style={[styles.name, { color: colors.text }]}>{item.name}</Text>
              {subtitle ? <Text style={[styles.meta, { color: colors.muted }]}>{subtitle(item)}</Text> : null}
            </View>
          )}
        />
        <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
          <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
            <Pressable style={[styles.sheet, { backgroundColor: colors.card }]} onPress={() => {}}>
              <Text style={[styles.name, { color: colors.text }]}>Add {title.toLowerCase()}</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Name"
                placeholderTextColor={colors.muted}
                style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              />
              <PrimaryButton
                label="Save"
                color={colors.tint}
                disabled={!name.trim()}
                onPress={async () => {
                  if (!onCreate) return;
                  await onCreate(name.trim());
                  setName('');
                  setOpen(false);
                  void refresh();
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
