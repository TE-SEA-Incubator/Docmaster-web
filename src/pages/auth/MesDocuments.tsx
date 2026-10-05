import { useState, useEffect, useMemo, useRef } from "react";
import { Modal, Loader, SimpleGrid, Paper, Text, Group, TextInput, Title, Card, Stepper, Button, Select, Stack, Checkbox, Radio } from "@mantine/core";
import { Dropzone, IMAGE_MIME_TYPE } from "@mantine/dropzone";
import { documentTypesService } from "../../services/declarationsService";
import { useDocuments } from "../../hooks/useDocuments";
import { useI18n } from "../../context/I18nContext";
import { useTopbar } from "../../hooks/useTopbar";
import { useAuth } from "../../context/AuthContext";
import apiClient from "../../services/api";

import DocumentCard from "../../components/cards/DocumentCard";
import DocumentDetailModal from "../../components/ui/DocumentDetailModal";
import ShareModal from "../../components/modals/Sharemodal";
import ReportLostModal from "../../components/ui/ReportLostModal";
import DatePicker from "../../components/ui/DatePicker";
import type { Document, DocTypeCatalog } from "../../types/api";

function addMonths(dateStr: string, months: number): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const day = d.getDate();
  d.setMonth(d.getMonth() + months);
  if (d.getDate() !== day) d.setDate(0);
  return d.toISOString().split("T")[0];
}

