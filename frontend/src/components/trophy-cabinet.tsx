import Ionicons from "@react-native-vector-icons/ionicons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useAppState } from "@/src/api";
import { colors, radius, spacing } from "@/src/theme";

type Team = "NZ" | "WORLD";

const HISTORY: { year: number; team: Team }[] = [
  { year: 2022, team: "WORLD" },
  { year: 2023, team: "WORLD" },
  { year: 2024, team: "NZ" },
  { year: 2025, team: "WORLD" },
];

function teamColor(t: Team | "TIE" | null | undefined) {
  if (t === "NZ") return colors.nz;
  if (t === "WORLD") return colors.world;
  return colors.gold;
}

function teamLabel(t: Team) {
  return t === "NZ" ? "🇳🇿 Team NZ" : "🌍 Team World";
}

export function TrophyCabinet() {
  const { data } = useAppState();
  const winner = data?.leaderboard?.cup_winner ?? null;

  return (
    <View style={styles.wrap} testID="trophy-cabinet">
      <Text style={styles.kicker}>PAST CHAMPIONS</Text>
      <View style={styles.row}>
        {HISTORY.map((h) => (
          <View key={h.year} style={styles.small} testID={`trophy-${h.year}`}>
            <Ionicons name="trophy" size={34} color={teamColor(h.team)} />
            <Text style={styles.smallYear}>{h.year}</Text>
            <Text style={styles.smallTeam}>{h.team === "NZ" ? "🇳🇿" : "🌍"}</Text>
          </View>
        ))}
      </View>

      <View style={[styles.big, { borderColor: teamColor(winner) }]} testID="trophy-2026">
        <Ionicons name="trophy" size={72} color={teamColor(winner)} />
        <Text style={styles.bigYear}>2026</Text>
        <Text style={[styles.bigTeam, { color: teamColor(winner) }]} testID="trophy-2026-winner">
          {winner === "NZ" || winner === "WORLD" ? teamLabel(winner) : winner === "TIE" ? "Tied" : "?"}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginHorizontal: spacing.lg, marginTop: spacing.lg },
  kicker: { color: colors.muted, fontSize: 12, fontWeight: "900", letterSpacing: 2, marginBottom: spacing.sm },
  row: { flexDirection: "row", gap: spacing.sm },
  small: {
    flex: 1,
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    paddingHorizontal: 4,
  },
  smallYear: { color: colors.onSurface, fontSize: 15, fontWeight: "900", marginTop: 4 },
  smallTeam: { fontSize: 20, textAlign: "center", marginTop: 2 },
  big: {
    marginTop: spacing.md,
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 2,
    paddingVertical: spacing.xl,
  },
  bigYear: { color: colors.onSurface, fontSize: 28, fontWeight: "900", marginTop: spacing.sm },
  bigTeam: { fontSize: 22, fontWeight: "900", marginTop: 2 },
});
