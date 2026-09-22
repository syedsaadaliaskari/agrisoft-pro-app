import { Redirect, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppLogo } from '@/components/AppLogo';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { font, radius, tokens, typeScale } from '@/constants/theme';
import { createShopAccount, signInShopAccount } from '@/lib/cloudAuth';
import { getSession, signInWithPassword } from '@/lib/rbac';
import { getLocale, setLocale, subscribeLocale, t } from '@/lib/i18n';

export default function LoginScreen() {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const router = useRouter();
  const [mode, setMode] = useState<'signin' | 'create'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [shopCode, setShopCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [, tick] = useState(0);
  useEffect(() => subscribeLocale(() => tick((n) => n + 1)), []);

  if (getSession()) {
    return <Redirect href="/" />;
  }

  const afterCloud = async () => {
    try {
      const { hydrateCloudSync, startCloudSyncScheduler } = await import('@/lib/cloudSync');
      await hydrateCloudSync();
      startCloudSyncScheduler();
    } catch {
      /* offline is fine */
    }
    router.replace('/');
  };

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const identifier = email.trim();
      if (!identifier.includes('@')) {
        await signInWithPassword(identifier, password);
        router.replace('/');
        return;
      }
      if (mode === 'create') {
        await createShopAccount({ email: identifier, password, shopCode });
      } else {
        await signInShopAccount({ email: identifier, password, shopCode });
      }
      await afterCloud();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't sign in.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
        <AppLogo size={220} variant="lockup" />
        <Text style={[styles.sub, { color: colors.muted }]}>
          {mode === 'create' ? t('login.create') : t('login.signIn')}
        </Text>
        <Pressable onPress={() => setMode(mode === 'create' ? 'signin' : 'create')}>
          <Text style={[styles.switch, { color: colors.tint }]}>
            {mode === 'create' ? t('login.haveAccount') : t('login.newPhone')}
          </Text>
        </Pressable>
        <Pressable onPress={() => void setLocale(getLocale() === 'ur' ? 'en' : 'ur')}>
          <Text style={[styles.switch, { color: colors.muted }]}>
            {t('lang.switch')}: {getLocale() === 'ur' ? t('lang.english') : t('lang.urdu')}
          </Text>
        </Pressable>
        <TextInput
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          placeholder={t('login.email')}
          placeholderTextColor={colors.muted}
          style={[styles.input, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border }]}
        />
        <TextInput
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder={t('login.password')}
          placeholderTextColor={colors.muted}
          style={[styles.input, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border }]}
        />
        <TextInput
          value={shopCode}
          onChangeText={setShopCode}
          autoCapitalize="none"
          placeholder={t('login.shopCode')}
          placeholderTextColor={colors.muted}
          style={[styles.input, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border }]}
        />
        {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
        <Pressable
          onPress={() => void submit()}
          disabled={busy}
          style={[styles.button, { backgroundColor: colors.tint, opacity: busy ? 0.5 : 1 }]}>
          <Text style={styles.buttonText}>
            {busy ? t('login.wait') : mode === 'create' ? t('login.create') : t('login.signIn')}
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: tokens.bg },
  inner: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 10 },
  sub: { ...font, fontSize: typeScale.body },
  switch: { ...font, fontSize: typeScale.label, fontWeight: '600', marginBottom: 4 },
  input: {
    ...font,
    width: '100%',
    maxWidth: 360,
    minHeight: 48,
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: typeScale.body,
  },
  error: { ...font, fontSize: typeScale.label, fontWeight: '500', textAlign: 'center', maxWidth: 360 },
  button: {
    marginTop: 8,
    minHeight: 48,
    minWidth: 220,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  buttonText: { ...font, color: tokens.logoInk, fontSize: typeScale.body, fontWeight: '600' },
});
