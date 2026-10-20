// Shared helpers for the Scores section: playing handicaps, leaderboard rows, sync pill.
import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Player, useAppState } from "./api";
import { cardTotals, CardTotals, compareBetter, Course, playingHandicap } from "./stableford";
import { SyncStatus, useScores } from "./scores-store";
import { colors } from "./theme";

export const SCORE_ROUNDS = [2, 3] as const;

export function useCourse(round: 2 | 3): Course | null {
  const { server } = useScores();
  return server?.courses.find((c) => c.round === round) ?? null;
}

export function usePH(player: Player | null | undefined, round: 2 | 3) {
  const { server } = useScores();
  const course = server?.courses.find((c) => c.round === round);
  if (!player || !course || !server) return { ph: 0, overridden: false, calculated: 0 };
  return playingHandicap(player, course, server.settings, server.overrides);
}

export type ScoreRow = {
  player: Player;
  rounds: Record<2 | 3, (CardTotals & { ph: number }) | null>;
  total: number;
  entered: boolean;
  cb: number[];
  pos?: number;
};

export function useScoreRows(): ScoreRow[] {
  const { data } = useAppState();
  const { server, getHoles } = useScores();
  return useMemo(() => {
    const players = data?.players ?? [];
    if (!server) return [];
    const rows: ScoreRow[] = players.map((p) => {
      const rounds = { 2: null, 3: null } as ScoreRow["rounds"];
      for (const r of SCORE_ROUNDS) {
        const course = server.courses.find((c) => c.round === r);
        if (!course) continue;
        const { ph } = playingHandicap(p, course, server.settings, server.overrides);
        const t = cardTotals(getHoles(p.id, r), course, ph);
        rounds[r] = t.completed > 0 ? { ...t, ph } : null;
      }
      const latest = rounds[3] ?? rounds[2];
      return {
        player: p,
        rounds,
        total: (rounds[2]?.points ?? 0) + (rounds[3]?.points ?? 0),
        entered: !!(rounds[2] || rounds[3]),
        cb: latest ? [latest.back9, latest.last6, latest.last3, latest.last1] : [0, 0, 0, 0],
      };
    });
    const ranked = rows.filter((r) => r.entered).sort((a, b) => compareBetter(b, a));
    ranked.forEach((r, i) => {
      r.pos = i > 0 && compareBetter(r, ranked[i - 1]) === 0 ? ranked[i - 1].pos : i + 1;
    });
    return [...ranked, ...rows.filter((r) => !r.entered).sort((a, b) => a.player.name.localeCompare(b.player.name))];
  }, [data, server, getHoles]);
}

export function SyncPill({ status }: { status: SyncStatus }) {
  const ok = status === "synced";
  return (
    <View style={[styles.pill, { borderColor: ok ? colors.goldBright : colors.creamMuted }]} testID="sync-indicator">
      <View style={[styles.dot, { backgroundColor: ok ? "#5dd39e" : "#f0a04b" }]} />
      <Text style={styles.text}>{ok ? "Synced" : status === "syncing" ? "Syncing…" : "Waiting for signal"}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  text: { color: colors.cream, fontSize: 12, fontWeight: "700" },
});
