import { useI18n } from "../../../context/I18nContext";
import ActionSuccessModal from "../../modals/ActionSuccessModal";

interface SuccessDeclarationModalProps {
  opened: boolean;
  isMobile: boolean;
  refNumber: string;
  isDownloading: boolean;
  onDownloadPdf: () => void;
  onNewDeclaration: () => void;
  onMyDeclarations: () => void;
}

export default function SuccessDeclarationModal({
  opened,
  refNumber,
  isDownloading,
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
      badgeText={t("declarer_breadcrumb")}
      badgeColor="green"
      icon="ph ph-file-lock"
      highlightBox={{
        label: t("declarer_keep_reference"),
        value: refNumber || t("declarer_ref_pending"),
      }}
      primaryAction={{
        label: t("declarer_download_pdf"),
        loadingLabel: t("declarer_downloading_pdf"),
        loading: isDownloading,
        icon: "ph ph-file-arrow-down",
        onClick: onDownloadPdf,
      }}
      secondaryAction={{
        label: t("declarer_my_declarations"),
        icon: "ph ph-folder-open",
        onClick: onMyDeclarations,
      }}
    />
  );
}
