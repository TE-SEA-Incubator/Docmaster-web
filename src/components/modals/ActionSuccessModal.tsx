import { Modal, Drawer, Box, Text, Title, Button, Group, Stack, Badge, Paper } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";

export interface ActionSuccessModalProps {
  opened: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  badgeText?: string;
  badgeColor?: string;
  icon?: string;
  details?: Array<{ label: string; value: string | React.ReactNode; highlighted?: boolean }>;
  highlightBox?: {
    label: string;
    value: string;
    sublabel?: string;
  };
  primaryAction: {
    label: string;
    onClick: () => void;
    icon?: string;
    color?: string;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
    icon?: string;
  };
}

export default function ActionSuccessModal({
  opened,
  onClose,
  title,
  description,
  badgeText,
  badgeColor = "green",
  icon = "fa-check",
  details,
  highlightBox,
  primaryAction,
  secondaryAction,
}: ActionSuccessModalProps) {
  const isMobile = useMediaQuery("(max-width: 640px)");

  const content = (
    <div className="text-center py-2 px-1">
      {/* Icon with soft pulse */}
      <div className="relative w-20 h-20 mx-auto mb-5 flex items-center justify-center">
        <div className="absolute inset-0 rounded-full bg-emerald-500/15 animate-ping opacity-75" style={{ animationDuration: "2.5s" }} />
        <div className="relative w-16 h-16 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-lg shadow-emerald-600/25">
          <i className={`fa-solid ${icon} text-2xl`} />
        </div>
      </div>

      {badgeText && (
        <span className={`inline-block px-3 py-1 mb-3 rounded-full text-[11px] font-bold tracking-wider uppercase bg-${badgeColor === "orange" ? "amber-500/10 text-amber-600" : "emerald-500/10 text-emerald-700"}`}>
          {badgeText}
        </span>
      )}

      <h2 className="font-bricolage text-2xl font-black text-slate-900 mb-2 leading-tight tracking-tight">
        {title}
      </h2>

      {description && (
        <p className="text-[13px] text-slate-500 leading-relaxed mb-5 max-w-sm mx-auto">
          {description}
        </p>
      )}

      {/* Highlight Box (e.g., Reference number, Pickup code, Points added) */}
      {highlightBox && (
        <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl mb-5 text-center">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            {highlightBox.label}
          </p>
          <p className="font-bricolage text-xl font-black text-emerald-700 tracking-wider">
            {highlightBox.value}
          </p>
          {highlightBox.sublabel && (
            <p className="text-[11px] text-slate-400 mt-1">{highlightBox.sublabel}</p>
          )}
        </div>
      )}

      {/* Details list */}
      {details && details.length > 0 && (
        <div className="bg-slate-50/80 border border-slate-100 rounded-2xl p-3.5 mb-5 space-y-2 text-left">
          {details.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between text-xs py-1 border-b border-slate-100 last:border-0">
              <span className="text-slate-400 font-medium">{item.label}</span>
              <span className={`font-bold ${item.highlighted ? "text-emerald-600 font-bricolage text-sm" : "text-slate-800"}`}>
                {item.value}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="space-y-2.5 pt-2">
        <button
          onClick={primaryAction.onClick}
          className="w-full py-3.5 px-6 rounded-2xl bg-[#2D5A42] text-white font-bricolage font-bold text-sm hover:bg-[#152E22] transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/20 active:scale-[0.98]"
        >
          {primaryAction.icon && <i className={`fa-solid ${primaryAction.icon}`} />}
          {primaryAction.label}
        </button>

        {secondaryAction && (
          <button
            onClick={secondaryAction.onClick}
            className="w-full py-3 px-6 rounded-2xl bg-white border border-slate-200 text-slate-700 font-bricolage font-bold text-xs hover:bg-slate-50 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
          >
            {secondaryAction.icon && <i className={`fa-solid ${secondaryAction.icon}`} />}
            {secondaryAction.label}
          </button>
        )}
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer
        opened={opened}
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
        {content}
      </Drawer>
    );
  }

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      centered
      radius="xl"
      size="md"
      withCloseButton={false}
      padding="xl"
      overlayProps={{
        backgroundOpacity: 0.55,
        blur: 4,
      }}
    >
      {content}
    </Modal>
  );
}
