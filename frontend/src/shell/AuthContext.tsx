/* Session state — profile comes from GET /auth/me, the only truth. */
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api, tokens, type Me } from "../api/client";

interface Auth {
  me: Me | null;
  loading: boolean;
  reload: () => Promise<void>;
  logout: () => Promise<void>;
}

const Ctx = createContext<Auth>({ me: null, loading: true, reload: async () => {}, logout: async () => {} });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!tokens.access) { setMe(null); setLoading(false); return; }
    try {
      const res = await api<{ data: Me }>("/api/v1/auth/me");
      setMe(res.data);
    } catch {
      setMe(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try { await api("/api/v1/auth/logout", { method: "POST" }); } catch { /* revoke is best-effort */ }
    tokens.clear();
    setMe(null);
  }, []);

  useEffect(() => { void reload(); }, [reload]);

  return <Ctx.Provider value={{ me, loading, reload, logout }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
