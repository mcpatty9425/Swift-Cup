import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppState } from "@/src/api";
import { Avatar } from "@/src/avatar";
import { usePlayer } from "@/src/player-context";
import { colors, radius, spacing } from "@/src/theme";

export default function PickPlayerScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data, isLoading } = useAppState();
  const { setPlayer } = usePlayer();

  async function choose(id: string) {
    await setPlayer(id);
    router.replace("/rounds");
  }

  const players = data?.players ?? [];
  const nz = players.filter((p) => p.team === "NZ");
  const world = players.filter((p) => p.team === "WORLD");

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={styles.hero}>
        <Image source={require("../assets/images/banner.png")} style={styles.heroImg} contentFit="cover" />
        <LinearGradient
          colors={["transparent", "rgba(7,17,31,0.7)", colors.background]}
          style={StyleSheet.absoluteFill}
        />
      </View>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 20, paddingBottom: insets.bottom + 32 }}
        testID="pick-player-screen"
      >
        <View style={styles.header}>
          <Text style={styles.kicker}>WELCOME TO</Text>
          <Text style={styles.title}>The Swifty Cup 2026</Text>
          <Text style={styles.subtitle}>Tap your name to get started. Your pick is saved on this device.</Text>
        </View>

        {isLoading ? (
          <ActivityIndicator color={colors.gold} style={{ marginTop: 40 }} />
        ) : (
          <>
            <Group title="🇳🇿 Team NZ" color={colors.nz}>
              {nz.map((p) => (
                <PlayerPick key={p.id} name={p.name} photo={p.photo_path} team="NZ" onPress={() => choose(p.id)} />
              ))}
            </Group>
            <Group title="🌍 Team World" color={colors.world}>
              {world.map((p) => (
                <PlayerPick
                  key={p.id}
                  name={p.name}
                  photo={p.photo_path}
                  team="WORLD"
                  onPress={() => choose(p.id)}
                />
              ))}
            </Group>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function Group({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  return (
    <View style={{ marginTop: spacing.xl, paddingHorizontal: spacing.lg }}>
      <Text style={[styles.groupTitle, { color }]}>{title}</Text>
      <View style={{ gap: spacing.sm }}>{children}</View>
    </View>
  );
}

function PlayerPick({
  name,
  photo,
  team,
  onPress,
}: {
  name: string;
  photo: string | null;
  team: "NZ" | "WORLD";
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.row} onPress={onPress} testID={`pick-${name}`}>
      <Avatar photoPath={photo} name={name} size={44} team={team} />
      <Text style={styles.rowName}>{name}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hero: { position: "absolute", top: 0, left: 0, right: 0, height: 220 },
  heroImg: { width: "100%", height: "100%" },
  header: { paddingHorizontal: spacing.lg },
  kicker: { color: colors.gold, fontSize: 12, fontWeight: "900", letterSpacing: 3 },
  title: { color: colors.onSurface, fontSize: 28, fontWeight: "900", marginTop: 4 },
  subtitle: { color: colors.muted, marginTop: 6, fontSize: 13 },
  groupTitle: { fontSize: 13, fontWeight: "900", letterSpacing: 2, marginBottom: spacing.sm },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowName: { color: colors.onSurface, fontSize: 16, fontWeight: "700" },
});
