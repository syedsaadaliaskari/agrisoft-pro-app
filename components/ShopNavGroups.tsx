import type { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Href, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { cardRadius, cardShadow } from '@/constants/layout';
import { font, typeScale } from '@/constants/theme';
import { homeHubGroups, navGroupKey } from '@/lib/nav';
import { subscribeLocale, tNav } from '@/lib/i18n';
import { getSession, subscribeSession } from '@/lib/rbac';

type IconName = ComponentProps<typeof Ionicons>['name'];

export function ShopNavGroups() {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const router = useRouter();
  const user = getSession();
  const [, tick] = useState(0);
  useEffect(() => {
    const a = subscribeLocale(() => tick((n) => n + 1));
    const b = subscribeSession(() => tick((n) => n + 1));
    return () => {
      a();
      b();
    };
  }, []);
  const groups = useMemo(() => homeHubGroups(user), [user]);

  return (
    <View style={styles.grid}>
      {groups.map((group) => (
        <Pressable
          key={group.title}
          onPress={() => router.push(`/menu/${navGroupKey(group.title)}` as Href)}
          style={({ pressed }) => [
            styles.hub,
            cardShadow,
            {
              backgroundColor: pressed ? colors.tintSoft : colors.card,
              borderColor: pressed ? colors.tint : colors.border,
            },
          ]}>
          <Ionicons name={group.icon as IconName} size={22} color={colors.tint} />
          <Text style={[styles.hubLabel, { color: colors.text }]} numberOfLines={2}>
            {tNav(group.title)}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  hub: {
    width: '23%',
    flexGrow: 1,
    maxWidth: '23.5%',
    minHeight: 76,
    borderRadius: cardRadius,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  hubLabel: { ...font, fontSize: typeScale.label, fontWeight: '600', textAlign: 'center' },
});
