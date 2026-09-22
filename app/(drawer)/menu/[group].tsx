import type { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Href, Redirect, Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { cardRadius, cardShadow, pagePadding } from '@/constants/layout';
import { font, typeScale } from '@/constants/theme';
import { GroupWeekChart } from '@/components/HubCharts';
import { subscribeLocale, t, tNav } from '@/lib/i18n';
import { hubGroupByKey, navGroupKey } from '@/lib/nav';
import { getSession, signOut, subscribeSession } from '@/lib/rbac';

type IconName = ComponentProps<typeof Ionicons>['name'];

export default function MenuGroupScreen() {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const router = useRouter();
  const { group: groupKey } = useLocalSearchParams<{ group: string }>();
  const [, tick] = useState(0);
  useEffect(() => {
    const a = subscribeLocale(() => tick((n) => n + 1));
    const b = subscribeSession(() => tick((n) => n + 1));
    return () => {
      a();
      b();
    };
  }, []);

  const found = hubGroupByKey(String(groupKey ?? ''), getSession());
  if (!found) {
    return <Redirect href="/" />;
  }

  return (
    <>
      <Stack.Screen options={{ title: tNav(found.title) }} />
      <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={styles.content}>
        <View style={styles.grid}>
          {found.items.map((item) => (
            <Pressable
              key={item.href}
              onPress={() => router.push(item.href as Href)}
              style={({ pressed }) => [
                styles.tile,
                cardShadow,
                {
                  backgroundColor: pressed ? colors.tintSoft : colors.card,
                  borderColor: pressed ? colors.tint : colors.border,
                },
              ]}>
              <Ionicons name={item.icon as IconName} size={28} color={colors.tint} />
              <Text style={[styles.label, { color: colors.text }]}>{tNav(item.label)}</Text>
            </Pressable>
          ))}
          {navGroupKey(found.title) === 'settings' ? (
            <Pressable
              onPress={() => {
                void signOut().then(() => router.replace('/login' as Href));
              }}
              style={({ pressed }) => [
                styles.tile,
                cardShadow,
                {
                  backgroundColor: pressed ? colors.danger + '14' : colors.card,
                  borderColor: colors.danger,
                },
              ]}>
              <Ionicons name="log-out-outline" size={28} color={colors.danger} />
              <Text style={[styles.label, { color: colors.danger }]}>{t('topbar.logout')}</Text>
            </Pressable>
          ) : null}
        </View>
        <GroupWeekChart groupKey={navGroupKey(found.title)} />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: pagePadding, gap: 12, paddingBottom: 40 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tile: {
    width: '47%',
    flexGrow: 1,
    minHeight: 96,
    borderRadius: cardRadius,
    padding: 16,
    gap: 10,
    justifyContent: 'center',
  },
  label: { ...font, fontSize: typeScale.section, fontWeight: '600' },
});
