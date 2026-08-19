import { Ionicons } from '@expo/vector-icons';
import { Href, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppLogo } from '@/components/AppLogo';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { cardShadow } from '@/constants/layout';
import { getAccount, signOut, subscribeAccount } from '@/lib/account';

export function AccountButton() {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [account, setAccount] = useState(getAccount());

  useEffect(() => subscribeAccount(() => setAccount(getAccount())), []);

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        hitSlop={8}
        accessibilityLabel="Account"
        style={({ pressed }) => [styles.avatarBtn, { opacity: pressed ? 0.7 : 1 }]}>
        <View style={[styles.avatarRing, { borderColor: colors.border }]}>
          <AppLogo size={32} />
        </View>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable
            style={[
              styles.sheet,
              cardShadow,
              {
                backgroundColor: colors.card,
                marginTop: insets.top + 6,
              },
            ]}
            onPress={() => {}}>
            <View style={styles.profile}>
              <AppLogo size={64} />
              <Text style={[styles.name, { color: colors.text }]}>{account.name}</Text>
            </View>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <Pressable
              onPress={() => {
                setOpen(false);
                router.push('/(tabs)/settings' as Href);
              }}
              style={({ pressed }) => [styles.row, { backgroundColor: pressed ? colors.tintSoft : 'transparent' }]}>
              <Ionicons name="settings-outline" size={20} color={colors.text} />
              <Text style={[styles.rowLabel, { color: colors.text }]}>Settings</Text>
            </Pressable>

            <Pressable
              onPress={() => {
                setOpen(false);
                signOut();
              }}
              style={({ pressed }) => [styles.row, { backgroundColor: pressed ? colors.tintSoft : 'transparent' }]}>
              <Ionicons name="log-out-outline" size={20} color={colors.danger} />
              <Text style={[styles.rowLabel, { color: colors.danger }]}>Logout</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  avatarBtn: {
    marginRight: 12,
  },
  avatarRing: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 1,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(22, 48, 36, 0.28)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingRight: 12,
  },
  sheet: {
    width: 248,
    borderRadius: 18,
    paddingVertical: 8,
    paddingBottom: 10,
  },
  profile: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 14,
    gap: 10,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 12,
    marginBottom: 4,
  },
  row: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginHorizontal: 6,
  },
  rowLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
});
