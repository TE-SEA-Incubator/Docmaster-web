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
        <h1 className="font-bricolage text-2xl font-black text-gray-900">Notification Broadcast</h1>
        <InfoTooltip text="Envoyez une notification push à tous les utilisateurs de l'application." />
      </div>
      <p className="text-gray-400 text-[13px] font-medium mt-1 mb-8">
        Envoyez une notification push à l'ensemble des utilisateurs inscrits.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200/60 rounded-2xl p-6 shadow-sm">
          <h3 className="font-bricolage font-bold text-gray-900 mb-4 flex items-center gap-2">
            <i className="fa-solid fa-bullhorn text-primary" />
            Nouveau broadcast
            <InfoTooltip text="Le message sera envoyé à tous les utilisateurs possédant un token push valide." />
          </h3>
          <form onSubmit={handleSend} className="space-y-4">
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">
                Titre <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Nouvelle fonctionnalité disponible"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-primary transition-all"
                required
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">
                Message <span className="text-red-500">*</span>
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
                placeholder="Contenu de la notification..."
                required
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-primary transition-all resize-none"
              />
            </div>
            {result && (
              <div
                className={`px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
                  result.success
                    ? "bg-green-50 text-green-700"
                    : "bg-red-50 text-red-700"
                }`}
              >
                <i className={`fa-solid ${result.success ? "fa-check-circle" : "fa-circle-xmark"}`} />
                {result.message}
              </div>
            )}
            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={!title.trim() || !message.trim() || sending}
                className="bg-primary text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-primary-dark transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {sending ? (
                  <><i className="fa-solid fa-spinner fa-spin" /> Envoi en cours...</>
                ) : (
                  <><i className="fa-solid fa-paper-plane" /> Envoyer la notification</>
                )}
              </button>
              <span className="text-[11px] text-gray-400">
                ~{message.length} caractères
              </span>
            </div>
          </form>
        </div>

        <div className="bg-white border border-gray-200/60 rounded-2xl p-6 shadow-sm">
          <h3 className="font-bricolage font-bold text-gray-900 mb-4 flex items-center gap-2">
            <i className="fa-solid fa-circle-info text-primary" />
            Informations
          </h3>
          <div className="space-y-4 text-sm text-gray-600 leading-relaxed">
            <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-xl">
              <i className="fa-solid fa-users text-blue-500 mt-0.5" />
              <div>
                <p className="font-bold text-gray-900 mb-0.5">Destinataires</p>
                <p className="text-[12px]">
                  La notification sera envoyée à <strong>tous les utilisateurs</strong> disposant d'un token push
                  FCM enregistré, quel que soit leur statut d'abonnement.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-xl">
              <i className="fa-solid fa-triangle-exclamation text-amber-500 mt-0.5" />
              <div>
                <p className="font-bold text-gray-900 mb-0.5">Attention</p>
                <p className="text-[12px]">
                  Le broadcast peut prendre quelques secondes selon le nombre d'utilisateurs.
                  Les notifications sont envoyées par lots de 500.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-green-50 rounded-xl">
              <i className="fa-solid fa-shield-check text-green-500 mt-0.5" />
              <div>
                <p className="font-bold text-gray-900 mb-0.5">Logging</p>
                <p className="text-[12px]">
                  Chaque broadcast est enregistré comme notification de type <code>BROADCAST</code> dans
                  l'historique de chaque utilisateur.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
