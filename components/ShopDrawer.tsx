import type { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Href, usePathname, useRouter } from 'expo-router';
import { DrawerContentScrollView } from 'expo-router/drawer';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppLogo } from '@/components/AppLogo';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { filterNavForUser } from '@/lib/nav';
import { getSession, signOut } from '@/lib/rbac';

type IconName = ComponentProps<typeof Ionicons>['name'];

export function ShopDrawerContent(props: ComponentProps<typeof DrawerContentScrollView>) {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const router = useRouter();
  const pathname = usePathname();
  const user = getSession();
  const [open, setOpen] = useState<Record<string, boolean>>({});

  const groups = useMemo(() => filterNavForUser(user), [user]);

  return (
    <DrawerContentScrollView {...props} contentContainerStyle={{ paddingBottom: 24 }}>
      <View style={[styles.brand, { borderBottomColor: colors.border }]}>
        <AppLogo size={40} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.brandName, { color: colors.text }]}>Agri Soft Pro</Text>
          <Text style={[styles.brandMeta, { color: colors.muted }]}>
            {user?.fullName} · {user?.roleName}
          </Text>
        </View>
      </View>

      {groups.map((group) => {
        const expanded = open[group.title] ?? true;
        return (
          <View key={group.title}>
            <Pressable
              onPress={() => setOpen((current) => ({ ...current, [group.title]: !expanded }))}
              style={styles.groupHead}>
              <Ionicons name={group.icon as IconName} size={18} color={colors.muted} />
              <Text style={[styles.groupTitle, { color: colors.muted }]}>{group.title}</Text>
              <Ionicons name={expanded ? 'chevron-down' : 'chevron-forward'} size={16} color={colors.muted} />
            </Pressable>
            {expanded
              ? group.items.map((item) => {
                  const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
                  return (
                    <Pressable
                      key={item.href}
                      onPress={() => router.push(item.href as Href)}
                      style={[
                        styles.item,
                        active && { backgroundColor: colors.tintSoft },
                      ]}>
                      <Ionicons name={item.icon as IconName} size={18} color={active ? colors.tint : colors.text} />
                      <Text style={[styles.itemLabel, { color: active ? colors.tint : colors.text }]}>
                        {item.label}
                      </Text>
                    </Pressable>
                  );
                })
              : null}
          </View>
        );
      })}

      {user ? (
        <Pressable
          onPress={() => {
            void signOut().then(() => router.replace('/login'));
          }}
          style={styles.logout}>
          <Ionicons name="log-out-outline" size={18} color={colors.danger} />
          <Text style={[styles.itemLabel, { color: colors.danger }]}>Logout</Text>
        </Pressable>
      ) : null}
    </DrawerContentScrollView>
  );
}

const styles = StyleSheet.create({
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 16,
    marginBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  brandName: { fontSize: 16, fontWeight: '800' },
  brandMeta: { fontSize: 12, marginTop: 2 },
  groupHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  groupTitle: { flex: 1, fontSize: 12, fontWeight: '800', letterSpacing: 0.4, textTransform: 'uppercase' },
  item: {
    minHeight: 44,
    marginHorizontal: 8,
    borderRadius: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  itemLabel: { fontSize: 15, fontWeight: '600' },
  logout: {
    minHeight: 48,
    marginTop: 16,
    marginHorizontal: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
});
