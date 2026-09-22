import { useEffect, useState } from 'react';
import { Href, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { cardRadius, cardShadow } from '@/constants/layout';
import { font, overline, typeScale } from '@/constants/theme';
import { getSession } from '@/lib/rbac';
import { fetchCloudLicenses } from '@/lib/vendorLicensesCloud';
import { licenseEnded } from '@/lib/vendorLicenseUi';

export function VendorDashboard() {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const router = useRouter();
  const user = getSession();
  const [active, setActive] = useState(0);
  const [ended, setEnded] = useState(0);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    void fetchCloudLicenses()
      .then((rows) => {
        setTotal(rows.length);
        setEnded(rows.filter((row) => licenseEnded(row)).length);
        setActive(rows.filter((row) => !licenseEnded(row)).length);
      })
      .catch(() => {
        setTotal(0);
        setActive(0);
        setEnded(0);
      });
  }, []);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={styles.content}>
      <Text style={[styles.title, { color: colors.text }]}>Activated companies</Text>
      <Text style={[styles.sub, { color: colors.muted }]}>
        {user?.fullName ? `${user.fullName} · ` : ''}Live list from desktop upload
      </Text>
      <View style={styles.grid}>
        <View style={[styles.stat, cardShadow, { backgroundColor: colors.card }]}>
          <Text style={[styles.label, { color: colors.muted }]}>All</Text>
          <Text style={[styles.value, { color: colors.text }]}>{total}</Text>
        </View>
        <View style={[styles.stat, cardShadow, { backgroundColor: colors.card }]}>
          <Text style={[styles.label, { color: colors.muted }]}>Active</Text>
          <Text style={[styles.value, { color: colors.success }]}>{active}</Text>
        </View>
        <View style={[styles.stat, cardShadow, { backgroundColor: colors.card }]}>
          <Text style={[styles.label, { color: colors.muted }]}>Ended</Text>
          <Text style={[styles.value, { color: colors.danger }]}>{ended}</Text>
        </View>
      </View>
      <Pressable
        onPress={() => router.push('/platform/licenses' as Href)}
        style={[styles.link, cardShadow, { backgroundColor: colors.card }]}>
        <Text style={[styles.linkTitle, { color: colors.text }]}>Activated list</Text>
        <Text style={{ color: colors.muted }}>Company, phone, plan, dates, status</Text>
      </Pressable>
      <Pressable
        onPress={() => router.push('/platform/messages' as Href)}
        style={[styles.link, cardShadow, { backgroundColor: colors.card }]}>
        <Text style={[styles.linkTitle, { color: colors.text }]}>Messages</Text>
        <Text style={{ color: colors.muted }}>English / Urdu WhatsApp. You tap Send.</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  title: { ...font, fontSize: 22, fontWeight: '600' },
  sub: { ...font, fontSize: typeScale.body, marginTop: -4 },
  grid: { flexDirection: 'row', gap: 10 },
  stat: { flex: 1, borderRadius: cardRadius, padding: 14, minHeight: 80, justifyContent: 'center' },
  label: { ...overline, marginBottom: 6 },
  value: { ...font, fontSize: 22, fontWeight: '700' },
  link: { borderRadius: cardRadius, padding: 16, gap: 4, minHeight: 72, justifyContent: 'center' },
  linkTitle: { ...font, fontSize: typeScale.section, fontWeight: '600' },
});
