import { useEffect, useState } from "react";
import { statsService } from "../services/statsService";

export interface GlobalStats {
  declared: number;
  recovered: number;
  rate: number;
}

/**
 * Renvoie null tant que la base n'a pas répondu : les écrans qui affichent des
 * compteurs doivent alors masquer la section plutôt que d'avancer un chiffre.
 */
export function useGlobalStats() {
  const [stats, setStats] = useState<GlobalStats | null>(null);

  useEffect(() => {
    let alive = true;
    statsService
      .getGlobal()
      .then((res: any) => {
        if (!alive || !res?.success || !res.data) return;
        const declared = Number(res.data.total_lost) || 0;
        const recovered = Number(res.data.total_recovered) || 0;
        setStats({
          declared,
          recovered,
          rate: declared > 0 ? Math.round((recovered / declared) * 100) : 0,
        });
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  return stats;
}
