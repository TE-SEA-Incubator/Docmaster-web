import { useState, useEffect, useRef, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import { declarationsService, documentTypesService } from "../../services/declarationsService";
import DatePicker from "../../components/ui/DatePicker";

import apiClient from "../../services/api";
import { useI18n } from "../../context/I18nContext";
import { useTopbar } from "../../hooks/useTopbar";
import { useToast } from "../../context/ToastContext";
import { useAuth } from "../../context/AuthContext";
import {
  Card,
  Group,
  Stack,
  Text,
  Title,
  Box,
  Button,
  TextInput,
  Textarea,
  ThemeIcon,
  Badge,
  ActionIcon,
  Progress,
  SimpleGrid,
  Container,
  Paper,
  Switch,
  NumberInput,
  Autocomplete,
  Loader,
  rem,
  useMantineTheme,
} from "@mantine/core";
import { useDisclosure, useMediaQuery, useDebouncedValue } from "@mantine/hooks";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import { usePageReady } from "../../hooks/usePageReady";
import SectionCard from "../../components/auth/Declarer/SectionCard";
import DocTypeCard from "../../components/auth/Declarer/DocTypeCard";
import UrgencyBadge from "../../components/auth/Declarer/UrgencyBadge";
import FieldLabel from "../../components/auth/Declarer/FieldLabel";
import DeclarerStepper from "../../components/auth/Declarer/DeclarerStepper";
import ConfirmDeclarationModal from "../../components/auth/Declarer/ConfirmDeclarationModal";
import SuccessDeclarationModal from "../../components/auth/Declarer/SuccessDeclarationModal";
import { DOC_META, PLACE_KEYS, type DocumentMetadata } from "../../components/auth/Declarer/docMeta";
import { addMonths } from "../../utils/dateHelpers";
import LocationSelect from "../../components/ui/LocationSelect";

interface DocTypeCatalog {
  id: string;
  code: string;
  nom: string;
  icone: string;
  is_active: boolean;
  delai_expiration_mois: number;
}

interface DocInstance {
  key: string;
  docId: string;
}

export default function Declarer() {
  const { t } = useI18n();
  useTopbar(t("declarer_title"), [{ label: t("nav_home"), href: "/dashboard" }, { label: t("declarer_breadcrumb") }]);
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const theme = useMantineTheme();
  const isMobile = useMediaQuery(`(max-width: ${theme.breakpoints.md})`);
  usePageReady();

  const [active, setActive] = useState(0);
  const [docTypes, setDocTypes] = useState<DocTypeCatalog[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastDeclarationRef, setLastDeclarationRef] = useState("");
  const [lastDeclarationId, setLastDeclarationId] = useState("");

  // Mantine disclosure hooks for mobile bottom-sheet modals
  const [confirmOpened, confirmHandlers] = useDisclosure(false);
  const [successOpened, successHandlers] = useDisclosure(false);
  const [bannerVisible, setBannerVisible] = useState(true);

  // Form states
  const [ownerType, setOwnerType] = useState<"me" | "other" | null>(null);
  const [selectedDocs, setSelectedDocs] = useState<DocInstance[]>([]);
  const instanceCounterRef = useRef(0);
  const [formData, setFormData] = useState<Record<string, any>>({});

  const MAX_DOCS = 5;

  // Custom states matching the HTML inputs
  const [lossDate, setLossDate] = useState("");
  const [lossTime, setLossTime] = useState("");
  const [location, setLocation] = useState<{ region: string; department: string; arrondissement: string }>({ region: "", department: "", arrondissement: "" });
  const [quartier, setQuartier] = useState("");
  const [lieuPrecis, setLieuPrecis] = useState("");
  const [circumstances, setCircumstances] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [urgencyLevel, setUrgencyLevel] = useState("medium");
  const [rewardEnabled, setRewardEnabled] = useState(false);
  const [rewardAmount, setRewardAmount] = useState<number | string>("");
  const [certified, setCertified] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // Instant place search (Nominatim / OpenStreetMap, no map)
  const [placeQuery, setPlaceQuery] = useState("");
  const [placeOptions, setPlaceOptions] = useState<string[]>([]);
  const [placeSearching, setPlaceSearching] = useState(false);
  const placeDetailsRef = useRef<Record<string, any>>({});
  const [debouncedPlaceQuery] = useDebouncedValue(placeQuery, 300);

  useEffect(() => {
    const q = debouncedPlaceQuery.trim();
    if (q.length < 3) {
      setPlaceOptions([]);
      return;
    }
    const ctrl = new AbortController();
    setPlaceSearching(true);
    fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&addressdetails=1&countrycodes=cm&limit=5`,
      { signal: ctrl.signal }
    )
      .then((res) => res.json())
      .then((data) => {
        const map: Record<string, any> = {};
        const options = (Array.isArray(data) ? data : []).map((item: any) => {
          map[item.display_name] = item;
          return item.display_name;
        });
        placeDetailsRef.current = map;
        setPlaceOptions(options);
      })
      .catch(() => {})
      .finally(() => setPlaceSearching(false));
    return () => ctrl.abort();
  }, [debouncedPlaceQuery]);

  const selectPlaceResult = (value: string) => {
    setPlaceQuery(value);
    const item = placeDetailsRef.current[value];
    if (!item) return;
    const addr = item.address || {};
    const city = addr.city || addr.town || addr.village || addr.municipality || "";
    if (city) {
      setVille(city);
      setFieldErrors((prev) => ({ ...prev, ville: "" }));
    }
    const quartier = addr.suburb || addr.quarter || addr.neighbourhood || addr.region || "";
    if (quartier) setQuartier(quartier);
    if (item.display_name) setLieuPrecis(item.display_name);
  };

  const formLeftRef = useRef<HTMLDivElement>(null);

  // Load document types on mount
  useEffect(() => {
    const loadDocTypes = async () => {
      try {
        const res = await documentTypesService.getActive();
        if (res.data) {
          setDocTypes(res.data);
        }
      } catch (error: any) {
        console.error("Failed to load document types:", error);
        toast.error(error.response?.data?.message || error.response?.data?.error || t("declarer_alert_error"));
      } finally {
        setLoading(false);
      }
    };
    loadDocTypes();
  }, []);

  // Clear field errors when step changes
  useEffect(() => {
    setFieldErrors({});
  }, [active]);

  const getDocMeta = (docId: string): DocumentMetadata => {
    const doc = docTypes.find((d) => d.id === docId);
    if (!doc) return DOC_META.autre;
    const code = doc.code.toLowerCase();
    return DOC_META[code] || DOC_META.autre;
  };

  const getDocIdOf = (instanceKey: string) => selectedDocs.find((s) => s.key === instanceKey)?.docId;

  const fillOwnerName = (docId: string, instanceKey: string) => {
    const fullName = ownerType === "me" ? [user?.prenom, user?.nom].filter(Boolean).join(" ").trim() : "";
    if (fullName) {
      const key = `titulaire_${instanceKey}`;
      setFormData((prevData) => ({ ...prevData, [key]: fullName }));
    }
  };

  const createInstanceKey = (docId: string) => `${docId}-${++instanceCounterRef.current}`;

  const toggleDocType = (docId: string) => {
    setSelectedDocs((prev) => {
      if (prev.some((s) => s.docId === docId)) return prev.filter((s) => s.docId !== docId);
      const key = createInstanceKey(docId);
      fillOwnerName(docId, key);
      return [...prev, { key, docId }];
    });
  };

  const addDocInstance = (docId: string) => {
    if (selectedDocs.length >= MAX_DOCS) {
      toast.warning(t("declarer_alert_max_docs"));
      return;
    }
    const key = createInstanceKey(docId);
    fillOwnerName(docId, key);
    setSelectedDocs((prev) => [...prev, { key, docId }]);
  };

  const removeDocInstance = (instanceKey: string) => {
    setSelectedDocs((prev) => prev.filter((s) => s.key !== instanceKey));
    setFormData((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((k) => {
        if (k.endsWith(`_${instanceKey}`)) delete next[k];
      });
      return next;
    });
    setFieldErrors((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((k) => {
        if (k.endsWith(`_${instanceKey}`)) delete next[k];
      });
      return next;
    });
  };

  const removeLastDocInstance = (docId: string) => {
    setSelectedDocs((prev) => {
      const instances = prev.filter((s) => s.docId === docId);
      if (instances.length === 0) return prev;
      const lastKey = instances[instances.length - 1].key;
      return prev.filter((s) => s.key !== lastKey);
    });
  };

  const updateFormField = (instanceKey: string, fieldId: string, value: string) => {
    const key = `${fieldId}_${instanceKey}`;
    setFormData((prev) => {
      const next = { ...prev, [key]: value };
      if (fieldId === "date_delivrance" && value) {
        const docId = getDocIdOf(instanceKey);
        const doc = docTypes.find((d) => d.id === docId);
        const expMoins = doc?.delai_expiration_mois ?? 0;
        if (expMoins > 0) {
          const expKey = `date_expiration_${instanceKey}`;
          next[expKey] = addMonths(value, expMoins);
        }
      }
      return next;
    });
  };

  const getFormValue = (instanceKey: string, fieldId: string, defaultValue = ""): string => {
    const key = `${fieldId}_${instanceKey}`;
    return formData[key] ?? defaultValue;
  };

  const nextStep = () => {
    if (active < 4) setActive((cur) => cur + 1);
    if (formLeftRef.current) formLeftRef.current.scrollTop = 0;
  };

  const prevStep = () => {
    if (active > 0) setActive((cur) => cur - 1);
    if (formLeftRef.current) formLeftRef.current.scrollTop = 0;
  };

  const validateCurrentStep = (): boolean => {
    if (active === 0 && !ownerType) {
      toast.warning(t("declarer_alert_select_owner"));
      return false;
    }
    if (active === 1 && selectedDocs.length === 0) {
      toast.warning(t("declarer_alert_select_document"));
      return false;
    }
    if (active === 2) {
      const errors: Record<string, string> = {};
      for (const inst of selectedDocs) {
        const meta = getDocMeta(inst.docId);
        const docType = docTypes.find((d) => d.id === inst.docId);
        const expMoins = docType?.delai_expiration_mois ?? 0;
        const hasExp = expMoins > 0;
        for (const field of meta.fields) {
          if (field.optional) continue;
          if (hasExp && field.id === "date_expiration") continue;
          const val = getFormValue(inst.key, field.id);
          if (!val || !val.trim()) {
            errors[field.id + "_" + inst.key] = t("declarer_field_required");
          }
        }
        if (hasExp && !meta.fields.some((f) => f.id === "date_delivrance")) {
          const val = getFormValue(inst.key, "date_delivrance");
          if (!val || !val.trim()) {
            errors["date_delivrance_" + inst.key] = t("declarer_field_required");
          }
        }
      }
      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors);
        return false;
      }
      setFieldErrors({});
      return true;
    }
    if (active === 3) {
      const errors: Record<string, string> = {};
      if (!lossDate || !lossDate.trim()) errors.lossDate = t("declarer_field_required");
      if (!location.department) errors.ville = t("declarer_field_required");
      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors);
        return false;
      }
      setFieldErrors({});
      return true;
    }
    if (active === 4) {
      const errors: Record<string, string> = {};
      if (!contactPhone || !contactPhone.trim()) errors.contactPhone = t("declarer_field_required");
      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors);
        return false;
      }
      setFieldErrors({});
      return true;
    }
    return true;
  };

  const handleNext = () => {
    if (validateCurrentStep()) {
      nextStep();
    }
  };

  const selectPlace = (place: string) => {
    setLieuPrecis(place);
  };

  const getUrgencyDescription = () => {
    switch (urgencyLevel) {
      case "low":
        return t("declarer_urgency_low");
      case "high":
        return t("declarer_urgency_high");
      default:
        return t("declarer_urgency_medium");
    }
  };

  const validateAndSubmit = async () => {
    if (!password.trim()) {
      setPasswordError(true);
      return;
    }

    for (const inst of selectedDocs) {
      const docNum = getFormValue(inst.key, "numero");
      if (docNum && !/\d/.test(docNum)) {
        toast.warning(t("declarer_alert_num_digit_prefix") + t(getDocMeta(inst.docId).label) + t("declarer_alert_num_digit_suffix"));
        setSubmitting(false);
        confirmHandlers.close();
        return;
      }
    }

    const numberByDocId: Record<string, Set<string>> = {};
    for (const inst of selectedDocs) {
      const docNum = (getFormValue(inst.key, "numero") || "").toLowerCase().replace(/[^a-z0-9]/g, "");
      if (!docNum) continue;
      if (!numberByDocId[inst.docId]) numberByDocId[inst.docId] = new Set();
      if (numberByDocId[inst.docId].has(docNum)) {
        toast.warning(t("declarer_alert_duplicate_number"));
        setSubmitting(false);
        confirmHandlers.close();
        return;
      }
      numberByDocId[inst.docId].add(docNum);
    }

    if (lossDate) {
      const d = new Date(lossDate);
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      if (d > today) {
        toast.warning(t("declarer_alert_future_date"));
        setSubmitting(false);
        confirmHandlers.close();
        return;
      }
    }

    setPasswordError(false);
    confirmHandlers.close();
    setSubmitting(true);

    try {
      let createdRefs: string[] = [];
      let lastId = "";

      for (const inst of selectedDocs) {
        const meta = getDocMeta(inst.docId);

        // Build document fields
        const ownerName = getFormValue(inst.key, "titulaire");
        const docNum = getFormValue(inst.key, "numero");
        const birthDate = getFormValue(inst.key, "date_naissance") || undefined;
        const delivranceDate = getFormValue(inst.key, "date_delivrance") || undefined;
        const expiryDate = getFormValue(inst.key, "date_expiration") || undefined;

        const fd = new FormData();
        fd.append("doc_type", inst.docId);
        fd.append("owner_name", ownerName || t("declarer_owner_unknown"));
        if (docNum) fd.append("document_number", docNum);
        fd.append("ville", (location.arrondissement || location.department) || t("declarer_not_specified"));
        if (quartier) fd.append("quartier", quartier);
        fd.append("region", location.region || t("declarer_region_centre"));
        if (location.department) fd.append("department", location.department);
        if (location.arrondissement) fd.append("arrondissement", location.arrondissement);
        fd.append("pays", t("declarer_country_cameroon"));
        if (lossDate) fd.append("date_perte", lossDate);
        if (delivranceDate) fd.append("date_delivrance", delivranceDate);
        if (expiryDate) fd.append("date_expiration", expiryDate);
        if (birthDate) fd.append("date_naissance", birthDate);
        if (circumstances) fd.append("description", circumstances);
        fd.append("etat_physique", "bon");
        const urgencyMap: Record<string, string> = { low: "Basse", medium: "Modérée", high: "Haute" };
        fd.append("urgence_niveau", urgencyMap[urgencyLevel] || "Modérée");
        if (rewardEnabled && rewardAmount) fd.append("recompense_montant", String(parseInt(String(rewardAmount))));
        fd.append("mode_contact", contactPhone && contactPhone.replace(/\s/g, "").length > 4 ? "PHONE" : "EMAIL");
        if (contactPhone && contactPhone.replace(/\s/g, "").length > 4) fd.append("telephone_contact", contactPhone);
        if (contactEmail) fd.append("email_contact", contactEmail);

        const metadata: Record<string, string> = {};
        if (lieuPrecis) metadata["Lieu exact"] = lieuPrecis;
        if (lossTime) metadata["Heure de perte"] = lossTime;
        if (circumstances) metadata["Circonstances"] = circumstances;
        if (quartier) metadata["Quartier"] = quartier;
        if (Object.keys(metadata).length > 0) fd.append("metadata", JSON.stringify(metadata));

        const res = await declarationsService.createLost(fd);
        if (res.success && res.data) {
          createdRefs.push(res.data.identifiant_doc_dm || "DOC-XXXX");
          lastId = res.data.id;
        }
      }

      setLastDeclarationRef(createdRefs.join(", "));
      setLastDeclarationId(lastId);
      successHandlers.open();
    } catch (e: any) {
      const data = e.response?.data;
      if (data?.errors) {
        const details = Object.entries(data.errors)
          .map(([field, msgs]) => `${field}: ${(msgs as string[]).join(", ")}`)
          .join("\n");
        toast.error((data?.message || t("declarer_alert_validation_failed")) + "\n\n" + details);
      } else {
        toast.error(data?.message || t("declarer_alert_error"));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!lastDeclarationId) return;
    try {
      const res = await apiClient.get(`declarations/${lastDeclarationId}/pdf`, {
        responseType: "blob",
      });
      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `${t("declarer_pdf_prefix")}_${lastDeclarationRef}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (e: any) {
      console.error("Failed to download PDF:", e);
      const msg = e.response?.data?.message || e.response?.data?.error || t("declarer_alert_pdf_error");
      toast.error(msg);
    }
  };

  const resetForm = () => {
    setActive(0);
    setSelectedDocs([]);
    instanceCounterRef.current = 0;
    setFormData({});
    setOwnerType(null);
    setLossDate("");
    setLossTime("");
    setVille("");
    setQuartier("");
    setLieuPrecis("");
    setCircumstances("");
    setContactPhone("");
    setContactEmail("");
    setUrgencyLevel("medium");
    setRewardEnabled(false);
    setRewardAmount("");
    setCertified(false);
    setPassword("");
    successHandlers.close();
  };

  const ownerFullName = useMemo(
    () => [user?.prenom, user?.nom].filter(Boolean).join(" ").trim(),
    [user?.prenom, user?.nom]
  );

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <Box style={{ display: "flex", flexDirection: "column", height: "100%", background: "var(--color-bgMain)" }}>

      <Box
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          padding: isMobile ? rem(12) : rem(24),
        }}
      >
        {/* ─── Alert banner ─── */}
        {bannerVisible && (
          <Paper
            radius="lg"
            p="md"
            mb="md"
            style={{
              background: "linear-gradient(to right, var(--color-primary-light), #FFF8F0)",
              border: "1px solid rgba(217,138,48,0.3)",
            }}
          >
            <Group gap="sm" wrap="nowrap" align="flex-start">
              <ThemeIcon size="lg" radius="md" color="orange" variant="light">
                <i className="fa-solid fa-lightbulb" style={{ fontSize: 16 }} />
              </ThemeIcon>
              <Text component="div" size="sm" fw={600} c="dark.7" style={{ flex: 1, lineHeight: 1.5 }}>
                {t("declarer_banner")}{" "}
                <Badge size="sm" variant="default" color="gray" radius="sm" tt="uppercase" component="span">
                  {t("declarer_optional")}
                </Badge>{" "}
                {t("declarer_banner_suffix")}
              </Text>
              <ActionIcon variant="subtle" color="gray" onClick={() => setBannerVisible(false)} aria-label="Close">
                <i className="fa-solid fa-xmark" />
              </ActionIcon>
            </Group>
          </Paper>
        )}

        {/* ─── Mantine Stepper (mobile-friendly) ─── */}
        <DeclarerStepper active={active} isMobile={isMobile} onStepClick={setActive} />

        <SimpleGrid cols={{ base: 1, md: 5 }} spacing="md">
          {/* Form column on the left (3/5 on desktop), recap sidebar on the right (2/5) */}
          <Box style={{ display: "flex", flexDirection: "column", gap: 12, gridColumn: "span 4" }} ref={formLeftRef}>
            {/* ─── Left column: form steps ─── */}

            {/* STEP 1: Owner Selection */}
            {active === 0 && (
              <SectionCard
                stepNum={1}
                title={t("declarer_step1_title")}
                description={t("declarer_step1_desc")}
              >
                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                  {[
                    { value: "me" as const, icon: "fa-user-check", label: t("declarer_for_myself") },
                    { value: "other" as const, icon: "fa-users", label: t("declarer_for_other") },
                  ].map((opt) => (
                    <Card
                      key={opt.value}
                      component="button"
                      type="button"
                      onClick={() => {
                        setOwnerType(opt.value);
                        if (opt.value === "me") {
                          if (ownerFullName) {
                            selectedDocs.forEach((inst) => {
                              const key = `titulaire_${inst.key}`;
                              setFormData((prev) => ({ ...prev, [key]: ownerFullName }));
                            });
                          }
                          if (user?.email) setContactEmail(user.email);
                        }
                      }}
                      padding="lg"
                      radius="lg"
                      withBorder
                      style={{
                        cursor: "pointer",
                        textAlign: "center",
                        background: ownerType === opt.value ? "var(--color-primary-light)" : "white",
                        borderColor: ownerType === opt.value ? "var(--color-primary)" : "var(--color-borda)",
                        boxShadow: ownerType === opt.value ? "0 0 0 3px rgba(217,138,48,.18)" : undefined,
                      }}
                    >
                      <ThemeIcon
                        size={48}
                        radius="md"
                        color="orange"
                        variant={ownerType === opt.value ? "filled" : "light"}
                        mx="auto"
                        mb="sm"
                      >
                        <i className={`fa-solid ${opt.icon}`} style={{ fontSize: 22 }} />
                      </ThemeIcon>
                      <Text fw={600} c={ownerType === opt.value ? "orange.8" : "dark.6"}>
                        {opt.label}
                      </Text>
                    </Card>
                  ))}
                </SimpleGrid>
              </SectionCard>
            )}

            {/* STEP 2: Document Selection */}
            {active === 1 && (
              <SectionCard
                stepNum={2}
                title={t("declarer_step2_title")}
                description={t("declarer_step2_desc")}
              >
                <SimpleGrid cols={{ base: 2, xs: 3, sm: 4 }} spacing="xs">
                  {docTypes.map((doc) => {
                    const count = selectedDocs.filter((s) => s.docId === doc.id).length;
                    return (
                        <DocTypeCard
                          key={doc.id}
                          doc={doc}
                          selected={count > 0}
                          count={count}
                          onToggle={toggleDocType}
                          onAddMore={addDocInstance}
                          onRemoveMore={removeLastDocInstance}
                        />
                    );
                  })}
                </SimpleGrid>

                {selectedDocs.length > 0 && (
                  <Box mt="md" pt="md" style={{ borderTop: "1px solid var(--color-borda)" }}>
                    <Group gap="xs" mb="sm">
                      <Badge size="lg" color="orange" variant="filled" radius="xl">
                        {selectedDocs.length}
                      </Badge>
                      <Text size="sm" fw={700} c="dimmed">
                        {t("declarer_selected_docs")}
                      </Text>
                    </Group>
                    <Group gap="xs">
                      {selectedDocs.map((inst) => {
                        const doc = docTypes.find((d) => d.id === inst.docId);
                        const sameTypeCount = selectedDocs.filter((s) => s.docId === inst.docId).length;
                        const sameTypeIndex = selectedDocs.filter((s) => s.docId === inst.docId).findIndex((s) => s.key === inst.key) + 1;
                        return (
                          <Badge
                            key={inst.key}
                            color="green.9"
                            variant="filled"
                            radius="xl"
                            size="lg"
                            rightSection={
                              <i className="fa-solid fa-xmark" style={{ fontSize: 9, cursor: "pointer" }} onClick={() => removeDocInstance(inst.key)} />
                            }
                            leftSection={<i className={`fa-solid fa-${doc?.icone || "file"}`} style={{ fontSize: 9 }} />}
                            style={{ cursor: "pointer", textTransform: "none", paddingRight: 8 }}
                          >
                            {doc?.nom}
                            {sameTypeCount > 1 ? ` n°${sameTypeIndex}` : ""}
                          </Badge>
                        );
                      })}
                    </Group>
                  </Box>
                )}
              </SectionCard>
            )}

            {/* STEP 3: Document Details */}
            {active === 2 && (
              <SectionCard
                stepNum={3}
                title={t("declarer_step3_title")}
                description={t("declarer_step3_desc")}
              >
                {selectedDocs.length > 1 && (
                  <Group gap="xs" mb="md" p="xs" style={{ background: "var(--color-bgMain)", borderRadius: 12 }}>
                    <i className="fa-solid fa-layer-group" style={{ fontSize: 12, color: "var(--color-primary)" }} />
                    <Text size="xs" fw={600} c="dimmed">
                      {selectedDocs.length} {t("declarer_documents_selected")}
                    </Text>
                  </Group>
                )}

                <Stack gap="md">
                  {selectedDocs.map((inst, idx) => {
                    const meta = getDocMeta(inst.docId);
                    const doc = docTypes.find((d) => d.id === inst.docId);
                    const hexColor = meta.color || "#6B7280";
                    const expMoins = doc?.delai_expiration_mois ?? 0;
                    const hasExp = expMoins > 0;
                    const hasDateDelivranceField = meta.fields.some((f) => f.id === "date_delivrance");
                    const hasDateExpirationField = meta.fields.some((f) => f.id === "date_expiration");
                    const isComplete = getFormValue(inst.key, "titulaire") && getFormValue(inst.key, "numero");
                    const sameTypeCount = selectedDocs.filter((s) => s.docId === inst.docId).length;
                    const sameTypeIndex = selectedDocs.filter((s) => s.docId === inst.docId).findIndex((s) => s.key === inst.key) + 1;

                    return (
                      <Card key={inst.key} padding={0} radius="lg" withBorder style={{ borderColor: hexColor + "30" }}>
                        <Box p={isMobile ? "xs" : "md"}
                          style={{ background: hexColor + "0D", borderBottom: `1px solid ${hexColor}20`, borderTopLeftRadius: 12, borderTopRightRadius: 12 }}
                        >
                          <Group gap={isMobile ? "xs" : "sm"} wrap="nowrap">
                            <ThemeIcon size={isMobile ? 32 : 40} radius="md" color="orange" style={{ background: hexColor, color: "white" }}>
                              <i className={`fa-solid ${meta.icon}`} style={{ fontSize: isMobile ? 14 : 16 }} />
                            </ThemeIcon>
                            <Box style={{ flex: 1, minWidth: 0 }}>
                              <Text size={isMobile ? "xs" : "sm"} fw={700} style={{ color: hexColor, wordBreak: "break-word" }}>
                                {doc?.nom || t("declarer_document")}
                                {sameTypeCount > 1 ? ` n°${sameTypeIndex}` : ""}
                              </Text>
                              <Text size={isMobile ? "10px" : "xs"} c="dimmed">
                                {t("declarer_document")} {idx + 1} {t("declarer_of")} {selectedDocs.length}
                              </Text>
                            </Box>
                              <ActionIcon
                                variant="subtle"
                                color="red"
                                onClick={() => removeDocInstance(inst.key)}
                                aria-label={t("declarer_remove_document")}
                                title={t("declarer_remove_document")}
                                size={isMobile ? "sm" : "md"}
                              >
                                <i className="fa-solid fa-trash-can" style={{ fontSize: isMobile ? 12 : 13 }} />
                              </ActionIcon>
                              <Badge
                                size={isMobile ? "xs" : "sm"}
                                radius="xl"
                                variant="light"
                                color={isComplete ? "green" : "gray"}
                                leftSection={<i className={`fa-solid ${isComplete ? "fa-circle-check" : "fa-circle"}`} style={{ fontSize: isMobile ? 8 : 9 }} />}
                              >
                                {isComplete ? t("declarer_completed") : t("declarer_pending")}
                              </Badge>
                            </Group>
                          </Box>
                        <Box p={isMobile ? "xs" : "md"}>
                          <Stack gap={isMobile ? "xs" : "md"}>
                            {meta.fields.filter((f) => !(hasExp && f.id === "date_expiration")).map((field) => (
                              <Box key={field.id}>
                                <FieldLabel
                                  icon={field.icon}
                                  labelKey={field.label}
                                  required={!field.optional}
                                  optional={field.optional}
                                />
                                {field.type === "textarea" ? (
                                  <Textarea
                                    value={getFormValue(inst.key, field.id)}
                                    onChange={(e) => { updateFormField(inst.key, field.id, e.currentTarget.value); setFieldErrors((prev) => ({ ...prev, [field.id + "_" + inst.key]: "" })); }}
                                    placeholder={field.placeholder ? t(field.placeholder) : ""}
                                    minRows={3}
                                    error={fieldErrors[field.id + "_" + inst.key]}
                                    autosize
                                  />
                                ) : field.type === "date" ? (
                                  <DatePicker
                                    value={getFormValue(inst.key, field.id)}
                                    onChange={(v) => { updateFormField(inst.key, field.id, v); setFieldErrors((prev) => ({ ...prev, [field.id + "_" + inst.key]: "" })); }}
                                    placeholder={t("declarer_date_format")}
                                  />
                                ) : (
                                  <TextInput
                                    type={field.type}
                                    value={getFormValue(inst.key, field.id)}
                                    onChange={(e) => { updateFormField(inst.key, field.id, e.currentTarget.value); setFieldErrors((prev) => ({ ...prev, [field.id + "_" + inst.key]: "" })); }}
                                    placeholder={field.placeholder ? t(field.placeholder) : ""}
                                    error={fieldErrors[field.id + "_" + inst.key]}
                                    leftSection={field.icon ? <i className={`fa-solid ${field.icon}`} style={{ fontSize: 13, color: "var(--color-primary)" }} /> : undefined}
                                  />
                                )}
                              </Box>
                            ))}

                            {hasExp && !hasDateDelivranceField && (
                              <Box>
                                <FieldLabel icon="fa-calendar" labelKey="declarer_field_date_delivrance" required />
                                <DatePicker
                                  value={getFormValue(inst.key, "date_delivrance")}
                                  onChange={(v) => { updateFormField(inst.key, "date_delivrance", v); setFieldErrors((prev) => ({ ...prev, ["date_delivrance_" + inst.key]: "" })); }}
                                  placeholder={t("declarer_date_format")}
                                />
                                {fieldErrors["date_delivrance_" + inst.key] && (
                                  <Text size="xs" c="red" mt={4}>{fieldErrors["date_delivrance_" + inst.key]}</Text>
                                )}
                              </Box>
                            )}

                            {hasExp && (
                              <Box>
                                <FieldLabel icon="fa-calendar-check" labelKey="declarer_field_date_expiration" />
                                <DatePicker
                                  value={getFormValue(inst.key, "date_expiration")}
                                  onChange={() => { }}
                                  placeholder={t("declarer_date_format")}
                                  disabled
                                />
                              </Box>
                            )}
                          </Stack>
                        </Box>
                      </Card>
                    );
                  })}
                </Stack>
              </SectionCard>
            )}

            {/* STEP 4: Location & Date */}
            {active === 3 && (
              <SectionCard
                stepNum={4}
                title={t("declarer_step4_title")}
                description={t("declarer_step4_desc")}
              >
                <Stack gap="md">
                  <Box>
                    <FieldLabel icon="fa-magnifying-glass-location" labelKey="declarer_place_search" />
                    <Autocomplete
                      value={placeQuery}
                      onChange={setPlaceQuery}
                      data={placeOptions}
                      limit={6}
                      placeholder={t("declarer_placeholder_place_search")}
                      onOptionSubmit={selectPlaceResult}
                      filter={({ options }) => options}
                      nothingFound={
                        placeQuery.trim().length >= 3 && !placeSearching
                          ? t("declarer_place_no_results")
                          : undefined
                      }
                      rightSection={
                        placeSearching ? (
                          <Loader size="xs" />
                        ) : (
                          <i className="fa-solid fa-magnifying-glass" style={{ fontSize: 13, color: "var(--color-primary)" }} />
                        )
                      }
                    />
                    <Text size="xs" c="dimmed" mt={4}>
                      {t("declarer_place_search_hint")}
                    </Text>
                  </Box>

                  <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                    <Box>
                      <FieldLabel icon="fa-calendar-days" labelKey="declarer_loss_date" required />
                      <DatePicker
                        value={lossDate}
                        onChange={(v) => { setLossDate(v); setFieldErrors((prev) => ({ ...prev, lossDate: "" })); }}
                        placeholder={t("declarer_date_format")}
                      />
                      {fieldErrors.lossDate && <Text size="xs" c="red" mt={4}>{fieldErrors.lossDate}</Text>}
                    </Box>

                    <Box>
                      <FieldLabel icon="fa-clock" labelKey="declarer_loss_time" optional />
                      <TextInput
                        type="time"
                        value={lossTime}
                        onChange={(e) => setLossTime(e.currentTarget.value)}
                        leftSection={<i className="fa-regular fa-clock" style={{ fontSize: 13, color: "var(--color-primary)" }} />}
                      />
                    </Box>

                    <Box>
                      <FieldLabel icon="fa-city" labelKey="declarer_city" required />
                      <LocationSelect
                        value={location}
                        onChange={(val) => { setLocation(val); setFieldErrors((prev) => ({ ...prev, ville: "" })); }}
                        error={fieldErrors.ville}
                      />
                    </Box>

                    <Box>
                      <FieldLabel icon="fa-map-pin" labelKey="declarer_neighborhood" optional />
                      <TextInput
                        value={quartier}
                        onChange={(e) => setQuartier(e.currentTarget.value)}
                        placeholder={t("declarer_placeholder_neighborhood")}
                        leftSection={<i className="fa-solid fa-location-dot" style={{ fontSize: 13, color: "var(--color-primary)" }} />}
                      />
                    </Box>
                  </SimpleGrid>

                  <Box>
                    <FieldLabel icon="fa-map-location-dot" labelKey="declarer_exact_location" optional />
                    <TextInput
                      value={lieuPrecis}
                      onChange={(e) => setLieuPrecis(e.currentTarget.value)}
                      placeholder={t("declarer_placeholder_exact_location")}
                      leftSection={<i className="fa-solid fa-map-marker-alt" style={{ fontSize: 13, color: "var(--color-primary)" }} />}
                    />
                  </Box>

                  <Box>
                    <Text size="xs" fw={700} c="gray.6" mb="xs">
                      {t("declarer_quick_suggestions")}
                    </Text>
                    <Group gap="xs">
                      {PLACE_KEYS.map((place) => (
                        <Badge
                          key={place}
                          size="lg"
                          radius="xl"
                          variant={lieuPrecis === place ? "filled" : "light"}
                          color="orange"
                          onClick={() => selectPlace(place)}
                          style={{ cursor: "pointer", textTransform: "none" }}
                        >
                          {t(place)}
                        </Badge>
                      ))}
                    </Group>
                  </Box>

                  <Box>
                    <FieldLabel icon="fa-comment-dots" labelKey="declarer_circumstances" optional />
                    <Textarea
                      value={circumstances}
                      onChange={(e) => setCircumstances(e.currentTarget.value)}
                      placeholder={t("declarer_placeholder_circumstances")}
                      minRows={3}
                      autosize
                    />
                  </Box>
                </Stack>
              </SectionCard>
            )}

            {/* STEP 5: Contact */}
            {active === 4 && (
              <SectionCard
                stepNum={5}
                title={t("declarer_step5_title")}
                description={t("declarer_step5_desc")}
              >
                <Stack gap="md">
                  <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                    <Box>
                      <FieldLabel icon="fa-phone" labelKey="declarer_phone" required />
                      <PhoneInput
                        country={"cm"}
                        value={contactPhone}
                        onChange={(phone) => { setContactPhone(phone); setFieldErrors((prev) => ({ ...prev, contactPhone: "" })); }}
                        placeholder={t("declarer_placeholder_phone")}
                        enableSearch
                        searchPlaceholder="Rechercher un pays..."
                        containerStyle={{ width: "100%" }}
                        inputStyle={{
                          width: "100%",
                          height: "42px",
                          fontSize: "14px",
                          borderRadius: "12px",
                          border: fieldErrors.contactPhone ? "1px solid #e03131" : "1px solid var(--color-border, #eae3d8)",
                          background: "#fff",
                          color: "#1A1A1A",
                          paddingLeft: "56px",
                        }}
                        buttonStyle={{
                          borderRadius: "12px 0 0 12px",
                          border: fieldErrors.contactPhone ? "1px solid #e03131" : "1px solid var(--color-border, #eae3d8)",
                          borderRight: "none",
                          background: "#fff",
                        }}
                      />
                      {fieldErrors.contactPhone && (
                        <Text size="xs" color="red" mt={4}>{fieldErrors.contactPhone}</Text>
                      )}
                    </Box>

                    <Box>
                      <FieldLabel icon="fa-envelope" labelKey="declarer_email" optional />
                      <TextInput
                        type="email"
                        value={contactEmail}
                        onChange={(e) => setContactEmail(e.currentTarget.value)}
                        placeholder={t("declarer_placeholder_email")}
                        leftSection={<i className="fa-regular fa-envelope" style={{ fontSize: 13, color: "var(--color-primary)" }} />}
                      />
                    </Box>
                  </SimpleGrid>

                  <Box>
                    <Text size="xs" fw={700} c="dimmed" tt="uppercase" mb="xs" style={{ letterSpacing: 0.4 }}>
                      <i className="fa-solid fa-gauge" style={{ fontSize: 11, color: "var(--color-primary)" }} /> {t("declarer_urgency_level")}
                    </Text>
                    <Group gap="xs" grow>
                      <UrgencyBadge level="low" label={t("declarer_urgency_low_btn")} color="green" icon="fa-circle" active={urgencyLevel === "low"} onSelect={setUrgencyLevel} />
                      <UrgencyBadge level="medium" label={t("declarer_urgency_medium_btn")} color="yellow" icon="fa-circle" active={urgencyLevel === "medium"} onSelect={setUrgencyLevel} />
                      <UrgencyBadge level="high" label={t("declarer_urgency_high_btn")} color="red" icon="fa-circle" active={urgencyLevel === "high"} onSelect={setUrgencyLevel} />
                    </Group>
                    <Text size="xs" c="dimmed" mt="xs">
                      {getUrgencyDescription()}
                    </Text>
                  </Box>

                  <Paper radius="lg" p="md" style={{ background: "var(--color-surface2)", border: "1px solid var(--color-borda)" }}>
                    <Group justify="space-between" align="flex-start" wrap="nowrap">
                      <Group gap="sm" align="flex-start" wrap="nowrap" style={{ flex: 1 }}>
                        <ThemeIcon size="md" color="orange" variant="light" radius="md">
                          <i className="fa-solid fa-coins" style={{ fontSize: 14 }} />
                        </ThemeIcon>
                        <Box style={{ flex: 1, minWidth: 0 }}>
                          <Group gap={6} mb={2}>
                            <Text size="sm" fw={700} c="dark.7">
                              {t("declarer_reward_title")}
                            </Text>
                            <Badge size="xs" variant="default" color="gray" radius="sm">{t("declarer_optional")}</Badge>
                          </Group>
                          <Text size="xs" c="gray.6">{t("declarer_reward_desc")}</Text>
                        </Box>
                      </Group>
                      <Switch
                        checked={rewardEnabled}
                        onChange={(e) => setRewardEnabled(e.currentTarget.checked)}
                        color="orange"
                        size="md"
                      />
                    </Group>
                    {rewardEnabled && (
                      <NumberInput
                        mt="md"
                        value={rewardAmount}
                        onChange={(v) => setRewardAmount(v)}
                        placeholder={t("declarer_placeholder_amount")}
                        min={0}
                        step={500}
                        leftSection={<i className="fa-solid fa-franc-sign" style={{ fontSize: 12 }} />}
                        rightSection={<Text size="xs" fw={700} c="dimmed">{t("declarer_fcfa")}</Text>}
                        rightSectionWidth={50}
                      />
                    )}
                  </Paper>
                </Stack>
              </SectionCard>
            )}
            


            {/* Step navigation (sticky on mobile) */}
            <Paper
              radius="lg"
              p="sm"
              withBorder
              style={{
                background: "white",
                position: "sticky",
                bottom: 0,
                zIndex: 10,
                boxShadow: "0 -4px 16px rgba(0,0,0,0.05)",
              }}
            >
              <Group justify="space-between" wrap="nowrap">
                <Button
                  variant="default"
                  radius="md"
                  onClick={prevStep}
                  disabled={active === 0}
                  leftSection={<i className="fa-solid fa-arrow-left" style={{ fontSize: 11 }} />}
                  size="sm"
                >
                  {t("declarer_previous")}
                </Button>
                <Text size="xs" fw={700} c="dimmed">
                  {t("declarer_step")} {active + 1} / 5
                </Text>
                {active < 4 ? (
                  <Button
                    color="dark"
                    radius="md"
                    onClick={handleNext}
                    rightSection={<i className="fa-solid fa-arrow-right" style={{ fontSize: 11 }} />}
                    size="sm"
                    styles={{ root: { background: "var(--color-green-dark)" } }}
                  >
                    {t("declarer_next")}
                  </Button>
                ) : (
                  <Button
                    color="dark"
                    radius="md"
                    onClick={confirmHandlers.open}
                    rightSection={<i className="fa-solid fa-circle-check" style={{ fontSize: 11 }} />}
                    size="sm"
                    styles={{ root: { background: "var(--color-green-dark)" } }}
                  >
                    {t("declarer_submit")}
                  </Button>
                )}
              </Group>
            </Paper>
          </Box>

          {/* ─── Right column: progression & recap (hidden on mobile) ─── */}
          <Box visibleFrom="md" style={{ display: "flex", flexDirection: "column", gap: 12, gridColumn: "span 1" }}>
            <Card padding="lg" radius="lg" withBorder style={{ background: "white" }}>
              <Title order={4} mb="md" style={{ fontFamily: "Bricolage Grotesque", fontSize: 14 }}>
                {t("declarer_progression")}
              </Title>
              <Progress.Root size="sm" radius="xl" style={{ background: "var(--color-bgMain)" }}>
                <Progress.Section value={(active + 1) * 20} color="orange" />
              </Progress.Root>
              <Stack gap={4} mt="md">
                {[
                  { num: 1, label: t("declarer_step_1") },
                  { num: 2, label: t("declarer_step_2") },
                  { num: 3, label: t("declarer_step_3") },
                  { num: 4, label: t("declarer_step_4") },
                  { num: 5, label: t("declarer_step_5") },
                ].map((s) => {
                  const isDone = active + 1 > s.num;
                  const isCurrent = active + 1 === s.num;
                  return (
                    <Group key={s.num} gap="sm" wrap="nowrap" py={4}>
                      <ThemeIcon
                        size={26}
                        radius="xl"
                        color={isDone ? "orange" : isCurrent ? "green.9" : "gray"}
                        variant={isDone || isCurrent ? "filled" : "outline"}
                      >
                        {isDone ? <i className="fa-solid fa-check" style={{ fontSize: 10 }} /> : <Text size="xs" fw={700}>{s.num}</Text>}
                      </ThemeIcon>
                      <Box>
                        <Text size="sm" fw={isCurrent ? 800 : 600} c={isCurrent ? "dark.7" : "gray.7"}>
                          {s.label}
                        </Text>
                        <Text size="xs" c="gray.5">
                          {isDone ? t("declarer_completed") : isCurrent ? t("declarer_in_progress") : t("declarer_pending")}
                        </Text>
                      </Box>
                    </Group>
                  );
                })}
              </Stack>
            </Card>

            <Card padding="lg" radius="lg" withBorder style={{ background: "linear-gradient(135deg, var(--color-green-dark), var(--color-green-mid))", color: "white" }}>
              <Title order={4} mb={4} c="white" style={{ fontFamily: "Bricolage Grotesque", fontSize: 14 }}>
                {t("declarer_summary")}
              </Title>
              <Text size="xs" c="rgba(255,255,255,0.5)" mb="sm">
                {t("declarer_documents_declared")}
              </Text>
              <Stack gap="xs">
                {selectedDocs.length === 0 ? (
                  <Text size="xs" c="rgba(255,255,255,0.4)" fs="italic">{t("declarer_none_selected")}</Text>
                ) : (
                  selectedDocs.map((inst) => {
                    const doc = docTypes.find((d) => d.id === inst.docId);
                    const sameTypeCount = selectedDocs.filter((s) => s.docId === inst.docId).length;
                    const sameTypeIndex = selectedDocs.filter((s) => s.docId === inst.docId).findIndex((s) => s.key === inst.key) + 1;
                    return (
                      <Group key={inst.key} gap="xs">
                        <i className={`fa-solid fa-${doc?.icone || "file"}`} style={{ fontSize: 12, color: "var(--color-primary)" }} />
                        <Text size="xs" fw={600} c="white">{doc?.nom}{sameTypeCount > 1 ? ` n°${sameTypeIndex}` : ""}</Text>
                      </Group>
                    );
                  })
                )}
              </Stack>
            </Card>

            <Card padding="lg" radius="lg" withBorder style={{ background: "white" }}>
              <Title order={4} mb="sm" style={{ fontFamily: "Bricolage Grotesque", fontSize: 14 }}>
                <i className="fa-solid fa-circle-info" style={{ color: "var(--color-primary)", marginRight: 8 }} />
                {t("declarer_useful_tips")}
              </Title>
              <Stack gap="xs">
                {[t("declarer_tip_1"), t("declarer_tip_2"), t("declarer_tip_3"), t("declarer_tip_4")].map((tip, i) => (
                  <Group key={i} gap="xs" align="flex-start" wrap="nowrap">
                    <i className="fa-solid fa-check" style={{ fontSize: 11, color: "var(--color-green-mid)", marginTop: 3, flexShrink: 0 }} />
                    <Text size="xs" c="dark.7" style={{ lineHeight: 1.5 }}>{tip}</Text>
                  </Group>
                ))}
              </Stack>
            </Card>
          </Box>
        </SimpleGrid>
      </Box>

      <ConfirmDeclarationModal
        opened={confirmOpened}
        isMobile={isMobile}
        password={password}
        passwordError={passwordError}
        submitting={submitting}
        onClose={() => { confirmHandlers.close(); setPasswordError(false); }}
        onPasswordChange={(v) => { setPassword(v); setPasswordError(false); }}
        onConfirm={validateAndSubmit}
      />

      <SuccessDeclarationModal
        opened={successOpened}
        isMobile={isMobile}
        refNumber={lastDeclarationRef}
        onDownloadPdf={handleDownloadPdf}
        onNewDeclaration={resetForm}
        onMyDeclarations={() => navigate("/mes-declarations")}
      />
    </Box>
  );
}
