import { useEffect, useState } from 'react';
import { Linking, Platform, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppLogo } from '@/components/AppLogo';
import { InstallIdQr } from '@/components/InstallIdQr';
import { PrimaryButton } from '@/components/PrimaryButton';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { font, radius, typeScale } from '@/constants/theme';
import {
  applyDeviceActivation,
  getDeviceLicense,
  subscribeDeviceLicense,
  whatsappActivationUrl,
} from '@/lib/deviceLicense';
import { getLocale, setLocale, subscribeLocale, t } from '@/lib/i18n';

export default function ActivateScreen() {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const [installId, setInstallId] = useState(getDeviceLicense()?.installId ?? '');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [, setTick] = useState(0);

  useEffect(() => {
    const stopLicense = subscribeDeviceLicense(() => {
      setInstallId(getDeviceLicense()?.installId ?? '');
      setTick((n) => n + 1);
    });
    const stopLocale = subscribeLocale(() => setTick((n) => n + 1));
    setInstallId(getDeviceLicense()?.installId ?? '');
    return () => {
      stopLicense();
      stopLocale();
    };
  }, []);

  const copyId = async () => {
    if (!installId) return;
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(installId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
      return;
    }
    await Share.share({ message: installId });
  };

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
        <AppLogo size={160} variant="lockup" />
        <Text style={[styles.title, { color: colors.text }]}>{t('activate.title')}</Text>
        <Text style={[styles.body, { color: colors.muted }]}>{t('activate.ended')}</Text>
        <Text style={[styles.body, { color: colors.muted }]}>{t('activate.hint')}</Text>
        <Pressable onPress={() => void setLocale(getLocale() === 'ur' ? 'en' : 'ur')}>
          <Text style={[styles.switch, { color: colors.muted }]}>
            {t('lang.switch')}: {getLocale() === 'ur' ? t('lang.english') : t('lang.urdu')}
          </Text>
        </Pressable>

        <View style={[styles.qrCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {installId ? <InstallIdQr installId={installId} /> : null}
        </View>

        <View style={[styles.idCard, { backgroundColor: colors.soft, borderColor: colors.border }]}>
          <Text style={[styles.label, { color: colors.muted }]}>{t('activate.installId')}</Text>
          <Text selectable style={[styles.installId, { color: colors.text }]}>
            {installId || '—'}
          </Text>
          <View style={styles.actions}>
            <PrimaryButton
              label={copied ? t('activate.copied') : Platform.OS === 'web' ? t('activate.copy') : t('activate.share')}
              tone="secondary"
              color={colors.tint}
              onPress={() => void copyId()}
            />
            <PrimaryButton
              label={t('activate.whatsapp')}
              tone="secondary"
              color={colors.tint}
              disabled={!installId}
              onPress={() => {
                if (!installId) return;
                void Linking.openURL(whatsappActivationUrl(installId));
              }}
            />
          </View>
        </View>

        <View style={[styles.form, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.formTitle, { color: colors.text }]}>{t('activate.codeLabel')}</Text>
          <TextInput
            value={code}
            onChangeText={setCode}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder={t('activate.placeholder')}
            placeholderTextColor={colors.muted}
            style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
          />
          {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
          <PrimaryButton
            label={busy ? t('activate.working') : t('activate.apply')}
            color={colors.tint}
            disabled={busy || !code.trim()}
            onPress={() => {
              setBusy(true);
              setError(null);
              void applyDeviceActivation(code)
                .catch((err: unknown) => {
                  setError(err instanceof Error ? err.message : "Couldn't activate.");
                })
                .finally(() => setBusy(false));
            }}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  inner: { padding: 24, gap: 12, alignItems: 'center', paddingBottom: 40 },
  title: { ...font, fontSize: typeScale.title, fontWeight: '700', textAlign: 'center' },
  body: { ...font, fontSize: 14, lineHeight: 20, textAlign: 'center' },
  switch: { ...font, fontSize: 14, fontWeight: '600' },
  qrCard: { borderWidth: 1, borderRadius: radius['2xl'], padding: 16 },
  idCard: { alignSelf: 'stretch', borderWidth: 1, borderRadius: radius['2xl'], padding: 16, gap: 8 },
  label: { ...font, fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },
  installId: { ...font, fontSize: 18, fontWeight: '700' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  form: { alignSelf: 'stretch', borderWidth: 1, borderRadius: radius['2xl'], padding: 16, gap: 10 },
  formTitle: { ...font, fontSize: 16, fontWeight: '700' },
  input: { minHeight: 48, borderWidth: 1, borderRadius: 14, paddingHorizontal: 12, fontSize: 16 },
  error: { ...font, fontWeight: '600' },
});
