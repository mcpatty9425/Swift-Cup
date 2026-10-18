import React, { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Header } from "@/src/components/chrome";
import { Player, useAppState } from "@/src/api";
import { Avatar } from "@/src/avatar";
import { colors, radius, spacing } from "@/src/theme";

export default function PlayersScreen() {
  const { data, isLoading } = useAppState();
  const [team, setTeam] = useState<"WORLD" | "NZ">("WORLD");

  const players = useMemo(
    () =>
      (data?.players ?? [])
        .filter((p) => p.team === team)
        .slice()
        .sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase())),
    [data, team],
  );

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingBottom: 24 }}
      testID="players-screen"
    >
      <Header />

      <View style={styles.head}>
        <Text style={styles.title}>Players</Text>
        <Text style={styles.sub}>Profiles, handicaps and bios.</Text>
      </View>

      <View style={styles.segment}>
        <Pressable
          testID="players-segment-world"
          onPress={() => setTeam("WORLD")}
          style={[styles.segBtn, team === "WORLD" && { backgroundColor: colors.world }]}
        >
          <Text style={[styles.segText, team === "WORLD" && { color: colors.onBrand }]}>🌍 Team World</Text>
        </Pressable>
        <Pressable
          testID="players-segment-nz"
          onPress={() => setTeam("NZ")}
          style={[styles.segBtn, team === "NZ" && { backgroundColor: colors.nz }]}
        >
          <Text style={[styles.segText, team === "NZ" && { color: colors.onBrand }]}>🇳🇿 Team NZ</Text>
        </Pressable>
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.brand} style={{ marginTop: 40 }} />
      ) : (
        <View style={styles.list}>
          {players.map((p) => (
            <PlayerCard key={p.id} p={p} />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

function PlayerCard({ p }: { p: Player }) {
  const accent = p.team === "NZ" ? colors.nz : colors.world;
  return (
    <View style={[styles.card, { borderLeftColor: accent }]} testID={`player-profile-${p.id}`}>
      <View style={styles.cardTop}>
        <Avatar photoPath={p.photo_path} name={p.name} size={72} team={p.team} />
        <View style={{ flex: 1, marginLeft: spacing.md }}>
          <Text style={styles.name}>{p.name}</Text>
          <Text style={[styles.team, { color: accent }]}>{p.team === "NZ" ? "🇳🇿 TEAM NZ" : "🌍 TEAM WORLD"}</Text>
        </View>
        <View style={styles.hcp}>
          <Text style={styles.hcpLabel}>HCP</Text>
          <Text style={styles.hcpVal} testID={`player-handicap-${p.id}`}>
            {p.handicap ? p.handicap : "–"}
          </Text>
        </View>
      </View>
      <Text style={p.bio ? styles.bio : styles.bioMuted}>{p.bio || "Bio coming soon"}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  head: { paddingHorizontal: spacing.lg, marginTop: spacing.lg },
  title: { color: colors.onSurface, fontSize: 24, fontWeight: "900" },
  sub: { color: colors.muted, marginTop: 4 },
  segment: {
    flexDirection: "row",
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    backgroundColor: colors.surface,
    padding: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  segBtn: { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: radius.pill },
  segText: { color: colors.muted, fontWeight: "800", fontSize: 13 },
  list: { marginTop: spacing.lg, paddingHorizontal: spacing.lg, gap: spacing.md },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 4,
  },
  cardTop: { flexDirection: "row", alignItems: "center" },
  name: { color: colors.onSurface, fontSize: 18, fontWeight: "900" },
  team: { fontSize: 11, fontWeight: "900", letterSpacing: 1.5, marginTop: 4 },
  hcp: {
    alignItems: "center",
    backgroundColor: colors.background,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 6,
    minWidth: 56,
  },
  hcpLabel: { color: colors.muted, fontSize: 10, fontWeight: "900", letterSpacing: 1.5 },
  hcpVal: { color: colors.onSurface, fontSize: 20, fontWeight: "900" },
  bio: { color: colors.onSurface, fontSize: 14, lineHeight: 20, marginTop: spacing.md },
  bioMuted: { color: colors.muted, fontSize: 13, fontStyle: "italic", marginTop: spacing.md },
});
