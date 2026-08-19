import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { PrimaryButton } from '@/components/PrimaryButton';
import { cardRadius, cardShadow } from '@/constants/layout';
import { getSession } from '@/lib/rbac';
import {
  createClientCompany,
  deleteClientCompany,
  getCompaniesDemand,
  hydrateVendor,
  listClientCompanies,
  subscribeVendor,
  updateClientCompany,
  type ClientCompany,
} from '@/lib/vendor';
import { todayIsoDate } from '@/lib/activation';

const emptyForm = {
  companyName: '',
  area: '',
  joinedAt: todayIsoDate(),
  notes: '',
  isActive: true,
};

export function VendorDashboard() {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const user = getSession();
  const [, setTick] = useState(0);
  useEffect(() => {
    void hydrateVendor().then(() => setTick((n) => n + 1));
    return subscribeVendor(() => setTick((n) => n + 1));
  }, []);
  const companies = listClientCompanies();
  const demand = getCompaniesDemand();
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const cardBase = [cardShadow, { backgroundColor: colors.card, borderRadius: cardRadius }];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const maxArea = Math.max(1, ...demand.areaDemand.map((row) => row.companyCount));
  const activeCompanies = useMemo(() => companies.filter((row) => row.isActive), [companies]);

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...emptyForm, joinedAt: todayIsoDate() });
    setFormOpen(true);
    setError(null);
  };

  const openEdit = (row: ClientCompany) => {
    setEditingId(row.id);
    setForm({
      companyName: row.companyName,
      area: row.area,
      joinedAt: row.joinedAt.slice(0, 10),
      notes: row.notes ?? '',
      isActive: row.isActive,
    });
    setFormOpen(true);
    setError(null);
  };

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const payload = {
        companyName: form.companyName,
        area: form.area,
        joinedAt: form.joinedAt,
        notes: form.notes || null,
        isActive: form.isActive,
      };
      if (editingId) await updateClientCompany(editingId, payload);
      else await createClientCompany(payload);
      setFormOpen(false);
      setTick((n) => n + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save.");
    } finally {
      setBusy(false);
    }
  };

  const kpis = [
    { label: 'Total companies', value: String(demand.totalCompanies), sub: 'Registered clients' },
    {
      label: 'Active now',
      value: String(demand.activeCompanies),
      sub: `${Math.max(0, demand.totalCompanies - demand.activeCompanies)} inactive`,
    },
    { label: 'Areas covered', value: String(demand.areaDemand.length), sub: 'Cities / regions' },
    {
      label: 'Top area',
      value: demand.areaDemand[0]?.area ?? '—',
      sub: demand.areaDemand[0] ? `${demand.areaDemand[0].companyCount} companies` : 'Add companies',
    },
  ];

  return (
    <ScrollView style={[styles.screen, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      <Text style={[styles.greet, { color: colors.tint }]}>
        {greeting}
        {user?.fullName ? ` · ${user.fullName.split(' ')[0]}` : ''}
      </Text>
      <Text style={[styles.title, { color: colors.text }]}>Vendor command center</Text>
      <Text style={[styles.sub, { color: colors.muted }]}>
        Active client companies, the area they belong to, and demand by area.
      </Text>

      <View style={styles.grid}>
        {kpis.map((kpi) => (
          <View key={kpi.label} style={[styles.stat, cardBase]}>
            <Text style={[styles.cardLabel, { color: colors.muted }]}>{kpi.label}</Text>
            <Text style={[styles.statValue, { color: colors.text }]} numberOfLines={1}>
              {kpi.value}
            </Text>
            <Text style={[styles.meta, { color: colors.muted }]}>{kpi.sub}</Text>
          </View>
        ))}
      </View>

      <View style={[styles.block, cardBase]}>
        <Text style={[styles.blockTitle, { color: colors.text }]}>Demand by area</Text>
        {demand.areaDemand.length ? (
          demand.areaDemand.map((row) => (
            <View key={row.area} style={styles.mixRow}>
              <View style={styles.mixHead}>
                <Text style={[styles.mixLabel, { color: colors.text }]}>{row.area}</Text>
                <Text style={[styles.mixValue, { color: colors.muted }]}>{row.companyCount}</Text>
              </View>
              <View style={[styles.track, { backgroundColor: colors.tintSoft }]}>
                <View
                  style={[
                    styles.fill,
                    {
                      width: `${Math.max(8, (row.companyCount / maxArea) * 100)}%`,
                      backgroundColor: colors.tint,
                    },
                  ]}
                />
              </View>
            </View>
          ))
        ) : (
          <Text style={[styles.meta, { color: colors.muted }]}>Add companies to see demand</Text>
        )}
      </View>

      <View style={[styles.block, cardBase]}>
        <View style={styles.rowBetween}>
          <Text style={[styles.blockTitle, { color: colors.text }]}>Active companies</Text>
          <Pressable onPress={openCreate}>
            <Text style={{ color: colors.tint, fontWeight: '800' }}>Add company</Text>
          </Pressable>
        </View>
        {activeCompanies.length ? (
          activeCompanies.map((row) => (
            <View key={row.id} style={[styles.company, { borderBottomColor: colors.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.name, { color: colors.text }]}>{row.companyName}</Text>
                <Text style={[styles.meta, { color: colors.muted }]}>
                  {row.area} · joined {row.joinedAt.slice(0, 10)}
                </Text>
              </View>
              <Pressable onPress={() => openEdit(row)}>
                <Text style={{ color: colors.tint, fontWeight: '700' }}>Edit</Text>
              </Pressable>
              <Pressable
                onPress={() =>
                  Alert.alert('Remove company', `Remove ${row.companyName}?`, [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Remove',
                      style: 'destructive',
                      onPress: () => {
                        void deleteClientCompany(row.id).then(() => setTick((n) => n + 1));
                      },
                    },
                  ])
                }>
                <Text style={{ color: colors.danger, fontWeight: '700' }}>Remove</Text>
              </Pressable>
            </View>
          ))
        ) : (
          <Text style={[styles.meta, { color: colors.muted }]}>No active companies yet</Text>
        )}

        {companies.some((row) => !row.isActive) ? (
          <>
            <Text style={[styles.inactiveHead, { color: colors.muted }]}>Inactive</Text>
            {companies
              .filter((row) => !row.isActive)
              .map((row) => (
                <View key={row.id} style={[styles.company, { borderBottomColor: colors.border }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.name, { color: colors.text }]}>{row.companyName}</Text>
                    <Text style={[styles.meta, { color: colors.muted }]}>{row.area}</Text>
                  </View>
                  <Pressable onPress={() => openEdit(row)}>
                    <Text style={{ color: colors.tint, fontWeight: '700' }}>Edit</Text>
                  </Pressable>
                </View>
              ))}
          </>
        ) : null}
      </View>

      {formOpen ? (
        <View style={[styles.block, cardBase]}>
          <Text style={[styles.blockTitle, { color: colors.text }]}>
            {editingId ? 'Edit company' : 'Add company'}
          </Text>
          <TextInput
            value={form.companyName}
            onChangeText={(companyName) => setForm((current) => ({ ...current, companyName }))}
            placeholder="Company name"
            placeholderTextColor={colors.muted}
            style={[styles.input, { color: colors.text, borderColor: colors.border }]}
          />
          <TextInput
            value={form.area}
            onChangeText={(area) => setForm((current) => ({ ...current, area }))}
            placeholder="Area / city"
            placeholderTextColor={colors.muted}
            style={[styles.input, { color: colors.text, borderColor: colors.border }]}
          />
          <TextInput
            value={form.joinedAt}
            onChangeText={(joinedAt) => setForm((current) => ({ ...current, joinedAt }))}
            placeholder="Joined date (YYYY-MM-DD)"
            placeholderTextColor={colors.muted}
            style={[styles.input, { color: colors.text, borderColor: colors.border }]}
          />
          <TextInput
            value={form.notes}
            onChangeText={(notes) => setForm((current) => ({ ...current, notes }))}
            placeholder="Notes (optional)"
            placeholderTextColor={colors.muted}
            style={[styles.input, { color: colors.text, borderColor: colors.border }]}
          />
          <View style={styles.roles}>
            {([true, false] as const).map((value) => (
              <Pressable
                key={String(value)}
                onPress={() => setForm((current) => ({ ...current, isActive: value }))}
                style={[
                  styles.chip,
                  {
                    borderColor: colors.border,
                    backgroundColor: form.isActive === value ? colors.tint : colors.card,
                  },
                ]}>
                <Text style={{ color: form.isActive === value ? '#fff' : colors.text, fontWeight: '700' }}>
                  {value ? 'Active' : 'Inactive'}
                </Text>
              </Pressable>
            ))}
          </View>
          {error ? <Text style={{ color: colors.danger, fontWeight: '600' }}>{error}</Text> : null}
          <PrimaryButton label={busy ? 'Saving…' : 'Save company'} color={colors.tint} disabled={busy} onPress={() => void save()} />
          <PrimaryButton
            label="Cancel"
            tone="ghost"
            color={colors.muted}
            onPress={() => setFormOpen(false)}
          />
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  greet: { fontSize: 12, fontWeight: '800', letterSpacing: 0.6, textTransform: 'uppercase' },
  title: { fontSize: 22, fontWeight: '800', marginTop: -4 },
  sub: { fontSize: 14, marginTop: -6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  stat: { width: '48%', flexGrow: 1, padding: 14, minHeight: 88, justifyContent: 'center' },
  cardLabel: { fontSize: 12, fontWeight: '700', marginBottom: 6, textTransform: 'uppercase' },
  statValue: { fontSize: 22, fontWeight: '800' },
  meta: { fontSize: 13, marginTop: 4 },
  block: { padding: 16, gap: 12 },
  blockTitle: { fontSize: 16, fontWeight: '800' },
  mixRow: { gap: 6 },
  mixHead: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  mixLabel: { fontSize: 15, fontWeight: '600', flex: 1 },
  mixValue: { fontSize: 14, fontWeight: '700' },
  track: { height: 10, borderRadius: 99, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 99 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  company: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  name: { fontSize: 16, fontWeight: '700' },
  inactiveHead: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase', marginTop: 8 },
  input: { minHeight: 48, borderWidth: 1, borderRadius: 14, paddingHorizontal: 12, fontSize: 16 },
  roles: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1 },
});
