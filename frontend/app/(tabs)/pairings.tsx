import Ionicons from "@react-native-vector-icons/ionicons";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Header, Scoreboard } from "@/src/components/chrome";
import { Match, Player, useAppState, useUpdatePairings } from "@/src/api";
import { Avatar } from "@/src/avatar";
import { useAuth } from "@/src/auth";
import { colors, radius, spacing } from "@/src/theme";

type Local = {
  id: string;
  round: 1 | 2 | 3;
  nz: string[];
  world: string[];
  hasResult: boolean;
};

export default function PairingsScreen() {
  const insets = useSafeAreaInsets();
  const { isAdmin } = useAuth();
  const { data, isLoading } = useAppState();
  const [round, setRound] = useState<1 | 2 | 3>(1);
  const [local, setLocal] = useState<Local[]>([]);
  const [dirty, setDirty] = useState(false);
  const [picker, setPicker] = useState<{ matchId: string; team: "NZ" | "WORLD"; slot: number } | null>(null);
  const [confirmResult, setConfirmResult] = useState<null | { apply: () => void }>(null);
  const [saved, setSaved] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const update = useUpdatePairings();

  const players = data?.players ?? [];
  const matches = data?.matches ?? [];

  useEffect(() => {
    const forRound = matches.filter((m) => m.round === round);
    setLocal(
      forRound.map((m) => ({
        id: m.id,
        round: m.round,
        nz: [...m.nz_player_ids],
        world: [...m.world_player_ids],
        hasResult: !!m.result,
      })),
    );
    setDirty(false);
    setSaved(null);
    setErr(null);
  }, [round, matches]);

  const slotsPerTeam = round === 3 ? 1 : 2;

  // used player ids in this round across all matches
  const usedCount = useMemo(() => {
    const map: Record<string, number> = {};
    for (const l of local) {
      [...l.nz, ...l.world].forEach((id) => {
        if (id) map[id] = (map[id] ?? 0) + 1;
      });
    }
    return map;
  }, [local]);

  const duplicates = useMemo(() => Object.values(usedCount).some((n) => n > 1), [usedCount]);

  function setSlot(matchId: string, team: "NZ" | "WORLD", slot: number, playerId: string | null) {
    setLocal((prev) =>
      prev.map((m) => {
        if (m.id !== matchId) return m;
        const arr = team === "NZ" ? [...m.nz] : [...m.world];
        while (arr.length < slotsPerTeam) arr.push("");
        arr[slot] = playerId ?? "";
        const clean = arr.filter(Boolean);
        return team === "NZ" ? { ...m, nz: clean } : { ...m, world: clean };
      }),
    );
    setDirty(true);
  }

  async function save() {
    setErr(null);
    // Warn if any affected match has a result
    const touched = local.some((l) => l.hasResult);
    if (touched && !confirmResult) {
      setConfirmResult({ apply: doSave });
      return;
    }
    await doSave();
  }

  async function doSave() {
    setConfirmResult(null);
    try {
      await update.mutateAsync({
        round,
        matches: local.map((l) => ({ id: l.id, nz_player_ids: l.nz, world_player_ids: l.world })),
      });
      setSaved(Date.now());
      setDirty(false);
    } catch (e: any) {
      setErr(e?.message || "Save failed");
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 120 }} testID="pairings-screen">
        <Header />
        <Scoreboard />

        <View style={styles.sectionHead}>
          <Text style={styles.title}>Pairings</Text>
          <Text style={styles.sub}>
            {isAdmin ? "Admin · Assign players to matches. Scores stay safe." : "View matchups by round. Only the organiser can edit."}
          </Text>
        </View>

        <View style={styles.segment}>
          {[1, 2, 3].map((r) => (
            <Pressable
              key={r}
              testID={`segment-round-${r}`}
              onPress={() => setRound(r as 1 | 2 | 3)}
              style={[styles.segBtn, round === r && { backgroundColor: colors.gold }]}
            >
              <Text style={[styles.segText, round === r && { color: colors.onBrand }]}>R{r}</Text>
            </Pressable>
          ))}
        </View>

        {duplicates ? (
          <View style={styles.warn} testID="duplicate-warning">
            <Ionicons name="warning" size={16} color={colors.error} />
            <Text style={styles.warnText}>A player is assigned to more than one match in this round.</Text>
          </View>
        ) : null}

        {isLoading ? (
          <ActivityIndicator color={colors.gold} style={{ marginTop: 40 }} />
        ) : (
          <View style={styles.list}>
            {local.map((m, i) => (
              <View key={m.id} style={styles.mcard}>
                <View style={styles.mhead}>
                  <Text style={styles.mnum}>MATCH {i + 1}</Text>
                  {m.hasResult ? <Text style={styles.hasResult}>Has result</Text> : null}
                </View>
                <View style={styles.teamRow}>
                  <Text style={[styles.teamLabel, { color: colors.nz }]}>🇳🇿 NZ</Text>
                  <View style={styles.slotRow}>
                    {Array.from({ length: slotsPerTeam }).map((_, idx) => {
                      const pid = m.nz[idx];
                      const p = players.find((x) => x.id === pid);
                      const dup = pid && (usedCount[pid] ?? 0) > 1;
                      return (
                        <Pressable
                          key={idx}
                          testID={`slot-nz-${m.id}-${idx}`}
                          onPress={() => isAdmin && setPicker({ matchId: m.id, team: "NZ", slot: idx })}
                          disabled={!isAdmin}
                          style={[styles.slot, dup && { borderColor: colors.error }, !isAdmin && { opacity: 0.9 }]}
                        >
                          <Text style={styles.slotText} numberOfLines={1}>
                            {p?.name || (isAdmin ? "Select…" : "TBD")}
                          </Text>
                          {isAdmin ? <Ionicons name="chevron-down" size={14} color={colors.muted} /> : null}
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
                <View style={styles.teamRow}>
                  <Text style={[styles.teamLabel, { color: colors.world }]}>🌍 WORLD</Text>
                  <View style={styles.slotRow}>
                    {Array.from({ length: slotsPerTeam }).map((_, idx) => {
                      const pid = m.world[idx];
                      const p = players.find((x) => x.id === pid);
                      const dup = pid && (usedCount[pid] ?? 0) > 1;
                      return (
                        <Pressable
                          key={idx}
                          testID={`slot-world-${m.id}-${idx}`}
                          onPress={() => isAdmin && setPicker({ matchId: m.id, team: "WORLD", slot: idx })}
                          disabled={!isAdmin}
                          style={[styles.slot, dup && { borderColor: colors.error }, !isAdmin && { opacity: 0.9 }]}
                        >
                          <Text style={styles.slotText} numberOfLines={1}>
                            {p?.name || (isAdmin ? "Select…" : "TBD")}
                          </Text>
                          {isAdmin ? <Ionicons name="chevron-down" size={14} color={colors.muted} /> : null}
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Sticky Save Bar (admin only) */}
      {isAdmin ? (
        <View style={[styles.saveBar, { paddingBottom: insets.bottom + 8 }]}>
        {err ? <Text style={styles.err}>{err}</Text> : null}
        {saved && !dirty ? <Text style={styles.ok}>Saved ✓</Text> : null}
        <Pressable
          testID="btn-save-pairings"
          onPress={save}
          disabled={!dirty || update.isPending}
          style={[styles.saveBtn, (!dirty || update.isPending) && { opacity: 0.5 }]}
        >
          {update.isPending ? (
            <ActivityIndicator color={colors.onBrand} />
          ) : (
            <Text style={styles.saveBtnText}>Save Changes</Text>
          )}
        </Pressable>
      </View>
      ) : null}

      {/* Player Picker */}
      <Modal visible={!!picker} transparent animationType="slide" onRequestClose={() => setPicker(null)}>
        <View style={styles.sheetWrap}>
          <Pressable style={styles.sheetBackdrop} onPress={() => setPicker(null)} />
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>
              Select {picker?.team === "NZ" ? "🇳🇿 NZ" : "🌍 World"} player
            </Text>
            <ScrollView style={{ maxHeight: 400 }}>
              <Pressable
                style={styles.pickerRow}
                onPress={() => {
                  if (picker) setSlot(picker.matchId, picker.team, picker.slot, null);
                  setPicker(null);
                }}
              >
                <Ionicons name="close-circle-outline" size={22} color={colors.muted} />
                <Text style={styles.pickerRowText}>Clear slot</Text>
              </Pressable>
              {players
                .filter((p) => p.team === picker?.team)
                .map((p) => {
                  const taken = (usedCount[p.id] ?? 0) > 0;
                  return (
                    <Pressable
                      key={p.id}
                      style={styles.pickerRow}
                      testID={`picker-select-${p.id}`}
                      onPress={() => {
                        if (picker) setSlot(picker.matchId, picker.team, picker.slot, p.id);
                        setPicker(null);
                      }}
                    >
                      <Avatar photoPath={p.photo_path} name={p.name} size={36} team={p.team} />
                      <Text style={styles.pickerRowText}>{p.name}</Text>
                      {taken ? <Text style={styles.pickerTaken}>in use</Text> : null}
                    </Pressable>
                  );
                })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Confirm Save When Result Exists */}
      <Modal visible={!!confirmResult} transparent animationType="fade">
        <View style={styles.confirmBackdrop}>
          <View style={styles.confirmCard}>
            <Ionicons name="warning" size={28} color={colors.gold} />
            <Text style={styles.confirmTitle}>Change pairings?</Text>
            <Text style={styles.confirmBody}>
              One or more matches in this round already have a result. The pairings will change, but recorded
              results and live statuses are kept.
            </Text>
            <View style={{ flexDirection: "row", gap: 10, marginTop: spacing.md }}>
              <Pressable style={[styles.sheetBtn, styles.sheetCancel]} onPress={() => setConfirmResult(null)}>
                <Text style={styles.sheetCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                testID="btn-confirm-save-pairings"
                style={[styles.sheetBtn, styles.sheetSave]}
                onPress={() => confirmResult?.apply()}
              >
                <Text style={styles.sheetSaveText}>Save Anyway</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionHead: { paddingHorizontal: spacing.lg, marginTop: spacing.lg },
  title: { color: colors.onSurface, fontSize: 22, fontWeight: "900" },
  sub: { color: colors.muted, marginTop: 4 },
  segment: {
    flexDirection: "row",
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    backgroundColor: colors.surfaceSecondary,
    padding: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  segBtn: { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: radius.pill },
  segText: { color: colors.muted, fontWeight: "900", fontSize: 14, letterSpacing: 1 },

  warn: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    backgroundColor: "rgba(194,59,59,0.08)",
    borderWidth: 1,
    borderColor: colors.error,
    padding: 10,
    borderRadius: radius.md,
  },
  warnText: { color: colors.error, flex: 1, fontSize: 12 },

  list: { paddingHorizontal: spacing.lg, marginTop: spacing.lg, gap: spacing.md },
  mcard: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  mhead: { flexDirection: "row", justifyContent: "space-between", marginBottom: spacing.sm },
  mnum: { color: colors.muted, fontSize: 12, fontWeight: "800", letterSpacing: 2 },
  hasResult: { color: colors.success, fontSize: 11, fontWeight: "800" },
  teamRow: { marginTop: spacing.sm },
  teamLabel: { fontSize: 12, fontWeight: "900", letterSpacing: 2, marginBottom: 6 },
  slotRow: { flexDirection: "row", gap: 8 },
  slot: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  slotText: { color: colors.onSurface, fontSize: 13, fontWeight: "700", flex: 1 },

  saveBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    backgroundColor: "rgba(241,237,225,0.97)",
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  saveBtn: {
    backgroundColor: colors.gold,
    paddingVertical: 16,
    borderRadius: radius.md,
    alignItems: "center",
  },
  saveBtnText: { color: colors.onBrand, fontWeight: "900", fontSize: 16 },
  err: { color: colors.error, marginBottom: 6 },
  ok: { color: colors.success, marginBottom: 6, fontWeight: "800" },

  sheetWrap: { flex: 1, justifyContent: "flex-end" },
  sheetBackdrop: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.55)" },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.lg,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  sheetHandle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 4,
    marginBottom: 10,
  },
  sheetTitle: { color: colors.onSurface, fontSize: 16, fontWeight: "900", marginBottom: 10 },
  pickerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  pickerRowText: { color: colors.onSurface, fontSize: 15, fontWeight: "700", flex: 1 },
  pickerTaken: { color: colors.gold, fontSize: 11, fontWeight: "800" },

  confirmBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
  },
  confirmCard: {
    backgroundColor: colors.surfaceSecondary,
    padding: spacing.lg,
    borderRadius: radius.lg,
    width: "100%",
    maxWidth: 360,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  confirmTitle: { color: colors.onSurface, fontSize: 18, fontWeight: "900", marginTop: 10 },
  confirmBody: { color: colors.muted, fontSize: 13, textAlign: "center", marginTop: 6 },
  sheetBtn: { flex: 1, paddingVertical: 14, borderRadius: radius.md, alignItems: "center" },
  sheetCancel: { backgroundColor: colors.surfaceTertiary },
  sheetCancelText: { color: colors.onSurface, fontWeight: "700" },
  sheetSave: { backgroundColor: colors.gold },
  sheetSaveText: { color: colors.onBrand, fontWeight: "900", fontSize: 15 },
});
