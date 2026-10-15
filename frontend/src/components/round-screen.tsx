import React from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { Header, Scoreboard } from "@/src/components/chrome";
import { MatchCard } from "@/src/components/match-card";
import { useAppState } from "@/src/api";
import { colors, spacing } from "@/src/theme";

export default function RoundScreen({ round, title, format }: { round: 1 | 2 | 3; title: string; format: string }) {
  const { data, isLoading } = useAppState();
  const matches = (data?.matches ?? []).filter((m) => m.round === round);
  const players = data?.players ?? [];
  const lb = data?.leaderboard?.rounds?.[String(round)];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingBottom: 32 }}
      testID={`round-${round}-screen`}
    >
      <Header />
      <Scoreboard />

      <View style={styles.header}>
        <Text style={styles.hRound}>{title}</Text>
        <Text style={styles.hFormat}>{format}</Text>
        <View style={styles.hPoints}>
          <View style={[styles.pBadge, { backgroundColor: "#1a3350" }]}>
            <Text style={styles.pBadgeLabel}>🇳🇿 NZ</Text>
            <Text style={styles.pBadgeVal}>{lb?.nz ?? 0}</Text>
          </View>
          <View style={[styles.pBadge, { backgroundColor: "#3a2418" }]}>
            <Text style={styles.pBadgeLabel}>🌍 WORLD</Text>
            <Text style={styles.pBadgeVal}>{lb?.world ?? 0}</Text>
          </View>
        </View>
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.gold} style={{ marginTop: 40 }} />
      ) : matches.length === 0 ? (
        <Text style={styles.empty}>No matches for this round yet.</Text>
      ) : (
        <View style={styles.list}>
          {matches.map((m, i) => (
            <MatchCard key={m.id} match={m} matchNumber={i + 1} players={players} />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: {
    marginTop: spacing.lg,
    marginHorizontal: spacing.lg,
  },
  hRound: { color: colors.gold, fontSize: 12, fontWeight: "900", letterSpacing: 3 },
  hFormat: { color: colors.onSurface, fontSize: 26, fontWeight: "900", marginTop: 2 },
  hPoints: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
  pBadge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  pBadgeLabel: { color: colors.onSurface, fontSize: 12, fontWeight: "800", letterSpacing: 1 },
  pBadgeVal: { color: colors.onSurface, fontSize: 18, fontWeight: "900" },
  empty: { color: colors.muted, textAlign: "center", marginTop: 40 },
  list: { paddingHorizontal: spacing.lg, marginTop: spacing.lg },
});
