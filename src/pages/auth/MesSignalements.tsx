import { useCallback, useEffect, useState } from "react";
import { Badge, Button, Loader, Paper, Stack, Text, Title } from "@mantine/core";
import { useI18n } from "../../context/I18nContext";
import { useTopbar } from "../../hooks/useTopbar";
import ReportModal from "../../components/ui/ReportModal";
import {
  reportsService,
  type Report,
  type ReportReasonCategory,
  type ReportStatus,
  type ReportTargetType,
} from "../../services/reportsService";

type Filter = "all" | ReportStatus;

const STATUS_KEYS: Record<ReportStatus, string> = {
  OPEN: "reports_status_open",
  IN_REVIEW: "reports_status_in_review",
  RESOLVED: "reports_status_resolved",
  DISMISSED: "reports_status_dismissed",
};

const STATUS_COLORS: Record<ReportStatus, string> = {
  OPEN: "orange",
  IN_REVIEW: "blue",
  RESOLVED: "green",
  DISMISSED: "gray",
};

const REASON_KEYS: Record<ReportReasonCategory, string> = {
  WRONG_DOCUMENT: "reports_reason_wrong_document",
  NO_HANDOVER: "reports_reason_no_handover",
  FRAUD: "reports_reason_fraud",
  ABUSIVE: "reports_reason_abusive",
  OTHER: "reports_reason_other",
};

const TARGET_KEYS: Record<ReportTargetType, string> = {
  DECLARATION: "reports_target_declaration",
  MATCH: "reports_target_match",
  CONVERSATION: "reports_target_conversation",
  USER: "reports_target_user",
  SUPPORT: "reports_target_support",
};

export default function MesSignalements() {
  const { t, lang } = useI18n();
  useTopbar(t("reports_title"), [
    { label: t("reports_breadcrumb_home"), href: "/dashboard" },
    { label: t("reports_title") },
  ]);

  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [supportOpen, setSupportOpen] = useState(false);

  const locale = lang === "ar" ? "ar" : lang === "en" ? "en-GB" : "fr-FR";

  const formatDate = (value?: string | null) => {
    if (!value) return "—";
    try {
      return new Intl.DateTimeFormat(locale, {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(value));
    } catch {
      return "—";
    }
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await reportsService.getMine();
      setReports(Array.isArray(res.data) ? res.data : []);
    } catch {
      setReports([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filters: { key: Filter; label: string }[] = [
    { key: "all", label: t("reports_filter_all") },
    { key: "OPEN", label: t("reports_status_open") },
    { key: "IN_REVIEW", label: t("reports_status_in_review") },
    { key: "RESOLVED", label: t("reports_status_resolved") },
    { key: "DISMISSED", label: t("reports_status_dismissed") },
  ];

  const visible = reports.filter((r) => filter === "all" || r.status === filter);

  return (
    <div className="flex flex-col h-full">
      <div className="custom-scroll p-4 sm:p-6 flex flex-col gap-4 pb-28 md:pb-8 w-full max-md:h-[calc(100vh-134px)] md:h-[calc(100vh-64px)] overflow-y-auto">
        <Paper radius="xl" withBorder p="lg" className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <Text fw={700} size="sm">
              {t("reports_support_title")}
            </Text>
            <Text size="xs" c="dimmed" mt={2}>
              {t("reports_support_desc")}
            </Text>
          </div>
          <Button
            radius="xl"
            size="sm"
            onClick={() => setSupportOpen(true)}
            style={{ backgroundColor: "#2D5A42" }}
            leftSection={<i className="ph ph-headset" />}
          >
            {t("reports_support_button")}
          </Button>
        </Paper>

        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full border text-[11px] sm:text-[12px] font-semibold transition-all ${
                filter === f.key
                  ? "bg-primary text-white border-primary"
                  : "bg-bgMain text-textMuted border-borda hover:border-primary hover:text-primary"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center min-h-[40vh]">
            <Loader size="md" />
          </div>
        ) : visible.length === 0 ? (
          <Paper radius="xl" withBorder p="xl">
            <Stack align="center" gap="xs">
              <i className="ph ph-flag text-textMuted text-2xl" />
              <Text fw={700}>{t("reports_empty_title")}</Text>
              <Text size="sm" c="dimmed" ta="center">
                {reports.length === 0 ? t("reports_empty_desc") : t("reports_empty_filter")}
              </Text>
            </Stack>
          </Paper>
        ) : (
          <Stack gap="md">
            {visible.map((report) => {
              const reference =
                report.target_reference ||
                (report.target_type === "SUPPORT" ? null : report.target_id);
              return (
                <Paper key={report.id} radius="xl" withBorder p="lg">
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <i className="ph ph-flag text-textMuted text-sm" />
                        <Title order={5} ff="Bricolage Grotesque">
                          {t(REASON_KEYS[report.reason_category] || "reports_reason_other")}
                        </Title>
                      </div>
                      <Badge
                        color={STATUS_COLORS[report.status] || "gray"}
                        variant="light"
                        radius="xl"
                        size="sm"
                      >
                        {t(STATUS_KEYS[report.status] || "reports_status_open")}
                      </Badge>
                    </div>

                    <Text size="xs" c="dimmed">
                      {t(TARGET_KEYS[report.target_type] || "reports_target_support")}
                      {reference ? ` · ${reference}` : ""}
                    </Text>

                    <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
                      {report.description}
                    </Text>

                    {report.admin_reply && (
                      <div className="mt-1 pl-3" style={{ borderLeft: "3px solid #2D5A42" }}>
                        <Text size="xs" fw={700} c="dimmed" tt="uppercase">
                          {t("reports_admin_reply")}
                        </Text>
                        <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
                          {report.admin_reply}
                        </Text>
                      </div>
                    )}

                    <Text size="xs" c="dimmed">
                      {t("reports_sent_on")} {formatDate(report.created_at)}
                      {report.resolved_at ? ` · ${t("reports_closed_on")} ${formatDate(report.resolved_at)}` : ""}
                    </Text>
                  </div>
                </Paper>
              );
            })}
          </Stack>
        )}
      </div>

      <ReportModal
        opened={supportOpen}
        onClose={() => {
          setSupportOpen(false);
          load();
        }}
      />
    </div>
  );
}
