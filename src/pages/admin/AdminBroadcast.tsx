import { useState } from "react";
import { notificationsService } from "../../services/notificationsService";
import InfoTooltip from "../../components/ui/InfoTooltip";

export default function AdminBroadcast() {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim() || sending) return;
    setSending(true);
    setResult(null);
    try {
      const res = await notificationsService.sendBroadcast(title.trim(), message.trim());
      setResult({ success: true, message: "Notification broadcast envoyée avec succès" });
      setTitle("");
      setMessage("");
    } catch (err: any) {
      setResult({ success: false, message: err.response?.data?.message || "Erreur d'envoi" });
    } finally {
      setSending(false);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <h1 className="text-xl font-bold text-gray-900">Notification Broadcast</h1>
        <InfoTooltip text="Envoyez une notification push à tous les utilisateurs de l'application." />
      </div>
      <p className="text-gray-500 text-[13px] mt-0.5 mb-6">
        Envoyez une notification push à l'ensemble des utilisateurs inscrits.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white border border-gray-200 rounded p-5">
          <h3 className="font-bold text-sm text-gray-800 mb-4 flex items-center gap-2">
            <i className="ph ph-megaphone text-[#E8923A]" />
            Nouveau broadcast
            <InfoTooltip text="Le message sera envoyé à tous les utilisateurs possédant un token push valide." />
          </h3>
          <form onSubmit={handleSend} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                Titre <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Nouvelle fonctionnalité disponible"
                className="w-full px-3 py-2.5 border border-gray-200 rounded text-[13px] outline-none focus:border-[#E8923A] transition-colors"
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                Message <span className="text-red-500">*</span>
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
                placeholder="Contenu de la notification..."
                required
                className="w-full px-3 py-2.5 border border-gray-200 rounded text-[13px] outline-none focus:border-[#E8923A] transition-colors resize-none"
              />
            </div>
            {result && (
              <div className={`px-3 py-2.5 rounded border text-[13px] flex items-center gap-2 ${result.success ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"}`}>
                <i className={`${result.success ? "ph ph-check-circle" : "ph ph-x-circle"} text-sm shrink-0`} />
                {result.message}
              </div>
            )}
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={!title.trim() || !message.trim() || sending}
                className="flex items-center gap-1.5 bg-[#2D5A42] text-white px-5 py-2.5 rounded text-[13px] font-semibold hover:bg-[#2D5A42] transition-colors disabled:opacity-50"
              >
                {sending ? (
                  <><i className="ph ph-spinner animate-spin text-xs" /> Envoi en cours...</>
                ) : (
                  <><i className="ph ph-paper-plane text-xs" /> Envoyer la notification</>
                )}
              </button>
              <span className="text-[12px] text-gray-400">{message.length} caractères</span>
            </div>
          </form>
        </div>

        <div className="bg-white border border-gray-200 rounded p-5">
          <h3 className="font-bold text-sm text-gray-800 mb-4 flex items-center gap-2">
            <i className="ph ph-info text-gray-400" />
            Informations
          </h3>
          <div className="space-y-3 text-[13px] text-gray-600">
            <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded">
              <i className="ph ph-users text-blue-500 mt-0.5 shrink-0" />
              <div>
                <p className="font-bold text-gray-900 mb-0.5">Destinataires</p>
                <p className="text-[12px]">La notification sera envoyée à <strong>tous les utilisateurs</strong> disposant d'un token push FCM enregistré.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded">
              <i className="ph ph-warning text-amber-500 mt-0.5 shrink-0" />
              <div>
                <p className="font-bold text-gray-900 mb-0.5">Attention</p>
                <p className="text-[12px]">Le broadcast peut prendre quelques secondes. Les notifications sont envoyées par lots de 500.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-green-50 border border-green-200 rounded">
              <i className="ph ph-shield text-green-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-bold text-gray-900 mb-0.5">Logging</p>
                <p className="text-[12px]">Chaque broadcast est enregistré comme notification de type <code className="bg-gray-100 px-1 rounded">BROADCAST</code> dans l'historique.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
