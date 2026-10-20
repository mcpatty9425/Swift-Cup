import Ionicons from "@react-native-vector-icons/ionicons";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { API_URL, loadToken, useAppState } from "@/src/api";
import { useAuth } from "@/src/auth";
import { useScores } from "@/src/scores-store";
import { Course, CourseHole, playingHandicap } from "@/src/stableford";
import { colors, radius, spacing } from "@/src/theme";

async function adminFetch(path: string, method: string, body: unknown) {
  const token = await loadToken();
  const r = await fetch(`${API_URL}${path}`, {
    method,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const j = await r.json().catch(() => ({}));
    throw new Error(typeof j.detail === "string" ? j.detail : `Error ${r.status}`);
  }
  return r.json();
}

export default function ScoreAdminScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isAdmin } = useAuth();
  const { server } = useScores();
  const qc = useQueryClient();
  const [round, setRound] = useState<2 | 3>(2);
  const [err, setErr] = useState<string | null>(null);

  const refresh = () => qc.invalidateQueries({ queryKey: ["scores"] });

  async function run(fn: () => Promise<unknown>) {
    setErr(null);
    try {
      await fn();
      refresh();
    } catch (e: any) {
      setErr(e?.message || "Failed");
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.green }}>
      <View style={[styles.top, { paddingTop: insets.top + 6 }]}>
        <Pressable testID="score-admin-back" onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={26} color={colors.cream} />
        </Pressable>
        <Text style={styles.topTitle}>SCORES SETUP</Text>
      </View>
      {!isAdmin ? (
        <Text style={styles.note}>Admin only. Log in with the PIN from the menu first.</Text>
      ) : !server ? (
        <ActivityIndicator color={colors.goldBright} style={{ marginTop: 40 }} />
      ) : (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + 40 }} testID="score-admin">
            {err ? <Text style={styles.err}>{err}</Text> : null}

            <Text style={styles.h}>HANDICAP METHOD</Text>
            <View style={styles.row}>
              {(
                [
                  ["AS_ENTERED", "Use handicap as entered"],
                  ["COURSE", "Calculate course handicap"],
                ] as const
              ).map(([m, label]) => (
                <Pressable
                  key={m}
                  testID={`method-${m}`}
                  onPress={() => run(() => adminFetch("/api/scores/settings", "PATCH", { method: m }))}
                  style={[styles.opt, server.settings.method === m && styles.optOn]}
                >
                  <Text style={[styles.optText, server.settings.method === m && styles.optTextOn]}>{label}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.hint}>Course handicap = index × slope ÷ 113 + (rating − par), rounded.</Text>

            <Text style={styles.h}>ALLOWANCE</Text>
            <View style={styles.row}>
              {[100, 95].map((a) => (
                <Pressable
                  key={a}
                  testID={`allowance-${a}`}
                  onPress={() => run(() => adminFetch("/api/scores/settings", "PATCH", { allowance: a }))}
                  style={[styles.opt, server.settings.allowance === a && styles.optOn]}
                >
                  <Text style={[styles.optText, server.settings.allowance === a && styles.optTextOn]}>{a}%</Text>
                </Pressable>
              ))}
            </View>

            <View style={[styles.row, { marginTop: spacing.xl }]}>
              {([2, 3] as const).map((r) => (
                <Pressable key={r} testID={`admin-round-${r}`} onPress={() => setRound(r)} style={[styles.opt, round === r && styles.optOn]}>
                  <Text style={[styles.optText, round === r && styles.optTextOn]}>ROUND {r}</Text>
                </Pressable>
              ))}
            </View>

            <PlayingHandicaps round={round} run={run} />
            <CourseEditor key={round} course={server.courses.find((c) => c.round === round)!} run={run} />
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </View>
  );
}

