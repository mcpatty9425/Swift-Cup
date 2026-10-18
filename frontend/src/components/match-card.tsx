// MatchCard: shared across R1 / R2 / R3.
import React, { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Match, Player, useUpdateMatch } from "@/src/api";
import { Avatar } from "@/src/avatar";
import { colors, radius, spacing } from "@/src/theme";

function PlayerStack({ players, team }: { players: Player[]; team: "NZ" | "WORLD" }) {
  const align = team === "NZ" ? "flex-start" : "flex-end";
  return (
    <View style={[styles.stack, { alignItems: align }]}>
      {players.length === 0 ? (
        <View style={{ alignItems: align }}>
          <Avatar photoPath={null} name="?" size={44} team={team} />
          <Text style={styles.pending}>Pairing TBD</Text>
        </View>
      ) : (
        players.map((p) => (
          <View key={p.id} style={[styles.playerRow, team === "WORLD" && styles.playerRowReverse]}>
            <Avatar photoPath={p.photo_path} name={p.name} size={44} team={team} />
            <Text style={styles.pname} numberOfLines={1}>
              {p.name}
            </Text>
          </View>
        ))
      )}
    </View>
  );
}

export function MatchCard({
  match,
  matchNumber,
  players,
}: {
  match: Match;
  matchNumber: number;
  players: Player[];
}) {
  const nzPlayers = match.nz_player_ids.map((id) => players.find((p) => p.id === id)).filter(Boolean) as Player[];
  const worldPlayers = match.world_player_ids
    .map((id) => players.find((p) => p.id === id))
    .filter(Boolean) as Player[];

  const [editing, setEditing] = useState(false);
  const [status, setStatus] = useState(match.live_status);
  const update = useUpdateMatch();

  React.useEffect(() => {
    if (!editing) setStatus(match.live_status);
  }, [match.live_status, editing]);

  async function saveStatus() {
    setEditing(false);
    if (status !== match.live_status) {
      await update.mutateAsync({ id: match.id, live_status: status });
    }
  }

  async function pick(result: Match["result"]) {
    const next = match.result === result ? null : result;
    await update.mutateAsync({ id: match.id, result: next });
  }

  return (
    <View style={styles.card} testID={`match-card-${match.round}-${match.index}`}>
      <View style={styles.cardHead}>
        <Text style={styles.matchNum}>MATCH {matchNumber}</Text>
        {match.result ? (
          <View style={[styles.resultBadge, resultBadgeStyle(match.result)]}>
            <Text style={styles.resultBadgeText}>{resultLabel(match.result)}</Text>
          </View>
        ) : (
          <Text style={styles.inProgress}>In Progress</Text>
        )}
      </View>

      <View style={styles.cardBody}>
        <PlayerStack players={nzPlayers} team="NZ" />
        <View style={styles.vsCol}>
          <Text style={styles.vs}>VS</Text>
        </View>
        <PlayerStack players={worldPlayers} team="WORLD" />
      </View>

      {editing ? (
        <TextInput
          testID={`match-status-input-${match.round}-${match.index}`}
          value={status}
          onChangeText={setStatus}
          onBlur={saveStatus}
          onSubmitEditing={saveStatus}
          autoFocus
          placeholder='e.g. "🇳🇿 2 UP thru 14"'
          placeholderTextColor={colors.muted}
          style={styles.statusInput}
          returnKeyType="done"
        />
      ) : (
        <Pressable
          testID={`match-status-${match.round}-${match.index}`}
          onPress={() => setEditing(true)}
          style={styles.statusChip}
        >
          <Text style={styles.statusText}>
            {match.live_status || "Tap to update live status"}
          </Text>
        </Pressable>
      )}

      <View style={styles.btnRow}>
        <ResultButton
          testID={`result-nz-${match.round}-${match.index}`}
          label="🇳🇿"
          color={colors.nz}
          selected={match.result === "NZ_WIN"}
          onPress={() => pick("NZ_WIN")}
        />
        <ResultButton
          testID={`result-halved-${match.round}-${match.index}`}
          label="HALVED"
          color={colors.gold}
          selected={match.result === "HALVED"}
          onPress={() => pick("HALVED")}
        />
        <ResultButton
          testID={`result-world-${match.round}-${match.index}`}
          label="🌍"
          color={colors.world}
          selected={match.result === "WORLD_WIN"}
          onPress={() => pick("WORLD_WIN")}
        />
      </View>
    </View>
  );
}

function ResultButton({
  label,
  color,
  selected,
  onPress,
  testID,
}: {
  label: string;
  color: string;
  selected: boolean;
  onPress: () => void;
  testID: string;
}) {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      style={[
        styles.rbtn,
        selected ? { backgroundColor: color, borderColor: color } : { borderColor: color },
      ]}
    >
      <Text
        style={[styles.rbtnText, label === "HALVED" && { fontSize: 14 }, selected ? { color: colors.onBrand } : { color }]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function resultLabel(r: Match["result"]) {
  if (r === "NZ_WIN") return "🇳🇿 WIN";
  if (r === "WORLD_WIN") return "🌍 WIN";
  if (r === "HALVED") return "HALVED";
  return "";
}
function resultBadgeStyle(r: Match["result"]) {
  if (r === "NZ_WIN") return { backgroundColor: colors.nz };
  if (r === "WORLD_WIN") return { backgroundColor: colors.world };
  if (r === "HALVED") return { backgroundColor: colors.gold };
  return {};
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  matchNum: { color: colors.muted, fontSize: 12, fontWeight: "800", letterSpacing: 2 },
  inProgress: { color: colors.success, fontSize: 11, fontWeight: "700", letterSpacing: 1 },
  resultBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill },
  resultBadgeText: { color: colors.onBrand, fontWeight: "900", fontSize: 11, letterSpacing: 1 },

  cardBody: { flexDirection: "row", alignItems: "center", paddingVertical: spacing.sm },
  stack: { flex: 1, gap: spacing.sm },
  playerRow: { flexDirection: "row", alignItems: "center", gap: 8, maxWidth: "100%" },
  playerRowReverse: { flexDirection: "row-reverse", gap: 8 },
  pname: { color: colors.onSurface, fontSize: 14, fontWeight: "700", flexShrink: 1 },
  pending: { color: colors.muted, fontSize: 11, marginTop: 4 },
  vsCol: { paddingHorizontal: spacing.sm },
  vs: { color: colors.gold, fontSize: 14, fontWeight: "900", letterSpacing: 2 },

  statusChip: {
    marginTop: spacing.sm,
    backgroundColor: colors.surfaceTertiary,
    borderRadius: radius.md,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: "center",
  },
  statusText: { color: colors.onSurface, fontSize: 14, fontWeight: "700" },
  statusInput: {
    marginTop: spacing.sm,
    backgroundColor: colors.surface,
    color: colors.onSurface,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.gold,
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },

  btnRow: { flexDirection: "row", gap: 8, marginTop: spacing.md },
  rbtn: {
    flex: 1,
    minHeight: 56,
    borderRadius: radius.md,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    backgroundColor: "transparent",
  },
  rbtnText: { fontSize: 22, fontWeight: "900", letterSpacing: 0.5, textAlign: "center" },
});
