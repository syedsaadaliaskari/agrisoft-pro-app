import { Redirect, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppLogo } from '@/components/AppLogo';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { font, radius, tokens, typeScale } from '@/constants/theme';
import { createShopAccount, signInShopAccount, startOwnShop } from '@/lib/cloudAuth';
import { shopLicenseAllowed } from '@/lib/deviceLicense';
import { isVendorUnlocked } from '@/lib/vendorUnlock';
import { getSession, resetForgottenPassword, signInWithPassword } from '@/lib/rbac';
import { getLocale, setLocale, subscribeLocale, t } from '@/lib/i18n';

export default function LoginScreen() {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const router = useRouter();
  const [mode, setMode] = useState<'signin' | 'create' | 'start'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [shopCode, setShopCode] = useState('');
  const [shopName, setShopName] = useState('');
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotUsername, setForgotUsername] = useState('');
  const [forgotEmail, setForgotEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [, tick] = useState(0);
  useEffect(() => subscribeLocale(() => tick((n) => n + 1)), []);

  if (!isVendorUnlocked() && !shopLicenseAllowed()) {
    return <Redirect href="/activate" />;
  }

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

  const resetPassword = async () => {
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      if (!forgotUsername.trim()) throw new Error(t('login.enterUsername'));
      if (!newPassword) throw new Error(t('login.enterNewPassword'));
      if (newPassword !== confirmPassword) throw new Error(t('login.passwordMismatch'));
      await resetForgottenPassword({
        username: forgotUsername,
        email: forgotEmail,
        newPassword,
      });
      try {
        const { syncShopUsers } = await import('@/lib/userSync');
        await syncShopUsers();
      } catch {
        /* the new password stays on this phone until the next sync */
      }
      setForgotOpen(false);
      setForgotEmail('');
      setNewPassword('');
      setConfirmPassword('');
      setInfo(t('login.passwordUpdated'));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save.");
    } finally {
      setBusy(false);
    }
  };

  const submit = async () => {
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      const identifier = email.trim();
      if (!identifier.includes('@')) {
        await signInWithPassword(identifier, password);
        router.replace('/');
        return;
      }
      if (mode === 'start') {
        await startOwnShop({ email: identifier, password, shopName });
      } else if (mode === 'create') {
        if (!shopCode.trim()) throw new Error('Enter the shop code.');
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
          {forgotOpen
            ? t('login.forgotTitle')
            : mode === 'start'
              ? t('login.startShop')
              : mode === 'create'
                ? t('login.create')
                : t('login.signIn')}
        </Text>
        {forgotOpen ? (
          <Text style={[styles.hint, { color: colors.muted }]}>{t('login.forgotHint')}</Text>
        ) : null}
        {!forgotOpen && mode === 'signin' ? (
          <>
            <Pressable onPress={() => setMode('create')}>
              <Text style={[styles.switch, { color: colors.tint }]}>{t('login.newPhone')}</Text>
            </Pressable>
            <Pressable onPress={() => setMode('start')}>
              <Text style={[styles.switch, { color: colors.tint }]}>{t('login.noComputer')}</Text>
            </Pressable>
          </>
        ) : null}
        {!forgotOpen && mode !== 'signin' ? (
          <Pressable onPress={() => setMode('signin')}>
            <Text style={[styles.switch, { color: colors.tint }]}>
              {mode === 'start' ? t('login.haveCode') : t('login.haveAccount')}
            </Text>
          </Pressable>
        ) : null}
        <Pressable onPress={() => void setLocale(getLocale() === 'ur' ? 'en' : 'ur')}>
          <Text style={[styles.switch, { color: colors.muted }]}>
            {t('lang.switch')}: {getLocale() === 'ur' ? t('lang.english') : t('lang.urdu')}
          </Text>
        </Pressable>
        {forgotOpen ? (
          <>
            <TextInput
              value={forgotUsername}
              onChangeText={setForgotUsername}
              autoCapitalize="none"
              autoComplete="username"
              placeholder={t('login.username')}
              placeholderTextColor={colors.muted}
              style={[styles.input, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border }]}
            />
            <TextInput
              value={forgotEmail}
              onChangeText={setForgotEmail}
              autoCapitalize="none"
              autoComplete="off"
              keyboardType="email-address"
              placeholder={t('login.email')}
              placeholderTextColor={colors.muted}
              style={[styles.input, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border }]}
            />
            <TextInput
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              autoComplete="new-password"
              placeholder={t('login.newPassword')}
              placeholderTextColor={colors.muted}
              style={[styles.input, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border }]}
            />
            <TextInput
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              autoComplete="new-password"
              placeholder={t('login.confirmPassword')}
              placeholderTextColor={colors.muted}
              style={[styles.input, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border }]}
            />
          </>
        ) : (
          <>
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
            {mode === 'start' ? (
              <TextInput
                value={shopName}
                onChangeText={setShopName}
                placeholder={t('login.shopName')}
                placeholderTextColor={colors.muted}
                style={[styles.input, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border }]}
              />
            ) : (
              <TextInput
                value={shopCode}
                onChangeText={setShopCode}
                autoCapitalize="none"
                placeholder={t('login.shopCode')}
                placeholderTextColor={colors.muted}
                style={[styles.input, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border }]}
              />
            )}
          </>
        )}
        {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
        {info ? <Text style={[styles.hint, { color: colors.tint }]}>{info}</Text> : null}
        <Pressable
          onPress={() => void (forgotOpen ? resetPassword() : submit())}
          disabled={busy}
          style={[styles.button, { backgroundColor: colors.tint, opacity: busy ? 0.5 : 1 }]}>
          <Text style={styles.buttonText}>
            {busy
              ? t('login.wait')
              : forgotOpen
                ? t('login.reset')
                : mode === 'start'
                  ? t('login.start')
                  : mode === 'create'
                    ? t('login.create')
                    : t('login.signIn')}
          </Text>
        </Pressable>
        {mode === 'signin' ? (
          <Pressable
            disabled={busy}
            onPress={() => {
              setForgotOpen((open) => !open);
              setError(null);
              setInfo(null);
              setNewPassword('');
              setConfirmPassword('');
            }}>
            <Text style={[styles.switch, { color: colors.muted }]}>
              {forgotOpen ? t('login.backToSignIn') : t('login.forgot')}
            </Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: tokens.bg },
  inner: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 10 },
  sub: { ...font, fontSize: typeScale.body },
  hint: { ...font, fontSize: typeScale.label, textAlign: 'center', maxWidth: 360 },
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
