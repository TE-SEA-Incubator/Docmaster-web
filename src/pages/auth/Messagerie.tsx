import MessageriePanel, { type MessagerieTheme } from "../../components/messagerie/MessageriePanel";
import { conversationsService } from "../../services/conversationsService";
import { useTopbar } from "../../hooks/useTopbar";

const userTheme: MessagerieTheme = {
  accent: "#2D5A42",
  accentDark: "#1E3A2F",
  accentSoft: "#EAF4EE",
  border: "#EAE3D8",
  surface: "#FFFFFF",
  subtle: "#FAF7F2",
  textMain: "#1A1A1A",
  textMuted: "#6B7280",
};

export default function Messagerie() {
  useTopbar("Messagerie", [
    { label: "Mon tableau de bord", href: "/dashboard" },
    { label: "Messagerie" },
  ]);

  return (
    <div className="flex flex-col flex-1 overflow-hidden bg-white">
      <MessageriePanel api={conversationsService} theme={userTheme} portal="user" />
    </div>
  );
}
