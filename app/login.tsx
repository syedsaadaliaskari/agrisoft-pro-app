import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppLogo } from '@/components/AppLogo';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
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
        style={[styles.input, { color: colors.text, backgroundColor: colors.card, borderColor: colors.border }]}
      />
      <TextInput
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        placeholder="Password"
        placeholderTextColor={colors.muted}
        style={[styles.input, { color: colors.text, backgroundColor: colors.card, borderColor: colors.border }]}
      />
      {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
      <Pressable
        onPress={() => void submit()}
        disabled={busy}
        style={[styles.button, { backgroundColor: colors.tint, opacity: busy ? 0.6 : 1 }]}>
        <Text style={styles.buttonText}>{busy ? 'Please wait…' : 'Sign in'}</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 10 },
  title: { fontSize: 26, fontWeight: '800', marginTop: 8 },
  sub: { fontSize: 15, marginBottom: 8 },
  input: {
    width: '100%',
    maxWidth: 360,
    minHeight: 52,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    fontSize: 16,
  },
  error: { fontSize: 14, fontWeight: '600' },
  button: {
    marginTop: 8,
    minHeight: 52,
    minWidth: 220,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