function PlayingHandicaps({ round, run }: { round: 2 | 3; run: (fn: () => Promise<unknown>) => void }) {
  const { data } = useAppState();
  const { server } = useScores();
  const course = server!.courses.find((c) => c.round === round)!;
  const players = [...(data?.players ?? [])].sort((a, b) => a.name.localeCompare(b.name));
  const setPh = (pid: string, ph: number | null) => run(() => adminFetch(`/api/scores/ph/${round}/${pid}`, "PUT", { ph }));

  return (
    <View>
      <Text style={styles.h}>PLAYING HANDICAPS · ROUND {round}</Text>
      {players.map((p) => {
        const { ph, overridden, calculated } = playingHandicap(p, course, server!.settings, server!.overrides);
        return (
          <View key={p.id} style={styles.phRow} testID={`ph-row-${p.id}`}>
            <View style={{ flex: 1 }}>
              <Text style={styles.phName}>{p.name}</Text>
              <Text style={styles.phSub}>
                Index {p.handicap || "–"} · calc {calculated}
                {overridden ? " · OVERRIDDEN" : ""}
              </Text>
            </View>
            <Pressable testID={`ph-minus-${p.id}`} style={styles.smallBtn} onPress={() => setPh(p.id, ph - 1)}>
              <Ionicons name="remove" size={22} color={colors.greenDeep} />
            </Pressable>
            <Text style={[styles.phVal, overridden && { color: colors.goldBright }]} testID={`ph-value-${p.id}`}>
              {ph}
            </Text>
            <Pressable testID={`ph-plus-${p.id}`} style={styles.smallBtn} onPress={() => setPh(p.id, ph + 1)}>
              <Ionicons name="add" size={22} color={colors.greenDeep} />
            </Pressable>
            <Pressable
              testID={`ph-auto-${p.id}`}
              disabled={!overridden}
              onPress={() => setPh(p.id, null)}
              style={[styles.autoBtn, !overridden && { opacity: 0.3 }]}
            >
              <Text style={styles.autoText}>AUTO</Text>
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}

function CourseEditor({ course, run }: { course: Course; run: (fn: () => Promise<unknown>) => void }) {
  const [name, setName] = useState(course.name);
  const [par, setPar] = useState(String(course.par));
  const [rating, setRating] = useState(String(course.rating));
  const [slope, setSlope] = useState(String(course.slope));
  const [holes, setHoles] = useState<CourseHole[]>(course.holes);
  const [saved, setSaved] = useState(false);

  useEffect(() => setSaved(false), [name, par, rating, slope, holes]);

  const setHole = (i: number, patch: Partial<CourseHole>) =>
    setHoles((hs) => hs.map((h, j) => (j === i ? { ...h, ...patch } : h)));

  return (
    <View>
      <Text style={styles.h}>COURSE · ROUND {course.round} (WHITE TEES)</Text>
      <TextInput testID="course-name" value={name} onChangeText={setName} style={styles.input} placeholderTextColor={colors.creamMuted} />
      <View style={[styles.row, { marginTop: spacing.sm }]}>
        {(
          [
            ["Par", par, setPar, "course-par"],
            ["Rating", rating, setRating, "course-rating"],
            ["Slope", slope, setSlope, "course-slope"],
          ] as const
        ).map(([label, v, set, tid]) => (
          <View key={label} style={{ flex: 1 }}>
            <Text style={styles.phSub}>{label}</Text>
            <TextInput testID={tid} value={v} onChangeText={set} keyboardType="decimal-pad" style={styles.input} />
          </View>
        ))}
      </View>
      <View style={styles.holeHead}>
        <Text style={[styles.holeTh, { width: 48 }]}>HOLE</Text>
        <Text style={[styles.holeTh, { flex: 1 }]}>PAR</Text>
        <Text style={[styles.holeTh, { width: 72 }]}>SI</Text>
      </View>
      {holes.map((h, i) => (
        <View key={i} style={styles.holeRow}>
          <Text style={[styles.phName, { width: 48 }]}>{i + 1}</Text>
          <View style={{ flex: 1, flexDirection: "row", gap: 6 }}>
            {[3, 4, 5].map((p) => (
              <Pressable
                key={p}
                testID={`course-hole-${i + 1}-par-${p}`}
                onPress={() => setHole(i, { par: p })}
                style={[styles.parChip, h.par === p && styles.optOn]}
              >
                <Text style={[styles.optText, h.par === p && styles.optTextOn]}>{p}</Text>
              </Pressable>
            ))}
          </View>
          <TextInput
            testID={`course-hole-${i + 1}-si`}
            value={String(h.si || "")}
            onChangeText={(t) => setHole(i, { si: parseInt(t, 10) || 0 })}
            keyboardType="number-pad"
            style={[styles.input, { width: 72, textAlign: "center" }]}
          />
        </View>
      ))}
      <Pressable
        testID="course-save"
        style={styles.save}
        onPress={() =>
          run(async () => {
            await adminFetch(`/api/courses/${course.round}`, "PUT", {
              name,
              par: parseInt(par, 10),
              rating: parseFloat(rating),
              slope: parseInt(slope, 10),
              holes,
            });
            setSaved(true);
          })
        }
      >
        <Text style={styles.saveText}>{saved ? "SAVED ✓" : "SAVE COURSE"}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  top: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.greenDeep,
    borderBottomWidth: 2,
    borderBottomColor: "#D6A84A",
  },
  iconBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  topTitle: { fontFamily: "BebasNeue-Regular", color: colors.cream, fontSize: 30 },
  note: { color: colors.cream, padding: spacing.xl, textAlign: "center" },
  err: { color: "#ffb4a8", marginBottom: spacing.sm, fontWeight: "700" },
  h: { color: colors.goldBright, fontSize: 13, fontWeight: "900", letterSpacing: 2, marginTop: spacing.xl, marginBottom: spacing.sm },
  hint: { color: colors.creamMuted, fontSize: 12, marginTop: 6 },
  row: { flexDirection: "row", gap: spacing.sm },
  opt: {
    flex: 1,
    minHeight: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.greenLine,
    backgroundColor: colors.greenCard,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  optOn: { backgroundColor: colors.goldBright, borderColor: colors.goldBright },
  optText: { color: colors.cream, fontWeight: "800", textAlign: "center" },
  optTextOn: { color: colors.greenDeep },
  phRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.greenLine,
  },
  phName: { color: colors.cream, fontSize: 16, fontWeight: "800" },
  phSub: { color: colors.creamMuted, fontSize: 12 },
  phVal: { color: colors.cream, fontFamily: "BebasNeue-Regular", fontSize: 30, width: 36, textAlign: "center" },
  smallBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.cream, alignItems: "center", justifyContent: "center" },
  autoBtn: { paddingHorizontal: 8, height: 44, justifyContent: "center" },
  autoText: { color: colors.goldBright, fontWeight: "900", fontSize: 12 },
  input: {
    backgroundColor: colors.greenDeep,
    color: colors.cream,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.greenLine,
    paddingHorizontal: 12,
    minHeight: 48,
    fontSize: 16,
  },
  holeHead: { flexDirection: "row", marginTop: spacing.md, paddingBottom: 4 },
  holeTh: { color: colors.goldBright, fontSize: 11, fontWeight: "900" },
  holeRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 4 },
  parChip: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.greenLine,
    backgroundColor: colors.greenCard,
    alignItems: "center",
    justifyContent: "center",
  },
  save: { marginTop: spacing.lg, backgroundColor: colors.goldBright, minHeight: 56, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  saveText: { fontFamily: "BebasNeue-Regular", color: colors.greenDeep, fontSize: 26 },
});
