import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { PrimaryButton } from '@/components/PrimaryButton';
import { ScreenGate } from '@/components/ScreenGate';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { cardRadius, cardShadow } from '@/constants/layout';
import { isShopPermission, isSuperAdminUser, PERMISSION_CATALOG } from '@/lib/permissions';
import {
  createUser,
  getSession,
  listRoles,
  listUsers,
  rolesForEditor,
  setRolePermissions,
  setUserActive,
  subscribeSession,
} from '@/lib/rbac';
import { useEffect } from 'react';

export default function UsersScreen() {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const [, setTick] = useState(0);
  useEffect(() => subscribeSession(() => setTick((n) => n + 1)), []);

  const session = getSession();
  const roles = rolesForEditor();
  const allRoles = listRoles();
  const users = listUsers().filter((user) => {
    if (isSuperAdminUser(session)) return true;
    return allRoles.find((role) => role.id === user.roleId)?.name !== 'Super Admin';
  });
  const catalog = isSuperAdminUser(session)
    ? PERMISSION_CATALOG
    : PERMISSION_CATALOG.filter((perm) => isShopPermission(perm.code));
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [roleId, setRoleId] = useState(roles.find((role) => role.name === 'Admin')?.id ?? roles[0]?.id ?? '');

  return (
    <ScreenGate permission="users.manage">
      <ScrollView
        style={[styles.screen, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.content}>
        <View style={[styles.card, cardShadow, { backgroundColor: colors.card }]}>
          <Text style={[styles.heading, { color: colors.text }]}>Add user</Text>
          <TextInput
            value={fullName}
            onChangeText={setFullName}
            placeholder="Full name"
            placeholderTextColor={colors.muted}
            style={[styles.input, { color: colors.text, borderColor: colors.border }]}
          />
          <TextInput
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            placeholder="Username"
            placeholderTextColor={colors.muted}
            style={[styles.input, { color: colors.text, borderColor: colors.border }]}
          />
          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="Password"
            placeholderTextColor={colors.muted}
            style={[styles.input, { color: colors.text, borderColor: colors.border }]}
          />
          <View style={styles.roles}>
            {roles.map((role) => (
              <Pressable
                key={role.id}
                onPress={() => setRoleId(role.id)}
                style={[
                  styles.chip,
                  { borderColor: colors.border, backgroundColor: roleId === role.id ? colors.tint : colors.card },
                ]}>
                <Text style={{ color: roleId === role.id ? '#fff' : colors.text, fontWeight: '700' }}>{role.name}</Text>
              </Pressable>
            ))}
          </View>
          <PrimaryButton
            label="Save user"
            color={colors.tint}
            onPress={async () => {
              try {
                await createUser({ fullName, username, password, roleId });
                setFullName('');
                setUsername('');
                setPassword('');
              } catch (err) {
                Alert.alert(err instanceof Error ? err.message : "Couldn't save.");
              }
            }}
          />
        </View>

        <View style={[styles.card, cardShadow, { backgroundColor: colors.card }]}>
          <Text style={[styles.heading, { color: colors.text }]}>Users</Text>
          {users.map((user) => (
            <View key={user.id} style={[styles.userRow, { borderBottomColor: colors.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.name, { color: colors.text }]}>{user.fullName}</Text>
                <Text style={[styles.meta, { color: colors.muted }]}>
                  {user.username} · {allRoles.find((role) => role.id === user.roleId)?.name} · {user.isActive ? 'Active' : 'Inactive'}
                </Text>
              </View>
              <Pressable onPress={() => void setUserActive(user.id, !user.isActive)}>
                <Text style={{ color: colors.tint, fontWeight: '700' }}>{user.isActive ? 'Disable' : 'Enable'}</Text>
              </Pressable>
            </View>
          ))}
        </View>

        {roles.map((role) => (
          <View key={role.id} style={[styles.card, cardShadow, { backgroundColor: colors.card }]}>
            <Text style={[styles.heading, { color: colors.text }]}>{role.name} permissions</Text>
            {role.name === 'Super Admin' ? (
              <Text style={{ color: colors.muted }}>Super Admin always has the full vendor console.</Text>
            ) : (
              catalog.map((perm) => {
                const on = role.permissionCodes.includes(perm.code);
                return (
                  <Pressable
                    key={perm.code}
                    onPress={() => {
                      const next = on
                        ? role.permissionCodes.filter((code) => code !== perm.code)
                        : [...role.permissionCodes, perm.code];
                      void setRolePermissions(role.id, next);
                    }}
                    style={styles.permRow}>
                    <View style={[styles.box, { borderColor: colors.tint, backgroundColor: on ? colors.tint : 'transparent' }]} />
                    <Text style={{ color: colors.text, flex: 1 }}>{perm.description}</Text>
                  </Pressable>
                );
              })
            )}
          </View>
        ))}
      </ScrollView>
    </ScreenGate>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  card: { borderRadius: cardRadius, padding: 16, gap: 10 },
  heading: { fontSize: 18, fontWeight: '800' },
  input: { minHeight: 48, borderWidth: 1, borderRadius: 14, paddingHorizontal: 12, fontSize: 16 },
  roles: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1 },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  name: { fontSize: 16, fontWeight: '700' },
  meta: { fontSize: 13, marginTop: 2 },
  permRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 40 },
  box: { width: 20, height: 20, borderRadius: 6, borderWidth: 2 },
});
