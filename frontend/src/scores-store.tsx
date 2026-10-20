// Offline-first scorecard store: local per-hole edits persisted on device, synced to server when possible.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AppState } from "react-native";
import { API_URL } from "./api";
import type { Course, HoleEntry, Holes, Override, ScoreSettings } from "./stableford";

const LOCAL_KEY = "swifty.scores.local";
const PENDING_KEY = "swifty.scores.pending";
const CACHE_KEY = "swifty.scores.cache";

export type ServerScores = {
  courses: Course[];
  settings: ScoreSettings;
  overrides: Override[];
  cards: { player_id: string; round: 2 | 3; holes: Holes }[];
};

export type SyncStatus = "synced" | "syncing" | "waiting";

type Ctx = {
  server: ServerScores | null;
  getHoles: (playerId: string, round: 2 | 3) => Holes;
  setHole: (playerId: string, round: 2 | 3, hole: number, entry: Omit<HoleEntry, "t">) => void;
  status: SyncStatus;
  refresh: () => Promise<void>;
};

const ScoresCtx = createContext<Ctx | null>(null);
const keyOf = (pid: string, round: number) => `${pid}:${round}`;

function mergeHoles(server: Holes | undefined, local: Holes | undefined): Holes {
  const out: Holes = { ...(server || {}) };
  for (const [n, e] of Object.entries(local || {})) {
    if (!out[n] || e.t >= out[n].t) out[n] = e;
  }
  return out;
}

export function ScoresProvider({ children }: { children: React.ReactNode }) {
  const qc = useQueryClient();
  const [cache, setCache] = useState<ServerScores | null>(null);
  const [local, setLocal] = useState<Record<string, Holes>>({});
  const [pending, setPending] = useState<string[]>([]);
  const [syncing, setSyncing] = useState(false);
  const localRef = useRef(local);
  const pendingRef = useRef(pending);
  const versions = useRef<Record<string, number>>({});
  const syncingRef = useRef(false);

  const q = useQuery({
    queryKey: ["scores"],
    queryFn: async () => {
      const r = await fetch(`${API_URL}/api/scores/state`);
      if (!r.ok) throw new Error(String(r.status));
      return (await r.json()) as ServerScores;
    },
    refetchInterval: 20000,
    retry: 1,
  });

  // Load persisted data
  useEffect(() => {
    (async () => {
      try {
        const [l, p, c] = await Promise.all([
          AsyncStorage.getItem(LOCAL_KEY),
          AsyncStorage.getItem(PENDING_KEY),
          AsyncStorage.getItem(CACHE_KEY),
        ]);
        if (l) {
          const parsed = JSON.parse(l);
          localRef.current = { ...parsed, ...localRef.current };
          setLocal(localRef.current);
        }
        if (p) {
          const merged = Array.from(new Set([...JSON.parse(p), ...pendingRef.current]));
          pendingRef.current = merged;
          setPending(merged);
        }
        if (c) setCache(JSON.parse(c));
      } catch {}
    })();
  }, []);

  useEffect(() => {
    if (q.data) {
      setCache(q.data);
      AsyncStorage.setItem(CACHE_KEY, JSON.stringify(q.data)).catch(() => {});
    }
  }, [q.data]);

  const sync = useCallback(async () => {
    if (syncingRef.current || pendingRef.current.length === 0) return;
    syncingRef.current = true;
    setSyncing(true);
    const keys = [...pendingRef.current];
    const sentVersions = Object.fromEntries(keys.map((k) => [k, versions.current[k] ?? 0]));
    try {
      const cards = keys.map((k) => {
        const [player_id, round] = k.split(":");
        return { player_id, round: Number(round), holes: localRef.current[k] || {} };
      });
      const r = await fetch(`${API_URL}/api/scores/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cards }),
      });
      if (!r.ok) throw new Error(String(r.status));
      // Only clear keys that were not edited while the request was in flight
      const remaining = pendingRef.current.filter((k) => (versions.current[k] ?? 0) !== sentVersions[k]);
      pendingRef.current = remaining;
      setPending(remaining);
      await AsyncStorage.setItem(PENDING_KEY, JSON.stringify(remaining));
      qc.invalidateQueries({ queryKey: ["scores"] });
    } catch {
      // stay pending; retried by interval
    } finally {
      syncingRef.current = false;
      setSyncing(false);
    }
  }, [qc]);

  useEffect(() => {
    const id = setInterval(() => {
      if (pendingRef.current.length) sync();
    }, 8000);
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") sync();
    });
    return () => {
      clearInterval(id);
      sub.remove();
    };
  }, [sync]);

  useEffect(() => {
    if (pending.length) sync();
  }, [pending.length, sync]);

  const setHole = useCallback(
    (playerId: string, round: 2 | 3, hole: number, entry: Omit<HoleEntry, "t">) => {
      const k = keyOf(playerId, round);
      const next = {
        ...localRef.current,
        [k]: { ...(localRef.current[k] || {}), [String(hole)]: { ...entry, t: Date.now() } },
      };
      localRef.current = next;
      setLocal(next);
      versions.current[k] = (versions.current[k] ?? 0) + 1;
      AsyncStorage.setItem(LOCAL_KEY, JSON.stringify(next)).catch(() => {});
      if (!pendingRef.current.includes(k)) {
        const p = [...pendingRef.current, k];
        pendingRef.current = p;
        setPending(p);
        AsyncStorage.setItem(PENDING_KEY, JSON.stringify(p)).catch(() => {});
      }
      setTimeout(sync, 0);
    },
    [sync],
  );

  const server = q.data ?? cache;

  const getHoles = useCallback(
    (playerId: string, round: 2 | 3) => {
      const sc = server?.cards.find((c) => c.player_id === playerId && c.round === round);
      return mergeHoles(sc?.holes, local[keyOf(playerId, round)]);
    },
    [server, local],
  );

  const refresh = useCallback(async () => {
    await sync();
    await q.refetch();
  }, [sync, q]);

  const status: SyncStatus = pending.length === 0 ? "synced" : syncing ? "syncing" : "waiting";

  const value = useMemo(() => ({ server, getHoles, setHole, status, refresh }), [server, getHoles, setHole, status, refresh]);
  return <ScoresCtx.Provider value={value}>{children}</ScoresCtx.Provider>;
}

export function useScores() {
  const c = useContext(ScoresCtx);
  if (!c) throw new Error("useScores outside ScoresProvider");
  return c;
}
