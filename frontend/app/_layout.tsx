import { QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import React, { useEffect } from "react";
import { LogBox, StyleSheet, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";

import { ErrorBoundary } from "@/src/components/error-boundary";
import { AuthProvider } from "@/src/auth";
import { useLiveSync } from "@/src/api";
import { queryClient } from "@/src/query-client";
import { PlayerProvider, usePlayer } from "@/src/player-context";
import { ScoresProvider } from "@/src/scores-store";
import { colors } from "@/src/theme";

LogBox.ignoreAllLogs(true);

function LiveSyncBridge({ children }: { children: React.ReactNode }) {
  const qc = useQueryClient();
  useLiveSync(qc);
  return <>{children}</>;
}

function Gate({ children }: { children: React.ReactNode }) {
  const { playerId, loading } = usePlayer();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const first = segments[0];
    if (!playerId && first !== "pick-player") {
      router.replace("/pick-player");
    } else if (playerId && first === "pick-player") {
      router.replace("/bio");
    }
  }, [playerId, loading, segments, router]);

  return <>{children}</>;
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    "BebasNeue-Regular": require("../assets/fonts/BebasNeue-Regular.ttf"),
    "IBMPlexMono-SemiBold": require("../assets/fonts/IBMPlexMono-SemiBold.ttf"),
  });
  if (!fontsLoaded) return <View style={styles.root} />;
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <ErrorBoundary>
          <QueryClientProvider client={queryClient}>
            <PlayerProvider>
              <AuthProvider>
                <LiveSyncBridge>
                  <ScoresProvider>
                  <KeyboardProvider>
                    <Gate>
                      <View style={styles.root}>
                        <StatusBar style="light" />
                        <Stack
                          screenOptions={{
                            headerShown: false,
                            contentStyle: { backgroundColor: colors.background },
                          }}
                        />
                      </View>
                    </Gate>
                  </KeyboardProvider>
                  </ScoresProvider>
                </LiveSyncBridge>
              </AuthProvider>
            </PlayerProvider>
          </QueryClientProvider>
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
});
