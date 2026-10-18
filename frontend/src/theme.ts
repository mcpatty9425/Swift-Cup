// Beige + Navy palette (Ryder Cup / Masters feel).
import { useMemo } from "react";
import { Appearance, StyleSheet, useColorScheme } from "react-native";

export type ColorScheme = "light" | "dark";

const palette = {
  // Surfaces
  surface: "#ffffff",
  onSurface: "#0b1f3a",
  surfaceSecondary: "#ffffff",
  onSurfaceSecondary: "#0b1f3a",
  surfaceTertiary: "#e8e2cf",
  onSurfaceTertiary: "#0b1f3a",
  surfaceInverse: "#0b1f3a",
  onSurfaceInverse: "#f1ede1",
  muted: "#6b7a90",

  // Brand = navy
  brand: "#0b1f3a",
  onBrand: "#ffffff",
  brandPrimary: "#1e3a8a", // NZ deeper blue
  onBrandPrimary: "#ffffff",
  brandSecondary: "#c05a2a", // World burnt orange
  onBrandSecondary: "#ffffff",
  brandTertiary: "#c4941f", // Muted gold
  onBrandTertiary: "#0b1f3a",

  // Status
  success: "#0e8a5c",
  onSuccess: "#ffffff",
  warning: "#c4941f",
  onWarning: "#0b1f3a",
  error: "#c23b3b",
  onError: "#ffffff",
  info: "#1e3a8a",
  onInfo: "#ffffff",

  // Lines
  border: "#dcd6c3",
  borderStrong: "#c7bfa8",
  divider: "#dcd6c3",

  // Extras
  background: "#f1ede1",
  nz: "#1e3a8a",
  world: "#c05a2a",
  gold: "#c4941f",
};

export type ThemeColors = typeof palette;

export const defaultScheme = "light" satisfies ColorScheme;
export const themes = { light: palette } as { light: ThemeColors; dark?: ThemeColors };

export function setColorScheme(scheme: ColorScheme | null) {
  Appearance.setColorScheme?.(scheme ?? "unspecified");
}
setColorScheme?.("light");

export function useTheme(): { scheme: ColorScheme; colors: ThemeColors } {
  const system = useColorScheme();
  return { scheme: "light", colors: palette };
}

export const colors = palette;

export function makeStyles<T extends StyleSheet.NamedStyles<T> | StyleSheet.NamedStyles<any>>(
  factory: (colors: ThemeColors) => T & StyleSheet.NamedStyles<any>,
): () => T {
  return function useStyles(): T {
    return useMemo(() => StyleSheet.create(factory(palette)), []);
  };
}

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 };
export const radius = { sm: 6, md: 12, lg: 20, pill: 999 };
