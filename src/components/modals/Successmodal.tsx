import { useI18n } from "../../context/I18nContext";
import ActionSuccessModal from "./ActionSuccessModal";

interface SuccessModalProps {
  refNumber: string;
  onClose: () => void;
  onNewDeclaration: () => void;
  onMyDeclarations: () => void;
  onDownloadPdf?: () => void;
}

export default function SuccessModal({
  refNumber,
  onClose,
  onNewDeclaration,
  onMyDeclarations,
  onDownloadPdf,
}: SuccessModalProps) {
  const { t } = useI18n();

  return (
    <ActionSuccessModal
      opened={true}
      onClose={onClose}
      title={t("success_declaration_title")}
      description={t("success_declaration_desc")}
      badgeText="Déclaration"
      badgeColor="green"
      icon="ph ph-file-lock"
      highlightBox={{
        label: t("success_keep_reference"),
        value: refNumber,
      }}
      primaryAction={{
        label: t("success_download_pdf"),
        icon: "ph ph-file-arrow-down",
        onClick: () => {
          if (onDownloadPdf) onDownloadPdf();
        },
      }}
      secondaryAction={{
        label: t("success_my_declarations"),
        icon: "ph ph-folder-open",
        onClick: onMyDeclarations,
      }}
    />
  );
}
