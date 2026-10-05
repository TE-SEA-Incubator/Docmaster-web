import MessageriePanel, { type MessagerieTheme } from "../../components/messagerie/MessageriePanel";
import { partenaireConversationsService } from "../../services/conversationsService";
import { partenairePalette } from "../../theme/partenaires";

const partenaireTheme: MessagerieTheme = {
  accent: partenairePalette.primary,
  accentDark: partenairePalette.primaryDark,
  accentSoft: partenairePalette.greenLight,
  border: partenairePalette.border,
  surface: partenairePalette.surface,
  subtle: partenairePalette.surface2,
  textMain: partenairePalette.textMain,
  textMuted: partenairePalette.textMuted,
};

export default function Messagerie() {
  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: partenairePalette.surface }}>
      <MessageriePanel
        api={partenaireConversationsService}
        theme={partenaireTheme}
        portal="partenaire"
      />
    </div>
  );
}
