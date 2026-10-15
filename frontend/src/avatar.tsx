import { Image } from "expo-image";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing } from "./theme";
import { photoUrl } from "./api";

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Avatar({
  photoPath,
  name,
  size = 56,
  team,
}: {
  photoPath: string | null | undefined;
  name: string;
  size?: number;
  team?: "NZ" | "WORLD";
}) {
  const url = photoUrl(photoPath);
  const ring = team === "NZ" ? colors.nz : team === "WORLD" ? colors.world : colors.border;
  const bg = team === "NZ" ? "#1a3350" : team === "WORLD" ? "#3a2418" : colors.surfaceSecondary;
  if (url) {
    return (
      <Image
        source={{ uri: url }}
        style={[styles.avatar, { width: size, height: size, borderRadius: size / 2, borderColor: ring }]}
        contentFit="cover"
        cachePolicy="memory-disk"
        transition={120}
      />
    );
  }
  return (
    <View
      style={[
        styles.avatar,
        styles.fallback,
        { width: size, height: size, borderRadius: size / 2, borderColor: ring, backgroundColor: bg },
      ]}
    >
      <Text style={[styles.initials, { fontSize: Math.round(size * 0.38) }]}>{initialsOf(name)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    borderWidth: 2,
  },
  fallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  initials: {
    color: colors.onSurface,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
});

export const AvatarSpacing = { spacing, radius };
