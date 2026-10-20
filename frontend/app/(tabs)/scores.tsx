import Ionicons from "@react-native-vector-icons/ionicons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { Header } from "@/src/components/chrome";
import { Avatar } from "@/src/avatar";
import { SyncPill, useScoreRows } from "@/src/score-helpers";
import { useScores } from "@/src/scores-store";
import { colors, radius, spacing } from "@/src/theme";

export default function ScoresScreen() {
  const router = useRouter();
  const { status, refresh } = useScores();
  const rows = useScoreRows();
  const [bestFirst, setBestFirst] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const ranked = rows.filter((r) => r.entered);
  const pendingRows = rows.filter((r) => !r.entered);
  const spoonId = ranked.length > 1 ? ranked[ranked.length - 1].player.id : null;
  const ordered = [...(bestFirst ? ranked : [...ranked].reverse()), ...pendingRows];

  async function onRefresh() {
    setRefreshing(true);
    await refresh().catch(() => {});
    setRefreshing(false);
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.green }}
      contentContainerStyle={{ paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.goldBright} />}
      testID="scores-screen"
    >
      <Header />

      <View style={styles.head}>
        <Text style={styles.title}>STABLEFORD</Text>
        <SyncPill status={status} />
      </View>

      <Pressable testID="enter-scores-button" style={styles.enterBtn} onPress={() => router.push("/score-entry")}>
        <Ionicons name="create" size={26} color={colors.greenDeep} />
        <Text style={styles.enterText}>ENTER SCORES</Text>
      </Pressable>

      <View style={styles.toggle}>
        <Pressable
          testID="sort-lowest-first"
          style={[styles.toggleBtn, !bestFirst && styles.toggleOn]}
          onPress={() => setBestFirst(false)}
        >
          <Text style={[styles.toggleText, !bestFirst && styles.toggleTextOn]}>Lowest first</Text>
        </Pressable>
        <Pressable
          testID="sort-best-first"
          style={[styles.toggleBtn, bestFirst && styles.toggleOn]}
          onPress={() => setBestFirst(true)}
        >
          <Text style={[styles.toggleText, bestFirst && styles.toggleTextOn]}>Best first</Text>
        </Pressable>
      </View>

      <View style={styles.table}>
        <View style={styles.thead}>
          <Text style={[styles.th, { flex: 1 }]}>PLAYER</Text>
          <Text style={[styles.th, styles.num]}>R2</Text>
          <Text style={[styles.th, styles.num]}>R3</Text>
          <Text style={[styles.th, styles.numTotal]}>TOTAL</Text>
        </View>
        {ordered.map((r) => (
          <Pressable
            key={r.player.id}
            testID={`score-row-${r.player.id}`}
            style={styles.row}
            onPress={() => router.push(`/score-player/${r.player.id}` as any)}
          >
            <Text style={styles.pos}>{r.pos ?? "–"}</Text>
            <Avatar photoPath={r.player.photo_path} name={r.player.name} size={34} team={r.player.team} />
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text style={styles.name} numberOfLines={1}>
                {r.player.name.split(" ")[0]} {r.player.team === "NZ" ? "🇳🇿" : "🌍"}
              </Text>
              {r.player.id === spoonId ? (
                <View style={styles.spoon} testID="wooden-spoon-badge">
                  <Text style={styles.spoonText}>🥄 WOODEN SPOON</Text>
                </View>
              ) : null}
            </View>
            <RoundCell v={r.rounds[2]} />
            <RoundCell v={r.rounds[3]} />
            <Text style={[styles.total, styles.numTotal]}>{r.entered ? r.total : "–"}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.foot}>Ties broken on countback: back 9, last 6, last 3, last hole.</Text>
    </ScrollView>
  );
}

function RoundCell({ v }: { v: { points: number; completed: number } | null }) {
  if (!v) return <Text style={[styles.pending, styles.num]}>pending</Text>;
  return (
    <View style={styles.num}>
      <Text style={styles.cell}>{v.points}</Text>
      {v.completed < 18 ? <Text style={styles.thru}>{v.completed}/18</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  head: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
  },
  title: { fontFamily: "BebasNeue-Regular", color: colors.goldBright, fontSize: 40, letterSpacing: 1 },
  enterBtn: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    backgroundColor: colors.goldBright,
    borderRadius: radius.md,
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  enterText: { fontFamily: "BebasNeue-Regular", color: colors.greenDeep, fontSize: 32, letterSpacing: 1 },
  toggle: {
    flexDirection: "row",
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.greenLine,
    backgroundColor: colors.greenDeep,
    padding: 3,
  },
  toggleBtn: { flex: 1, height: 40, borderRadius: 999, alignItems: "center", justifyContent: "center" },
  toggleOn: { backgroundColor: colors.cream },
  toggleText: { color: colors.creamMuted, fontWeight: "800" },
  toggleTextOn: { color: colors.greenDeep },
  table: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    backgroundColor: colors.greenCard,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.greenLine,
    overflow: "hidden",
  },
  thead: { flexDirection: "row", paddingHorizontal: 12, paddingVertical: 10, backgroundColor: colors.greenDeep },
  th: { color: colors.goldBright, fontSize: 12, fontWeight: "900", letterSpacing: 1.5 },
  num: { width: 52, alignItems: "center", textAlign: "center" },
  numTotal: { width: 52, textAlign: "right" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    minHeight: 60,
    borderTopWidth: 1,
    borderTopColor: colors.greenLine,
  },
  pos: { color: colors.creamMuted, width: 22, fontWeight: "900", fontSize: 15 },
  name: { color: colors.cream, fontSize: 16, fontWeight: "800" },
  cell: { color: colors.cream, fontSize: 18, fontWeight: "800" },
  thru: { color: colors.creamMuted, fontSize: 10 },
  pending: { color: colors.creamMuted, fontSize: 11, fontStyle: "italic" },
  total: { fontFamily: "BebasNeue-Regular", color: colors.goldBright, fontSize: 30 },
  spoon: {
    alignSelf: "flex-start",
    marginTop: 3,
    backgroundColor: "#8a5a2b",
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  spoonText: { color: colors.cream, fontSize: 10, fontWeight: "900", letterSpacing: 1 },
  foot: { color: colors.creamMuted, fontSize: 12, textAlign: "center", marginTop: spacing.md, paddingHorizontal: spacing.lg },
});
