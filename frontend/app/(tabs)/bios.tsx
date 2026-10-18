import Ionicons from "@react-native-vector-icons/ionicons";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Header, Scoreboard } from "@/src/components/chrome";
import { API_URL, Player, loadToken, useAppState, useUpdatePlayer } from "@/src/api";
import { Avatar } from "@/src/avatar";
import { uploadForm } from "@/src/utils/upload";
import { colors, radius, spacing } from "@/src/theme";
import { useQueryClient } from "@tanstack/react-query";

export default function BiosScreen() {
  const insets = useSafeAreaInsets();
  const { data } = useAppState();
  const players = data?.players ?? [];
  const [editing, setEditing] = useState<Player | null>(null);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 40 }} testID="bios-screen">
        <Header />
        <Scoreboard />
        <View style={styles.listHeader}>
          <Text style={styles.listTitle}>Admin · Player Bios</Text>
          <Text style={styles.listSub}>Edit names, bios, and profile photos.</Text>
        </View>

        {["NZ", "WORLD"].map((team) => (
          <View key={team} style={styles.section}>
            <Text style={[styles.secTitle, team === "NZ" ? { color: colors.nz } : { color: colors.world }]}>
              {team === "NZ" ? "🇳🇿 Team NZ" : "🌍 Team World"}
            </Text>
            {players
              .filter((p) => p.team === team)
              .map((p) => (
                <Pressable
                  key={p.id}
                  onPress={() => setEditing(p)}
                  style={styles.row}
                  testID={`bio-row-${p.id}`}
                >
                  <Avatar photoPath={p.photo_path} name={p.name} size={48} team={p.team} />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.pname}>{p.name}</Text>
                    <Text style={styles.pbio} numberOfLines={1}>
                      {p.bio || "No bio yet"}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.muted} />
                </Pressable>
              ))}
          </View>
        ))}
      </ScrollView>

      <EditPlayerSheet
        player={editing}
        onClose={() => setEditing(null)}
      />
    </View>
  );
}

