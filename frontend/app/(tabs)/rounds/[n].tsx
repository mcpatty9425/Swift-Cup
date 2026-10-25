import { useLocalSearchParams } from "expo-router";
import React from "react";
import RoundScreen from "@/src/components/round-screen";

const META = {
  1: { title: "ROUND 1", format: "Alternate Shot" },
  2: { title: "ROUND 2", format: "Best Ball" },
  3: { title: "ROUND 3", format: "Heads Up" },
} as const;

export default function RoundDetail() {
  const { n } = useLocalSearchParams<{ n: string }>();
  const round = (n === "2" ? 2 : n === "3" ? 3 : 1) as 1 | 2 | 3;
  return <RoundScreen key={round} round={round} title={META[round].title} format={META[round].format} />;
}