export default function MesDocuments() {
  const { t } = useI18n();
  useTopbar(t("mesdocuments_title"), [{ label: t("mesdocuments_breadcrumb_home"), href: "/dashboard" }, { label: t("mesdocuments_breadcrumb_documents") }]);
  const { user } = useAuth();
  const { documents: docs, loading, fetch: fetchDocs, register, remove, reportLost } = useDocuments();
  const [docTypes, setDocTypes] = useState<DocTypeCatalog[]>([]);
  const [filterCat, setFilterCat] = useState("all");
  const [search, setSearch] = useState("");
  const [showBanner, setShowBanner] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showLostModal, setShowLostModal] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const [step, setStep] = useState(1);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [validityOption, setValidityOption] = useState<'EXPIRING' | 'PERMANENT'>('EXPIRING');
  const [form, setForm] = useState({ name: "", number: "", issued: "", expiry: "", authority: "", notes: "" });
  const [rectoFile, setRectoFile] = useState<File | null>(null);
  const [versoFile, setVersoFile] = useState<File | null>(null);
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [customTypeName, setCustomTypeName] = useState("");
  const rectoOpenRef = useRef<() => void>(null);
  const versoOpenRef = useRef<() => void>(null);

  const selectedDocType = useMemo(
    () => (selectedType ? docTypes.find((dt) => dt.code === selectedType) : null),
    [selectedType, docTypes]
  );
  const hasExpiration = validityOption === 'EXPIRING' && (selectedType === 'AUTRES' || (selectedDocType?.delai_expiration_mois ?? 0) > 0);
  const isAutoExpiry = selectedType !== 'AUTRES' && (selectedDocType?.delai_expiration_mois ?? 0) > 0;

  const updateIssued = (v: string) => {
    setForm((prev) => ({
      ...prev,
      issued: v,
      expiry: isAutoExpiry && v ? addMonths(v, selectedDocType!.delai_expiration_mois) : prev.expiry,
    }));
  };

  useEffect(() => {
    documentTypesService.getActive().then((res) => {
      if (res.success && Array.isArray(res.data)) {
        setDocTypes(res.data);
      }
    }).catch(() => {});
  }, []);

  const verifiedCount = docs.filter((d) => d.is_verified).length;
  const pendingCount = docs.filter((d) => !d.is_verified).length;

  const showArchived = filterCat === "__archived";
  const filtered = docs.filter((d) => {
    if (showArchived) return d.is_archived;
    if (d.is_archived) return false;
    const matchCat = filterCat === "all" || d.type_doc === filterCat;
    const matchSearch = !search || (d.nom_sur_doc || "").toLowerCase().includes(search.toLowerCase()) || (d.numero_doc || "").includes(search);
    return matchCat && matchSearch;
  });

  function resetForm() {
    setStep(1);
    setSelectedType(null);
    setValidityOption('EXPIRING');
    setForm({ name: "", number: "", issued: "", expiry: "", authority: "", notes: "" });
    setRectoFile(null);
    setVersoFile(null);
    setConsent(false);
    setCustomTypeName("");
  }

  function closeAddModal() { setShowAddModal(false); resetForm(); }
  function goStep(s: number) { setStep(s); }

  async function handleSubmit() {
    if (!consent || !selectedType || (selectedType === 'AUTRES' && !customTypeName.trim()) || !form.name || !rectoFile) return;
    setSubmitting(true);
    try {
      const fd = new FormData();
      const isCustom = selectedType === 'AUTRES' && customTypeName.trim();
      fd.append("type_doc", isCustom ? "AUTRES" : (selectedType || ""));
      fd.append("numero_doc", form.number);
      fd.append("nom_sur_doc", form.name);
      if (isCustom) fd.append("custom_type_name", customTypeName.trim());
      fd.append("validity_option", validityOption);
      if (validityOption === 'PERMANENT') {
        fd.append("date_expiration", "");
        fd.append("date_delivrance", "");
      } else {
        if (form.issued) fd.append("date_delivrance", form.issued);
        if (form.expiry) fd.append("date_expiration", form.expiry);
      }
      if (form.authority) fd.append("nom_autorite", form.authority);
      if (form.notes) fd.append("notes", form.notes);
      if (rectoFile) fd.append("photo_recto", rectoFile);
      if (versoFile) fd.append("photo_verso", versoFile);

      await apiClient.post("documents", fd);
      await fetchDocs();
      setSubmitting(false);
      setShowAddModal(false);
      setShowSuccess(true);
      resetForm();
      setTimeout(() => setShowSuccess(false), 4000);
    } catch {
      setSubmitting(false);
    }
  }

  function openViewModal(doc: Document) {
    setSelectedDoc(doc);
    setShowViewModal(true);
  }

  function openShareModal(doc: Document) {
    setSelectedDoc(doc);
    setShowShareModal(true);
  }

  async function handleDelete(doc: Document) {
    setSelectedDoc(doc);
    setShowDeleteModal(true);
  }

  async function confirmDelete() {
    if (!selectedDoc) return;
    await remove(selectedDoc.id);
    setShowDeleteModal(false);
  }

  async function handleLostModalClose() {
    setShowLostModal(false);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 5000);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] pt-0 md:pt-6">
        <Loader color="gold" size="lg" />
      </div>
    );
  }

  const R = (props: { children: React.ReactNode }) => (
    <span className="text-red-500 ml-0.5">*</span>
  );

  const FilterTab = ({ id, label }: { id: string; label: string }) => (
    <button
      onClick={() => setFilterCat(id)}
      className={`tab-filter ${filterCat === id ? "active" : ""}`}
    >
      {label} {id === "all" && `(${docs.length})`}
    </button>
  );

  const catLabelsT = Object.fromEntries(
    docTypes.map((dt) => [dt.code, dt.nom])
  );

  return (
    <div className="flex flex-col h-full">
      <div className="main-content custom-scroll p-4 sm:p-6 flex flex-col gap-5 pb-[calc(6rem+max(env(safe-area-inset-bottom),0.75rem))] md:pb-[calc(2rem+max(env(safe-area-inset-bottom),0.75rem))] max-md:h-[calc(100vh-134px)] md:h-[calc(100vh-64px)] overflow-y-auto">

        {/* Info banner */}
        {showBanner && (
          <Paper withBorder p="md" radius="md" style={{ background: "rgba(217,138,48,0.08)", borderColor: "rgba(217,138,48,0.2)" }}>
            <Group gap="sm" align="flex-start" wrap="nowrap">
              <Paper style={{ background: "rgba(217,138,48,0.15)", width: 36, height: 36, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <i className="fa-solid fa-shield-halved text-primary text-sm" />
              </Paper>
              <div style={{ flex: 1 }}>
                <Text fz={13.5} fw={700}>{t("mesdocuments_banner_title")}</Text>
                <Text size="sm" c="dimmed">{t("mesdocuments_banner_desc")}</Text>
              </div>
              <i className="fa-solid fa-xmark text-sm" style={{ cursor: "pointer", color: "var(--mantine-color-dimmed)" }} onClick={() => setShowBanner(false)} />
            </Group>
          </Paper>
        )}

        {/* Stats row */}
        <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="sm" className="max-sm:hidden">
          <Paper withBorder p="md" radius="md">
            <Paper style={{ background: "rgba(217,138,48,0.1)", width: 36, height: 36, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <i className="fa-solid fa-folder-open text-primary text-sm" />
            </Paper>
            <Text fz={24} fw={800} mt="sm" className="font-bricolage">{docs.length}</Text>
            <Text size="sm" c="dimmed" fw={500}>{t("mesdocuments_total_registered")}</Text>
          </Paper>
          <Paper withBorder p="md" radius="md">
            <Paper style={{ background: "#e6f7ed", width: 36, height: 36, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <i className="fa-solid fa-shield-check text-green-mid text-sm" />
            </Paper>
            <Text fz={24} fw={800} mt="sm" className="font-bricolage">{verifiedCount}</Text>
            <Text size="sm" c="dimmed" fw={500}>{t("mesdocuments_verified")}</Text>
          </Paper>
          <Paper withBorder p="md" radius="md">
            <Paper style={{ background: "#fef3c7", width: 36, height: 36, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <i className="fa-solid fa-clock text-amber-500 text-sm" />
            </Paper>
            <Text fz={24} fw={800} mt="sm" className="font-bricolage">{pendingCount}</Text>
            <Text size="sm" c="dimmed" fw={500}>{t("mesdocuments_pending")}</Text>
          </Paper>
          <Paper withBorder p="md" radius="md">
            <Paper style={{ background: "#eff6ff", width: 36, height: 36, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <i className="fa-solid fa-cloud-arrow-up text-blue-500 text-sm" />
            </Paper>
            <Text fz={24} fw={800} mt="sm" className="font-bricolage">94%</Text>
            <Text size="sm" c="dimmed" fw={500}>{t("mesdocuments_profile_completed")}</Text>
          </Paper>
        </SimpleGrid>

        {/* Filters + search */}
        <Group gap="sm" wrap="wrap">
          <TextInput
            placeholder={t("mesdocuments_search_placeholder")}
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
            leftSection={<i className="fa-solid fa-search text-xs" />}
            style={{ flex: 1, maxWidth: 320 }}
          />
          <Group gap="xs" wrap="wrap">
            <FilterTab id="all" label={t("mesdocuments_filter_all")} />
            {docTypes.map((dt) => (
              <FilterTab key={dt.code} id={dt.code} label={dt.nom} />
            ))}
            <FilterTab id="__archived" label={t("mesdocuments_filter_archived")} />
          </Group>
        </Group>

        {/* Documents grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card
            withBorder
            radius="lg"
            p="lg"
            style={{ borderStyle: "dashed", background: "#FAF7F2", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 180, gap: 12 }}
            onClick={() => {
              const fullName = [user?.prenom, user?.nom].filter(Boolean).join(" ") || "";
              setForm((prev) => ({ ...prev, name: fullName }));
              setShowAddModal(true);
            }}
          >
            <div className="w-12 h-12 rounded-2xl bg-primary/10 border-2 border-primary/25 flex items-center justify-center">
              <i className="fa-solid fa-plus text-primary text-xl" />
            </div>
            <div className="text-center">
              <Text fz={14} fw={700}>{t("mesdocuments_add_document")}</Text>
              <Text size="sm" c="dimmed">{t("mesdocuments_add_hint")}</Text>
            </div>
          </Card>

          {filtered.map((doc) => (
            <DocumentCard
              key={doc.id}
              doc={doc}
              catLabels={catLabelsT}
              onView={openViewModal}
              onShare={openShareModal}
              onDelete={handleDelete}
              onReportLost={(d) => { setSelectedDoc(d); setShowLostModal(true); }}
            />
          ))}
        </div>

        {/* Security notice */}
        <Paper withBorder p="md" radius="md">
          <Group gap="sm">
            <i className="fa-solid fa-lock text-green-mid text-lg flex-shrink-0" />
            <div>
              <Text fz={12.5} fw={700}>{t("mesdocuments_security_title")}</Text>
              <Text size="sm" c="dimmed">{t("mesdocuments_security_desc")}</Text>
            </div>
          </Group>
        </Paper>
      </div>

      {/* ── ADD DOCUMENT MODAL ── */}
      <Modal opened={showAddModal} onClose={closeAddModal} size="lg" padding="lg">
        <Title order={2} className="font-bricolage" fz={20} mb={2}>{t("mesdocuments_modal_title")}</Title>
        <Text size="sm" c="dimmed" mb="lg">{t("mesdocuments_step")} {step} {t("mesdocuments_of")} 3</Text>

        <Stepper active={step - 1} mb="xl" size="sm" allowNextStepsSelect={false}>
          <Stepper.Step label={t("mesdocuments_step_type")} />
          <Stepper.Step label={t("mesdocuments_step_info")} />
          <Stepper.Step label={t("mesdocuments_step_photos")} />
        </Stepper>

        {/* Step 1: Validity Option */}
        {step === 1 && (
          <div>
            <Text fw={600} mb="md">{t("mesdocuments_validity_option")}</Text>
            <Stack gap="md" mb="lg">
              <Card
                withBorder p="lg" radius="md"
                style={{
                  borderColor: validityOption === 'EXPIRING' ? "#E8923A" : undefined,
                  background: validityOption === 'EXPIRING' ? 'rgba(254,240,220,0.4)' : undefined,
                  cursor: "pointer",
                  transform: validityOption === 'EXPIRING' ? 'scale(1.01)' : undefined,
                  boxShadow: validityOption === 'EXPIRING' ? '0 8px 24px rgba(217,138,48,0.1)' : undefined,
                }}
                onClick={() => { setValidityOption('EXPIRING'); setSelectedType(null); }}
              >
                <Group gap="md">
                  <Paper style={{ width: 48, height: 48, borderRadius: 14, background: validityOption === 'EXPIRING' ? '#E8923A' : '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: validityOption === 'EXPIRING' ? 'white' : '#d97706' }}>
                    <i className="fa-solid fa-calendar-clock text-xl" />
                  </Paper>
                  <div style={{ flex: 1 }}>
                    <Group gap="sm">
                      <Radio checked={validityOption === 'EXPIRING'} />
                      <Text fz={15} fw={800}>{t("mesdocuments_option_expiring")}</Text>
                    </Group>
                    <Text size="sm" c="dimmed" mt={4} ml={28}>{t("mesdocuments_option_expiring_desc")}</Text>
                  </div>
                </Group>
              </Card>

              <Card
                withBorder p="lg" radius="md"
                style={{
                  borderColor: validityOption === 'PERMANENT' ? "#E8923A" : undefined,
                  background: validityOption === 'PERMANENT' ? 'rgba(254,240,220,0.4)' : undefined,
                  cursor: "pointer",
                  transform: validityOption === 'PERMANENT' ? 'scale(1.01)' : undefined,
                  boxShadow: validityOption === 'PERMANENT' ? '0 8px 24px rgba(217,138,48,0.1)' : undefined,
                }}
                onClick={() => { setValidityOption('PERMANENT'); setSelectedType(null); }}
              >
                <Group gap="md">
                  <Paper style={{ width: 48, height: 48, borderRadius: 14, background: validityOption === 'PERMANENT' ? '#E8923A' : '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: validityOption === 'PERMANENT' ? 'white' : '#2563eb' }}>
                    <i className="fa-solid fa-infinity text-xl" />
                  </Paper>
                  <div style={{ flex: 1 }}>
                    <Group gap="sm">
                      <Radio checked={validityOption === 'PERMANENT'} />
                      <Text fz={15} fw={800}>{t("mesdocuments_option_permanent")}</Text>
                    </Group>
                    <Text size="sm" c="dimmed" mt={4} ml={28}>{t("mesdocuments_option_permanent_desc")}</Text>
                  </div>
                </Group>
              </Card>
            </Stack>
            <Button onClick={() => goStep(2)} color="gold" fullWidth size="md" rightSection={<i className="fa-solid fa-arrow-right" />}>
              {t("mesdocuments_continue")}
            </Button>
          </div>
        )}

        {/* Step 2: Type + Info */}
        {step === 2 && (
          <div>
            <Select
              label={<>{t("mesdocuments_modal_choose_type")} <R /></>}
              data={[
                ...docTypes
                  .filter((dt) => dt.code !== "AUTRES")
                  .filter((dt) => validityOption === 'EXPIRING' ? (dt.delai_expiration_mois ?? 0) > 0 : (dt.delai_expiration_mois ?? 0) === 0)
                  .map((dt) => ({ value: dt.code, label: dt.nom })),
                { value: 'AUTRES', label: t("mesdocuments_custom_type") },
              ]}
              value={selectedType}
              onChange={(v) => {
                setSelectedType(v);
                setCustomTypeName("");
                const dt = docTypes.find((d) => d.code === v);
                if (form.issued && dt && (dt.delai_expiration_mois ?? 0) > 0) {
                  setForm((prev) => ({ ...prev, expiry: addMonths(prev.issued, dt.delai_expiration_mois) }));
                }
              }}
              placeholder={t("mesdocuments_choose_expiring_type")}
              searchable clearable mb="md"
            />

            {selectedType === 'AUTRES' && (
              <TextInput
                label={t("mesdocuments_custom_type")}
                value={customTypeName}
                onChange={(e) => setCustomTypeName(e.currentTarget.value)}
                placeholder={t("mesdocuments_custom_type_placeholder")}
                mb="md" autoFocus
              />
            )}

            <Stack gap="sm" mb="md">
              <TextInput
                label={<>{t("mesdocuments_full_name")} <R /></>}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.currentTarget.value })}
                placeholder={t("mesdocuments_placeholder_name")} required
              />
              <TextInput
                label={<>{t("mesdocuments_doc_number")} <R /></>}
                value={form.number}
                onChange={(e) => setForm({ ...form, number: e.currentTarget.value })}
                placeholder={t("mesdocuments_placeholder_number")} required
              />
              {hasExpiration ? (
                <Group gap="sm" grow>
                  <DatePicker value={form.issued} onChange={updateIssued} label={<>{t("mesdocuments_issue_date")} <R /></>} placeholder={t("mesdocuments_placeholder_date")} />
                  <DatePicker value={form.expiry} onChange={(v) => setForm({ ...form, expiry: v })} label={t("mesdocuments_expiry_date")} placeholder={t("mesdocuments_placeholder_date")} disabled={isAutoExpiry} />
                </Group>
              ) : (
                <DatePicker value={form.issued} onChange={(v) => setForm({ ...form, issued: v })} label={t("mesdocuments_issue_date")} placeholder={t("mesdocuments_placeholder_date")} />
              )}
              <TextInput
                label={t("mesdocuments_issuing_authority")}
                value={form.authority}
                onChange={(e) => setForm({ ...form, authority: e.currentTarget.value })}
                placeholder={t("mesdocuments_placeholder_authority")}
              />
            </Stack>

            <Group gap="sm" mt="lg">
              <Button variant="default" onClick={() => goStep(1)} leftSection={<i className="fa-solid fa-arrow-left" />}>
                {t("mesdocuments_back")}
              </Button>
              <Button
                color="gold" onClick={() => goStep(3)}
                disabled={!selectedType || (selectedType === 'AUTRES' && !customTypeName.trim()) || !form.name || !form.number || (hasExpiration && !form.issued) || (hasExpiration && !isAutoExpiry && !form.expiry)}
                rightSection={<i className="fa-solid fa-arrow-right" />}
              >
                {t("mesdocuments_continue")}
              </Button>
            </Group>
          </div>
        )}

        {/* Step 3: Photos + Confirm */}
        {step === 3 && (
          <div>
            <Stack gap="md" mb="lg">
              {/* Recto dropzone */}
              <div>
                <Text fw={500} size="sm" mb={4}>{t("mesdocuments_photo_recto")} <R /></Text>
                {rectoFile ? (
                  <Paper withBorder p="sm" radius="md">
                    <Group gap="sm">
                      <img src={URL.createObjectURL(rectoFile)} alt="recto" style={{ width: 64, height: 48, objectFit: "cover", borderRadius: 8 }} />
                      <div style={{ flex: 1 }}>
                        <Text size="sm" fw={600} truncate>{rectoFile.name}</Text>
                        <Text size="xs" c="dimmed">{(rectoFile.size / 1024).toFixed(0)} Ko</Text>
                      </div>
                      <Button variant="subtle" color="red" size="compact-xs" onClick={() => setRectoFile(null)}>
                        <i className="fa-solid fa-xmark" />
                      </Button>
                    </Group>
                  </Paper>
                ) : (
                  <Dropzone
                    openRef={rectoOpenRef}
                    onDrop={(files) => setRectoFile(files[0] || null)}
                    accept={IMAGE_MIME_TYPE}
                    maxSize={10 * 1024 ** 2}
                    radius="md"
                    p="lg"
                  >
                    <Group justify="center" gap="sm">
                      <Dropzone.Accept>
                        <i className="fa-solid fa-download text-xl" style={{ color: "var(--mantine-color-blue-6)" }} />
                      </Dropzone.Accept>
                      <Dropzone.Reject>
                        <i className="fa-solid fa-xmark text-xl" style={{ color: "var(--mantine-color-red-6)" }} />
                      </Dropzone.Reject>
                      <Dropzone.Idle>
                        <i className="fa-solid fa-cloud-arrow-up text-xl" style={{ color: "var(--mantine-color-dimmed)" }} />
                      </Dropzone.Idle>
                      <div>
                        <Text size="sm" fw={600}>{t("mesdocuments_drop_photo")}</Text>
                        <Text size="xs" c="dimmed">{t("mesdocuments_click_import")}</Text>
                      </div>
                    </Group>
                  </Dropzone>
                )}
              </div>

              {/* Verso dropzone */}
              <div>
                <Text fw={500} size="sm" mb={4}>{t("mesdocuments_photo_verso")} <Text span c="dimmed" fw={400} size="xs">— {t("mesdocuments_optional")}</Text></Text>
                {versoFile ? (
                  <Paper withBorder p="sm" radius="md">
                    <Group gap="sm">
                      <img src={URL.createObjectURL(versoFile)} alt="verso" style={{ width: 64, height: 48, objectFit: "cover", borderRadius: 8 }} />
                      <div style={{ flex: 1 }}>
                        <Text size="sm" fw={600} truncate>{versoFile.name}</Text>
                        <Text size="xs" c="dimmed">{(versoFile.size / 1024).toFixed(0)} Ko</Text>
                      </div>
                      <Button variant="subtle" color="red" size="compact-xs" onClick={() => setVersoFile(null)}>
                        <i className="fa-solid fa-xmark" />
                      </Button>
                    </Group>
                  </Paper>
                ) : (
                  <Dropzone
                    openRef={versoOpenRef}
                    onDrop={(files) => setVersoFile(files[0] || null)}
                    accept={IMAGE_MIME_TYPE}
                    maxSize={10 * 1024 ** 2}
                    radius="md"
                    p="lg"
                  >
                    <Group justify="center" gap="sm">
                      <Dropzone.Accept>
                        <i className="fa-solid fa-download text-xl" style={{ color: "var(--mantine-color-blue-6)" }} />
                      </Dropzone.Accept>
                      <Dropzone.Reject>
                        <i className="fa-solid fa-xmark text-xl" style={{ color: "var(--mantine-color-red-6)" }} />
                      </Dropzone.Reject>
                      <Dropzone.Idle>
                        <i className="fa-solid fa-cloud-arrow-up text-xl" style={{ color: "var(--mantine-color-dimmed)" }} />
                      </Dropzone.Idle>
                      <div>
                        <Text size="sm" fw={600}>{t("mesdocuments_drop_photo")}</Text>
                        <Text size="xs" c="dimmed">{t("mesdocuments_click_import")}</Text>
                      </div>
                    </Group>
                  </Dropzone>
                )}
              </div>
            </Stack>

            <Paper withBorder p="md" radius="md" mb="lg" style={{ background: "var(--mantine-color-bgMain)" }}>
              <Text fz={12} fw={700} c="dimmed" tt="uppercase" mb="md">{t("mesdocuments_summary")}</Text>
              <Stack gap="xs">
                {[
                  { label: t("mesdocuments_summary_name"), val: form.name },
                  { label: t("mesdocuments_summary_type"), val: selectedType === 'AUTRES' && customTypeName.trim() ? customTypeName.trim() : (docTypes.find(dt => dt.code === selectedType)?.nom || selectedType) },
                  { label: t("mesdocuments_summary_number"), val: form.number },
                  { label: t("mesdocuments_summary_validity"), val: validityOption === 'PERMANENT' ? t("mesdocuments_option_permanent") : t("mesdocuments_option_expiring") },
                  ...(validityOption === 'EXPIRING' ? [{ label: t("mesdocuments_summary_issued"), val: form.issued || "—" }, { label: t("mesdocuments_summary_expiry"), val: form.expiry || "—" }] : []),
                  { label: t("mesdocuments_summary_documents"), val: `${(rectoFile ? 1 : 0) + (versoFile ? 1 : 0)} ${t("mesdocuments_summary_files")}` },
                ].map((i) => (
                  <Group key={i.label} justify="space-between">
                    <Text size="sm" c="dimmed">{i.label}</Text>
                    <Text size="sm" fw={700}>{i.val}</Text>
                  </Group>
                ))}
              </Stack>
            </Paper>

            <Checkbox
              label={t("mesdocuments_consent")}
              checked={consent}
              onChange={(e) => setConsent(e.currentTarget.checked)}
              mb="lg"
            />

            <Group gap="sm">
              <Button variant="default" onClick={() => goStep(2)} leftSection={<i className="fa-solid fa-arrow-left" />}>
                {t("mesdocuments_back")}
              </Button>
              <Button
                color="green" onClick={handleSubmit}
                disabled={!consent || submitting}
                loading={submitting}
                leftSection={<i className="fa-solid fa-shield-halved" />}
              >
                {t("mesdocuments_save_secure")}
              </Button>
            </Group>
          </div>
        )}
      </Modal>

      {/* ── VIEW MODAL ── */}
      {showViewModal && selectedDoc && (
        <DocumentDetailModal
          doc={selectedDoc}
          catLabels={catLabelsT}
          onClose={() => setShowViewModal(false)}
          onShare={() => { setShowViewModal(false); setShowShareModal(true); }}
        />
      )}

      {/* ── SHARE MODAL ── */}
      {showShareModal && selectedDoc && (
        <ShareModal
          doc={selectedDoc}
          onClose={() => setShowShareModal(false)}
        />
      )}

      {/* ── DELETE MODAL ── */}
      <Modal opened={showDeleteModal} onClose={() => setShowDeleteModal(false)} size="sm" withCloseButton={false} padding="xl">
        <div className="text-center">
          <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mb-4 mx-auto">
            <i className="fa-solid fa-trash-can text-red-500 text-xl" />
          </div>
          <h3 className="font-bricolage text-lg font-bold text-textMain mb-2">{t("mesdocuments_confirm_delete_title")}</h3>
          <p className="text-[13.5px] text-textMuted mb-6 leading-relaxed">
            {t("mesdocuments_confirm_delete_desc")}
          </p>
          <div className="flex gap-3">
            <button onClick={() => setShowDeleteModal(false)}
              className="flex-1 py-2.5 rounded-[11px] bg-bgMain border border-borderMain text-textMain font-bold text-[13.5px] hover:border-textMain transition-colors">
              {t("mesdocuments_cancel")}
            </button>
            <button onClick={confirmDelete}
              className="flex-1 py-2.5 rounded-[11px] bg-red-500 text-white font-bold text-[13.5px] hover:bg-red-600 transition-all active:scale-[.98]">
              {t("mesdocuments_confirm_delete")}
            </button>
          </div>
        </div>
      </Modal>

      {/* ── LOST MODAL ── */}
      {showLostModal && selectedDoc && (
        <ReportLostModal
          doc={selectedDoc}
          onClose={handleLostModalClose}
        />
      )}

      {/* ── SUCCESS NOTIFICATION ── */}
      {showSuccess && (
        <div className="fixed bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-5 py-3 rounded-full flex items-center gap-3 shadow-2xl z-[100] animate-in fade-in slide-in-from-bottom-4">
          <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
            <i className="fa-solid fa-check text-[10px]" />
          </div>
          <span className="text-[13px] font-medium whitespace-nowrap">{t("mesdocuments_success_msg")}</span>
        </div>
      )}
    </div>
  );
}