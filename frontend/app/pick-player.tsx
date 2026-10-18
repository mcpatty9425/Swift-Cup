import { Image } from "expo-image";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import React from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppState } from "@/src/api";
import { usePlayer } from "@/src/player-context";

// Stylistic one-off home: cream + navy (Ryder Cup / Masters feel).
const CREAM = "#f1ede1";
const FOREST = "#0b1f3a";
const FOREST_SOFT = "#4a5b78";
const CARD = "#ffffff";
const SELECTED = "#f4ea9c";

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
  const byName = (a: any, b: any) =>
    displayName(a.name).toLowerCase().localeCompare(displayName(b.name).toLowerCase());
  const nz = players.filter((p) => p.team === "NZ").slice().sort(byName);
  const world = players.filter((p) => p.team === "WORLD").slice().sort(byName);
  // Pair rows side by side; pad short side with nulls
  const rows = Math.max(nz.length, world.length);
  const pairs: { world: any; nz: any }[] = [];
  for (let i = 0; i < rows; i++) pairs.push({ world: world[i] ?? null, nz: nz[i] ?? null });

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 32, paddingTop: 20 }}
        testID="pick-player-screen"
      >
        <View style={styles.heroBadge}>
          <Image
            source={require("../assets/images/banner.png")}
            style={styles.heroImg}
            contentFit="cover"
          />
        </View>

        <Text style={styles.tagline}>RYDER CUP STYLE</Text>
        <Text style={styles.title}>The Swifty Cup</Text>
        <Text style={styles.titleItalic}>2026</Text>
        <View style={styles.titleRule} />
        <Text style={styles.meta}>3 ROUNDS  •  2 TEAMS  •  1 WINNER</Text>

        <Text style={styles.selectKicker}>SELECT YOUR NAME</Text>

        {/* Column headers */}
        <View style={styles.colHeaders}>
          <Text style={styles.colHeaderWorld}>🌍  TEAM WORLD</Text>
          <Text style={styles.colHeaderNz}>TEAM NZ  🇳🇿</Text>
        </View>

        {isLoading ? (
          <ActivityIndicator color={FOREST} style={{ marginTop: 40 }} />
        ) : (
          <View style={styles.grid}>
            {pairs.map((pair, i) => (
              <View key={i} style={styles.row}>
                <NameChip player={pair.world} onPick={choose} />
                <NameChip player={pair.nz} onPick={choose} />
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function NameChip({ player, onPick }: { player: any; onPick: (id: string) => void }) {
  if (!player) return <View style={[styles.chip, styles.chipEmpty]} />;
  const display = displayName(player.name);
  return (
    <Pressable
      style={styles.chip}
      onPress={() => onPick(player.id)}
      testID={`pick-${player.name}`}
    >
      <Text style={styles.chipText} numberOfLines={1}>
        {display}
      </Text>
    </Pressable>
  );
}

// Short display: use first name only if it fits
function displayName(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts[0] || name;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: CREAM },
  heroBadge: {
    alignSelf: "center",
    width: 160,
    height: 160,
    borderRadius: 80,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: FOREST,
    backgroundColor: "#f7c948",
  },
  heroImg: { width: "100%", height: "100%" },
  tagline: {
    color: FOREST_SOFT,
    textAlign: "center",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 4,
    marginTop: 20,
  },
  title: {
    color: FOREST,
    textAlign: "center",
    fontSize: 44,
    fontWeight: "900",
    marginTop: 6,
    letterSpacing: 1,
  },
  titleItalic: {
    color: FOREST,
    textAlign: "center",
    fontSize: 36,
    fontWeight: "900",
    fontStyle: "italic",
    marginTop: -4,
  },
  titleRule: {
    alignSelf: "center",
    width: 180,
    height: 2,
    backgroundColor: FOREST,
    marginTop: 10,
    opacity: 0.9,
  },
  meta: {
    color: FOREST_SOFT,
    textAlign: "center",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 2,
    marginTop: 14,
  },
  selectKicker: {
    color: FOREST_SOFT,
    textAlign: "center",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 3,
    marginTop: 28,
  },
  colHeaders: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginTop: 14,
    marginBottom: 10,
  },
  colHeaderWorld: { color: FOREST, fontSize: 11, fontWeight: "900", letterSpacing: 2 },
  colHeaderNz: { color: FOREST, fontSize: 11, fontWeight: "900", letterSpacing: 2 },
  grid: { paddingHorizontal: 20, gap: 10 },
  row: { flexDirection: "row", gap: 10 },
  chip: {
    flex: 1,
    backgroundColor: CARD,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#dcd6c3",
    paddingVertical: 16,
    paddingHorizontal: 14,
    alignItems: "center",
    minHeight: 56,
    justifyContent: "center",
  },
  chipEmpty: { opacity: 0, borderWidth: 0 },
  chipText: {
    color: FOREST,
    fontSize: 20,
    fontWeight: "800",
    fontStyle: "italic",
    textAlign: "center",
  },
});
