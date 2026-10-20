import Ionicons from "@react-native-vector-icons/ionicons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppState } from "@/src/api";
import { Avatar } from "@/src/avatar";
import { SCORE_ROUNDS, useCourse, usePH } from "@/src/score-helpers";
import { useScores } from "@/src/scores-store";
import { cardTotals, holePoints, strokesOn } from "@/src/stableford";
import { colors, radius, spacing } from "@/src/theme";

export default function ScorePlayerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data } = useAppState();
  const player = data?.players.find((p) => p.id === id);

  return (
    <View style={{ flex: 1, backgroundColor: colors.green }}>
      <View style={[styles.top, { paddingTop: insets.top + 8 }]}>
        <Pressable testID="breakdown-back" onPress={() => router.back()} style={styles.iconBtn} hitSlop={8}>
          <Ionicons name="chevron-back" size={26} color={colors.cream} />
        </Pressable>
        {player ? <Avatar photoPath={player.photo_path} name={player.name} size={40} team={player.team} /> : null}
        <Text style={styles.name} numberOfLines={1}>
          {player?.name ?? ""}
        </Text>
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 32 }} testID="score-breakdown">
        {player ? SCORE_ROUNDS.map((r) => <RoundTable key={r} round={r} playerId={player.id} />) : null}
      </ScrollView>
    </View>
  );
}

function RoundTable({ round, playerId }: { round: 2 | 3; playerId: string }) {
  const course = useCourse(round);
  const { data } = useAppState();
  const player = data?.players.find((p) => p.id === playerId);
  const { ph } = usePH(player, round);
  const { getHoles } = useScores();
  if (!course) return null;
  const holes = getHoles(playerId, round);
  const t = cardTotals(holes, course, ph);

  return (
    <View style={styles.card} testID={`breakdown-round-${round}`}>
      <Text style={styles.round}>ROUND {round}</Text>
      <Text style={styles.course}>{course.name}</Text>
      <Text style={styles.meta}>
        Playing handicap {ph} · {t.completed}/18 holes · {t.points} pts
      </Text>
      {t.completed === 0 ? (
        <Text style={styles.pending}>pending</Text>
      ) : (
        <>
          <View style={styles.thead}>
            {["HOLE", "PAR", "SI", "SHOTS", "GROSS", "PTS"].map((h) => (
              <Text key={h} style={styles.th}>
                {h}
              </Text>
            ))}
          </View>
          {course.holes.map((h, i) => {
            const e = holes[String(i + 1)];
            const pts = holePoints(e, h, ph);
            return (
              <View key={i} style={[styles.tr, i === 9 && { borderTopWidth: 2, borderTopColor: colors.goldBright }]}>
                <Text style={styles.td}>{i + 1}</Text>
                <Text style={styles.td}>{h.par}</Text>
                <Text style={styles.td}>{h.si}</Text>
                <Text style={styles.td}>{strokesOn(ph, h.si) || ""}</Text>
                <Text style={styles.td}>{e?.pu ? "P/U" : e?.g ?? "–"}</Text>
                <Text style={[styles.td, styles.pts]}>{pts ?? "–"}</Text>
              </View>
            );
          })}
          <View style={[styles.tr, styles.totalRow]}>
            <Text style={[styles.td, { flex: 4, textAlign: "left" }]}>TOTAL</Text>
            <Text style={styles.td}>{t.gross || "–"}</Text>
            <Text style={[styles.td, styles.pts]}>{t.points}</Text>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  top: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    backgroundColor: colors.greenDeep,
    borderBottomWidth: 2,
    borderBottomColor: "#D6A84A",
  },
  iconBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  name: { flex: 1, fontFamily: "BebasNeue-Regular", color: colors.cream, fontSize: 30 },
  card: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    backgroundColor: colors.greenCard,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.greenLine,
    padding: spacing.md,
  },
  round: { fontFamily: "BebasNeue-Regular", color: colors.goldBright, fontSize: 26 },
  course: { color: colors.cream, fontSize: 15, fontWeight: "800" },
  meta: { color: colors.creamMuted, fontSize: 13, marginTop: 4, marginBottom: spacing.sm },
  pending: { color: colors.creamMuted, fontStyle: "italic", marginTop: spacing.sm },
  thead: { flexDirection: "row", paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.greenLine },
  th: { flex: 1, color: colors.goldBright, fontSize: 11, fontWeight: "900", textAlign: "center" },
  tr: { flexDirection: "row", paddingVertical: 7, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.greenLine },
  td: { flex: 1, color: colors.cream, fontSize: 15, textAlign: "center", fontWeight: "600" },
  pts: { color: colors.goldBright, fontWeight: "900" },
  totalRow: { borderBottomWidth: 0, marginTop: 4 },
});
