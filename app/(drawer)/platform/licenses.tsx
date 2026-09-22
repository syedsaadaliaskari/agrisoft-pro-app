import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Card, Chips } from '@/components/FormKit';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ScreenGate } from '@/components/ScreenGate';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { font, typeScale } from '@/constants/theme';
import { sharePdfFromHtml, showShareError } from '@/lib/shareOut';
import { fetchCloudLicenses } from '@/lib/vendorLicensesCloud';
import {
  activatedListPdfHtml,
  filterLicenses,
  licenseExpiresLabel,
  licenseStatusLabel,
  toLicenseExportRow,
  type CloudLicense,
  type LicenseListFilter,
} from '@/lib/vendorLicenseUi';

export default function ActivatedListScreen() {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const [rows, setRows] = useState<CloudLicense[]>([]);
  const [filter, setFilter] = useState<LicenseListFilter>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(await fetchCloudLicenses());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load this data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = useMemo(() => filterLicenses(rows, filter), [rows, filter]);

  const sharePdf = async () => {
    try {
      await sharePdfFromHtml(activatedListPdfHtml(visible.map(toLicenseExportRow)), 'Activated companies');
    } catch (err) {
      showShareError(err);
    }
  };

  return (
    <ScreenGate permission="license.view">
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void load()} tintColor={colors.tint} />}>
        <Chips
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: 'All' },
            { value: 'active', label: 'Active' },
            { value: 'ended', label: 'Ended' },
          ]}
        />
        <PrimaryButton label="Share PDF" tone="secondary" color={colors.tint} onPress={() => void sharePdf()} />
        {error ? <Text style={[styles.err, { color: colors.danger }]}>{error}</Text> : null}
        {!loading && !visible.length ? (
          <Card title="Activated list">
            <Text style={{ color: colors.text, fontWeight: '600' }}>
              On desktop Super Admin → Activated list → Upload to phone
            </Text>
          </Card>
        ) : (
          visible.map((row) => {
            const ended = licenseStatusLabel(row) === 'Ended';
            return (
              <View key={row.id} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.company, { color: colors.text }]}>{row.name}</Text>
                <Text style={[styles.meta, { color: colors.muted }]}>Phone {row.phone || '—'}</Text>
                <Text style={[styles.meta, { color: colors.muted }]}>Plan {row.plan}</Text>
                <Text style={[styles.meta, { color: colors.muted }]}>Start {row.activatedAt}</Text>
                <Text style={[styles.meta, { color: colors.muted }]}>End {licenseExpiresLabel(row)}</Text>
                <Text style={[styles.status, { color: ended ? colors.danger : colors.success }]}>
                  {licenseStatusLabel(row)}
                </Text>
              </View>
            );
          })
        )}
      </ScrollView>
    </ScreenGate>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  card: { borderWidth: 1, borderRadius: 16, padding: 16, gap: 4 },
  company: { ...font, fontSize: typeScale.section, fontWeight: '600' },
  meta: { ...font, fontSize: typeScale.body },
  status: { ...font, fontSize: typeScale.label, fontWeight: '700', marginTop: 4 },
  err: { ...font, fontSize: typeScale.body, fontWeight: '600' },
});