function EditPlayerSheet({ player, onClose }: { player: Player | null; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const update = useUpdatePlayer();
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [handicap, setHandicap] = useState("");
  const [busy, setBusy] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (player) {
      setName(player.name);
      setBio(player.bio);
      setHandicap(player.handicap || "");
      setSavedAt(null);
      setError(null);
    }
  }, [player]);

  if (!player) return null;

  async function save() {
    setBusy(true);
    setError(null);
    try {
      await update.mutateAsync({ id: player!.id, name, bio, handicap });
      setSavedAt(Date.now());
    } catch (e: any) {
      setError(e?.message || "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function pickPhoto() {
    setError(null);
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setError("Photo permission denied");
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.9,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (res.canceled || !res.assets?.[0]) return;
    const asset = res.assets[0];
    setBusy(true);
    try {
      // Resize + recompress to JPEG for fast loading
      const processed = await ImageManipulator.manipulateAsync(
        asset.uri,
        [{ resize: { width: 512 } }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG },
      );
      const token = await loadToken();
      const r = await uploadForm(`${API_URL}/api/photos`, {
        fields: { player_id: player!.id },
        files: { file: { uri: processed.uri, name: "photo.jpg", mimeType: "image/jpeg" } },
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) {
        let msg = `${r.status}`;
        try {
          const j = await r.json();
          msg = j.detail || msg;
        } catch {}
        throw new Error(msg);
      }
      qc.invalidateQueries({ queryKey: ["state"] });
      setSavedAt(Date.now());
    } catch (e: any) {
      setError(e?.message || "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  async function removePhoto() {
    setBusy(true);
    try {
      await update.mutateAsync({ id: player!.id, photo_path: null });
      setSavedAt(Date.now());
    } catch (e: any) {
      setError(e?.message || "Remove failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal visible={!!player} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.sheetWrap}>
        <Pressable style={styles.sheetBackdrop} onPress={onClose} />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}
        >
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHead}>
            <Avatar photoPath={player.photo_path} name={player.name} size={72} team={player.team} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.sheetTitle}>{player.team === "NZ" ? "🇳🇿 Team NZ" : "🌍 Team World"}</Text>
              <Text style={styles.sheetSub}>Edit player profile</Text>
            </View>
          </View>

          <View style={styles.photoRow}>
            <Pressable testID="btn-upload-photo" style={styles.photoBtn} onPress={pickPhoto} disabled={busy}>
              <Ionicons name="camera" size={18} color={colors.onBrand} />
              <Text style={styles.photoBtnText}>{player.photo_path ? "Replace Photo" : "Upload Photo"}</Text>
            </Pressable>
            {player.photo_path ? (
              <Pressable testID="btn-remove-photo" style={styles.removeBtn} onPress={removePhoto} disabled={busy}>
                <Ionicons name="trash-outline" size={18} color={colors.error} />
                <Text style={styles.removeBtnText}>Remove</Text>
              </Pressable>
            ) : null}
          </View>

          <Text style={styles.label}>Name</Text>
          <TextInput
            testID="input-name"
            value={name}
            onChangeText={setName}
            style={styles.input}
            placeholder="Player name"
            placeholderTextColor={colors.muted}
          />

          <Text style={styles.label}>Handicap</Text>
          <TextInput
            testID="input-handicap"
            value={handicap}
            onChangeText={setHandicap}
            style={styles.input}
            placeholder="e.g. 12.4"
            placeholderTextColor={colors.muted}
            keyboardType="numbers-and-punctuation"
          />

          <Text style={styles.label}>Bio</Text>
          <TextInput
            testID="input-bio"
            value={bio}
            onChangeText={setBio}
            style={[styles.input, { minHeight: 100, textAlignVertical: "top" }]}
            multiline
            placeholder="Handicap, nickname, favourite shot…"
            placeholderTextColor={colors.muted}
          />

          {error ? <Text style={styles.err}>{error}</Text> : null}
          {savedAt ? <Text style={styles.ok}>Saved ✓</Text> : null}

          <View style={styles.sheetActions}>
            <Pressable style={[styles.sheetBtn, styles.sheetCancel]} onPress={onClose}>
              <Text style={styles.sheetCancelText}>Close</Text>
            </Pressable>
            <Pressable
              testID="btn-save-player"
              style={[styles.sheetBtn, styles.sheetSave, busy && { opacity: 0.6 }]}
              onPress={save}
              disabled={busy}
            >
              {busy ? (
                <ActivityIndicator color={colors.onBrand} />
              ) : (
                <Text style={styles.sheetSaveText}>Save Changes</Text>
              )}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  listHeader: { paddingHorizontal: spacing.lg, marginTop: spacing.lg },
  listTitle: { color: colors.onSurface, fontSize: 22, fontWeight: "900" },
  listSub: { color: colors.muted, marginTop: 4 },
  section: { marginTop: spacing.lg, paddingHorizontal: spacing.lg },
  secTitle: { fontSize: 13, fontWeight: "900", letterSpacing: 2, marginBottom: spacing.sm },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  pname: { color: colors.onSurface, fontWeight: "800", fontSize: 15 },
  pbio: { color: colors.muted, fontSize: 12, marginTop: 2 },

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
  sheetHead: { flexDirection: "row", alignItems: "center", marginBottom: spacing.md },
  sheetTitle: { color: colors.onSurface, fontSize: 16, fontWeight: "900" },
  sheetSub: { color: colors.muted, fontSize: 12, marginTop: 2 },
  photoRow: { flexDirection: "row", gap: 8, marginBottom: spacing.md },
  photoBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.gold,
    paddingVertical: 12,
    borderRadius: radius.md,
  },
  photoBtnText: { color: colors.onBrand, fontWeight: "900" },
  removeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.error,
  },
  removeBtnText: { color: colors.error, fontWeight: "800" },
  label: { color: colors.muted, fontSize: 12, fontWeight: "800", letterSpacing: 1, marginBottom: 6, marginTop: 8 },
  input: {
    backgroundColor: colors.surfaceSecondary,
    color: colors.onSurface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
  },
  err: { color: colors.error, marginTop: 10 },
  ok: { color: colors.success, marginTop: 10, fontWeight: "800" },
  sheetActions: { flexDirection: "row", gap: 10, marginTop: spacing.lg },
  sheetBtn: { flex: 1, paddingVertical: 14, borderRadius: radius.md, alignItems: "center" },
  sheetCancel: { backgroundColor: colors.surfaceTertiary },
  sheetCancelText: { color: colors.onSurface, fontWeight: "700" },
  sheetSave: { backgroundColor: colors.gold },
  sheetSaveText: { color: colors.onBrand, fontWeight: "900", fontSize: 16 },
});
