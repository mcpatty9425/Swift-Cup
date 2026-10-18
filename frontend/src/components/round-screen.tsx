import { useRouter } from "expo-router";
import React from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Header, Scoreboard } from "@/src/components/chrome";
import { MatchCard } from "@/src/components/match-card";
import { useAppState } from "@/src/api";
import { colors, radius, spacing } from "@/src/theme";

export default function RoundScreen({ round, title, format }: { round: 1 | 2 | 3; title: string; format: string }) {
  const router = useRouter();
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

      <View style={styles.switcher} testID="round-switcher">
        {([1, 2, 3] as const).map((r) => (
          <Pressable
            key={r}
            testID={`round-switch-${r}`}
            onPress={() => r !== round && router.replace(`/r${r}` as any)}
            style={[styles.swBtn, r === round && styles.swBtnActive]}
          >
            <Text style={[styles.swText, r === round && styles.swTextActive]}>ROUND {r}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.header}>
        <Text style={styles.hRound}>{title}</Text>
        <Text style={styles.hFormat}>{format}</Text>
        <View style={styles.hPoints}>
          <View style={[styles.pBadge, { backgroundColor: "rgba(30,58,138,0.1)" }]}>
            <Text style={styles.pBadgeLabel}>🇳🇿 NZ</Text>
            <Text style={styles.pBadgeVal}>{lb?.nz ?? 0}</Text>
          </View>
          <View style={[styles.pBadge, { backgroundColor: "rgba(192,90,42,0.1)" }]}>
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
  switcher: {
    flexDirection: "row",
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 3,
  },
  swBtn: { flex: 1, height: 32, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
  swBtnActive: { backgroundColor: colors.brand },
  swText: { color: colors.muted, fontSize: 12, fontWeight: "800", letterSpacing: 1 },
  swTextActive: { color: colors.onBrand },
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
