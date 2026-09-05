import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text } from 'react-native';

import { Card, Field } from '@/components/FormKit';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ScreenGate } from '@/components/ScreenGate';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { exportShopJson, importShopJson, subscribeErp } from '@/lib/erp';
import { shareTextOrFile, showShareError } from '@/lib/shareOut';

export default function BackupScreen() {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const [, tick] = useState(0);
  useEffect(() => subscribeErp(() => tick((n) => n + 1)), []);
  const [paste, setPaste] = useState('');

  return (
    <ScreenGate permission="settings.manage">
      <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={styles.content}>
        <Card title="Backup">
          <Text style={{ color: colors.muted, lineHeight: 20 }}>
            Save a copy of this phone’s shop books (sales, stock, ledgers). Restore replaces the data on this phone.
          </Text>
          <PrimaryButton
            label="Share backup file"
            color={colors.tint}
            onPress={() =>
              void shareTextOrFile({
                filename: 'agrisoft-backup.json',
                mime: 'application/json',
                uti: 'public.json',
                contents: exportShopJson(),
                title: 'Shop backup',
              }).catch(showShareError)
            }
          />
        </Card>
        <Card title="Restore">
          <Field label="Paste backup JSON" value={paste} onChangeText={setPaste} />
          <PrimaryButton
            label="Restore now"
            color={colors.danger}
            onPress={() =>
              Alert.alert('Replace shop data?', 'This overwrites books on this phone.', [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Restore',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      await importShopJson(paste);
                      setPaste('');
                      Alert.alert('Restored', 'Shop books were replaced.');
                    } catch (err) {
                      Alert.alert('Restore failed', err instanceof Error ? err.message : 'Invalid backup.');
                    }
                  },
                },
              ])
            }
          />
        </Card>
      </ScrollView>
    </ScreenGate>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12, paddingBottom: 40 },
});
