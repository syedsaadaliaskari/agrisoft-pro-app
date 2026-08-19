import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput } from 'react-native';
import { Stack, useRouter } from 'expo-router';

import { StatusBanner } from '@/components/StatusBanner';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { createProduct } from '@/lib/shopData';

export default function NewProductScreen() {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const router = useRouter();
  const [name, setName] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [stockQty, setStockQty] = useState('0');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      <Stack.Screen options={{ title: 'New product' }} />
      <ScrollView
        style={[styles.screen, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled">
        {error ? <StatusBanner tone="error" title={error} /> : null}
        <Text style={[styles.label, { color: colors.muted }]}>Name</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          style={[styles.input, { color: colors.text, backgroundColor: colors.card, borderColor: colors.border }]}
        />
        <Text style={[styles.label, { color: colors.muted }]}>Sale price</Text>
        <TextInput
          value={salePrice}
          onChangeText={setSalePrice}
          keyboardType="decimal-pad"
          style={[styles.input, { color: colors.text, backgroundColor: colors.card, borderColor: colors.border }]}
        />
        <Text style={[styles.label, { color: colors.muted }]}>Cost price</Text>
        <TextInput
          value={costPrice}
          onChangeText={setCostPrice}
          keyboardType="decimal-pad"
          style={[styles.input, { color: colors.text, backgroundColor: colors.card, borderColor: colors.border }]}
        />
        <Text style={[styles.label, { color: colors.muted }]}>Opening stock</Text>
        <TextInput
          value={stockQty}
          onChangeText={setStockQty}
          keyboardType="decimal-pad"
          style={[styles.input, { color: colors.text, backgroundColor: colors.card, borderColor: colors.border }]}
        />
        <Pressable
          disabled={saving || !name.trim()}
          onPress={async () => {
            setSaving(true);
            setError(null);
            try {
              await createProduct({
                name,
                salePrice: Number(salePrice) || 0,
                costPrice: Number(costPrice) || 0,
                stockQty: Number(stockQty) || 0,
              });
              router.back();
            } catch (err) {
              setError(err instanceof Error ? err.message : "Couldn't save.");
            } finally {
              setSaving(false);
            }
          }}
          style={[styles.button, { backgroundColor: colors.tint, opacity: saving || !name.trim() ? 0.5 : 1 }]}>
          <Text style={styles.buttonText}>{saving ? 'Saving…' : 'Save product'}</Text>
        </Pressable>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 16, gap: 8, paddingBottom: 40 },
  label: { fontSize: 13, fontWeight: '600', marginTop: 8 },
  input: { minHeight: 52, borderWidth: 1, borderRadius: 16, paddingHorizontal: 14, fontSize: 16 },
  button: { marginTop: 16, minHeight: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
