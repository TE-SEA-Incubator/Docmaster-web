import { useEffect } from "react";
import { useTopbarContext, type Breadcrumb } from "../context/TopbarContext";

/**
 * Hook à appeler dans chaque page auth pour définir le titre et les breadcrumbs du Topbar global.
 * 
 * Usage:
 *   useTopbar("Mon titre", [
 *     { label: "Tableau de bord", href: "/dashboard" },
 *     { label: "Mon titre" },
 *   ]);
 */
export function useTopbar(title: string, breadcrumbs: Breadcrumb[] = []) {
  const { setTopbar } = useTopbarContext();

  useEffect(() => {
    setTopbar(title, breadcrumbs);
    // Pas de cleanup — on garde le dernier titre affiché jusqu'à la prochaine page
  }, [title]);
}
