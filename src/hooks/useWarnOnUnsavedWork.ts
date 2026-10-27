import { useEffect } from "react";

/**
 * L'app est routée par un `BrowserRouter` déclaratif : `useBlocker` n'est pas
 * disponible, donc seul le déchargement de la page est interceptable. Les liens
 * internes (sidebar, topbar) restent sans alerte tant que le routeur n'est pas
 * migré vers un data router.
 */
export function useWarnOnUnsavedWork(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);
}
