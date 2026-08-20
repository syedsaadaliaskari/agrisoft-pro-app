import { useState } from 'react';
import { Alert, ScrollView, Text } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';

import { Card, Chips, Field } from '@/components/FormKit';
import { PrimaryButton } from '@/components/PrimaryButton';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { getCustomer, getVendor, removeParty, saveCustomer, saveVendor, type Party } from '@/lib/erp';

export default function PartyDetail({ kind }: { kind: 'customer' | 'vendor' }) {
  const { id } = useLocalSearchParams<{ id: string }>();
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const router = useRouter();
  const row = kind === 'customer' ? getCustomer(id) : getVendor(id);
  const [name, setName] = useState(row?.name ?? '');
  const [phone, setPhone] = useState(row?.phone ?? '');
  const [email, setEmail] = useState(row?.email ?? '');
  const [city, setCity] = useState(row?.city ?? '');
  const [address, setAddress] = useState(row?.address ?? '');
  const [opening, setOpening] = useState(String(row?.openingBalance ?? 0));
  const [balanceType, setBalanceType] = useState<Party['balanceType']>(row?.balanceType ?? (kind === 'vendor' ? 'credit' : 'debit'));
  const [creditLimit, setCreditLimit] = useState(String(row?.creditLimit ?? 0));
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      <Stack.Screen options={{ title: row?.name ?? 'Party' }} />
      <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}>
        {!row ? (
          <Text style={{ color: colors.muted }}>Not found.</Text>
        ) : (
          <Card>
            <Field label="Code" value={row.code} onChangeText={() => {}} editable={false} />
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
            {kind === 'customer' ? (
              <Field label="Credit limit" value={creditLimit} onChangeText={setCreditLimit} keyboardType="decimal-pad" />
            ) : null}
            {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}
            <PrimaryButton
              label="Save"
              color={colors.tint}
              onPress={async () => {
                try {
                  const payload = {
                    id,
                    name,
                    phone,
                    email,
                    city,
                    address,
                    openingBalance: Number(opening) || 0,
                    balanceType,
                    creditLimit: Number(creditLimit) || 0,
                  };
                  if (kind === 'customer') await saveCustomer(payload);
                  else await saveVendor(payload);
                  router.back();
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Couldn't save.");
                }
              }}
            />
            <PrimaryButton
              label={kind === 'customer' ? 'Delete customer' : 'Delete vendor'}
              color={colors.danger}
              onPress={() =>
                Alert.alert('Delete', row.name, [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => void removeParty(kind === 'customer' ? 'customers' : 'vendors', row.id).then(() => router.back()),
                  },
                ])
              }
            />
          </Card>
        )}
      </ScrollView>
    </>
  );
}
