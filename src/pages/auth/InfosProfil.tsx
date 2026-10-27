import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { authService } from "../../services/authService";
import { useI18n } from "../../context/I18nContext";
import { useTopbar } from "../../hooks/useTopbar";
import DatePicker from "../../components/ui/DatePicker";
import { todayISO } from "../../utils/dateHelpers";
import VipAvatar, { isVipUser } from "../../components/ui/VipBadge";
import type { UserProfile } from "../../types/api";
import {
  TextInput,
  PasswordInput,
  Select,
  Button,
  Text,
  Group,
  Stack,
  Alert,
  SimpleGrid,
  Modal,
  Box,
  Badge,
  Title,
  Paper,
  Divider,
} from "@mantine/core";

function resolvePhotoUrl(p: string | undefined | null): string {
  if (!p) return "";
  if (p.startsWith("http") || p.startsWith("data:")) return p;
  return "/" + p.replace(/^\//, "");
}

type NavKey = "profile" | "security";

export default function InfosProfil() {
  const { t, lang, setLanguage } = useI18n();
  const { user, updateUser, deleteAccount } = useAuth();
  const navigate = useNavigate();
  useTopbar(t("profil_title"), [
    { label: t("profil_breadcrumb_home"), href: "/dashboard" },
    { label: t("profil_breadcrumb_profile") },
  ]);

  const [activeNav, setActiveNav] = useState<NavKey>("profile");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  // Edit modes per section
  const [editingIdentity, setEditingIdentity] = useState(false);
  const [editingContact, setEditingContact] = useState(false);
  const [editingPreferences, setEditingPreferences] = useState(false);

  const [form, setForm] = useState({
    nom: "", prenom: "", email: "", telephone: "",
    ville: "", date_naissance: "", lieu_naissance: "", genre: "", currency: "XAF",
  });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);
  const [pwForm, setPwForm] = useState({ current: "", new: "", confirm: "" });
  const [pwSaving, setPwSaving] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    setForm({
      nom: user.nom || "", prenom: user.prenom || "", email: user.email || "",
      telephone: user.telephone || "", ville: user.ville || "",
      date_naissance: user.date_naissance || "", lieu_naissance: user.lieu_naissance || "",
      genre: user.genre || "", currency: user.currency || "XAF",
    });
    if (user.photo_url) setPhotoPreview(resolvePhotoUrl(user.photo_url));
  }, [user]);

  const isIncomplete = [form.telephone, form.ville, form.date_naissance, form.lieu_naissance]
    .some((v) => !v || String(v).trim() === "");

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setFeedback({ ok: false, msg: t("profil_photo_too_large") }); return; }
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setPhotoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSaveSection = async (fields: Partial<typeof form>) => {
    setFeedback(null);
    const merged = { ...form, ...fields };
    const validDate = merged.date_naissance && !isNaN(new Date(merged.date_naissance).getTime())
      ? merged.date_naissance : "";
    setSaving(true);
    try {
      let body: FormData | Partial<UserProfile>;
      if (photoFile) {
        const fd = new FormData();
        fd.append("nom", merged.nom.trim()); fd.append("prenom", merged.prenom.trim());
        fd.append("telephone", merged.telephone.trim()); fd.append("ville", merged.ville.trim());
        if (validDate) fd.append("date_naissance", validDate);
        fd.append("lieu_naissance", merged.lieu_naissance.trim());
        if (merged.genre) fd.append("genre", merged.genre);
        fd.append("currency", merged.currency); fd.append("photo_profile", photoFile);
        body = fd;
      } else {
        body = {
          nom: merged.nom.trim(), prenom: merged.prenom.trim(), telephone: merged.telephone.trim(),
          ville: merged.ville.trim(), ...(validDate ? { date_naissance: validDate } : {}),
          lieu_naissance: merged.lieu_naissance.trim(), genre: merged.genre || undefined,
          currency: merged.currency,
        };
      }
      const result = await authService.updateProfile(body);
      if (result.user) {
        updateUser(result.user); setPhotoFile(null);
        if (result.user.photo_url) setPhotoPreview(resolvePhotoUrl(result.user.photo_url));
        setFeedback({ ok: true, msg: t("profil_update_success") });
        setTimeout(() => setFeedback(null), 4000);
        return true;
      } else { setFeedback({ ok: false, msg: t("profil_update_error") }); return false; }
    } catch (err: any) {
      setFeedback({ ok: false, msg: err?.response?.data?.error || err?.response?.data?.message || t("profil_network_error") });
      return false;
    } finally { setSaving(false); }
  };

  const handleChangePw = async (e: React.FormEvent) => {
    e.preventDefault(); setFeedback(null);
    if (pwForm.new.length < 6) { setFeedback({ ok: false, msg: t("profil_password_length") }); return; }
    if (pwForm.new !== pwForm.confirm) { setFeedback({ ok: false, msg: t("profil_password_mismatch") }); return; }
    setPwSaving(true);
    try {
      const result = await authService.changePassword(pwForm.current, pwForm.new);
      if (result.success) {
        setPwForm({ current: "", new: "", confirm: "" });
        setFeedback({ ok: true, msg: t("profil_password_success") });
      } else { setFeedback({ ok: false, msg: result.message || t("profil_password_change_error") }); }
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      setFeedback({ ok: false, msg: err?.response?.data?.error || t("profil_password_change_error") });
    } finally { setPwSaving(false); }
  };

  const initials = user?.initial || "DM";

  const navItems: { key: NavKey; label: string; danger?: boolean }[] = [
    { key: "profile", label: "Profil" },
    { key: "security", label: "Sécurité" },
  ];

  // Edit button
  const EditBtn = ({ onClick }: { onClick: () => void }) => (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 text-xs font-medium text-textMuted border border-borderMain rounded-lg px-3 py-1.5 hover:bg-gray-50 transition-colors"
    >
      Modifier <i className="fa-solid fa-pen" />
    </button>
  );

  // Read-only field display
  const FieldDisplay = ({ label, value }: { label: string; value: string }) => (
    <div>
      <Text size="xs" c="dimmed" mb={4}>{label}</Text>
      <div className="px-3 py-2 rounded-lg border border-borderMain bg-white text-sm text-textMain min-h-[36px]">
        {value || <span className="text-textMuted">—</span>}
      </div>
    </div>
  );

  return (
    <div className="flex-1 overflow-y-auto bg-white">
      {/* Feedback */}
      {feedback && (
        <div className="px-8 pt-4">
          <Alert
            color={feedback.ok ? "green" : "red"}
            icon={<i className={`fa-solid ${feedback.ok ? "fa-check" : "fa-triangle-exclamation"}`} />}
            radius="md" variant="light" withCloseButton onClose={() => setFeedback(null)}
          >
            {feedback.msg}
          </Alert>
        </div>
      )}

      <div className="flex flex-row h-full">

        {/* ── Mobile nav (horizontal scrollable, hidden on sm+) ── */}
        <div className="sm:hidden flex flex-row overflow-x-auto border-b border-borderMain py-2 px-4 w-full bg-white shrink-0">
          {navItems.map((item) => (
            <button
              key={item.key}
              onClick={() => setActiveNav(item.key)}
              className={`shrink-0 text-sm px-3 py-1.5 rounded-lg mr-1 whitespace-nowrap transition-colors ${
                item.danger
                  ? activeNav === item.key
                    ? "text-red-500 font-semibold bg-red-50"
                    : "text-red-500 hover:bg-red-50"
                  : activeNav === item.key
                  ? "text-green-dark font-semibold border-b-2 border-green-dark"
                  : "text-textMuted hover:text-textMain hover:bg-gray-50"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* ── Left sidebar nav (hidden on mobile) ── */}
        <div className="hidden sm:flex flex-col w-56 shrink-0 border-r border-borderMain bg-white min-h-full px-4 py-8">
          <div className="flex flex-col gap-1">
            {navItems.map((item) => (
              <button
                key={item.key}
                onClick={() => setActiveNav(item.key)}
                className={`text-sm px-3 py-2 rounded-lg w-full text-left transition-colors ${
                  item.danger
                    ? "text-red-500 hover:bg-red-50"
                    : activeNav === item.key
                    ? "text-green-dark font-semibold border-l-2 border-green-dark pl-2"
                    : "text-textMuted px-3 hover:text-textMain hover:bg-gray-50"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Right content ── */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-8 bg-white">

          {/* ═══ ONGLET PROFILE ═══ */}
          {activeNav === "profile" && (
            <div className="space-y-0">

              {/* Header — Mon Profil */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-lg font-bold text-textMain">Mon Profil</h2>
                  <p className="text-sm text-textMuted">{form.email}</p>
                </div>
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  className="flex items-center gap-1.5 text-xs font-medium text-textMuted border border-borderMain rounded-lg px-3 py-1.5 hover:bg-gray-50 transition-colors"
                >
                  Modifier <i className="fa-solid fa-pen" />
                </button>
              </div>

              {/* Avatar row */}
              <div className="flex items-center gap-4 mb-2">
                <Box style={{ position: "relative", flexShrink: 0 }}>
                  <VipAvatar isVip={isVipUser(user)}>
                    <div className="w-[72px] h-[72px] rounded-full bg-white flex items-center justify-center overflow-hidden border border-borderMain">
                      {photoPreview
                        ? <img src={photoPreview} className="w-full h-full object-cover" alt="photo" />
                        : <span className="text-2xl font-bold text-primary">{initials}</span>}
                    </div>
                  </VipAvatar>
                  <label
                    htmlFor="photo-input"
                    className="absolute -bottom-1 -right-1 w-6 h-6 bg-white rounded-full shadow-sm border border-borderMain flex items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors"
                  >
                    <i className="fa-solid fa-camera text-[9px] text-textMuted" />
                    <input
                      ref={photoInputRef}
                      id="photo-input"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handlePhotoChange}
                    />
                  </label>
                </Box>
                <div className="min-w-0">
                  <p className="font-bold text-textMain text-base">{form.prenom} {form.nom}</p>
                  <p className="text-xs text-textMuted">{form.email}</p>
                  {form.ville && <p className="text-xs text-textMuted">{form.ville}</p>}
                  <div className="flex flex-wrap gap-1 mt-1">
                    {user?.subscription ? (
                      <Badge color={user.subscription.status === "active" ? "green" : "red"} variant="light" radius="xl" size="xs">
                        <i className="fa-solid fa-crown mr-1 text-[9px]" />{user.subscription.plan_name}
                      </Badge>
                    ) : (
                      <Badge color="gray" variant="light" radius="xl" size="xs">{t("sidebar_plan_standard")}</Badge>
                    )}
                    {isIncomplete && (
                      <Badge color="orange" variant="light" radius="xl" size="xs">
                        <i className="fa-solid fa-circle-exclamation mr-1 text-[9px]" />Incomplet
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {photoFile && (
                <div className="mb-4">
                  <Button
                    size="xs" radius="xl" style={{ backgroundColor: "#2D5A42" }}
                    loading={saving}
                    onClick={() => handleSaveSection({}).then((ok) => ok && setPhotoFile(null))}
                    leftSection={<i className="fa-solid fa-floppy-disk text-xs" />}
                  >
                    Enregistrer la photo
                  </Button>
                </div>
              )}

              <hr className="border-borderMain my-6" />

              {/* Section — Informations personnelles */}
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-bold text-textMuted uppercase tracking-wider">Informations personnelles</p>
                <EditBtn onClick={() => setEditingIdentity(!editingIdentity)} />
              </div>

              {editingIdentity ? (
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  const ok = await handleSaveSection({});
                  if (ok) setEditingIdentity(false);
                }}>
                  <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
                    <TextInput label={t("profil_label_firstname")} value={form.prenom} onChange={(e) => setForm({ ...form, prenom: e.target.value })} required radius="xl" size="sm" />
                    <TextInput label={t("profil_label_lastname")} value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} required radius="xl" size="sm" />
                    <TextInput
                      label={t("profil_label_email")} value={form.email} readOnly radius="xl" size="sm"
                      rightSection={<i className="fa-solid fa-lock text-textMuted text-xs" />}
                      styles={{ input: { backgroundColor: "#F9F9F9", cursor: "not-allowed" } }}
                    />
                    <TextInput label={t("profil_label_phone")} value={form.telephone} onChange={(e) => setForm({ ...form, telephone: e.target.value })} radius="xl" size="sm" />
                    <Select
                      label="Genre" value={form.genre} placeholder="Sélectionner"
                      onChange={(val) => setForm({ ...form, genre: val || "" })}
                      data={[{ value: "HOMME", label: "Homme" }, { value: "FEMME", label: "Femme" }, { value: "AUTRE", label: "Autre" }]}
                      radius="xl" size="sm" clearable
                    />
                    <div>
                      <Text size="xs" fw={500} mb={4}>{t("profil_label_birthdate")}</Text>
                      <DatePicker value={form.date_naissance} onChange={(v) => setForm({ ...form, date_naissance: v })} className="w-full" placeholder={t("profil_placeholder_date")} maxDate={todayISO()} />
                    </div>
                  </SimpleGrid>
                  <Group gap="sm" mt="md">
                    <Button type="submit" loading={saving} radius="xl" size="sm" style={{ backgroundColor: "#2D5A42" }} leftSection={<i className="fa-solid fa-floppy-disk text-xs" />}>
                      {t("profil_save")}
                    </Button>
                    <Button type="button" variant="default" radius="xl" size="sm" onClick={() => setEditingIdentity(false)}>
                      Annuler
                    </Button>
                  </Group>
                </form>
              ) : (
                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
                  <FieldDisplay label={t("profil_label_firstname")} value={form.prenom} />
                  <FieldDisplay label={t("profil_label_lastname")} value={form.nom} />
                  <FieldDisplay label={t("profil_label_email")} value={form.email} />
                  <FieldDisplay label={t("profil_label_phone")} value={form.telephone} />
                </SimpleGrid>
              )}

              <hr className="border-borderMain my-6" />

              {/* Section — Localisation & Identité */}
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-bold text-textMuted uppercase tracking-wider">Localisation &amp; Identité</p>
                <EditBtn onClick={() => setEditingContact(!editingContact)} />
              </div>

              {editingContact ? (
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  const ok = await handleSaveSection({});
                  if (ok) setEditingContact(false);
                }}>
                  <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
                    <TextInput label={t("profil_label_city")} value={form.ville} onChange={(e) => setForm({ ...form, ville: e.target.value })} radius="xl" size="sm" />
                    <TextInput label={t("profil_label_birthplace")} value={form.lieu_naissance} onChange={(e) => setForm({ ...form, lieu_naissance: e.target.value })} radius="xl" size="sm" />
                    <div>
                      <Text size="xs" fw={500} mb={4}>{t("profil_label_birthdate")}</Text>
                      <DatePicker value={form.date_naissance} onChange={(v) => setForm({ ...form, date_naissance: v })} className="w-full" placeholder={t("profil_placeholder_date")} maxDate={todayISO()} />
                    </div>
                    <Select
                      label="Genre" value={form.genre} placeholder="Sélectionner"
                      onChange={(val) => setForm({ ...form, genre: val || "" })}
                      data={[{ value: "HOMME", label: "Homme" }, { value: "FEMME", label: "Femme" }, { value: "AUTRE", label: "Autre" }]}
                      radius="xl" size="sm" clearable
                    />
                  </SimpleGrid>
                  <Group gap="sm" mt="md">
                    <Button type="submit" loading={saving} radius="xl" size="sm" style={{ backgroundColor: "#2D5A42" }} leftSection={<i className="fa-solid fa-floppy-disk text-xs" />}>
                      {t("profil_save")}
                    </Button>
                    <Button type="button" variant="default" radius="xl" size="sm" onClick={() => setEditingContact(false)}>
                      Annuler
                    </Button>
                  </Group>
                </form>
              ) : (
                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
                  <FieldDisplay label={t("profil_label_city")} value={form.ville} />
                  <FieldDisplay label={t("profil_label_birthplace")} value={form.lieu_naissance} />
                  <FieldDisplay label={t("profil_label_birthdate")} value={form.date_naissance ? new Date(form.date_naissance).toLocaleDateString("fr-FR") : ""} />
                  <FieldDisplay label="Genre" value={form.genre === "HOMME" ? "Homme" : form.genre === "FEMME" ? "Femme" : form.genre === "AUTRE" ? "Autre" : ""} />
                </SimpleGrid>
              )}

              <hr className="border-borderMain my-6" />

              {/* Section — Préférences */}
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-bold text-textMuted uppercase tracking-wider">Préférences</p>
                <EditBtn onClick={() => setEditingPreferences(!editingPreferences)} />
              </div>

              {editingPreferences ? (
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  const ok = await handleSaveSection({});
                  if (ok) setEditingPreferences(false);
                }}>
                  <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
                    <Select label={t("profil_label_currency")} value={form.currency} onChange={(val) => setForm({ ...form, currency: val || "XAF" })} data={[{ value: "XAF", label: t("profil_currency_xaf") }, { value: "EUR", label: t("profil_currency_eur") }, { value: "USD", label: t("profil_currency_usd") }]} radius="xl" size="sm" clearable={false} />
                    <Select label={t("profil_label_language")} value={lang} onChange={(val) => val && setLanguage(val)} data={[{ value: "fr", label: "Français" }, { value: "en", label: "English" }]} radius="xl" size="sm" clearable={false} />
                  </SimpleGrid>
                  <Group gap="sm" mt="md">
                    <Button type="submit" loading={saving} radius="xl" size="sm" style={{ backgroundColor: "#2D5A42" }} leftSection={<i className="fa-solid fa-floppy-disk text-xs" />}>
                      {t("profil_save")}
                    </Button>
                    <Button type="button" variant="default" radius="xl" size="sm" onClick={() => setEditingPreferences(false)}>
                      Annuler
                    </Button>
                  </Group>
                </form>
              ) : (
                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
                  <FieldDisplay label={t("profil_label_currency")} value={form.currency} />
                  <FieldDisplay label={t("profil_label_language")} value={lang === "fr" ? "Français" : "English"} />
                </SimpleGrid>
              )}

            </div>
          )}

          {/* ═══ ONGLET SÉCURITÉ ═══ */}
          {activeNav === "security" && (
            <div>
              <h2 className="text-lg font-bold text-textMain mb-1">Sécurité</h2>
              <p className="text-sm text-textMuted mb-6">Gérez votre mot de passe et la sécurité de votre compte.</p>

              {/* Mot de passe */}
              <p className="text-xs font-bold text-textMuted uppercase tracking-wider mb-4">Mot de passe</p>
              <Text size="sm" c="dimmed" mb="md">Mettez à jour votre mot de passe régulièrement pour sécuriser votre compte.</Text>
              <form onSubmit={handleChangePw}>
                <Stack gap="sm" maw={400}>
                  <PasswordInput label={t("profil_current_password")} value={pwForm.current} onChange={(e) => setPwForm({ ...pwForm, current: e.target.value })} required minLength={4} radius="xl" size="sm" />
                  <PasswordInput label={t("profil_new_password")} value={pwForm.new} onChange={(e) => setPwForm({ ...pwForm, new: e.target.value })} required minLength={6} radius="xl" size="sm" />
                  <PasswordInput label={t("profil_confirm_password")} value={pwForm.confirm} onChange={(e) => setPwForm({ ...pwForm, confirm: e.target.value })} required minLength={6} radius="xl" size="sm" />
                  <div>
                    <Button type="submit" loading={pwSaving} leftSection={<i className="fa-solid fa-key text-xs" />} radius="xl" size="sm" style={{ backgroundColor: "#2D5A42" }}>
                      {t("profil_update_password")}
                    </Button>
                  </div>
                </Stack>
              </form>

              <hr className="border-borderMain my-8" />

              {/* Zone de danger */}
              <p className="text-xs font-bold text-red-500 uppercase tracking-wider mb-2">{t("profil_danger_zone_title")}</p>
              <Text size="sm" c="dimmed" mb="md">{t("profil_danger_zone_desc")}</Text>
              <Button
                color="red" variant="light"
                leftSection={<i className="fa-solid fa-trash-can" />}
                radius="xl" size="sm"
                onClick={() => setShowDeleteConfirm(true)}
              >
                {t("profil_delete_account")}
              </Button>
              <Text size="xs" c="dimmed" mt="sm">
                Cette action est irréversible. Toutes vos données seront définitivement supprimées.
              </Text>
            </div>
          )}

        </div>
      </div>

      {/* Modal suppression */}
      {showDeleteConfirm && (
      <Modal
        opened
        onClose={() => setShowDeleteConfirm(false)}
        centered radius="xl" size="sm" padding="xl"
        title={
          <Stack align="center" gap="sm">
            <i className="fa-solid fa-triangle-exclamation text-red-500 text-3xl" />
            <div>
              <Title order={4} ta="center">{t("profil_delete_confirm_title")}</Title>
              <Text size="sm" c="dimmed" ta="center" mt={4}>{t("profil_delete_confirm_desc")}</Text>
            </div>
          </Stack>
        }
      >
        <Stack gap="sm">
          <Button
            color="red" fullWidth size="md" radius="xl" loading={deletingAccount}
            onClick={async () => {
              setDeletingAccount(true);
              const result = await deleteAccount();
              setDeletingAccount(false); setShowDeleteConfirm(false);
              if (result.success) navigate("/login", { replace: true });
            }}
          >
            {t("profil_delete_confirm_yes")}
          </Button>
          <Button variant="default" fullWidth size="md" radius="xl" disabled={deletingAccount} onClick={() => setShowDeleteConfirm(false)}>
            {t("profil_delete_confirm_cancel")}
          </Button>
        </Stack>
      </Modal>
      )}
    </div>
  );
}
