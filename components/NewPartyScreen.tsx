import { useState } from 'react';
import { ScrollView, Text } from 'react-native';
import { Stack, useRouter } from 'expo-router';

import { Card, Chips, Field } from '@/components/FormKit';
import { PrimaryButton } from '@/components/PrimaryButton';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { saveCustomer, saveVendor, type Party } from '@/lib/erp';

export default function NewPartyScreen({ kind }: { kind?: 'customer' | 'vendor' }) {
  const which = kind ?? 'customer';
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const router = useRouter();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [opening, setOpening] = useState('0');
  const [balanceType, setBalanceType] = useState<Party['balanceType']>(which === 'vendor' ? 'credit' : 'debit');
  const [creditLimit, setCreditLimit] = useState('0');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <>
      <Stack.Screen options={{ title: which === 'customer' ? 'New customer' : 'New vendor' }} />
      <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <Card>
          <Field label="Name" value={name} onChangeText={setName} />
          <Field label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
          <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" />
          <Field label="City" value={city} onChangeText={setCity} />
          <Field label="Address" value={address} onChangeText={setAddress} multiline />
          <Field label="Opening balance" value={opening} onChangeText={setOpening} keyboardType="decimal-pad" />
          <Chips
            value={balanceType}
            onChange={setBalanceType}
            options={[
              { value: 'debit', label: 'Debit' },
              { value: 'credit', label: 'Credit' },
            ]}
          />
          {which === 'customer' ? (
            <Field label="Credit limit" value={creditLimit} onChangeText={setCreditLimit} keyboardType="decimal-pad" />
          ) : null}
          {error ? <Text style={{ color: colors.danger, fontWeight: '700' }}>{error}</Text> : null}
          <PrimaryButton
            label="Save"
            color={colors.tint}
            disabled={busy}
            onPress={async () => {
              setBusy(true);
              setError(null);
              try {
                const payload = {
                  name,
                  phone,
                  email,
                  city,
                  address,
                  openingBalance: Number(opening) || 0,
                  balanceType,
                  creditLimit: Number(creditLimit) || 0,
                };
                if (which === 'customer') await saveCustomer(payload);
                else await saveVendor(payload);
                router.back();
              } catch (err) {
                setError(err instanceof Error ? err.message : "Couldn't save.");
              } finally {
                setBusy(false);
              }
            }}
          />
        </Card>
      </ScrollView>
    </>
  );
}
