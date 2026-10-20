import Ionicons from "@react-native-vector-icons/ionicons";
import { useKeepAwake } from "expo-keep-awake";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Directions, Gesture, GestureDetector } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Player, useAppState } from "@/src/api";
import { usePlayer } from "@/src/player-context";
import { SyncPill, useCourse, usePH } from "@/src/score-helpers";
import { useScores } from "@/src/scores-store";
import { cardTotals, holePoints, isPlayed, parseIndex, strokesOn } from "@/src/stableford";
import { colors, radius, spacing } from "@/src/theme";

type Step = "select" | "hole" | "review";

export default function ScoreEntryScreen() {
  useKeepAwake();
  const params = useLocalSearchParams<{ round?: string; player?: string }>();
  const { playerId: me } = usePlayer();
  const [round, setRound] = useState<2 | 3>(params.round === "3" ? 3 : 2);
  const [pid, setPid] = useState<string | null>(params.player ?? me);
  const [step, setStep] = useState<Step>("select");
  const [idx, setIdx] = useState(0);
  const { data } = useAppState();
  const player = data?.players.find((p) => p.id === pid) ?? null;

  if (step === "select" || !player) {
    return (
      <SelectStep
        round={round}
        setRound={setRound}
        pid={pid}
        setPid={setPid}
        players={data?.players ?? []}
        onStart={(first) => {
          setIdx(first);
          setStep("hole");
        }}
      />
    );
  }
  if (step === "review") {
    return (
      <ReviewStep
        player={player}
        round={round}
        onEdit={(i) => {
          setIdx(i);
          setStep("hole");
        }}
        onBack={() => setStep("hole")}
      />
    );
  }
  return (
    <HoleStep
      player={player}
      round={round}
      idx={idx}
      setIdx={setIdx}
      onReview={() => setStep("review")}
      onChangePlayer={() => setStep("select")}
    />
  );
}

function TopBar({ title, sub, onLeft, leftIcon = "close" }: { title: string; sub?: string; onLeft: () => void; leftIcon?: any }) {
  const insets = useSafeAreaInsets();
  const { status } = useScores();
  return (
    <View style={[styles.top, { paddingTop: insets.top + 6 }]}>
      <Pressable testID="entry-top-left" onPress={onLeft} style={styles.iconBtn} hitSlop={8}>
        <Ionicons name={leftIcon} size={28} color={colors.cream} />
      </Pressable>
      <View style={{ flex: 1 }}>
        <Text style={styles.topTitle} numberOfLines={1}>
          {title}
        </Text>
        {sub ? (
          <Text style={styles.topSub} numberOfLines={1}>
            {sub}
          </Text>
        ) : null}
      </View>
      <SyncPill status={status} />
    </View>
  );
}

