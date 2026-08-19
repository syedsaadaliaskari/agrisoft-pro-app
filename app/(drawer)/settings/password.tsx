import { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';

import { PrimaryButton } from '@/components/PrimaryButton';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { cardRadius, cardShadow } from '@/constants/layout';
import { changePassword } from '@/lib/rbac';

export default function PasswordScreen() {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const [currentPassword, setCurrent] = useState('');
  const [nextPassword, setNext] = useState('');

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={[styles.card, cardShadow, { backgroundColor: colors.card }]}>
        <Text style={[styles.heading, { color: colors.text }]}>Update password</Text>
        <TextInput
          value={currentPassword}
          onChangeText={setCurrent}
          secureTextEntry
          placeholder="Current password"
          placeholderTextColor={colors.muted}
          style={[styles.input, { color: colors.text, borderColor: colors.border }]}
        />
        <TextInput
          value={nextPassword}
          onChangeText={setNext}
          secureTextEntry
          placeholder="New password"
          placeholderTextColor={colors.muted}
          style={[styles.input, { color: colors.text, borderColor: colors.border }]}
        />
        <PrimaryButton
          label="Save password"
          color={colors.tint}
          onPress={async () => {
            try {
              await changePassword(currentPassword, nextPassword);
              setCurrent('');
              setNext('');
              Alert.alert('Password updated');
            } catch (err) {
              Alert.alert(err instanceof Error ? err.message : "Couldn't save.");
            }
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16 },
  card: { borderRadius: cardRadius, padding: 16, gap: 10 },
  heading: { fontSize: 18, fontWeight: '800' },
  input: { minHeight: 52, borderWidth: 1, borderRadius: 14, paddingHorizontal: 12, fontSize: 16 },
});
