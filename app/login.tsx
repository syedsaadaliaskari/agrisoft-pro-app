import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppLogo } from '@/components/AppLogo';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { font, radius, tokens, typeScale } from '@/constants/theme';
import { getSession, signInWithPassword } from '@/lib/rbac';

export default function LoginScreen() {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (getSession()) {
    return <Redirect href="/" />;
  }

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await signInWithPassword(username, password);
      router.replace('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't sign in.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]}>
      <AppLogo size={80} />
      <Text style={[styles.title, { color: colors.text }]}>Agri Soft Pro</Text>
      <Text style={[styles.sub, { color: colors.muted }]}>Sign in</Text>
      <TextInput
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
        placeholder="Username"
        placeholderTextColor={colors.muted}
        style={[styles.input, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border }]}
      />
      <TextInput
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        placeholder="Password"
        placeholderTextColor={colors.muted}
        style={[styles.input, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border }]}
      />
      {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
      <Pressable
        onPress={() => void submit()}
        disabled={busy}
        style={[styles.button, { backgroundColor: colors.tint, opacity: busy ? 0.5 : 1 }]}>
        <Text style={styles.buttonText}>{busy ? 'Please wait…' : 'Sign in'}</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 10 },
  title: { ...font, fontSize: 26, fontWeight: '600', marginTop: 8 },
  sub: { ...font, fontSize: typeScale.body, marginBottom: 8 },
  input: {
    ...font,
    width: '100%',
    maxWidth: 360,
    minHeight: 44,
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: typeScale.body,
  },
  error: { ...font, fontSize: typeScale.label, fontWeight: '500' },
  button: {
    marginTop: 8,
    minHeight: 44,
    minWidth: 220,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  buttonText: { ...font, color: tokens.logoInk, fontSize: typeScale.body, fontWeight: '600' },
});
