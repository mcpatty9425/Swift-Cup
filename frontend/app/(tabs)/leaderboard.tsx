import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Header, Scoreboard } from "@/src/components/chrome";
import { useAppState } from "@/src/api";
import { colors, radius, spacing } from "@/src/theme";

const ROUND_LABEL: Record<string, string> = { "1": "Alternate Shot", "2": "Best Ball", "3": "Heads Up" };

export default function LeaderboardScreen() {
  const insets = useSafeAreaInsets();
  const { data } = useAppState();
  const lb = data?.leaderboard;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
      testID="leaderboard-screen"
    >
      <Header />
      <Scoreboard />

      <View style={styles.head}>
        <Text style={styles.title}>Board</Text>
        <Text style={styles.sub}>
          {lb?.cup_winner
            ? lb.cup_winner === "TIE"
              ? "Cup tied."
              : lb.cup_winner === "NZ"
              ? "🇳🇿 Team NZ wins the cup."
              : "🌍 Team World wins the cup."
            : lb?.leader === "TIE"
            ? "All square."
            : lb?.leader === "NZ"
            ? "🇳🇿 Team NZ leads."
            : lb?.leader === "WORLD"
            ? "🌍 Team World leads."
            : "—"}
        </Text>
      </View>

      <View style={styles.totals}>
        <View style={[styles.totalCard, { borderColor: colors.nz }]}>
          <Text style={styles.flag}>🇳🇿</Text>
          <Text style={styles.teamName}>Team NZ</Text>
          <Text style={styles.score}>{lb?.nz_total ?? 0}</Text>
        </View>
        <View style={[styles.totalCard, { borderColor: colors.world }]}>
          <Text style={styles.flag}>🌍</Text>
          <Text style={styles.teamName}>Team World</Text>
          <Text style={styles.score}>{lb?.world_total ?? 0}</Text>
        </View>
      </View>

      <View style={styles.breakdown}>
        <Text style={styles.sectionTitle}>Round by Round</Text>
        {[1, 2, 3].map((r) => {
          const pts = lb?.rounds?.[String(r)] || { nz: 0, world: 0 };
          const total = lb?.per_round_totals?.[String(r)] ?? 0;
          return (
            <View key={r} style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowKicker}>ROUND {r}</Text>
                <Text style={styles.rowName}>{ROUND_LABEL[String(r)]}</Text>
              </View>
              <View style={styles.rowScores}>
                <View style={styles.rowScoreCol}>
                  <Text style={[styles.rowScoreLabel, { color: colors.nz }]}>🇳🇿</Text>
                  <Text style={styles.rowScoreVal}>{pts.nz}</Text>
                </View>
                <Text style={styles.rowDash}>–</Text>
                <View style={styles.rowScoreCol}>
                  <Text style={[styles.rowScoreLabel, { color: colors.world }]}>🌍</Text>
                  <Text style={styles.rowScoreVal}>{pts.world}</Text>
                </View>
              </View>
              <Text style={styles.rowOf}>of {total}</Text>
            </View>
          );
        })}
        <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.md }}>
          <Text style={styles.sub}>
            {lb?.completed_matches ?? 0} of {lb?.total_matches ?? 0} matches complete
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  head: { paddingHorizontal: spacing.lg, marginTop: spacing.lg },
  title: { color: colors.onSurface, fontSize: 24, fontWeight: "900" },
  sub: { color: colors.muted, marginTop: 4, fontSize: 13 },
  totals: {
    flexDirection: "row",
    gap: spacing.md,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
  },
  totalCard: {
    flex: 1,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: "center",
    borderWidth: 2,
  },
  flag: { fontSize: 32 },
  teamName: { color: colors.muted, fontSize: 12, fontWeight: "800", letterSpacing: 1, marginTop: 4 },
  score: { color: colors.onSurface, fontSize: 42, fontWeight: "900", marginTop: 4 },
  breakdown: { marginTop: spacing.xl },
  sectionTitle: {
    color: colors.gold,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 2,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowKicker: { color: colors.muted, fontSize: 11, fontWeight: "800", letterSpacing: 2 },
  rowName: { color: colors.onSurface, fontSize: 16, fontWeight: "800", marginTop: 2 },
  rowScores: { flexDirection: "row", alignItems: "center", gap: 10 },
  rowScoreCol: { alignItems: "center", minWidth: 36 },
  rowScoreLabel: { fontSize: 14 },
  rowScoreVal: { color: colors.onSurface, fontSize: 20, fontWeight: "900" },
  rowDash: { color: colors.muted },
  rowOf: { color: colors.muted, fontSize: 11, marginLeft: 10 },
});
