import { useEffect, useState } from "react";
import {
  Button,
  Card,
  Checkbox,
  Col,
  Empty,
  Form,
  Input,
  Radio,
  Row,
  Select,
  Space,
  Steps,
  Tag,
  Typography,
  Upload,
  message,
} from "antd";
import {
  CameraOutlined,
  CheckCircleOutlined,
  ContactsOutlined,
  EnvironmentOutlined,
  FileProtectOutlined,
  PhoneOutlined,
  TagOutlined,
  UserOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { documentTypesService } from "../../services/declarationsService";
import type { DocTypeCatalog } from "../../types/api";
import { partenairesService } from "../../services/partenairesService";
import { useI18n } from "../../context/I18nContext";
import AntdLocationSelect from "../../components/ui/AntdLocationSelect";
import OsmStreetSearch from "../../components/ui/OsmStreetSearch";
import { partenairePalette } from "../../theme/partenaires";
import { phClass } from "../../utils/phosphorIcons";

interface LocationValue {
  region: string;
  department: string;
  arrondissement: string;
}

interface DocEntry {
  key: string;
  typeId: string;
  ownerName: string;
  docNum: string;
  dateExpiration: string;
  etat: string;
  details: string;
  fileRecto: File | null;
  fileVerso: File | null;
  previewRecto: string | null;
  previewVerso: string | null;
}

const MAX_DOCS = 5;

let entrySeq = 0;

const createDocEntry = (typeId: string): DocEntry => ({
  key: `${typeId}-${++entrySeq}`,
  typeId,
  ownerName: "",
  docNum: "",
  dateExpiration: "",
  etat: "bon",
  details: "",
  fileRecto: null,
  fileVerso: null,
  previewRecto: null,
  previewVerso: null,
});

export default function DeclarerTrouvaille() {
  const navigate = useNavigate();
  const { t, lang } = useI18n();
  const localeTag = lang === "ar" ? "ar" : lang === "en" ? "en" : "fr-FR";

  const [step, setStep] = useState(0);
  const [docTypes, setDocTypes] = useState<DocTypeCatalog[]>([]);
  const [docs, setDocs] = useState<DocEntry[]>([]);

  const [location, setLocation] = useState<LocationValue>({ region: "", department: "", arrondissement: "" });
  const [rue, setRue] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [dateFound, setDateFound] = useState<string>(new Date().toISOString().split("T")[0]);

  const [contactTel, setContactTel] = useState("");
  const [contactMode, setContactMode] = useState("PHONE");
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successRefs, setSuccessRefs] = useState<string[] | null>(null);

  useEffect(() => {
    documentTypesService.getActive().then((res) => {
      if (res.success && Array.isArray(res.data)) setDocTypes(res.data as DocTypeCatalog[]);
    });
  }, []);

  const isAutreType = (d: DocTypeCatalog) => d.code === "AUTRES" || d.id === "autre";

  const orderedDocTypes = [
    ...docTypes.filter((d) => !isAutreType(d)),
    ...(docTypes.some(isAutreType)
      ? docTypes.filter(isAutreType)
      : [{ id: "autre", code: "AUTRES", nom: t("partenaire_declarer_type_other"), icone: "circle-question", is_active: true, delai_expiration_mois: 0 }]),
  ];

  const findDocType = (id: string) => orderedDocTypes.find((d) => d.id === id) || null;

  const toggleType = (typeId: string) => {
    setDocs((prev) => {
      if (prev.some((doc) => doc.typeId === typeId)) {
        return prev.filter((doc) => doc.typeId !== typeId);
      }
      return prev.length >= MAX_DOCS ? prev : [...prev, createDocEntry(typeId)];
    });
  };

  const addDoc = (typeId: string) => {
    setDocs((prev) => (prev.length >= MAX_DOCS ? prev : [...prev, createDocEntry(typeId)]));
  };

  const removeDoc = (key: string) => setDocs((prev) => prev.filter((doc) => doc.key !== key));

  const minusDoc = (typeId: string) => {
    setDocs((prev) => {
      const sameType = prev.filter((doc) => doc.typeId === typeId);
      if (sameType.length === 0) return prev;
      const toRemove = sameType[sameType.length - 1].key;
      return prev.filter((doc) => doc.key !== toRemove);
    });
  };

  const updateDoc = (key: string, patch: Partial<DocEntry>) =>
    setDocs((prev) => prev.map((doc) => (doc.key === key ? { ...doc, ...patch } : doc)));

  const nextStep = () => {
    if (step === 0) {
      if (docs.length === 0) {
        message.warning(t("partenaire_declarer_warn_type_first"));
        return;
      }
    }
    if (step === 1) {
      const invalid = docs.find((doc) => doc.ownerName.trim().length < 2);
      if (invalid) {
        message.warning(t("partenaire_declarer_warn_owner"));
        return;
      }
    }
    if (step === 2) {
      if (!location.department) {
        message.warning(t("partenaire_declarer_warn_city"));
        return;
      }
      if (dateFound && new Date(dateFound) > new Date()) {
        message.warning(t("partenaire_declarer_warn_date_future"));
        return;
      }
    }
    setStep((s) => s + 1);
  };

  const handleFileSelect = (key: string, side: "recto" | "verso", file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      message.error(t("partenaire_declarer_err_image"));
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      updateDoc(key, {
        [side === "recto" ? "fileRecto" : "fileVerso"]: file,
        [side === "recto" ? "previewRecto" : "previewVerso"]: e.target?.result as string,
      });
    };
    reader.readAsDataURL(file);
  };

  const submitDeclaration = async () => {
    if (!consent) {
      message.warning(t("partenaire_declarer_warn_consent"));
      return;
    }
    if (docs.length === 0) {
      message.warning(t("partenaire_declarer_warn_type"));
      return;
    }
    if (!location.department) {
      message.warning(t("partenaire_declarer_warn_city_short"));
      return;
    }

    setSubmitting(true);

    const numberByType: Record<string, Set<string>> = {};
    for (const doc of docs) {
      const norm = (doc.docNum || "").toLowerCase().replace(/[^a-z0-9]/g, "");
      if (!norm) continue;
      if (!numberByType[doc.typeId]) numberByType[doc.typeId] = new Set();
      if (numberByType[doc.typeId].has(norm)) {
        message.warning(t("partenaire_declarer_warn_duplicate_number"));
        setSubmitting(false);
        return;
      }
      numberByType[doc.typeId].add(norm);
    }

    const autreCatalog = docTypes.find((d) => d.code === "AUTRES");
    const refs: string[] = [];
    const failures: string[] = [];

    for (const doc of docs) {
      const docType = findDocType(doc.typeId);
      const isAutre = doc.typeId === "autre" || docType?.code === "AUTRES";

      const formData = new FormData();
      formData.append("doc_type", isAutre ? (autreCatalog?.id || "AUTRES") : doc.typeId);
      formData.append("owner_name", doc.ownerName);
      if (doc.docNum.trim()) formData.append("document_number", doc.docNum.trim());
      formData.append("etat_physique", doc.etat);
      formData.append("ville", (location.arrondissement || location.department) || "");
      if (location.region) formData.append("region", location.region);
      if (location.department) formData.append("department", location.department);
      if (location.arrondissement) formData.append("arrondissement", location.arrondissement);
      formData.append("pays", "Cameroun");
      formData.append("date_perte", dateFound);
      if (doc.dateExpiration) formData.append("date_expiration", doc.dateExpiration);
      formData.append("mode_contact", contactMode);
      if (contactTel.trim()) formData.append("telephone_contact", contactTel.trim());
      if (doc.details.trim()) formData.append("description", doc.details.trim());
      if (rue.trim()) formData.append("quartier", rue.trim());
      if (coords) formData.append("found_location", JSON.stringify({ lat: coords.lat, lon: coords.lon }));
      if (doc.fileRecto) formData.append("photo_recto", doc.fileRecto);
      if (doc.fileVerso) formData.append("photo_verso", doc.fileVerso);

      try {
        const res = await partenairesService.createDeclaration(formData);
        const ref = res.data?.data?.identifiant_doc_dm;
        if (ref) refs.push(ref);
      } catch (err: any) {
        failures.push(doc.ownerName || docType?.nom || t("partenaire_declarer_summary_type"));
      }
    }

    setSubmitting(false);

    if (refs.length > 0) {
      setSuccessRefs(refs);
      message.success(t("partenaire_declarer_success_msg"));
    } else {
      message.error(t("partenaire_declarer_error_default"));
    }
  };

  if (successRefs !== null) {
    return (
      <div style={{ maxWidth: 560, margin: "40px auto" }}>
        <Card
          style={{ borderRadius: 10, border: `1px solid ${partenairePalette.border}`, textAlign: "center" }}
          styles={{ body: { padding: 32 } }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: partenairePalette.greenLight,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
            }}
          >
            <CheckCircleOutlined style={{ color: partenairePalette.success, fontSize: 26 }} />
          </div>
          <Typography.Title level={4} style={{ marginBottom: 4 }}>
            {t("partenaire_declarer_success_title")}
          </Typography.Title>
          <Typography.Paragraph type="secondary" style={{ fontSize: 13 }}>
            {successRefs.length > 1
              ? t("partenaire_declarer_success_desc_multi", { count: successRefs.length })
              : t("partenaire_declarer_success_desc")}
          </Typography.Paragraph>
          <div
            style={{
              background: partenairePalette.bgMain,
              border: `1px solid ${partenairePalette.border}`,
              borderRadius: 8,
              padding: "12px 16px",
              marginBottom: 20,
              textAlign: "left",
            }}
          >
            <Typography.Text style={{ fontSize: 11, color: partenairePalette.textMuted, display: "block", textTransform: "uppercase", fontWeight: 600, marginBottom: 8 }}>
              {t("partenaire_declarer_success_ref")}
            </Typography.Text>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {successRefs.map((ref) => (
                <Space key={ref} style={{ justifyContent: "space-between", width: "100%" }}>
                  <Typography.Text strong style={{ fontSize: 16, letterSpacing: 1 }}>
                    {ref}
                  </Typography.Text>
                  <Button
                    size="small"
                    type="text"
                    icon={<i className="ph ph-copy" />}
                    onClick={() => navigator.clipboard.writeText(ref)}
                  />
                </Space>
              ))}
            </div>
          </div>
          <div style={{ padding: "12px 16px", background: "#fff7e6", border: "1px solid #ffd591", borderRadius: 8, textAlign: "left", marginBottom: 24 }}>
            <Typography.Text style={{ fontSize: 12, color: "#d46b08" }}>
              <i className="ph ph-wallet" style={{ marginRight: 8 }} />
              {t("partenaire_declarer_success_reward")}
            </Typography.Text>
          </div>
          <Space>
            <Button
              onClick={() => {
                window.location.reload();
              }}
            >
              {t("partenaire_declarer_new")}
            </Button>
            <Button type="primary" onClick={() => navigate("/partenaire/declarations")}>
              {t("partenaire_declarer_view_declarations")}
            </Button>
          </Space>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <Card
        style={{ marginBottom: 16, borderRadius: 10, border: `1px solid ${partenairePalette.border}` }}
        styles={{ body: { padding: 16 } }}
      >
        <Steps
          current={step}
          size="small"
          items={[
            { title: t("partenaire_declarer_step_type"), icon: <TagOutlined /> },
            { title: t("partenaire_declarer_step_info"), icon: <UserOutlined /> },
            { title: t("partenaire_declarer_step_location"), icon: <EnvironmentOutlined /> },
            { title: t("partenaire_declarer_step_photos"), icon: <CameraOutlined /> },
            { title: t("partenaire_declarer_step_contact"), icon: <ContactsOutlined /> },
          ]}
        />
      </Card>

      {/* Étape 1 — Types de documents (sélection multiple) */}
      {step === 0 && (
        <Card style={{ borderRadius: 10, border: `1px solid ${partenairePalette.border}` }}>
          <Space style={{ width: "100%", justifyContent: "space-between", marginBottom: 12 }}>
            <Typography.Title level={5} style={{ margin: 0 }}>
              <TagOutlined style={{ color: partenairePalette.primary, marginRight: 8 }} />
              {t("partenaire_declarer_type_title")}
            </Typography.Title>
            <Tag color={docs.length >= MAX_DOCS ? "orange" : "blue"} style={{ fontSize: 12 }}>
              {docs.length}/{MAX_DOCS}
            </Tag>
          </Space>
          <Typography.Paragraph type="secondary" style={{ fontSize: 13, marginTop: 0 }}>
            {t("partenaire_declarer_type_hint")}
          </Typography.Paragraph>
          {orderedDocTypes.length === 0 ? (
            <Empty description={t("partenaire_declarer_type_empty")} />
          ) : (
            <Row gutter={[12, 12]}>
              {orderedDocTypes.map((d) => {
                const count = docs.filter((doc) => doc.typeId === d.id).length;
                const selected = count > 0;
                const disabled = !selected && docs.length >= MAX_DOCS;
                const addDisabled = docs.length >= MAX_DOCS;
                return (
                  <Col xs={12} sm={8} md={6} key={d.id}>
                    <div
                      onClick={() => {
                        if (disabled) {
                          message.info(t("partenaire_declarer_type_max"));
                          return;
                        }
                        toggleType(d.id);
                      }}
                      style={{
                        border: `2px solid ${selected ? partenairePalette.primary : partenairePalette.border}`,
                        background: selected ? partenairePalette.primaryLight : "#fff",
                        borderRadius: 10,
                        padding: "12px 8px",
                        textAlign: "center",
                        cursor: disabled ? "not-allowed" : "pointer",
                        opacity: disabled ? 0.5 : 1,
                        transition: "all .2s",
                        position: "relative",
                      }}
                    >
                      {selected && (
                        <CheckCircleOutlined
                          style={{ color: partenairePalette.primary, position: "absolute", top: 8, right: 8, fontSize: 16 }}
                        />
                      )}
                      {selected && count > 0 && (
                        <Tag color="blue" style={{ position: "absolute", top: 6, left: 6, fontSize: 10, margin: 0 }}>
                          ×{count}
                        </Tag>
                      )}
                      {selected && (
                        <Space style={{ position: "absolute", bottom: 8, right: 8 }}>
                          <Button
                            size="small"
                            shape="circle"
                            danger
                            onClick={(e) => {
                              e.stopPropagation();
                              minusDoc(d.id);
                            }}
                            title={t("partenaire_declarer_remove_another")}
                            style={{ width: 22, height: 22, fontSize: 11, lineHeight: 1, padding: 0 }}
                          >
                            -
                          </Button>
                          <Button
                            size="small"
                            shape="circle"
                            type="primary"
                            disabled={addDisabled}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (addDisabled) {
                                message.info(t("partenaire_declarer_type_max"));
                                return;
                              }
                              addDoc(d.id);
                            }}
                            title={t("partenaire_declarer_add_another")}
                            style={{ width: 22, height: 22, fontSize: 11, lineHeight: 1, padding: 0 }}
                          >
                            +
                          </Button>
                        </Space>
                      )}
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 8,
                          background: selected ? partenairePalette.primary : partenairePalette.greenLight,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          margin: "0 auto 8px",
                        }}
                      >
                        <i className={`${phClass(d.icone || "file-lines")}`} style={{ color: selected ? "#fff" : partenairePalette.primary, fontSize: 16 }} />
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: partenairePalette.textMain }}>{d.nom}</div>
                      {(d.delai_expiration_mois ?? 0) > 0 ? (
                        <Tag color="orange" style={{ fontSize: 10, marginTop: 6 }}>
                          {t("partenaire_declarer_type_has_expiry")}
                        </Tag>
                      ) : (
                        <Tag color="green" style={{ fontSize: 10, marginTop: 6 }}>
                          {t("partenaire_declarer_type_no_expiry")}
                        </Tag>
                      )}
                    </div>
                  </Col>
                );
              })}
            </Row>
          )}
          <Button type="primary" block style={{ marginTop: 24, height: 40 }} onClick={nextStep} disabled={docs.length === 0}>
            {t("partenaire_declarer_continue")} <i className="ph ph-arrow-right ml-1" style={{ fontSize: 11 }} />
          </Button>
        </Card>
      )}

      {/* Étape 2 — Informations par document */}
      {step === 1 && (
        <Card style={{ borderRadius: 10, border: `1px solid ${partenairePalette.border}` }}>
          <Typography.Title level={5}>
            <UserOutlined style={{ color: partenairePalette.primary, marginRight: 8 }} />
            {t("partenaire_declarer_info_title")}
          </Typography.Title>
          {docs.map((doc, idx) => {
            const docType = findDocType(doc.typeId);
            const sameTypeCount = docs.filter((d) => d.typeId === doc.typeId).length;
            const sameTypeIndex = docs.filter((d) => d.typeId === doc.typeId).findIndex((d) => d.key === doc.key) + 1;
            const label = sameTypeCount > 1 ? `${docType?.nom || ""} n°${sameTypeIndex}` : docType?.nom || "";
            return (
              <Card
                key={doc.key}
                size="small"
                style={{ borderRadius: 10, marginBottom: 12, border: `1px solid ${partenairePalette.border}` }}
                title={
                  <Space>
                    <Tag color="blue">{idx + 1}</Tag>
                    <Typography.Text strong>{label}</Typography.Text>
                  </Space>
                }
                extra={
                  <Button
                    size="small"
                    type="text"
                    danger
                    icon={<i className="ph ph-trash" />}
                    onClick={() => removeDoc(doc.key)}
                    title={t("partenaire_declarer_remove_doc")}
                  />
                }
              >
                <Form layout="vertical" requiredMark={false}>
                  <Row gutter={12}>
                    <Col span={12}>
                      <Form.Item label={t("partenaire_declarer_owner_label")}>
                        <Input
                          placeholder={t("partenaire_declarer_owner_placeholder")}
                          value={doc.ownerName}
                          onChange={(e) => updateDoc(doc.key, { ownerName: e.target.value })}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item label={t("partenaire_declarer_doc_number_label")}>
                        <Input placeholder={t("partenaire_declarer_doc_number_placeholder")} value={doc.docNum} onChange={(e) => updateDoc(doc.key, { docNum: e.target.value })} />
                      </Form.Item>
                    </Col>
                  </Row>

                  {docType && (docType.delai_expiration_mois ?? 0) > 0 && (
                    <Form.Item label={t("partenaire_declarer_expiry_label")}>
                      <Input type="date" value={doc.dateExpiration} onChange={(e) => updateDoc(doc.key, { dateExpiration: e.target.value })} />
                    </Form.Item>
                  )}

                  <Form.Item label={t("partenaire_declarer_state_label")}>
                    <Radio.Group value={doc.etat} onChange={(e) => updateDoc(doc.key, { etat: e.target.value })}>
                      <Space wrap>
                        <Radio.Button value="bon">
                          <i className="ph ph-check-circle" style={{ color: "#16a34a", marginRight: 6 }} />
                          {t("partenaire_declarer_state_good")}
                        </Radio.Button>
                        <Radio.Button value="moyen">
                          <i className="ph ph-warning" style={{ color: "#f59e0b", marginRight: 6 }} />
                          {t("partenaire_declarer_state_mid")}
                        </Radio.Button>
                        <Radio.Button value="abime">
                          <i className="ph ph-x-circle" style={{ color: "#ef4444", marginRight: 6 }} />
                          {t("partenaire_declarer_state_damaged")}
                        </Radio.Button>
                      </Space>
                    </Radio.Group>
                  </Form.Item>

                  <Form.Item label={t("partenaire_declarer_details_label")}>
                    <Input.TextArea
                      rows={2}
                      placeholder={t("partenaire_declarer_details_placeholder")}
                      value={doc.details}
                      onChange={(e) => updateDoc(doc.key, { details: e.target.value })}
                    />
                  </Form.Item>
                </Form>
              </Card>
            );
          })}
          <Space style={{ width: "100%", justifyContent: "space-between" }}>
            <Button onClick={() => setStep(0)}>{t("partenaire_declarer_back")}</Button>
            <Button type="primary" onClick={nextStep}>
              {t("partenaire_declarer_continue")} <i className="ph ph-arrow-right ml-1" style={{ fontSize: 11 }} />
            </Button>
          </Space>
        </Card>
      )}

      {/* Étape 3 — Localisation */}
      {step === 2 && (
        <Card style={{ borderRadius: 10, border: `1px solid ${partenairePalette.border}` }}>
          <Typography.Title level={5}>
            <EnvironmentOutlined style={{ color: partenairePalette.primary, marginRight: 8 }} />
            {t("partenaire_declarer_location_title")}
          </Typography.Title>
          <Form layout="vertical" requiredMark={false}>
            <Form.Item label={t("partenaire_declarer_location_label")} required>
              <AntdLocationSelect
                value={location}
                onChange={(val) => setLocation({ ...val })}
              />
            </Form.Item>
            <Form.Item label={t("partenaire_declarer_street_label")}>
              <OsmStreetSearch
                value={rue}
                onChange={(v) => setRue(v)}
                onCoordinates={(lat, lon) => setCoords({ lat, lon })}
                placeholder={t("partenaire_declarer_street_placeholder")}
              />
            </Form.Item>
            <Row gutter={12}>
              <Col span={12}>
                <Form.Item label={t("partenaire_declarer_found_date_label")} required>
                  <Input type="date" value={dateFound} onChange={(e) => setDateFound(e.target.value)} />
                </Form.Item>
              </Col>
            </Row>
          </Form>
          <Space style={{ width: "100%", justifyContent: "space-between" }}>
            <Button onClick={() => setStep(1)}>{t("partenaire_declarer_back")}</Button>
            <Button type="primary" onClick={nextStep}>
              {t("partenaire_declarer_continue")} <i className="ph ph-arrow-right ml-1" style={{ fontSize: 11 }} />
            </Button>
          </Space>
        </Card>
      )}

      {/* Étape 4 — Photos par document */}
      {step === 3 && (
        <Card style={{ borderRadius: 10, border: `1px solid ${partenairePalette.border}` }}>
          <Typography.Title level={5}>
            <CameraOutlined style={{ color: partenairePalette.primary, marginRight: 8 }} />
            {t("partenaire_declarer_photos_title")}
          </Typography.Title>
          {docs.map((doc, idx) => {
            const docType = findDocType(doc.typeId);
            const sameTypeCount = docs.filter((d) => d.typeId === doc.typeId).length;
            const sameTypeIndex = docs.filter((d) => d.typeId === doc.typeId).findIndex((d) => d.key === doc.key) + 1;
            const label = sameTypeCount > 1 ? `${docType?.nom || ""} n°${sameTypeIndex}` : docType?.nom || "";
            return (
              <Card
                key={doc.key}
                size="small"
                style={{ borderRadius: 10, marginBottom: 12, border: `1px solid ${partenairePalette.border}` }}
                title={
                  <Space>
                    <Tag color="blue">{idx + 1}</Tag>
                    <Typography.Text strong>{label}</Typography.Text>
                  </Space>
                }
              >
                <Row gutter={12}>
                  <Col span={12}>
                    <Form.Item label={t("partenaire_declarer_photo_front_label")}>
                      <Upload
                        beforeUpload={(file) => {
                          handleFileSelect(doc.key, "recto", file);
                          return false;
                        }}
                        maxCount={1}
                        onRemove={() => updateDoc(doc.key, { fileRecto: null, previewRecto: null })}
                        fileList={doc.fileRecto ? [{ uid: `recto-${doc.key}`, name: doc.fileRecto.name, status: "done" } as any] : []}
                        listType="picture-card"
                        style={{ width: "100%" }}
                      >
                        {!doc.previewRecto && (
                          <div style={{ fontSize: 12, color: partenairePalette.textMuted }}>
                            <UploadOutlined style={{ fontSize: 20, display: "block", marginBottom: 6 }} />
                            {t("partenaire_declarer_upload")}
                          </div>
                        )}
                      </Upload>
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item label={t("partenaire_declarer_photo_back_label")}>
                      <Upload
                        beforeUpload={(file) => {
                          handleFileSelect(doc.key, "verso", file);
                          return false;
                        }}
                        maxCount={1}
                        onRemove={() => updateDoc(doc.key, { fileVerso: null, previewVerso: null })}
                        fileList={doc.fileVerso ? [{ uid: `verso-${doc.key}`, name: doc.fileVerso.name, status: "done" } as any] : []}
                        listType="picture-card"
                      >
                        {!doc.previewVerso && (
                          <div style={{ fontSize: 12, color: partenairePalette.textMuted }}>
                            <UploadOutlined style={{ fontSize: 20, display: "block", marginBottom: 6 }} />
                            {t("partenaire_declarer_upload")}
                          </div>
                        )}
                      </Upload>
                    </Form.Item>
                  </Col>
                </Row>
              </Card>
            );
          })}
          <Space style={{ width: "100%", justifyContent: "space-between" }}>
            <Button onClick={() => setStep(2)}>{t("partenaire_declarer_back")}</Button>
            <Button type="primary" onClick={() => setStep(4)}>
              {t("partenaire_declarer_continue")} <i className="ph ph-arrow-right ml-1" style={{ fontSize: 11 }} />
            </Button>
          </Space>
        </Card>
      )}

      {/* Étape 5 — Contact & publication */}
      {step === 4 && (
        <Card style={{ borderRadius: 10, border: `1px solid ${partenairePalette.border}` }}>
          <Typography.Title level={5}>
            <PhoneOutlined style={{ color: partenairePalette.primary, marginRight: 8 }} />
            {t("partenaire_declarer_contact_title")}
          </Typography.Title>
          <Form layout="vertical" requiredMark={false}>
            <Row gutter={12}>
              <Col span={12}>
                <Form.Item label={t("partenaire_declarer_contact_phone_label")}>
                  <Input
                    placeholder={t("partenaire_declarer_contact_phone_placeholder")}
                    value={contactTel}
                    onChange={(e) => setContactTel(e.target.value)}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label={t("partenaire_declarer_contact_mode_label")}>
                  <Select
                    value={contactMode}
                    onChange={setContactMode}
                    options={[
                      { value: "PHONE", label: t("partenaire_declarer_contact_phone") },
                      { value: "APP_CHAT", label: t("partenaire_declarer_contact_chat") },
                    ]}
                  />
                </Form.Item>
              </Col>
            </Row>
          </Form>

          <div
            style={{
              background: partenairePalette.bgMain,
              border: `1px solid ${partenairePalette.border}`,
              borderRadius: 8,
              padding: "12px 16px",
              marginBottom: 16,
            }}
          >
            <Typography.Text style={{ fontSize: 11, color: partenairePalette.textMuted, textTransform: "uppercase", fontWeight: 600, display: "block", marginBottom: 8 }}>
              {t("partenaire_declarer_summary")}
            </Typography.Text>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 12 }}>
              {docs.map((doc, idx) => {
                const docType = findDocType(doc.typeId);
                const typeLabel = docType?.nom || "—";
                const sameTypeCount = docs.filter((d) => d.typeId === doc.typeId).length;
                const sameTypeIndex = docs.filter((d) => d.typeId === doc.typeId).findIndex((d) => d.key === doc.key) + 1;
                const label = sameTypeCount > 1 ? `${typeLabel} n°${sameTypeIndex}` : typeLabel;
                return (
                  <div key={doc.key} style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                    <Typography.Text type="secondary">
                      {t("partenaire_declarer_summary_doc", { n: idx + 1 })} — {label}
                    </Typography.Text>
                    <Typography.Text strong>{doc.ownerName || "—"}</Typography.Text>
                  </div>
                );
              })}
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <Typography.Text type="secondary">{t("partenaire_declarer_summary_location")}</Typography.Text>
                <Typography.Text strong>{(location.arrondissement || location.department) || "—"}</Typography.Text>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <Typography.Text type="secondary">{t("partenaire_declarer_summary_date")}</Typography.Text>
                <Typography.Text strong>
                  {dateFound ? new Date(dateFound).toLocaleDateString(localeTag) : "—"}
                </Typography.Text>
              </div>
            </div>
          </div>

          <Checkbox checked={consent} onChange={(e) => setConsent(e.target.checked)} style={{ marginBottom: 16 }}>
            {t("partenaire_declarer_consent")}
          </Checkbox>

          <div style={{ padding: "10px 14px", background: "#fff7e6", border: "1px solid #ffd591", borderRadius: 8, fontSize: 12, color: "#d46b08", marginBottom: 20 }}>
            <FileProtectOutlined style={{ marginRight: 8 }} />
            {t("partenaire_declarer_reward_note")}
          </div>

          <Space style={{ width: "100%", justifyContent: "space-between" }}>
            <Button onClick={() => setStep(3)} disabled={submitting}>
              {t("partenaire_declarer_back")}
            </Button>
            <Button type="primary" loading={submitting} onClick={submitDeclaration} style={{ background: partenairePalette.success, height: 40, paddingInline: 32 }}>
              {submitting ? t("partenaire_declarer_publishing") : t("partenaire_declarer_publish")}
            </Button>
          </Space>
        </Card>
      )}
    </div>
  );
}
