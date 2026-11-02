import { createPortal } from "react-dom";
import { Box, Drawer } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";

interface PollingModalProps {
  isOpen: boolean;
  onClose: () => void;
  pollingStatus: string;
  pollingElapsed: number;
  nokashTransactionId: string | null;
  onManualCheck: () => void;
  isManualChecking?: boolean;
}

export default function PollingModal({
  isOpen,
  onClose,
  pollingStatus,
  pollingElapsed,
  nokashTransactionId,
  onManualCheck,
  isManualChecking,
}: PollingModalProps) {
  const isMobile = useMediaQuery("(max-width: 640px)");

  if (!isOpen) return null;

  const minutes = Math.floor(pollingElapsed / 60);
  const seconds = (pollingElapsed % 60).toString().padStart(2, "0");

  const modalBody = (
    <div className="text-center py-2 px-1">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="text-left">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-700 mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Paiement sécurisé
          </span>
          <h2 className="font-bricolage text-xl font-black text-slate-900 leading-tight">
            Validation en cours
          </h2>
        </div>
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-all"
          title="Fermer"
        >
          <i className="ph ph-x text-sm" />
        </button>
      </div>

      {/* Main visual spinner & animation */}
      <div className="relative w-28 h-28 mx-auto my-6 flex items-center justify-center">
        {/* Glowing rings */}
        <div className="absolute inset-0 rounded-full bg-emerald-500/10 animate-ping opacity-60" style={{ animationDuration: "2s" }} />
        <div className="absolute inset-2 rounded-full border-2 border-dashed border-emerald-500/40 animate-spin" style={{ animationDuration: "12s" }} />
        
        {/* Core spinner ring */}
        <div className="absolute inset-1 rounded-full border-4 border-slate-100 border-t-emerald-600 border-r-amber-500 animate-spin" style={{ animationDuration: "1.2s" }} />

        {/* Center device icon */}
        <div className="relative w-16 h-16 rounded-full bg-gradient-to-tr from-[#2D5A42] to-[#2D5A42] text-white flex items-center justify-center shadow-md">
          <i className="ph ph-device-mobile text-2xl animate-bounce" style={{ animationDuration: "2s" }} />
        </div>
      </div>

      {/* Status messages */}
      <div className="space-y-1 mb-6">
        <p className="font-bricolage text-lg font-bold text-slate-900">
          Consultez votre téléphone
        </p>
        <p className="text-[13px] text-slate-600 leading-relaxed max-w-xs mx-auto">
          {pollingStatus || "Un message de confirmation a été envoyé sur votre numéro. Veuillez saisir votre code PIN."}
        </p>
        <div className="pt-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-slate-100 text-slate-600">
            <i className="ph ph-clock text-[11px] text-slate-400" />
            {minutes}:{seconds}
          </span>
        </div>
      </div>

      {/* Help USSD card */}
      <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 mb-5 text-left text-xs text-slate-600 space-y-1.5">
        <p className="font-bold text-slate-800 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
          <i className="ph ph-info text-amber-500" />
          Le prompt n'apparaît pas ?
        </p>
        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
          <span>Orange Money :</span>
          <span className="font-mono font-bold bg-white px-2 py-0.5 rounded border border-slate-200 text-orange-600">#150*50#</span>
        </div>
        <div className="flex items-center justify-between text-[11px] text-slate-500">
          <span>MTN MoMo :</span>
          <span className="font-mono font-bold bg-white px-2 py-0.5 rounded border border-slate-200 text-yellow-600">*126#</span>
        </div>
      </div>

      {/* Manual Check CTA */}
      {nokashTransactionId && (
        <div className="space-y-2">
          <button
            onClick={onManualCheck}
            disabled={isManualChecking}
            className="w-full py-3 px-5 rounded-2xl bg-[#2D5A42] text-white font-bricolage font-bold text-xs hover:bg-[#152E22] transition-all flex items-center justify-center gap-2 shadow-md shadow-emerald-950/15 disabled:opacity-50 active:scale-[0.98]"
          >
            {isManualChecking ? (
              <>
                <i className="ph ph-circle-notch animate-spin text-sm" />
                Vérification du statut...
              </>
            ) : (
              <>
                <i className="ph ph-arrows-clockwise text-xs" />
                J'ai déjà validé sur mon téléphone
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );

  if (isMobile) {
    return createPortal(
      <Drawer
        opened={isOpen}
        onClose={onClose}
        position="bottom"
        size="auto"
        withCloseButton={false}
        padding="lg"
        radius="xl"
        lockScroll
        styles={{ content: { borderTopLeftRadius: 28, borderTopRightRadius: 28 } }}
      >
        <Box w={40} h={4} bg="gray.3" mx="auto" mb="md" style={{ borderRadius: 99 }} />
        {modalBody}
      </Drawer>,
      document.body
    );
  }

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <div className="relative bg-white w-full max-w-md rounded-[28px] p-6 shadow-2xl overflow-hidden border border-white/20 animate-fade-in">
        {modalBody}
      </div>
    </div>,
    document.body
  );
}
