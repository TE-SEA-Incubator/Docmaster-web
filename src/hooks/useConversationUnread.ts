import { useCallback, useEffect, useState } from "react";
import { conversationsService } from "../services/conversationsService";
import { getToken } from "../utils/cookie";

const REFRESH_EVENTS = [
  "docmaster:conversation-message",
  "docmaster:conversation-opened",
  "docmaster:conversation-read",
];

/**
 * Total des messages non lus, pour l'indicateur de la sidebar. Le serveur ne
 * diffuse MESSAGE_NEW qu'aux membres d'un fil : le retour du focuscomplete le
 * rafraîchissement pendant que l'onglet était inactif.
 */
export function useConversationUnread() {
  const [unreadTotal, setUnreadTotal] = useState(0);

  const refresh = useCallback(async () => {
    if (!getToken("user")) {
      setUnreadTotal(0);
      return;
    }
    try {
      const rows = await conversationsService.list("all");
      setUnreadTotal(rows.reduce((sum, item) => sum + (item.unread_count ?? 0), 0));
    } catch {
      // Un badge muet vaut mieux qu'une sidebar qui plante.
    }
  }, []);

  useEffect(() => {
    refresh();
    REFRESH_EVENTS.forEach((name) => window.addEventListener(name, refresh));
    window.addEventListener("focus", refresh);
    return () => {
      REFRESH_EVENTS.forEach((name) => window.removeEventListener(name, refresh));
      window.removeEventListener("focus", refresh);
    };
  }, [refresh]);

  return { unreadTotal, refresh };
}
