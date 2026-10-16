import Ionicons from "@react-native-vector-icons/ionicons";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Header } from "@/src/components/chrome";
import { API_URL, useAppState } from "@/src/api";
import { Avatar } from "@/src/avatar";
import { usePlayer } from "@/src/player-context";
import { uploadForm } from "@/src/utils/upload";
import { colors, radius, spacing } from "@/src/theme";

export default function BioScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();
  const { data } = useAppState();
  const { playerId, setPlayer } = usePlayer();
  const me = (data?.players ?? []).find((p) => p.id === playerId) || null;

  const [bio, setBio] = useState("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (me) setBio(me.bio || "");
  }, [me?.id, me?.bio]);

  async function save() {
    if (!me) return;
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch(`${API_URL}/api/players/${me.id}/self`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ player_id: me.id, bio }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.detail || `${r.status}`);
      }
      qc.invalidateQueries({ queryKey: ["state"] });
      setSaved(Date.now());
    } catch (e: any) {
      setErr(e?.message || "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function pickPhoto() {
    if (!me) return;
    setErr(null);
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setErr("Photo permission denied");
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.9,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (res.canceled || !res.assets?.[0]) return;
    setBusy(true);
    try {
      const processed = await ImageManipulator.manipulateAsync(
        res.assets[0].uri,
        [{ resize: { width: 512 } }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG },
      );
      const r = await uploadForm(`${API_URL}/api/photos-self`, {
        fields: { player_id: me.id },
        files: { file: { uri: processed.uri, name: "photo.jpg", mimeType: "image/jpeg" } },
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.detail || `${r.status}`);
      }
      qc.invalidateQueries({ queryKey: ["state"] });
      setSaved(Date.now());
    } catch (e: any) {
      setErr(e?.message || "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  async function removePhoto() {
    if (!me) return;
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch(`${API_URL}/api/players/${me.id}/self`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ player_id: me.id, photo_path: "" }),
      });
      if (!r.ok) throw new Error("Remove failed");
      qc.invalidateQueries({ queryKey: ["state"] });
      setSaved(Date.now());
    } catch (e: any) {
      setErr(e?.message || "Remove failed");
    } finally {
      setBusy(false);
    }
  }

  async function switchPlayer() {
    await setPlayer(null);
    router.replace("/pick-player");
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 40 }} testID="bio-screen">
        <Header />

        {!me ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Pick your name to edit your bio.</Text>
            <Pressable style={styles.switchBtn} onPress={switchPlayer}>
              <Text style={styles.switchBtnText}>Choose Player</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={styles.card}>
              <Avatar photoPath={me.photo_path} name={me.name} size={96} team={me.team} />
              <Text style={styles.name}>{me.name}</Text>
              <Text style={[styles.teamTag, { color: me.team === "NZ" ? colors.nz : colors.world }]}>
                {me.team === "NZ" ? "🇳🇿 Team NZ" : "🌍 Team World"}
              </Text>
            </View>

            <View style={styles.photoRow}>
              <Pressable testID="btn-upload-photo" style={styles.photoBtn} onPress={pickPhoto} disabled={busy}>
                <Ionicons name="camera" size={18} color={colors.onBrand} />
                <Text style={styles.photoBtnText}>{me.photo_path ? "Replace Photo" : "Upload Photo"}</Text>
              </Pressable>
              {me.photo_path ? (
                <Pressable testID="btn-remove-photo" style={styles.removeBtn} onPress={removePhoto} disabled={busy}>
                  <Ionicons name="trash-outline" size={18} color={colors.error} />
                  <Text style={styles.removeBtnText}>Remove</Text>
                </Pressable>
              ) : null}
            </View>

            <Text style={styles.label}>Your Bio</Text>
            <TextInput
              testID="input-bio"
              value={bio}
              onChangeText={setBio}
              placeholder="Handicap, nickname, favourite shot…"
              placeholderTextColor={colors.muted}
              style={styles.input}
              multiline
            />

            {err ? <Text style={styles.err}>{err}</Text> : null}
            {saved ? <Text style={styles.ok}>Saved ✓</Text> : null}

            <Pressable
              testID="btn-save-bio"
              style={[styles.saveBtn, busy && { opacity: 0.6 }]}
              onPress={save}
              disabled={busy}
            >
              {busy ? <ActivityIndicator color={colors.onBrand} /> : <Text style={styles.saveBtnText}>Save</Text>}
            </Pressable>

            <Pressable testID="btn-switch-player" style={styles.switchRow} onPress={switchPlayer}>
              <Ionicons name="swap-horizontal" size={18} color={colors.muted} />
              <Text style={styles.switchText}>Not {me.name}? Switch player</Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  name: { color: colors.onSurface, fontSize: 22, fontWeight: "900", marginTop: 10 },
  teamTag: { fontSize: 13, fontWeight: "800", letterSpacing: 1, marginTop: 4 },
  photoRow: { flexDirection: "row", gap: 8, marginHorizontal: spacing.lg, marginTop: spacing.md },
  photoBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.gold,
    paddingVertical: 14,
    borderRadius: radius.md,
  },
  photoBtnText: { color: colors.onBrand, fontWeight: "900" },
  removeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.error,
  },
  removeBtnText: { color: colors.error, fontWeight: "800" },
  label: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
    marginTop: spacing.lg,
    marginHorizontal: spacing.lg,
    marginBottom: 6,
  },
  input: {
    marginHorizontal: spacing.lg,
    backgroundColor: colors.surfaceSecondary,
    color: colors.onSurface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    minHeight: 100,
    textAlignVertical: "top",
  },
  err: { color: colors.error, marginHorizontal: spacing.lg, marginTop: 10 },
  ok: { color: colors.success, marginHorizontal: spacing.lg, marginTop: 10, fontWeight: "800" },
  saveBtn: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    backgroundColor: colors.gold,
    paddingVertical: 16,
    borderRadius: radius.md,
    alignItems: "center",
  },
  saveBtnText: { color: colors.onBrand, fontWeight: "900", fontSize: 16 },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: spacing.lg,
  },
  switchText: { color: colors.muted, fontSize: 13 },
  empty: { padding: spacing.xl, alignItems: "center" },
  emptyText: { color: colors.muted, marginBottom: spacing.md },
  switchBtn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: radius.md, backgroundColor: colors.gold },
  switchBtnText: { color: colors.onBrand, fontWeight: "900" },
});
