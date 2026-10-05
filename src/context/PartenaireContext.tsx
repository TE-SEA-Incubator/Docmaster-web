import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { partenairesService, type PartenaireSession } from "../services/partenairesService";
import { saveToken, saveRefreshToken, deleteToken, getRefreshToken } from "../utils/cookie";

const PARTNER_PORTAL = "partenaire" as const;

interface PartenaireContextValue {
  partenaire: PartenaireSession | null;
  loading: boolean;
  login: (email: string, motDePasse: string) => Promise<PartenaireSession>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const PartenaireContext = createContext<PartenaireContextValue | undefined>(undefined);

export function PartenaireProvider({ children }: { children: React.ReactNode }) {
  const [partenaire, setPartenaire] = useState<PartenaireSession | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await partenairesService.me();
      setPartenaire(res.data.data);
    } catch {
      setPartenaire(null);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    partenairesService
      .me()
      .then((res) => {
        if (!cancelled) setPartenaire(res.data.data);
      })
      .catch(() => {
        if (!cancelled) setPartenaire(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, motDePasse: string) => {
    const res = await partenairesService.login(email, motDePasse);
    if (res.data.data.token) {
      saveToken(res.data.data.token, PARTNER_PORTAL);
    }
    if (res.data.data.refresh_token) {
      saveRefreshToken(res.data.data.refresh_token, PARTNER_PORTAL);
    }
    setPartenaire(res.data.data.partenaire);
    return res.data.data.partenaire;
  }, []);

  const logout = useCallback(async () => {
    const refreshToken = getRefreshToken(PARTNER_PORTAL);
    try {
      await partenairesService.logout(refreshToken);
    } catch {
      /* ignore */
    }
    deleteToken(PARTNER_PORTAL);
    setPartenaire(null);
    window.location.href = "/partenaire/connexion";
  }, []);

  const value = useMemo(
    () => ({ partenaire, loading, login, logout, refresh }),
    [partenaire, loading, login, logout, refresh]
  );

  return <PartenaireContext.Provider value={value}>{children}</PartenaireContext.Provider>;
}

export function usePartenaire() {
  const ctx = useContext(PartenaireContext);
  if (!ctx) {
    throw new Error("usePartenaire doit être utilisé dans PartenaireProvider");
  }
  return ctx;
}