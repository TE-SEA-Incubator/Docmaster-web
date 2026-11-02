import { useI18n } from "../../context/I18nContext";
import {
  Dialog,
  DialogContent,
  DialogBody,
} from "./dialog";

interface InfoAlertProps {
  message: string;
  onClose: () => void;
}

export default function InfoAlert({ message, onClose }: InfoAlertProps) {
  const { t } = useI18n();

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogBody>
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-orange-50 flex items-center justify-center mx-auto mb-5">
              <i className="ph ph-info text-primary text-2xl"></i>
            </div>
            <p className="text-[14px] font-bold text-textMain leading-relaxed mb-6">
              {message}
            </p>
            <button
              onClick={onClose}
              className="w-full py-3.5 bg-primary text-white rounded-xl font-black text-sm hover:bg-primary-dark transition-all active:scale-95"
            >
              {t("confirm_ok" as any) || "OK"}
            </button>
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
