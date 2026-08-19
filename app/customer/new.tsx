import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { StatusBanner } from '@/components/StatusBanner';
import { createCustomer } from '@/lib/api';

export default function NewCustomerScreen() {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const router = useRouter();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      await createCustomer({ name, phone, city, address });
      router.back();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save this customer.");
    } finally {
      setSaving(false);
    }
  }, [address, city, name, phone, router]);

  return (
    <>
      <Stack.Screen options={{ title: 'New customer' }} />
      <ScrollView
        style={[styles.screen, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled">
        {error ? <StatusBanner tone="error" title="Couldn't save" /> : null}

        <Text style={[styles.label, { color: colors.muted }]}>Name</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Customer name"
          placeholderTextColor={colors.muted}
          style={[styles.input, { color: colors.text, backgroundColor: colors.card, borderColor: colors.border }]}
        />
        <Text style={[styles.label, { color: colors.muted }]}>Phone</Text>
        <TextInput
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          placeholder="Phone"
          placeholderTextColor={colors.muted}
          style={[styles.input, { color: colors.text, backgroundColor: colors.card, borderColor: colors.border }]}
        />
        <Text style={[styles.label, { color: colors.muted }]}>City</Text>
        <TextInput
          value={city}
          onChangeText={setCity}
          placeholder="City"
          placeholderTextColor={colors.muted}
          style={[styles.input, { color: colors.text, backgroundColor: colors.card, borderColor: colors.border }]}
        />
        <Text style={[styles.label, { color: colors.muted }]}>Address</Text>
        <TextInput
          value={address}
          onChangeText={setAddress}
          placeholder="Address"
          placeholderTextColor={colors.muted}
          style={[styles.input, { color: colors.text, backgroundColor: colors.card, borderColor: colors.border }]}
        />

        <Pressable
          onPress={() => void save()}
          disabled={saving || !name.trim()}
          style={[styles.button, { backgroundColor: colors.tint, opacity: saving || !name.trim() ? 0.5 : 1 }]}>
          <Text style={styles.buttonText}>{saving ? 'Saving…' : 'Save customer'}</Text>
        </Pressable>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 16, gap: 8, paddingBottom: 40 },
  label: { fontSize: 13, fontWeight: '600', marginTop: 8 },
  input: {
    minHeight: 52,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    fontSize: 16,
  },
  button: {
    marginTop: 16,
    minHeight: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
