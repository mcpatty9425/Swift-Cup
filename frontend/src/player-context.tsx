// Local-device player identity. Stores the selected player id and provides it to the app.
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const KEY = "swifty.me.player_id";

type Ctx = {
  playerId: string | null;
  loading: boolean;
  setPlayer: (id: string | null) => Promise<void>;
};

const PlayerCtx = createContext<Ctx>({ playerId: null, loading: true, setPlayer: async () => {} });

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const v = await AsyncStorage.getItem(KEY);
      setPlayerId(v);
      setLoading(false);
    })();
  }, []);

  const setPlayer = useCallback(async (id: string | null) => {
    if (id) await AsyncStorage.setItem(KEY, id);
    else await AsyncStorage.removeItem(KEY);
    setPlayerId(id);
  }, []);

  const value = useMemo(() => ({ playerId, loading, setPlayer }), [playerId, loading, setPlayer]);
  return <PlayerCtx.Provider value={value}>{children}</PlayerCtx.Provider>;
}

export function usePlayer() {
  return useContext(PlayerCtx);
}
