import { useEffect } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { Badge, Button } from "@mantine/core";
import { useI18n } from "../../context/I18nContext";
import { ProtectedDocumentImage } from "./ProtectedDocumentImage";

export interface PublicDocumentDetailData {
  id: string | number;
  docType: string;
  ownerName: string;
  photoUrl?: string;
  dateText: string;
  dateRelative?: string;
  location: string;
  country: string;
  status: string;
  reference?: string;
  score?: number;
  isAuthenticated: boolean;
  ctaTo: string;
}

interface PublicDocumentDetailModalProps {
  doc: PublicDocumentDetailData;
  onClose: () => void;
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <dt className="flex items-center gap-2 shrink-0 text-[10px] font-bold uppercase tracking-wider text-textMuted">
        <i className={`${icon} text-[11px]`} />
        {label}
      </dt>
      <dd className="text-right text-[13px] font-semibold text-textMain break-words">{value}</dd>
    </div>
  );
}

export default function PublicDocumentDetailModal({
  doc,
  onClose,
}: PublicDocumentDetailModalProps) {
  const { t } = useI18n();

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-[230] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm sm:p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="public-document-title"
        className="w-full sm:max-w-2xl max-h-[92vh] overflow-y-auto bg-white rounded-t-3xl sm:rounded-3xl border border-borderMain shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="relative">
          <div className="h-44 sm:h-52 bg-surface2 overflow-hidden">
            <ProtectedDocumentImage
              src={doc.photoUrl}
              revealed={false}
              className="relative w-full h-full overflow-hidden"
              imgClassName="w-full h-full object-cover"
              loginUrl={doc.isAuthenticated ? undefined : "/login"}
              lockLabelKey={
                doc.isAuthenticated ? "rechercher_photo_protected" : "rechercher_public_locked"
              }
              lockHintKey={
                doc.isAuthenticated
                  ? "rechercher_data_protection_desc"
                  : "rechercher_public_locked_hint"
              }
            />
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label={t("rechercher_close")}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white border border-borderMain flex items-center justify-center text-textMain hover:bg-surface2 transition-colors"
          >
            <i className="ph ph-x" />
          </button>

          {doc.score && doc.score > 0 ? (
            <div className="absolute bottom-4 left-4">
              <Badge color="orange" variant="light" radius="xl" size="md">
                {doc.score}% {t("rechercher_match")}
              </Badge>
            </div>
          ) : null}
        </div>

        <div className="p-5 sm:p-7">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="text-[10px] font-bold text-primary uppercase tracking-widest">
              {t("rechercher_found_doc")}
            </span>
            <Badge color="green" variant="light" radius="xl" size="sm">
              {doc.status}
            </Badge>
          </div>

          <h2
            id="public-document-title"
            className="font-bricolage text-xl sm:text-2xl font-black text-textMain"
          >
            {doc.docType}
          </h2>
          <p className="text-sm font-medium text-textMuted mt-1">{doc.ownerName}</p>

          <dl className="mt-5 border-y border-borderMain divide-y divide-borderMain">
            <DetailRow
              icon="ph ph-calendar"
              label={t("rechercher_date_label")}
              value={doc.dateRelative ? `${doc.dateText} · ${doc.dateRelative}` : doc.dateText}
            />
            <DetailRow
              icon="ph ph-map-pin"
              label={t("rechercher_location_label")}
              value={`${doc.location}, ${doc.country}`}
            />
            {doc.reference && (
              <DetailRow
                icon="ph ph-hash"
                label={t("rechercher_reference")}
                value={doc.reference}
              />
            )}
            <DetailRow
              icon="ph ph-check-circle"
              label={t("rechercher_status_label")}
              value={doc.status}
            />
          </dl>

          <p className="mt-5 flex items-start gap-2 text-[11px] font-medium text-textMuted leading-relaxed">
            <i className="ph ph-shield mt-0.5" />
            {t("rechercher_public_detail_hint")}
          </p>

          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <Button
              variant="default"
              radius="xl"
              size="md"
              fullWidth
              onClick={onClose}
            >
              {t("rechercher_close")}
            </Button>
            <Button
              component={Link}
              to={doc.ctaTo}
              radius="xl"
              size="md"
              fullWidth
              leftSection={<i className="ph ph-file-plus text-xs" />}
              style={{ backgroundColor: "#2D5A42" }}
            >
              {t("rechercher_its_mine")}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
