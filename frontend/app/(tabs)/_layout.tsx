import Ionicons from "@react-native-vector-icons/ionicons";
import { Tabs } from "expo-router";
import React from "react";
import { ColorValue, Platform, StyleSheet } from "react-native";
import { colors } from "@/src/theme";

function TabIcon({ name, color, focused }: { name: any; color: ColorValue; focused: boolean }) {
  return <Ionicons name={name} size={focused ? 26 : 22} color={color as string} />;
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: StyleSheet.hairlineWidth,
          ...(Platform.OS === "web" ? { height: 64 } : {}),
        },
        tabBarItemStyle: { alignSelf: "center" },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "700", letterSpacing: 0.5 },
      }}
    >
      <Tabs.Screen name="rounds" options={{ title: "Rounds", tabBarIcon: (p) => <TabIcon name="golf" {...p} /> }} />
      <Tabs.Screen
        name="leaderboard"
        options={{ title: "Board", tabBarIcon: (p) => <TabIcon name="trophy" {...p} /> }}
      />
      <Tabs.Screen
        name="scores"
        options={{ title: "Scores", tabBarIcon: (p) => <TabIcon name="stats-chart" {...p} /> }}
      />
      <Tabs.Screen
        name="pairings"
        options={{ title: "Pairings", tabBarIcon: (p) => <TabIcon name="people" {...p} /> }}
      />
      <Tabs.Screen
        name="players"
        options={{ title: "Players", tabBarIcon: (p) => <TabIcon name="person-circle" {...p} /> }}
      />
      <Tabs.Screen name="bio" options={{ title: "Bio", tabBarIcon: (p) => <TabIcon name="create" {...p} /> }} />

    </Tabs>
  );
}
