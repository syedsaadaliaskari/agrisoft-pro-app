import { ScrollView, StyleSheet, Text } from 'react-native';
import { useEffect, useState } from 'react';

import { Card, Chips, Field } from '@/components/FormKit';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ScreenGate } from '@/components/ScreenGate';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { getSettings, saveSettings, subscribeErp } from '@/lib/erp';
import { isSuperAdminUser } from '@/lib/permissions';
import { getSession } from '@/lib/rbac';

export default function SettingsScreen() {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const user = getSession();
  const [, tick] = useState(0);
  useEffect(() => subscribeErp(() => tick((n) => n + 1)), []);
  const current = getSettings();
  const [shop_name, setName] = useState(current.shop_name);
  const [shop_phone, setPhone] = useState(current.shop_phone);
  const [shop_address, setAddress] = useState(current.shop_address);
  const [currency_symbol, setSymbol] = useState(current.currency_symbol);
  const [tax_mode, setTax] = useState(current.tax_mode);
  const [receipt_footer, setFooter] = useState(current.receipt_footer);
  const [ok, setOk] = useState<string | null>(null);

  return (
    <ScreenGate permission="settings.manage">
      <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={styles.content}>
        {isSuperAdminUser(user) ? (
          <Card title="Vendor">
            <Text style={{ color: colors.muted }}>
              Signed in as {user?.fullName} ({user?.roleName}). Company list, licenses, users, backup, and audit are in the menu.
            </Text>
          </Card>
        ) : (
          <Card title="Shop">
            <Field label="Shop name" value={shop_name} onChangeText={setName} />
            <Field label="Phone" value={shop_phone} onChangeText={setPhone} keyboardType="phone-pad" />
            <Field label="Address" value={shop_address} onChangeText={setAddress} />
            <Field label="Currency symbol" value={currency_symbol} onChangeText={setSymbol} />
            <Chips
              value={tax_mode}
              onChange={setTax}
              options={[
                { value: 'exclusive', label: 'Tax exclusive' },
                { value: 'inclusive', label: 'Tax inclusive' },
              ]}
            />
            <Field label="Receipt footer" value={receipt_footer} onChangeText={setFooter} />
            {ok ? <Text style={{ color: colors.tint, fontWeight: '700' }}>{ok}</Text> : null}
            <PrimaryButton
              label="Save settings"
              color={colors.tint}
              onPress={async () => {
                await saveSettings({ shop_name, shop_phone, shop_address, currency_symbol, tax_mode, receipt_footer });
                setOk('Saved.');
              }}
            />
            <Text style={{ color: colors.muted }}>Signed in as {user?.fullName} ({user?.roleName})</Text>
          </Card>
        )}
      </ScrollView>
    </ScreenGate>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40 },
});
