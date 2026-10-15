import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Header, Scoreboard } from "@/src/components/chrome";
import { useAppState } from "@/src/api";
import { Avatar } from "@/src/avatar";
import { colors, radius, spacing } from "@/src/theme";

export default function TeamsScreen() {
  const insets = useSafeAreaInsets();
  const { data, isLoading } = useAppState();
  const [team, setTeam] = useState<"NZ" | "WORLD">("NZ");

  const players = useMemo(() => (data?.players ?? []).filter((p) => p.team === team), [data, team]);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingBottom: 24 }}
      testID="teams-screen"
    >
      <Header />
      <Scoreboard />

      <View style={styles.segment}>
        <Pressable
          testID="segment-nz"
          onPress={() => setTeam("NZ")}
          style={[styles.segBtn, team === "NZ" && { backgroundColor: colors.nz }]}
        >
          <Text style={[styles.segText, team === "NZ" && { color: colors.onBrandPrimary }]}>🇳🇿 Team NZ</Text>
        </Pressable>
        <Pressable
          testID="segment-world"
          onPress={() => setTeam("WORLD")}
          style={[styles.segBtn, team === "WORLD" && { backgroundColor: colors.world }]}
        >
          <Text style={[styles.segText, team === "WORLD" && { color: colors.onBrandSecondary }]}>
            🌍 Team World
          </Text>
        </Pressable>
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.gold} style={{ marginTop: 40 }} />
      ) : (
        <View style={styles.list}>
          {players.map((p) => (
            <View key={p.id} style={styles.pcard} testID={`player-card-${p.id}`}>
              <Avatar photoPath={p.photo_path} name={p.name} size={64} team={team} />
              <View style={{ flex: 1, marginLeft: spacing.md }}>
                <Text style={styles.pname}>{p.name}</Text>
                {p.bio ? (
                  <Text style={styles.pbio} numberOfLines={3}>
                    {p.bio}
                  </Text>
                ) : (
                  <Text style={styles.pbioMuted}>Bio coming soon</Text>
                )}
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  segment: {
    flexDirection: "row",
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    backgroundColor: colors.surfaceSecondary,
    padding: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  segBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: radius.pill,
  },
  segText: { color: colors.muted, fontWeight: "800", fontSize: 13 },
  list: { marginTop: spacing.lg, paddingHorizontal: spacing.lg, gap: spacing.md },
  pcard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pname: { color: colors.onSurface, fontSize: 17, fontWeight: "800" },
  pbio: { color: colors.muted, fontSize: 13, marginTop: 4 },
  pbioMuted: { color: colors.muted, fontSize: 12, fontStyle: "italic", marginTop: 4 },
});
