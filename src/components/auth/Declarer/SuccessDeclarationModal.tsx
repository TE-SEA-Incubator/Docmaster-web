import { useI18n } from "../../../context/I18nContext";
import ActionSuccessModal from "../../modals/ActionSuccessModal";

interface SuccessDeclarationModalProps {
  opened: boolean;
  isMobile: boolean;
  refNumber: string;
  onDownloadPdf: () => void;
  onNewDeclaration: () => void;
  onMyDeclarations: () => void;
}

export default function SuccessDeclarationModal({
  opened,
  refNumber,
  onDownloadPdf,
  onNewDeclaration,
  onMyDeclarations,
}: SuccessDeclarationModalProps) {
  const { t } = useI18n();

  return (
    <ActionSuccessModal
      opened={opened}
      onClose={onMyDeclarations}
      title={t("declarer_success_title")}
      description={t("declarer_success_desc")}
      badgeText="Déclaration"
      badgeColor="green"
      icon="fa-file-shield"
      highlightBox={{
        label: t("declarer_keep_reference"),
        value: refNumber,
      }}
      primaryAction={{
        label: t("declarer_download_pdf"),
        icon: "fa-file-arrow-down",
        onClick: onDownloadPdf,
      }}
      secondaryAction={{
        label: t("declarer_my_declarations"),
        icon: "fa-folder-open",
        onClick: onMyDeclarations,
      }}
    />
  );
}
