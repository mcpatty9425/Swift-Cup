import Ionicons from "@react-native-vector-icons/ionicons";
import { Tabs } from "expo-router";
import React from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useAuth } from "@/src/auth";
import { colors, spacing } from "@/src/theme";

function TabIcon({ name, color, focused }: { name: any; color: string; focused: boolean }) {
  return <Ionicons name={name} size={focused ? 26 : 22} color={color} />;
}

export default function TabsLayout() {
  const { isAdmin } = useAuth();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.gold,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: "#07111fF2",
          borderTopColor: colors.border,
          borderTopWidth: StyleSheet.hairlineWidth,
          ...(Platform.OS === "web" ? { height: 64 } : {}),
        },
        tabBarItemStyle: { alignSelf: "center" },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "700", letterSpacing: 0.5 },
      }}
    >
      <Tabs.Screen
        name="teams"
        options={{
          title: "Teams",
          tabBarIcon: (p) => <TabIcon name="people" {...p} />,
        }}
      />
      <Tabs.Screen
        name="r1"
        options={{
          title: "R1",
          tabBarIcon: (p) => <TabIcon name="golf" {...p} />,
        }}
      />
      <Tabs.Screen
        name="r2"
        options={{
          title: "R2",
          tabBarIcon: (p) => <TabIcon name="flag" {...p} />,
        }}
      />
      <Tabs.Screen
        name="r3"
        options={{
          title: "R3",
          tabBarIcon: (p) => <TabIcon name="trophy" {...p} />,
        }}
      />
      <Tabs.Screen
        name="bios"
        options={{
          title: "Bios",
          href: isAdmin ? "/bios" : null,
          tabBarIcon: (p) => <TabIcon name="person-circle" {...p} />,
        }}
      />
      <Tabs.Screen
        name="pairings"
        options={{
          title: "Pairings",
          href: isAdmin ? "/pairings" : null,
          tabBarIcon: (p) => <TabIcon name="git-merge" {...p} />,
        }}
      />
    </Tabs>
  );
}
