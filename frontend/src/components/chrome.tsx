// Shared header + leaderboard components for every public screen.
import Ionicons from "@react-native-vector-icons/ionicons";
import { Image } from "expo-image";
import { CompactBanner } from "@/src/components/swifty-banner";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/src/auth";
import { Leaderboard, Settings, useAppState } from "@/src/api";
import { colors, radius, spacing } from "@/src/theme";

export function LiveDot({ connected }: { connected?: boolean }) {
  return (
    <View style={styles.liveWrap} testID="live-indicator">
      <View style={[styles.liveDot, { backgroundColor: connected === false ? colors.muted : colors.success }]} />
      <Text style={styles.liveText}>{connected === false ? "OFFLINE" : "LIVE"}</Text>
    </View>
  );
}

export function Header({ title, showAdminMenu = true }: { title?: string; showAdminMenu?: boolean }) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [pinOpen, setPinOpen] = useState(false);
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { isAdmin, login, logout } = useAuth();

  async function submitPin() {
    setError(null);
    setBusy(true);
    try {
      await login(pin);
      setPinOpen(false);
      setPin("");
    } catch (e: any) {
      setError(e?.message || "Incorrect PIN");
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.headerWrap}>
      <CompactBanner topInset={insets.top} />
      <View style={[styles.topBar, { top: insets.top }]}>
        <View style={{ flex: 1 }} />
        <LiveDot />
        <View style={{ width: spacing.sm }} />
        {showAdminMenu ? (
          <Pressable
            testID="header-menu-button"
            onPress={() => setMenuOpen(true)}
            style={styles.menuBtn}
            hitSlop={10}
          >
            <Ionicons name="ellipsis-vertical" size={22} color={colors.onBrand} />
          </Pressable>
        ) : null}
      </View>
      {title ? <Text style={styles.pageTitle}>{title}</Text> : null}

      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <Pressable style={styles.menuBackdrop} onPress={() => setMenuOpen(false)}>
          <View style={[styles.menuCard, { marginTop: insets.top + 76 }]}>
            {isAdmin ? (
              <>
                <Pressable
                  testID="menu-admin-bios"
                  style={styles.menuItem}
                  onPress={() => {
                    setMenuOpen(false);
                    router.push("/bios" as any);
                  }}
                >
                  <Ionicons name="people-outline" size={18} color={colors.onSurface} />
                  <Text style={styles.menuItemText}>Admin: All Bios</Text>
                </Pressable>
                <Pressable
                  testID="menu-admin-scores"
                  style={styles.menuItem}
                  onPress={() => {
                    setMenuOpen(false);
                    router.push("/score-admin" as any);
                  }}
                >
                  <Ionicons name="settings-outline" size={18} color={colors.onSurface} />
                  <Text style={styles.menuItemText}>Admin: Scores Setup</Text>
                </Pressable>
                <Pressable
                  testID="menu-logout"
                  style={styles.menuItem}
                  onPress={async () => {
                    setMenuOpen(false);
                    await logout();
                  }}
                >
                  <Ionicons name="log-out-outline" size={18} color={colors.onSurface} />
                  <Text style={styles.menuItemText}>Admin Logout</Text>
                </Pressable>
              </>
            ) : (
              <Pressable
                testID="menu-admin-login"
                style={styles.menuItem}
                onPress={() => {
                  setMenuOpen(false);
                  setPinOpen(true);
                }}
              >
                <Ionicons name="lock-closed-outline" size={18} color={colors.onSurface} />
                <Text style={styles.menuItemText}>Admin Login</Text>
              </Pressable>
            )}
          </View>
        </Pressable>
      </Modal>

      <Modal visible={pinOpen} transparent animationType="slide" onRequestClose={() => setPinOpen(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.pinBackdrop}
        >
          <View style={styles.pinCard}>
            <Text style={styles.pinTitle}>Admin PIN</Text>
            <Text style={styles.pinSubtitle}>Enter your organiser PIN to unlock Bios and Pairings.</Text>
            <TextInput
              testID="admin-pin-input"
              value={pin}
              onChangeText={setPin}
              keyboardType="number-pad"
              secureTextEntry
              placeholder="PIN"
              placeholderTextColor={colors.muted}
              style={styles.pinInput}
              autoFocus
            />
            {error ? <Text style={styles.pinError}>{error}</Text> : null}
            <View style={styles.pinActions}>
              <Pressable style={[styles.pinBtn, styles.pinCancel]} onPress={() => setPinOpen(false)}>
                <Text style={styles.pinCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                testID="admin-pin-submit"
                style={[styles.pinBtn, styles.pinSubmit, busy && { opacity: 0.6 }]}
                onPress={submitPin}
                disabled={busy}
              >
                <Text style={styles.pinSubmitText}>{busy ? "..." : "Unlock"}</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

export function Scoreboard({ compact = false }: { compact?: boolean }) {
  const { data } = useAppState();
  const lb = data?.leaderboard;
  const nz = lb?.nz_total ?? 0;
  const world = lb?.world_total ?? 0;

  return (
    <View style={styles.sbWrap} testID="scoreboard">
      <View style={[styles.sbTeam, { borderLeftColor: colors.nz }]}>
        <Text style={styles.sbFlag}>🇳🇿</Text>
        <View>
          <Text style={styles.sbLabel}>NZ</Text>
          <Text style={styles.sbScore}>{nz}</Text>
        </View>
      </View>
      <View style={styles.sbCenter}>
        <Text style={styles.sbStatus}>
          {lb?.cup_winner
            ? lb.cup_winner === "TIE"
              ? "CUP TIED"
              : lb.cup_winner === "NZ"
              ? "🇳🇿 CUP WINNER"
              : "🌍 CUP WINNER"
            : lb?.leader === "TIE"
            ? "ALL SQUARE"
            : lb?.leader === "NZ"
            ? "🇳🇿 LEADS"
            : lb?.leader === "WORLD"
            ? "🌍 LEADS"
            : "—"}
        </Text>
        {!compact ? (
          <Text style={styles.sbMeta}>
            {lb?.completed_matches ?? 0} / {lb?.total_matches ?? 0} matches
          </Text>
        ) : null}
      </View>
      <View style={[styles.sbTeam, styles.sbTeamRight, { borderRightColor: colors.world }]}>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={styles.sbLabel}>WORLD</Text>
          <Text style={styles.sbScore}>{world}</Text>
        </View>
        <Text style={styles.sbFlag}>🌍</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerWrap: {
    paddingBottom: spacing.xs,
  },
  bannerBox: {
    backgroundColor: colors.brand,
  },
  banner: {
    width: "100%",
    height: 200,
  },
  topBar: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 80,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
  },
  menuBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
    backgroundColor: "rgba(11,31,58,0.75)",
  },
  pageTitle: {
    marginTop: spacing.md,
    marginHorizontal: spacing.lg,
    color: colors.onSurface,
    fontSize: 32,
    fontWeight: "900",
    letterSpacing: 1,
  },
  liveWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(11,31,58,0.75)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  liveDot: { width: 8, height: 8, borderRadius: 4 },
  liveText: { color: colors.onBrand, fontSize: 11, fontWeight: "800", letterSpacing: 1 },

  menuBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.25)",
    alignItems: "flex-end",
  },
  menuCard: {
    marginRight: spacing.lg,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    minWidth: 180,
    paddingVertical: spacing.xs,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  menuItemText: { color: colors.onSurface, fontSize: 15, fontWeight: "600" },

  pinBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  pinCard: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pinTitle: { color: colors.onSurface, fontSize: 22, fontWeight: "900", marginBottom: 6 },
  pinSubtitle: { color: colors.muted, fontSize: 13, marginBottom: spacing.lg },
  pinInput: {
    backgroundColor: colors.surface,
    color: colors.onSurface,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 22,
    letterSpacing: 8,
    textAlign: "center",
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  pinError: { color: colors.error, marginBottom: spacing.sm },
  pinActions: { flexDirection: "row", gap: spacing.md, marginTop: spacing.sm },
  pinBtn: { flex: 1, paddingVertical: 14, borderRadius: radius.md, alignItems: "center" },
  pinCancel: { backgroundColor: colors.surfaceTertiary },
  pinCancelText: { color: colors.onSurface, fontWeight: "700" },
  pinSubmit: { backgroundColor: colors.gold },
  pinSubmitText: { color: colors.onBrand, fontWeight: "900", fontSize: 16 },

  sbWrap: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  sbTeam: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 10,
    borderLeftWidth: 3,
    minWidth: 86,
  },
  sbTeamRight: {
    borderLeftWidth: 0,
    borderRightWidth: 3,
    justifyContent: "flex-end",
  },
  sbFlag: { fontSize: 26 },
  sbLabel: { color: colors.muted, fontSize: 11, fontWeight: "800", letterSpacing: 1 },
  sbScore: { color: colors.onSurface, fontSize: 28, fontWeight: "900", lineHeight: 30 },
  sbCenter: { flex: 1, alignItems: "center" },
  sbStatus: { color: colors.gold, fontSize: 13, fontWeight: "900", letterSpacing: 1 },
  sbMeta: { color: colors.muted, fontSize: 11, marginTop: 2 },
});
