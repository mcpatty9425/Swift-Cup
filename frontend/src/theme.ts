// Design tokens for The Swifty Cup 2026 (dark-first, premium golf aesthetic).
import { useMemo } from "react";
import { Appearance, StyleSheet, useColorScheme } from "react-native";

export type ColorScheme = "light" | "dark";

const dark = {
  // Surfaces
  surface: "#0e1a2b",
  onSurface: "#f7fafc",
  surfaceSecondary: "#14243a",
  onSurfaceSecondary: "#f7fafc",
  surfaceTertiary: "#1d334f",
  onSurfaceTertiary: "#f7fafc",
  surfaceInverse: "#f7fafc",
  onSurfaceInverse: "#0e1a2b",
  muted: "#9fb0c7",

  // Brand (gold + team accents)
  brand: "#f7c948",
  onBrand: "#0e1a2b",
  brandPrimary: "#4fb3ff", // NZ blue
  onBrandPrimary: "#07111f",
  brandSecondary: "#ff8c5a", // World orange
  onBrandSecondary: "#07111f",
  brandTertiary: "#f7c948", // Gold
  onBrandTertiary: "#07111f",

  // Status
  success: "#5dd39e",
  onSuccess: "#07111f",
  warning: "#f7c948",
  onWarning: "#07111f",
  error: "#ff6b6b",
  onError: "#07111f",
  info: "#4fb3ff",
  onInfo: "#07111f",

  // Lines
  border: "#1d334f",
  borderStrong: "#2a4365",
  divider: "#1d334f",

  // Extras
  background: "#07111f",
  nz: "#4fb3ff",
  world: "#ff8c5a",
  gold: "#f7c948",
};

export type ThemeColors = typeof dark;

export const defaultScheme = "dark" satisfies ColorScheme;

export const themes: { light?: ThemeColors; dark: ThemeColors } = { dark };

export function setColorScheme(scheme: ColorScheme | null) {
  Appearance.setColorScheme?.(scheme ?? "unspecified");
}

setColorScheme?.(themes.light ? null : defaultScheme);

export function useTheme(): { scheme: ColorScheme; colors: ThemeColors } {
  const system = useColorScheme();
  const scheme: ColorScheme = system === "light" && themes.light ? "light" : "dark";
  return { scheme, colors: themes.dark };
}

export const colors = themes.dark;

export function makeStyles<T extends StyleSheet.NamedStyles<T> | StyleSheet.NamedStyles<any>>(
  factory: (colors: ThemeColors) => T & StyleSheet.NamedStyles<any>,
): () => T {
  return function useStyles(): T {
    const { colors } = useTheme();
    return useMemo(() => StyleSheet.create(factory(colors)), [colors]);
  };
}

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 };
export const radius = { sm: 6, md: 12, lg: 20, pill: 999 };
