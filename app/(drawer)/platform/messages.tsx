import { useCallback, useEffect, useMemo, useState } from 'react';
import { Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Card, Chips } from '@/components/FormKit';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ScreenGate } from '@/components/ScreenGate';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { font, typeScale } from '@/constants/theme';
import { fetchCloudLicenses } from '@/lib/vendorLicensesCloud';
import {
  filterLicenses,
  licenseExpiresLabel,
  licenseStatusLabel,
  type CloudLicense,
  type LicenseListFilter,
} from '@/lib/vendorLicenseUi';
import {
  VENDOR_MESSAGE_TEMPLATES,
  fillVendorMessage,
  vendorWhatsAppUrl,
  whatsappDigits,
  type VendorMsgLang,
} from '@/lib/vendorMessages';

export default function VendorMessagesScreen() {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const [rows, setRows] = useState<CloudLicense[]>([]);
  const [filter, setFilter] = useState<LicenseListFilter>('all');
  const [lang, setLang] = useState<VendorMsgLang>('en');
  const [templateId, setTemplateId] = useState('renewal_en');
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [queue, setQueue] = useState<CloudLicense[]>([]);
  const [queueIndex, setQueueIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

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

  const templates = useMemo(() => VENDOR_MESSAGE_TEMPLATES.filter((t) => t.lang === lang), [lang]);
  useEffect(() => {
    if (!templates.some((t) => t.id === templateId)) {
      setTemplateId(templates[0]?.id ?? '');
    }
  }, [templates, templateId]);
  const template = templates.find((t) => t.id === templateId) ?? templates[0];

  const visible = useMemo(() => filterLicenses(rows, filter), [rows, filter]);
  const selectedRows = visible.filter((row) => selected[row.id]);
  const withPhone = selectedRows.filter((row) => whatsappDigits(row.phone));

  const previewText = template
    ? fillVendorMessage(template.body, {
        name: withPhone[0]?.name || selectedRows[0]?.name || 'Company',
        plan: withPhone[0]?.plan || selectedRows[0]?.plan || 'yearly',
        expires: licenseExpiresLabel(withPhone[0] || selectedRows[0] || { plan: 'forever', expiresAt: null }),
      })
    : '';

  const openRow = async (row: CloudLicense) => {
    if (!template) return;
    const digits = whatsappDigits(row.phone);
    if (!digits) {
      setError(`No phone on ${row.name}`);
      return;
    }
    const text = fillVendorMessage(template.body, {
      name: row.name,
      plan: row.plan,
      expires: licenseExpiresLabel(row),
    });
    await Linking.openURL(vendorWhatsAppUrl(row.phone, text));
    setOkMsg(`WhatsApp opened for ${row.name}. Tap Send.`);
    setError(null);
  };

  const startQueue = async () => {
    if (!withPhone.length) {
      setError('Select companies that have a phone number');
      return;
    }
    setQueue(withPhone);
    setQueueIndex(0);
    await openRow(withPhone[0]);
  };

  const openNext = async () => {
    const next = queueIndex + 1;
    if (next >= queue.length) {
      setOkMsg('All selected chats opened. Tap Send on each.');
      setQueue([]);
      setQueueIndex(0);
      return;
    }
    setQueueIndex(next);
    await openRow(queue[next]);
  };

  return (
    <ScreenGate permission="license.view">
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void load()} tintColor={colors.tint} />}>
        <Text style={[styles.hint, { color: colors.muted }]}>
          Free WhatsApp only. Pick companies, choose English or Urdu, then open WhatsApp with the message filled in. You tap
          Send.
        </Text>
        <Chips
          value={lang}
          onChange={setLang}
          options={[
            { value: 'en', label: 'English' },
            { value: 'ur', label: 'Urdu' },
          ]}
        />
        <Chips
          value={template?.id ?? ''}
          onChange={setTemplateId}
          options={templates.map((t) => ({ value: t.id, label: t.name }))}
        />
        <Chips
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: 'All' },
            { value: 'active', label: 'Active' },
            { value: 'ended', label: 'Ended' },
          ]}
        />
        <Card title="Preview">
          <Text style={[styles.preview, { color: colors.text }]}>{previewText}</Text>
        </Card>
        <PrimaryButton
          label={`Open WhatsApp (${withPhone.length})`}
          color={colors.tint}
          disabled={!withPhone.length}
          onPress={() => void startQueue()}
        />
        {queue.length > 0 ? (
          <PrimaryButton
            label={`Next (${Math.min(queueIndex + 1, queue.length)} / ${queue.length})`}
            tone="secondary"
            color={colors.tint}
            onPress={() => void openNext()}
          />
        ) : null}
        {error ? <Text style={{ color: colors.danger, fontWeight: '600' }}>{error}</Text> : null}
        {okMsg ? <Text style={{ color: colors.tint, fontWeight: '600' }}>{okMsg}</Text> : null}

        {visible.map((row) => {
          const hasPhone = Boolean(whatsappDigits(row.phone));
          const on = Boolean(selected[row.id]);
          return (
            <Pressable
              key={row.id}
              onPress={() => setSelected((prev) => ({ ...prev, [row.id]: !on }))}
              style={[styles.row, { backgroundColor: colors.card, borderColor: on ? colors.tint : colors.border }]}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[styles.company, { color: colors.text }]}>{row.name}</Text>
                <Text style={[styles.meta, { color: colors.muted }]}>
                  {row.phone || 'No phone'} · {row.plan} · {licenseExpiresLabel(row)} · {licenseStatusLabel(row)}
                </Text>
              </View>
              <Pressable
                onPress={() => void openRow(row)}
                disabled={!hasPhone}
                style={{ minHeight: 44, justifyContent: 'center' }}>
                <Text style={{ color: hasPhone ? colors.tint : colors.muted, fontWeight: '700' }}>
                  {hasPhone ? 'WhatsApp' : 'No phone'}
                </Text>
              </Pressable>
            </Pressable>
          );
        })}
      </ScrollView>
    </ScreenGate>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  hint: { ...font, fontSize: typeScale.body },
  preview: { ...font, fontSize: typeScale.body, lineHeight: 20 },
  row: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  company: { ...font, fontSize: typeScale.body, fontWeight: '600' },
  meta: { ...font, fontSize: typeScale.label },
});
