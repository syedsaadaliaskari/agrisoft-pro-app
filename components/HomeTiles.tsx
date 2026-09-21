import type { ComponentProps } from 'react';
import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Href, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { cardRadius, cardShadow } from '@/constants/layout';
import { font, typeScale } from '@/constants/theme';
import { hasPermission } from '@/lib/permissions';
import { getSession } from '@/lib/rbac';
import { subscribeLocale, tNav } from '@/lib/i18n';

type IconName = ComponentProps<typeof Ionicons>['name'];

type Tile = {
  label: string;
  href: Href;
  icon: IconName;
  show: boolean;
};

export function HomeTiles() {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const router = useRouter();
  const user = getSession();
  const [, tick] = useState(0);
  useEffect(() => subscribeLocale(() => tick((n) => n + 1)), []);
  const canSale = hasPermission(user, 'sales.create');
  const canPurchase = hasPermission(user, 'purchases.create');

  const tiles: Tile[] = (
    [
    {
      label: 'Sale',
      href: (canSale ? '/sale/new' : '/sales') as Href,
      icon: 'cart-outline',
      show: hasPermission(user, 'sales.view') || canSale,
    },
    {
      label: 'Purchase',
      href: (canPurchase ? '/purchase/new' : '/purchases') as Href,
      icon: 'bag-outline',
      show: hasPermission(user, 'purchases.view') || canPurchase,
    },
    {
      label: 'Customer',
      href: '/parties/customers' as Href,
      icon: 'people-outline',
      show: hasPermission(user, 'customers.view'),
    },
    {
      label: 'Product',
      href: '/catalog/products' as Href,
      icon: 'cube-outline',
      show: hasPermission(user, 'products.view'),
    },
  ] satisfies Tile[]
  ).filter((tile) => tile.show);

  if (!tiles.length) return null;

  return (
    <View style={styles.grid}>
      {tiles.map((tile) => (
        <Pressable
          key={tile.label}
          onPress={() => router.push(tile.href)}
          style={({ pressed }) => [
            styles.tile,
            cardShadow,
            {
              backgroundColor: pressed ? colors.tintSoft : colors.card,
              borderColor: pressed ? colors.tint : colors.border,
            },
          ]}>
          <Ionicons name={tile.icon} size={28} color={colors.tint} />
          <Text style={[styles.label, { color: colors.text }]}>{tNav(tile.label)}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
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
