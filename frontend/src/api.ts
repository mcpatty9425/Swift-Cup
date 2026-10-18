// API client, auth, WebSocket, react-query hooks.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { QueryClient, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

export const API_URL = (process.env.EXPO_PUBLIC_BACKEND_URL || "").replace(/\/$/, "");
const WS_URL = API_URL.replace(/^http/, "ws") + "/api/ws";

const TOKEN_KEY = "swifty.admin.token";

export type Player = {
  id: string;
  team: "NZ" | "WORLD";
  name: string;
  bio: string;
  handicap?: string;
  photo_path: string | null;
  order: number;
};

export type Match = {
  id: string;
  round: 1 | 2 | 3;
  index: number;
  nz_player_ids: string[];
  world_player_ids: string[];
  live_status: string;
  result: "NZ_WIN" | "HALVED" | "WORLD_WIN" | null;
  updated_at: string;
};

export type Leaderboard = {
  rounds: Record<string, { nz: number; world: number }>;
  nz_total: number;
  world_total: number;
  leader: "NZ" | "WORLD" | "TIE";
  cup_winner: "NZ" | "WORLD" | "TIE" | null;
  completed_matches: number;
  total_matches: number;
  per_round_totals: Record<string, number>;
};

export type Settings = {
  tournament_name: string;
  year: number;
  nz_team_name: string;
  world_team_name: string;
};

export type AppState = {
  settings: Settings;
  players: Player[];
  matches: Match[];
  leaderboard: Leaderboard;
};

export function photoUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  return `${API_URL}/api/photos/${path}`;
}

// ---------- Token store ----------
let cachedToken: string | null = null;
export async function loadToken(): Promise<string | null> {
  if (cachedToken) return cachedToken;
  cachedToken = await AsyncStorage.getItem(TOKEN_KEY);
  return cachedToken;
}
export async function saveToken(t: string): Promise<void> {
  cachedToken = t;
  await AsyncStorage.setItem(TOKEN_KEY, t);
}
export async function clearToken(): Promise<void> {
  cachedToken = null;
  await AsyncStorage.removeItem(TOKEN_KEY);
}

async function authHeaders(): Promise<Record<string, string>> {
  const t = await loadToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

// ---------- Fetch wrapper ----------
async function api<T>(path: string, init: RequestInit = {}, admin = false): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string> | undefined),
  };
  if (admin) Object.assign(headers, await authHeaders());
  const res = await fetch(`${API_URL}${path}`, { ...init, headers });
  if (!res.ok) {
    let msg = `${res.status}`;
    try {
      const j = await res.json();
      msg = j.detail || msg;
    } catch {}
    throw new Error(msg);
  }
  if (res.status === 204) return undefined as unknown as T;
  return (await res.json()) as T;
}

// ---------- Hooks ----------
export function useAppState() {
  return useQuery({
    queryKey: ["state"],
    queryFn: () => api<AppState>("/api/state"),
    staleTime: 10_000,
  });
}

export function useAdminLogin() {
  return useMutation({
    mutationFn: async (pin: string) => {
      const res = await api<{ token: string }>("/api/admin/login", {
        method: "POST",
        body: JSON.stringify({ pin }),
      });
      await saveToken(res.token);
      return res;
    },
  });
}

export function useUpdateMatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { id: string; live_status?: string; result?: Match["result"] | null }) => {
      const body: Record<string, unknown> = {};
      if (p.live_status !== undefined) body.live_status = p.live_status;
      if (p.result !== undefined) body.result = p.result;
      return api<Match>(`/api/matches/${p.id}`, { method: "PATCH", body: JSON.stringify(body) });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["state"] });
    },
  });
}

export function useUpdatePlayer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { id: string; name?: string; bio?: string; handicap?: string; photo_path?: string | null }) => {
      const body: Record<string, unknown> = {};
      if (p.name !== undefined) body.name = p.name;
      if (p.handicap !== undefined) body.handicap = p.handicap;
      if (p.bio !== undefined) body.bio = p.bio;
      if (p.photo_path !== undefined) body.photo_path = p.photo_path ?? "";
      return api<Player>(`/api/players/${p.id}`, { method: "PATCH", body: JSON.stringify(body) }, true);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["state"] }),
  });
}

export function useUpdatePairings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { round: 1 | 2 | 3; matches: { id: string; nz_player_ids: string[]; world_player_ids: string[] }[] }) => {
      return api(`/api/pairings/${p.round}`, {
        method: "PATCH",
        body: JSON.stringify({ matches: p.matches }),
      }, true);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["state"] }),
  });
}

// ---------- Real-time websocket ----------
export function useLiveSync(qc: QueryClient) {
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    let cancelled = false;
    let retry = 0;

    function connect() {
      if (cancelled) return;
      try {
        const ws = new WebSocket(WS_URL);
        wsRef.current = ws;
        ws.onopen = () => {
          retry = 0;
          setConnected(true);
        };
        ws.onclose = () => {
          setConnected(false);
          if (cancelled) return;
          retry += 1;
          setTimeout(connect, Math.min(1000 * retry, 5000));
        };
        ws.onerror = () => {
          try {
            ws.close();
          } catch {}
        };
        ws.onmessage = () => {
          // any change — refetch state
          qc.invalidateQueries({ queryKey: ["state"] });
        };
      } catch {
        setTimeout(connect, 2000);
      }
    }
    connect();
    return () => {
      cancelled = true;
      try {
        wsRef.current?.close();
      } catch {}
    };
  }, [qc]);

  return connected;
}
