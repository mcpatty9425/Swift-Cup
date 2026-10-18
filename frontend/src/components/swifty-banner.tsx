// Split-flap "The Swifty Cup" banner (native port of swifty-cup-banner.html).
// Brand artwork: colors are fixed literals by design.
import React from "react";
import { StyleSheet, Text, View, useWindowDimensions } from "react-native";

const BG = "#0B3A2D";
const GOLD = "#F0C766";
const RULE = "rgba(244,239,225,0.35)";
const STRIPE = "rgba(244,239,225,0.045)";
const TILE_TOP = "#1a5240";
const TILE_BOTTOM = "#123f31";
const NOTCH = "#082a21";

// Natural content width of the design (9 big tiles + gaps) plus side padding.
const DESIGN_W = 1228 + 120;

function Tile({ ch, w, h, r, fs, notch, line }: { ch: string; w: number; h: number; r: number; fs: number; notch: number; line: number }) {
  return (
    <View style={[styles.tile, { width: w, height: h, borderRadius: r }]}>
      <View style={[styles.half, { top: 0, backgroundColor: TILE_TOP }]} />
      <View style={[styles.half, { bottom: 0, backgroundColor: TILE_BOTTOM }]} />
      <Text style={[styles.letter, { fontSize: fs, lineHeight: fs * 1.05 }]}>{ch}</Text>
      <View style={[styles.line, { height: line, marginTop: -line / 2 }]} />
      <View style={[styles.notch, { width: notch * 2, height: notch * 2, borderRadius: notch, left: -notch, marginTop: -notch }]} />
      <View style={[styles.notch, { width: notch * 2, height: notch * 2, borderRadius: notch, right: -notch, marginTop: -notch }]} />
    </View>
  );
}

function Word({ text, s, big }: { text: string; s: number; big: boolean }) {
  const w = (big ? 124 : 62) * s;
  const h = (big ? 176 : 86) * s;
  return (
    <View style={{ flexDirection: "row", gap: (big ? 8 : 6) * s }}>
      {text.split("").map((c, i) => (
        <Tile
          key={i}
          ch={c}
          w={w}
          h={h}
          r={(big ? 9 : 6) * s}
          fs={(big ? 168 : 80) * s}
          notch={Math.max((big ? 6 : 4) * s, 1.5)}
          line={Math.max((big ? 4 : 3) * s, 1)}
        />
      ))}
    </View>
  );
}

export function SwiftyBanner({ topInset = 0 }: { topInset?: number }) {
  const { width } = useWindowDimensions();
  const W = Math.min(width, 700);
  const s = W / DESIGN_W;
  const stripeW = Math.max(70 * s, 6);
  const stripes = Math.ceil(width / (stripeW * 2)) + 6;

  return (
    <View style={[styles.wrap, { paddingTop: topInset + 44 * s + 12, paddingBottom: 40 * s + 8 }]} testID="swifty-banner">
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {Array.from({ length: stripes }).map((_, i) => (
          <View
            key={i}
            style={{
              position: "absolute",
              top: -200,
              bottom: -200,
              left: i * stripeW * 2 - stripeW * 3,
              width: stripeW,
              backgroundColor: STRIPE,
              transform: [{ rotate: "10deg" }],
            }}
          />
        ))}
      </View>

      <View style={[styles.row, { gap: 22 * s }]}>
        <View style={{ width: 120 * s, height: 1, backgroundColor: RULE }} />
        <Text style={[styles.mono, { fontSize: Math.max(18 * s, 9), letterSpacing: Math.max(18 * s, 9) * 0.32 }]}>2026 SEASON</Text>
        <View style={{ width: 120 * s, height: 1, backgroundColor: RULE }} />
      </View>

      <View style={{ alignItems: "center", gap: 14 * s, marginTop: 18 * s }}>
        <Word text="THE" s={s} big={false} />
        <View style={{ flexDirection: "row", gap: 56 * s }}>
          <Word text="SWIFTY" s={s} big />
          <Word text="CUP" s={s} big />
        </View>
      </View>

      <Text
        style={[
          styles.mono,
          { fontSize: Math.max(18 * s, 9), letterSpacing: Math.max(18 * s, 9) * 0.32, marginTop: 26 * s },
        ]}
      >
        NZ VS WORLD
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: BG, alignItems: "center", overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center" },
  mono: { fontFamily: "IBMPlexMono-SemiBold", color: GOLD },
  tile: {
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(244,239,225,0.16)",
    shadowColor: "#000",
    shadowOpacity: 0.45,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  half: { position: "absolute", left: 0, right: 0, height: "50%" },
  letter: { fontFamily: "BebasNeue-Regular", color: GOLD, textAlign: "center", includeFontPadding: false },
  line: { position: "absolute", left: 0, right: 0, top: "50%", backgroundColor: "rgba(6,25,15,0.85)" },
  notch: { position: "absolute", top: "50%", backgroundColor: NOTCH },
});
