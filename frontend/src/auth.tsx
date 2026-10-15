// Admin PIN auth context.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { clearToken, loadToken, useAdminLogin } from "./api";

type AuthCtx = {
  isAdmin: boolean;
  loading: boolean;
  login: (pin: string) => Promise<void>;
  logout: () => Promise<void>;
  error: string | null;
};

const Ctx = createContext<AuthCtx>({
  isAdmin: false,
  loading: true,
  login: async () => {},
  logout: async () => {},
  error: null,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const loginMut = useAdminLogin();

  useEffect(() => {
    (async () => {
      const t = await loadToken();
      setIsAdmin(!!t);
      setLoading(false);
    })();
  }, []);

  const login = useCallback(
    async (pin: string) => {
      setError(null);
      try {
        await loginMut.mutateAsync(pin);
        setIsAdmin(true);
      } catch (e: any) {
        setError(e?.message || "Login failed");
        throw e;
      }
    },
    [loginMut],
  );

  const logout = useCallback(async () => {
    await clearToken();
    setIsAdmin(false);
  }, []);

  const value = useMemo(() => ({ isAdmin, loading, login, logout, error }), [isAdmin, loading, login, logout, error]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  return useContext(Ctx);
}
