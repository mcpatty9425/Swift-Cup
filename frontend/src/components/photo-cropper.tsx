// Square photo cropper with pinch/drag + zoom buttons. Works on iOS, Android and web.
import Ionicons from "@react-native-vector-icons/ionicons";
import * as ImageManipulator from "expo-image-manipulator";
import { Image } from "expo-image";
import React, { useCallback, useRef, useState } from "react";
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, { useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, radius, spacing } from "@/src/theme";

type Src = { uri: string; width: number; height: number };
const MAX_ZOOM = 5;

function clamp(v: number, min: number, max: number) {
  "worklet";
  return Math.min(Math.max(v, min), max);
}

function Cropper({ src, onCancel, onDone }: { src: Src; onCancel: () => void; onDone: (uri: string) => void }) {
  const insets = useSafeAreaInsets();
  const { width: winW } = useWindowDimensions();
  const F = Math.min(winW - 48, 340); // frame size
  const base = F / Math.min(src.width, src.height); // cover scale
  const baseW = src.width * base;
  const baseH = src.height * base;

  const zoom = useSharedValue(1);
  const savedZoom = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const savedTx = useSharedValue(0);
  const savedTy = useSharedValue(0);
  const [busy, setBusy] = useState(false);

  const clampT = (z: number) => {
    "worklet";
    const maxX = (baseW * z - F) / 2;
    const maxY = (baseH * z - F) / 2;
    tx.value = clamp(tx.value, -maxX, maxX);
    ty.value = clamp(ty.value, -maxY, maxY);
  };

  const pan = Gesture.Pan()
    .onStart(() => {
      savedTx.value = tx.value;
      savedTy.value = ty.value;
    })
    .onUpdate((e) => {
      tx.value = savedTx.value + e.translationX;
      ty.value = savedTy.value + e.translationY;
      clampT(zoom.value);
    });

  const pinch = Gesture.Pinch()
    .onStart(() => {
      savedZoom.value = zoom.value;
    })
    .onUpdate((e) => {
      zoom.value = clamp(savedZoom.value * e.scale, 1, MAX_ZOOM);
      clampT(zoom.value);
    });

  const gesture = Gesture.Simultaneous(pan, pinch);

  const imgStyle = useAnimatedStyle(() => ({
    width: baseW,
    height: baseH,
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: zoom.value }],
  }));

  function stepZoom(delta: number) {
    zoom.value = clamp(zoom.value + delta, 1, MAX_ZOOM);
    clampT(zoom.value);
  }

  function reset() {
    zoom.value = 1;
    tx.value = 0;
    ty.value = 0;
  }

  async function done() {
    setBusy(true);
    try {
      const S = base * zoom.value;
      const size = Math.round(F / S);
      let originX = ((baseW * zoom.value) / 2 - F / 2 - tx.value) / S;
      let originY = ((baseH * zoom.value) / 2 - F / 2 - ty.value) / S;
      originX = Math.round(clamp(originX, 0, src.width - size));
      originY = Math.round(clamp(originY, 0, src.height - size));
      const out = await ImageManipulator.manipulateAsync(
        src.uri,
        [{ crop: { originX, originY, width: size, height: size } }, { resize: { width: 512, height: 512 } }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG },
      );
      onDone(out.uri);
    } catch {
      onCancel();
    } finally {
      setBusy(false);
    }
  }

  return (
    <GestureHandlerRootView style={[styles.root, { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.lg }]}>
      <Text style={styles.title}>Move and zoom</Text>
      <Text style={styles.sub}>Drag to position, pinch or use + / − to zoom.</Text>

      <View style={styles.center}>
        <GestureDetector gesture={gesture}>
          <View style={[styles.frame, { width: F, height: F }]} testID="cropper-frame">
            <Animated.View style={imgStyle}>
              <Image source={{ uri: src.uri }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
            </Animated.View>
            <View style={[styles.circle, { width: F, height: F, borderRadius: F / 2, pointerEvents: "none" }]} />
          </View>
        </GestureDetector>

        <View style={styles.zoomRow}>
          <Pressable testID="cropper-zoom-out" style={styles.zoomBtn} onPress={() => stepZoom(-0.25)}>
            <Ionicons name="remove" size={22} color={colors.onSurface} />
          </Pressable>
          <Pressable testID="cropper-reset" style={styles.resetBtn} onPress={reset}>
            <Text style={styles.resetText}>Reset</Text>
          </Pressable>
          <Pressable testID="cropper-zoom-in" style={styles.zoomBtn} onPress={() => stepZoom(0.25)}>
            <Ionicons name="add" size={22} color={colors.onSurface} />
          </Pressable>
        </View>
      </View>

      <View style={styles.actions}>
        <Pressable testID="cropper-cancel" style={[styles.btn, styles.cancel]} onPress={onCancel} disabled={busy}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
        <Pressable testID="cropper-done" style={[styles.btn, styles.doneBtn]} onPress={done} disabled={busy}>
          {busy ? <ActivityIndicator color={colors.onBrand} /> : <Text style={styles.doneText}>Use Photo</Text>}
        </Pressable>
      </View>
    </GestureHandlerRootView>
  );
}

/** Promise-based cropper: `const uri = await requestCrop(asset)` (null when cancelled). */
export function useCropper() {
  const [src, setSrc] = useState<Src | null>(null);
  const resolver = useRef<((uri: string | null) => void) | null>(null);

  const requestCrop = useCallback((s: Src) => {
    setSrc(s);
    return new Promise<string | null>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const finish = (uri: string | null) => {
    resolver.current?.(uri);
    resolver.current = null;
    setSrc(null);
  };

  const element = (
    <Modal visible={!!src} animationType="slide" onRequestClose={() => finish(null)}>
      {src ? <Cropper src={src} onCancel={() => finish(null)} onDone={(u) => finish(u)} /> : null}
    </Modal>
  );

  return { requestCrop, cropperElement: element };
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.brand, paddingHorizontal: spacing.lg },
  title: { color: colors.onBrand, fontSize: 22, fontWeight: "900" },
  sub: { color: colors.onBrand, opacity: 0.75, marginTop: 4 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  frame: { overflow: "hidden", alignItems: "center", justifyContent: "center", backgroundColor: "#000" },
  circle: { position: "absolute", top: 0, left: 0, borderWidth: 3, borderColor: colors.onBrand },
  zoomRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginTop: spacing.xl },
  zoomBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  resetBtn: { paddingHorizontal: 20, height: 48, borderRadius: 24, borderWidth: 1, borderColor: colors.onBrand, justifyContent: "center" },
  resetText: { color: colors.onBrand, fontWeight: "800" },
  actions: { flexDirection: "row", gap: spacing.md },
  btn: { flex: 1, paddingVertical: 16, borderRadius: radius.md, alignItems: "center" },
  cancel: { backgroundColor: "rgba(255,255,255,0.12)" },
  cancelText: { color: colors.onBrand, fontWeight: "800" },
  doneBtn: { backgroundColor: colors.gold },
  doneText: { color: colors.onBrand, fontWeight: "900", fontSize: 16 },
});
