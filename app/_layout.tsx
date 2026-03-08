import 'react-native-gesture-handler'; 

import { GestureHandlerRootView } from 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_700Bold,
} from '@expo-google-fonts/dm-sans';
import {
  Syne_700Bold,
  Syne_800ExtraBold,
} from '@expo-google-fonts/syne';

import { SafeAreaProvider } from 'react-native-safe-area-context';
import { initDatabase } from '../src/database/db';
import { useSettingsStore } from '../src/store';
import { COLORS, FONTS } from '../src/constants/theme';
import SetupScreen from '../src/screens/SetupScreen';

export default function RootLayout() {
  const [dbReady, setDbReady] = useState(false);
  const { isSetup, load: loadSettings } = useSettingsStore();

  const [fontsLoaded, fontsError] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold: DMSans_700Bold,
    Syne_700Bold,
    Syne_800ExtraBold,
  });

  useEffect(() => {
    initDatabase()
      .then(() => {
        loadSettings();
        setDbReady(true);
      })
      .catch(e => {
        console.error('DB init error:', e);
        loadSettings();
        setDbReady(true); // still proceed
      });
  }, []);

  if ((!fontsLoaded && !fontsError) || !dbReady) {
    return (
      <View style={styles.splash}>
        <Text style={styles.splashLogo}>RetailFlow</Text>
        <Text style={styles.splashSub}>Cargando...</Text>
      </View>
    );
  }

  if (!isSetup) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <SetupScreen />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: COLORS.blue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashLogo: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.white,
    letterSpacing: -1,
    marginBottom: 8,
  },
  splashSub: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
  },
});
