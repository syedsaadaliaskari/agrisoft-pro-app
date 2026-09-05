import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { getActionSheet, hideActionSheet, subscribeActionSheet } from '@/lib/actionSheet';

export function AppActionSheet() {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const [, tick] = useState(0);
  useEffect(() => subscribeActionSheet(() => tick((n) => n + 1)), []);
  const sheet = getActionSheet();

  return (
    <Modal visible={!!sheet} transparent animationType="fade" onRequestClose={hideActionSheet}>
      <Pressable style={styles.backdrop} onPress={hideActionSheet}>
        <Pressable style={[styles.sheet, { backgroundColor: colors.card }]} onPress={() => {}}>
          <Text style={[styles.title, { color: colors.text }]}>{sheet?.title}</Text>
          {sheet?.message ? <Text style={[styles.message, { color: colors.muted }]}>{sheet.message}</Text> : null}
          {sheet?.options.map((option) => (
            <Pressable
              key={option.label}
              onPress={() => {
                hideActionSheet();
                setTimeout(option.onPress, 280);
              }}
              style={[styles.btn, { borderColor: option.danger ? colors.danger : colors.border }]}>
              <Text style={{ color: option.danger ? colors.danger : colors.tint, fontWeight: '800', fontSize: 16 }}>
                {option.label}
              </Text>
            </Pressable>
          ))}
          <Pressable onPress={hideActionSheet} style={[styles.btn, { borderColor: colors.border }]}>
            <Text style={{ color: colors.muted, fontWeight: '700', fontSize: 16 }}>Cancel</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: '#0007', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20, gap: 10, paddingBottom: 28 },
  title: { fontSize: 18, fontWeight: '600' },
  message: { fontSize: 14, lineHeight: 20, marginBottom: 4 },
  btn: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
});
