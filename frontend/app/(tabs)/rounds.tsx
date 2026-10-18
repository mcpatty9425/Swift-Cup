import Ionicons from "@react-native-vector-icons/ionicons";
import { useRouter } from "expo-router";
import React from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Header, Scoreboard } from "@/src/components/chrome";
import { useAppState } from "@/src/api";
import { colors, radius, spacing } from "@/src/theme";

export default function RoundsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data, isLoading } = useAppState();
  const rounds = (data as any)?.rounds ?? [];
  const lb = data?.leaderboard;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
      testID="rounds-screen"
    >
      <Header />
      <Scoreboard />

      <View style={styles.head}>
        <Text style={styles.title}>Rounds</Text>
        <Text style={styles.sub}>Tap a round to see pairings, scores and live status.</Text>
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.gold} style={{ marginTop: 30 }} />
      ) : (
        <View style={styles.list}>
          {rounds.map((r: any) => {
            const pts = lb?.rounds?.[String(r.round)] || { nz: 0, world: 0 };
            return (
              <Pressable
                key={r.round}
                testID={`round-card-${r.round}`}
                style={[styles.card, statusBorder(r.status)]}
                onPress={() => router.push(`/r${r.round}` as any)}
              >
                <View style={styles.cardTop}>
                  <View>
                    <Text style={styles.kicker}>ROUND {r.round}</Text>
                    <Text style={styles.format}>{r.format}</Text>
                  </View>
                  <View style={[styles.pill, pillStyle(r.status)]}>
                    <View style={[styles.dot, { backgroundColor: pillText(r.status) }]} />
                    <Text style={[styles.pillText, { color: pillText(r.status) }]}>{labelFor(r.status)}</Text>
                  </View>
                </View>

                <View style={styles.meta}>
                  <View style={styles.metaItem}>
                    <Ionicons name="location-outline" size={14} color={colors.muted} />
                    <Text style={styles.metaText}>{r.venue}</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Ionicons name="calendar-outline" size={14} color={colors.muted} />
                    <Text style={styles.metaText}>{r.date}</Text>
                  </View>
                </View>

                <View style={styles.footer}>
                  <View style={styles.pointPair}>
                    <Text style={styles.ptLabel}>🇳🇿 NZ</Text>
                    <Text style={styles.ptVal}>{pts.nz}</Text>
                  </View>
                  <View style={styles.progressWrap}>
                    <Text style={styles.progress}>
                      {r.completed}/{r.total} matches
                    </Text>
                  </View>
                  <View style={styles.pointPair}>
                    <Text style={styles.ptLabel}>🌍 WORLD</Text>
                    <Text style={styles.ptVal}>{pts.world}</Text>
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

function labelFor(s: string) {
  if (s === "LIVE") return "LIVE";
  if (s === "COMPLETE") return "COMPLETE";
  return "UPCOMING";
}
function pillText(s: string) {
  if (s === "LIVE") return colors.success;
  if (s === "COMPLETE") return colors.gold;
  return colors.muted;
}
function pillStyle(s: string) {
  if (s === "LIVE") return { backgroundColor: "rgba(14,138,92,0.1)", borderColor: colors.success };
  if (s === "COMPLETE") return { backgroundColor: "rgba(196,148,31,0.12)", borderColor: colors.gold };
  return { backgroundColor: colors.surfaceTertiary, borderColor: colors.border };
}
function statusBorder(s: string) {
  if (s === "LIVE") return { borderColor: colors.success };
  if (s === "COMPLETE") return { borderColor: colors.gold };
  return { borderColor: colors.border };
}

const styles = StyleSheet.create({
  head: { paddingHorizontal: spacing.lg, marginTop: spacing.lg },
  title: { color: colors.onSurface, fontSize: 24, fontWeight: "900" },
  sub: { color: colors.muted, marginTop: 4 },
  list: { paddingHorizontal: spacing.lg, marginTop: spacing.lg, gap: spacing.md },
  card: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
  },
  cardTop: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  kicker: { color: colors.gold, fontSize: 12, fontWeight: "900", letterSpacing: 2 },
  format: { color: colors.onSurface, fontSize: 22, fontWeight: "900", marginTop: 2 },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  pillText: { fontSize: 11, fontWeight: "900", letterSpacing: 1 },
  meta: { flexDirection: "row", gap: spacing.lg, marginTop: spacing.md },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  metaText: { color: colors.onSurfaceSecondary, fontSize: 13 },
  footer: {
    marginTop: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  pointPair: { alignItems: "center", minWidth: 70 },
  ptLabel: { color: colors.muted, fontSize: 11, fontWeight: "800", letterSpacing: 1 },
  ptVal: { color: colors.onSurface, fontSize: 20, fontWeight: "900" },
  progressWrap: { flex: 1, alignItems: "center" },
  progress: { color: colors.muted, fontSize: 12 },
});
