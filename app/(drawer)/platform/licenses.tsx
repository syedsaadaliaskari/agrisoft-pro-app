import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ScreenGate } from '@/components/ScreenGate';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { cardRadius, cardShadow } from '@/constants/layout';
import { deleteLicense, hydrateVendor, listLicenses, subscribeVendor } from '@/lib/vendor';
import type { LicenseRow } from '@/lib/activation';
import { shareTextOrFile, showShareError } from '@/lib/shareOut';

export default function ActivatedListScreen() {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const [rows, setRows] = useState<LicenseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    await hydrateVendor();
    setRows(await listLicenses());
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
    return subscribeVendor(() => {
      void listLicenses().then(setRows);
    });
  }, [load]);

  return (
    <ScreenGate permission="license.view">
      <ScrollView
        style={[styles.screen, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.tint} />}>
        <Text style={[styles.hint, { color: colors.muted }]}>
          Share the activation code with the shop. Stop access removes the record from this list.
        </Text>
        {msg ? <Text style={[styles.ok, { color: colors.tint }]}>{msg}</Text> : null}
        {!loading && !rows.length ? (
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <Text style={[styles.empty, { color: colors.text }]}>No activated companies yet</Text>
            <Text style={[styles.hint, { color: colors.muted }]}>
              Open Settings → License, paste an Install ID, then activate.
            </Text>
          </View>
        ) : (
          rows.map((row) => (
            <View key={row.id} style={[styles.card, { backgroundColor: colors.card }]}>
              <Text style={[styles.name, { color: colors.text }]}>{row.name}</Text>
              <Text selectable style={[styles.mono, { color: colors.muted }]}>
                {row.installId}
              </Text>
              <Text style={[styles.meta, { color: colors.muted }]}>
                {row.plan} · activated {row.activatedAt} · expires {row.expiresAt ?? 'Never'}
              </Text>
              <Text selectable style={[styles.code, { color: colors.text, backgroundColor: colors.tintSoft }]}>
                {row.activationCode}
              </Text>
              <View style={styles.actions}>
                <Pressable
                  onPress={() => {
                    void shareTextOrFile({
                      filename: 'activation-code.txt',
                      mime: 'text/plain',
                      contents: row.activationCode,
                      title: `Activation ${row.name}`,
                    })
                      .then(() => setMsg(`Activation code ready for ${row.name}.`))
                      .catch(showShareError);
                  }}>
                  <Text style={{ color: colors.tint, fontWeight: '800' }}>Share code</Text>
                </Pressable>
                <Pressable
                  onPress={() =>
                    Alert.alert(
                      'Stop access',
                      `Remove activation for ${row.name}? Their PC stays unlocked until they lose the code or you stop access on that machine.`,
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Stop',
                          style: 'destructive',
                          onPress: () => {
                            void deleteLicense(row.id).then(() => {
                              setMsg(`Removed activation for ${row.name}.`);
                              void load();
                            });
                          },
                        },
                      ],
                    )
                  }>
                  <Text style={{ color: colors.danger, fontWeight: '800' }}>Stop access</Text>
                </Pressable>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </ScreenGate>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  hint: { fontSize: 13, lineHeight: 18 },
  ok: { fontSize: 14, fontWeight: '700' },
  card: { borderRadius: cardRadius, padding: 16, gap: 8, ...cardShadow },
  empty: { fontSize: 16, fontWeight: '800' },
  name: { fontSize: 17, fontWeight: '800' },
  mono: { fontSize: 13, fontFamily: 'monospace' },
  meta: { fontSize: 13 },
  code: { fontSize: 12, lineHeight: 18, padding: 10, borderRadius: 12 },
  actions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
});
