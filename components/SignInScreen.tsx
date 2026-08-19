import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppLogo } from '@/components/AppLogo';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { signIn } from '@/lib/account';

export function SignInScreen() {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const [name, setName] = useState('');

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]}>
      <AppLogo size={88} />
      <Text style={[styles.title, { color: colors.text }]}>Agri Soft Pro</Text>
      <Text style={[styles.subtitle, { color: colors.muted }]}>Sign in to this shop</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Your name"
        placeholderTextColor={colors.muted}
        autoCapitalize="words"
        style={[styles.input, { color: colors.text, backgroundColor: colors.card, borderColor: colors.border }]}
      />
      <Pressable
        onPress={() => signIn(name)}
        disabled={!name.trim()}
        style={({ pressed }) => [
          styles.button,
          { backgroundColor: colors.tint, opacity: !name.trim() ? 0.45 : pressed ? 0.85 : 1 },
        ]}>
        <Text style={styles.buttonText}>Sign in</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    marginTop: 8,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 8,
  },
  input: {
    width: '100%',
    maxWidth: 360,
    minHeight: 52,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    fontSize: 16,
    marginTop: 8,
  },
  button: {
    marginTop: 12,
    minHeight: 52,
    minWidth: 220,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
