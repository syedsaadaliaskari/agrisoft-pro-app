import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { hydrateRbac } from '@/lib/rbac';
import { hydrateVendor } from '@/lib/vendor';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: 'login',
};

SplashScreen.preventAutoHideAsync();

const agriLight = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: Colors.light.tint,
    background: Colors.light.background,
    card: Colors.light.card,
    text: Colors.light.text,
    border: Colors.light.border,
    notification: Colors.light.tint,
  },
};

const agriDark = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: Colors.dark.tint,
    background: Colors.dark.background,
    card: Colors.dark.card,
    text: Colors.dark.text,
    border: Colors.dark.border,
    notification: Colors.dark.tint,
  },
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void Promise.all([hydrateRbac(), hydrateVendor()]).then(() => {
      setReady(true);
      SplashScreen.hideAsync();
    });
  }, []);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={colorScheme === 'dark' ? agriDark : agriLight}>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
        <Stack>
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="(drawer)" options={{ headerShown: false }} />
          <Stack.Screen name="customer/[id]" options={{ title: 'Customer', headerBackTitle: 'Back' }} />
          <Stack.Screen name="customer/new" options={{ title: 'New customer', headerBackTitle: 'Back' }} />
          <Stack.Screen name="product/[id]" options={{ title: 'Product', headerBackTitle: 'Back' }} />
          <Stack.Screen name="product/new" options={{ title: 'New product', headerBackTitle: 'Back' }} />
          <Stack.Screen name="sale/new" options={{ title: 'New sale', headerBackTitle: 'Back' }} />
          <Stack.Screen name="sale/[id]" options={{ title: 'Sale', headerBackTitle: 'Back' }} />
        </Stack>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