function SelectStep({
  round,
  setRound,
  pid,
  setPid,
  players,
  onStart,
}: {
  round: 2 | 3;
  setRound: (r: 2 | 3) => void;
  pid: string | null;
  setPid: (id: string) => void;
  players: Player[];
  onStart: (firstHole: number) => void;
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const c2 = useCourse(2);
  const c3 = useCourse(3);
  const { getHoles } = useScores();
  const sorted = useMemo(() => [...players].sort((a, b) => a.name.localeCompare(b.name)), [players]);
  const player = players.find((p) => p.id === pid);
  const { ph, overridden } = usePH(player, round);
  const holes = pid ? getHoles(pid, round) : {};
  const firstUnplayed = Array.from({ length: 18 }).findIndex((_, i) => !isPlayed(holes[String(i + 1)]));
  const noHcp = player && !overridden && parseIndex(player.handicap) === null;

  return (
    <View style={styles.root}>
      <TopBar title="ENTER SCORES" onLeft={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 140 + insets.bottom }}>
        <Text style={styles.label}>ROUND</Text>
        <View style={{ flexDirection: "row", gap: spacing.md }}>
          {([2, 3] as const).map((r) => {
            const c = r === 2 ? c2 : c3;
            const on = round === r;
            return (
              <Pressable
                key={r}
                testID={`entry-round-${r}`}
                onPress={() => setRound(r)}
                style={[styles.roundCard, on && styles.roundCardOn]}
              >
                <Text style={[styles.roundNum, on && { color: colors.greenDeep }]}>ROUND {r}</Text>
                <Text style={[styles.roundCourse, on && { color: colors.greenDeep }]} numberOfLines={2}>
                  {c?.name ?? "…"}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={[styles.label, { marginTop: spacing.xl }]}>PLAYER</Text>
        <View style={styles.grid}>
          {sorted.map((p) => {
            const on = p.id === pid;
            return (
              <Pressable
                key={p.id}
                testID={`entry-player-${p.id}`}
                onPress={() => setPid(p.id)}
                style={[styles.nameChip, on && styles.nameChipOn]}
              >
                <Text style={[styles.nameText, on && { color: colors.greenDeep }]} numberOfLines={1}>
                  {p.team === "NZ" ? "🇳🇿" : "🌍"} {p.name.split(" ")[0]}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <View style={[styles.sticky, { paddingBottom: insets.bottom + spacing.md }]}>
        {player ? (
          <Text style={styles.stickyInfo}>
            {player.name} · Playing handicap {ph}
            {noHcp ? " (no handicap entered)" : ""}
          </Text>
        ) : null}
        <Pressable
          testID="entry-start"
          disabled={!player}
          onPress={() => onStart(firstUnplayed === -1 ? 0 : firstUnplayed)}
          style={[styles.bigGold, !player && { opacity: 0.4 }]}
        >
          <Text style={styles.bigGoldText}>{firstUnplayed > 0 ? `CONTINUE · HOLE ${firstUnplayed + 1}` : firstUnplayed === -1 ? "VIEW / EDIT CARD" : "START HOLE 1"}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function HoleStep({
  player,
  round,
  idx,
  setIdx,
  onReview,
  onChangePlayer,
}: {
  player: Player;
  round: 2 | 3;
  idx: number;
  setIdx: (i: number) => void;
  onReview: () => void;
  onChangePlayer: () => void;
}) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const course = useCourse(round);
  const { ph } = usePH(player, round);
  const { getHoles, setHole } = useScores();
  if (!course) return <View style={styles.root} />;
  const holes = getHoles(player.id, round);
  const hole = course.holes[idx];
  const n = idx + 1;
  const entry = holes[String(n)];
  const gross = entry && !entry.pu && entry.g != null ? entry.g : hole.par;
  const pickedUp = !!entry?.pu;
  const pts = holePoints(entry && isPlayed(entry) ? entry : { g: hole.par, pu: false, t: 0 }, hole, ph);
  const shots = strokesOn(ph, hole.si);
  const totals = cardTotals(holes, course, ph);

  const save = (g: number | null, pu: boolean) => setHole(player.id, round, n, { g, pu });
  const minus = () => save(Math.max(1, (pickedUp ? hole.par : gross) - 1), false);
  const plus = () => save(Math.min(20, (pickedUp ? hole.par : gross) + 1), false);
  const pickup = () => (pickedUp ? save(hole.par, false) : save(null, true));
  const next = () => {
    if (!isPlayed(entry)) save(hole.par, false);
    if (idx < 17) setIdx(idx + 1);
    else onReview();
  };
  const back = () => idx > 0 && setIdx(idx - 1);

  const swipe = Gesture.Race(
    Gesture.Fling().direction(Directions.LEFT).runOnJS(true).onEnd(next),
    Gesture.Fling().direction(Directions.RIGHT).runOnJS(true).onEnd(back),
  );

  return (
    <View style={styles.root}>
      <TopBar
        title={`${player.name}`}
        sub={`Round ${round} · ${course.name} · PH ${ph}`}
        onLeft={() => router.back()}
      />
      <GestureDetector gesture={swipe}>
        <View style={styles.holeBody} testID={`hole-screen-${n}`}>
          <View style={styles.holeHead}>
            <Text style={styles.holeNum} testID="hole-number">
              HOLE {n}
            </Text>
            <View style={styles.holeMetaRow}>
              <View style={styles.metaBox}>
                <Text style={styles.metaLabel}>PAR</Text>
                <Text style={styles.metaVal} testID="hole-par">
                  {hole.par}
                </Text>
              </View>
              <View style={styles.metaBox}>
                <Text style={styles.metaLabel}>STROKE INDEX</Text>
                <Text style={styles.metaVal} testID="hole-si">
                  {hole.si}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.scoreRow}>
            <Pressable testID="score-minus" onPress={minus} style={styles.stepBtn}>
              <Ionicons name="remove" size={56} color={colors.greenDeep} />
            </Pressable>
            <View style={styles.scoreBox}>
              <Text
                style={[styles.scoreVal, pickedUp && { fontSize: 44 }, !isPlayed(entry) && { opacity: 0.55 }]}
                testID="score-value"
              >
                {pickedUp ? "PICK UP" : gross}
              </Text>
            </View>
            <Pressable testID="score-plus" onPress={plus} style={styles.stepBtn}>
              <Ionicons name="add" size={56} color={colors.greenDeep} />
            </Pressable>
          </View>

          <Pressable testID="score-pickup" onPress={pickup} style={[styles.pickup, pickedUp && styles.pickupOn]}>
            <Text style={[styles.pickupText, pickedUp && { color: colors.greenDeep }]}>
              {pickedUp ? "UNDO PICK UP" : "PICK UP (0 PTS)"}
            </Text>
          </Pressable>

          <View style={styles.ptsRow}>
            <Text style={styles.ptsVal} testID="hole-points">
              {pts} {pts === 1 ? "PT" : "PTS"}
            </Text>
            <Text style={styles.shots} testID="hole-shots">
              {shots === 0
                ? "No shots on this hole"
                : shots > 0
                  ? `You get ${shots} shot${shots > 1 ? "s" : ""}`
                  : `You give back ${-shots} shot`}
            </Text>
          </View>
        </View>
      </GestureDetector>

      <View style={[styles.sticky, { paddingBottom: insets.bottom + spacing.md }]}>
        <View style={styles.stickyTop}>
          <Text style={styles.running} testID="running-total">
            {totals.points} pts · {totals.completed}/18
          </Text>
          <Pressable testID="open-review" onPress={onReview} style={styles.reviewLink} hitSlop={6}>
            <Ionicons name="list" size={18} color={colors.goldBright} />
            <Text style={styles.reviewLinkText}>Review card</Text>
          </Pressable>
        </View>
        <View style={styles.navRow}>
          <Pressable testID="hole-back" onPress={back} disabled={idx === 0} style={[styles.navBtn, idx === 0 && { opacity: 0.35 }]}>
            <Ionicons name="chevron-back" size={28} color={colors.cream} />
            <Text style={styles.navText}>BACK</Text>
          </Pressable>
          <Pressable testID="hole-next" onPress={next} style={[styles.navBtn, styles.navNext]}>
            <Text style={[styles.navText, { color: colors.greenDeep }]}>{idx === 17 ? "FINISH" : "NEXT"}</Text>
            <Ionicons name="chevron-forward" size={28} color={colors.greenDeep} />
          </Pressable>
        </View>
        <Pressable testID="change-player" onPress={onChangePlayer} hitSlop={6}>
          <Text style={styles.changeText}>Change round / player</Text>
        </Pressable>
      </View>
    </View>
  );
}

function ReviewStep({
  player,
  round,
  onEdit,
  onBack,
}: {
  player: Player;
  round: 2 | 3;
  onEdit: (i: number) => void;
  onBack: () => void;
}) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const course = useCourse(round);
  const { ph } = usePH(player, round);
  const { getHoles } = useScores();
  if (!course) return <View style={styles.root} />;
  const holes = getHoles(player.id, round);
  const t = cardTotals(holes, course, ph);

  return (
    <View style={styles.root}>
      <TopBar title="REVIEW CARD" sub={`${player.name} · Round ${round} · PH ${ph}`} onLeft={onBack} leftIcon="chevron-back" />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 140 + insets.bottom }} testID="review-card">
        <View style={styles.rvHead}>
          {["HOLE", "PAR", "SI", "GROSS", "PTS"].map((h) => (
            <Text key={h} style={styles.rvTh}>
              {h}
            </Text>
          ))}
        </View>
        {course.holes.map((h, i) => {
          const e = holes[String(i + 1)];
          const p = holePoints(e, h, ph);
          return (
            <Pressable
              key={i}
              testID={`review-hole-${i + 1}`}
              onPress={() => onEdit(i)}
              style={[styles.rvRow, i === 9 && { borderTopWidth: 2, borderTopColor: colors.goldBright }]}
            >
              <Text style={styles.rvTd}>{i + 1}</Text>
              <Text style={styles.rvTd}>{h.par}</Text>
              <Text style={styles.rvTd}>{h.si}</Text>
              <Text style={[styles.rvTd, styles.rvGross]}>{e?.pu ? "P/U" : e?.g ?? "–"}</Text>
              <Text style={[styles.rvTd, styles.rvPts]}>{p ?? "–"}</Text>
            </Pressable>
          );
        })}
        <Text style={styles.rvHint}>Tap any hole to fix it.</Text>
      </ScrollView>
      <View style={[styles.sticky, { paddingBottom: insets.bottom + spacing.md }]}>
        <Text style={styles.running} testID="review-total">
          {t.points} pts · {t.completed}/18 · Gross {t.gross || "–"}
        </Text>
        <Pressable testID="review-done" onPress={() => router.back()} style={styles.bigGold}>
          <Text style={styles.bigGoldText}>DONE</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.green },
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
  topTitle: { fontFamily: "BebasNeue-Regular", color: colors.cream, fontSize: 28 },
  topSub: { color: colors.creamMuted, fontSize: 12 },
  label: { color: colors.goldBright, fontSize: 13, fontWeight: "900", letterSpacing: 2, marginBottom: spacing.sm },
  roundCard: {
    flex: 1,
    minHeight: 96,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.greenLine,
    backgroundColor: colors.greenCard,
    padding: spacing.md,
    justifyContent: "center",
  },
  roundCardOn: { backgroundColor: colors.goldBright, borderColor: colors.goldBright },
  roundNum: { fontFamily: "BebasNeue-Regular", color: colors.goldBright, fontSize: 28 },
  roundCourse: { color: colors.cream, fontSize: 13, fontWeight: "700" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  nameChip: {
    width: "48%",
    flexGrow: 1,
    minHeight: 56,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.greenLine,
    backgroundColor: colors.greenCard,
    alignItems: "center",
    justifyContent: "center",
  },
  nameChipOn: { backgroundColor: colors.cream, borderColor: colors.cream },
  nameText: { color: colors.cream, fontSize: 18, fontWeight: "800" },
  sticky: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.greenDeep,
    borderTopWidth: 1,
    borderTopColor: colors.greenLine,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  stickyInfo: { color: colors.cream, textAlign: "center", fontSize: 14 },
  bigGold: {
    backgroundColor: colors.goldBright,
    minHeight: 60,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  bigGoldText: { fontFamily: "BebasNeue-Regular", color: colors.greenDeep, fontSize: 28, letterSpacing: 1 },
  holeBody: { flex: 1, paddingHorizontal: spacing.lg, paddingBottom: 200 },
  holeHead: { alignItems: "center", marginTop: spacing.md },
  holeNum: { fontFamily: "BebasNeue-Regular", color: colors.cream, fontSize: 72, lineHeight: 76 },
  holeMetaRow: { flexDirection: "row", gap: spacing.md, marginTop: spacing.xs },
  metaBox: {
    alignItems: "center",
    backgroundColor: colors.greenCard,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.greenLine,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    minWidth: 120,
  },
  metaLabel: { color: colors.goldBright, fontSize: 11, fontWeight: "900", letterSpacing: 1.5 },
  metaVal: { fontFamily: "BebasNeue-Regular", color: colors.cream, fontSize: 44, lineHeight: 48 },
  scoreRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: spacing.xl },
  stepBtn: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.cream,
    alignItems: "center",
    justifyContent: "center",
  },
  scoreBox: { flex: 1, alignItems: "center" },
  scoreVal: { fontFamily: "BebasNeue-Regular", color: colors.goldBright, fontSize: 120, lineHeight: 124 },
  pickup: {
    marginTop: spacing.lg,
    minHeight: 52,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.creamMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  pickupOn: { backgroundColor: colors.cream, borderColor: colors.cream },
  pickupText: { color: colors.cream, fontSize: 16, fontWeight: "900", letterSpacing: 1 },
  ptsRow: { alignItems: "center", marginTop: spacing.lg },
  ptsVal: { fontFamily: "BebasNeue-Regular", color: colors.cream, fontSize: 48, lineHeight: 52 },
  shots: { color: colors.creamMuted, fontSize: 16, fontWeight: "700" },
  stickyTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  running: { fontFamily: "BebasNeue-Regular", color: colors.goldBright, fontSize: 30, textAlign: "center" },
  reviewLink: { flexDirection: "row", alignItems: "center", gap: 6, minHeight: 44 },
  reviewLinkText: { color: colors.goldBright, fontWeight: "800", fontSize: 15 },
  navRow: { flexDirection: "row", gap: spacing.md },
  navBtn: {
    flex: 1,
    minHeight: 60,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.creamMuted,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  navNext: { backgroundColor: colors.goldBright, borderColor: colors.goldBright },
  navText: { fontFamily: "BebasNeue-Regular", color: colors.cream, fontSize: 28 },
  changeText: { color: colors.creamMuted, textAlign: "center", fontSize: 13, paddingVertical: 4 },
  rvHead: { flexDirection: "row", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.greenLine },
  rvTh: { flex: 1, color: colors.goldBright, fontSize: 12, fontWeight: "900", textAlign: "center" },
  rvRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 48,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.greenLine,
  },
  rvTd: { flex: 1, color: colors.cream, fontSize: 17, textAlign: "center", fontWeight: "600" },
  rvGross: { fontWeight: "900" },
  rvPts: { color: colors.goldBright, fontWeight: "900" },
  rvHint: { color: colors.creamMuted, textAlign: "center", marginTop: spacing.md },
});
