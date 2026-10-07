import { useState, useEffect, useCallback, useMemo } from "react";
import { Link, useSearchParams, useLocation } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { useI18n } from "../../context/I18nContext";
import { useTopbar } from "../../hooks/useTopbar";
import { useAuth } from "../../context/AuthContext";
import { declarationsService, documentTypesService } from "../../services/declarationsService";
import { API_BASE_URL } from "../../services/api";

import type { Declaration, DocTypeCatalog } from "../../types/api";
import { ProtectedDocumentImage } from "../../components/ui/ProtectedDocumentImage";
import {
  TextInput,
  Button,
  Card,
  Badge,
  Paper,
  Text,
  Title,
  Group,
  Stack,
  SimpleGrid,
  Skeleton,
  ActionIcon,
  ThemeIcon,
} from "@mantine/core";

const BACKEND_ROOT = API_BASE_URL.replace(/\/api\/?$/, "");

function getFullImageUrl(path: string | undefined): string {
  if (!path) return "";
  if (path.startsWith("http") || path.startsWith("data:")) return path;
  return `${BACKEND_ROOT}/${path.replace(/^\//, "")}`;
}

function formatDate(d: string | undefined): string {
  if (!d) return "";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

/** Recovery always uses the LOST declaration id, not the FOUND document id. */
function resolveLostDeclarationId(doc: ResultDoc, explicitLostId?: string): string {
  if (explicitLostId) return explicitLostId;
  const matches = (doc.matches as Array<{ lost_declaration_id?: string; status?: string }> | undefined) || [];
  const active = matches.find((m) => m.status && ["PENDING", "CONFIRMED", "MATCHED"].includes(m.status));
  return active?.lost_declaration_id || doc.id;
}

interface ResultDoc {
  id: string;
  owner_name?: string;
  date_trouvaille?: string;
  date_perte?: string;
  created_at?: string;
  ville?: string;
  photo_recto?: string;
  document_type?: string;
  doc_type?: string;
  docTypeInfo?: { nom: string };
  [key: string]: unknown;
}

export default function Rechercher() {
  const { t } = useI18n();
  useTopbar(t("rechercher_search_page"), [{ label: t("rechercher_search_page") }]);
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();

  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [results, setResults] = useState<ResultDoc[]>([]);
  const [loading, setLoading] = useState(false);
  const [docTypes, setDocTypes] = useState<DocTypeCatalog[]>([]);

  const docTypeMap = useMemo(() => {
    const map: Record<string, string> = {};
    docTypes.forEach((dt) => { map[dt.id] = dt.nom; if (dt.code) map[dt.code] = dt.nom; });
    return map;
  }, [docTypes]);

  const potentialIds = (location.state as { potentialIds?: string[]; lostDeclarationId?: string } | null)?.potentialIds;
  const lostDeclarationId = (location.state as { lostDeclarationId?: string } | null)?.lostDeclarationId;
  const isMatchView = !!potentialIds && potentialIds.length > 0;

  useEffect(() => {
    documentTypesService.getActive().then((res) => {
      if (res.success && res.data) setDocTypes(res.data);
    }).catch((e: any) => {
      console.error("[Rechercher] Failed to load doc types:", e);
    });
  }, []);

  useEffect(() => {
    if (potentialIds && potentialIds.length > 0) {
      setLoading(true);
      Promise.all(
        potentialIds.map((id: string) =>
          declarationsService.getById(id).then((res) => res.data).catch(() => null)
        )
      ).then((decls) => {
        setResults(decls.filter(Boolean) as ResultDoc[]);
      }).finally(() => setLoading(false));
    }
  }, []);

  const performSearch = useCallback(async (searchQuery: string) => {
    setLoading(true);
    try {
      const res = await declarationsService.searchPublic(searchQuery || "");
      const docs: ResultDoc[] = (res.data || []) as ResultDoc[];
      setResults(docs);

      const newUrl = searchQuery
        ? `?q=${encodeURIComponent(searchQuery)}`
        : window.location.pathname;
      window.history.replaceState({}, "", newUrl);
    } catch (e: any) {
      console.error("[Rechercher] performSearch error:", e?.response?.data || e);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Charger toutes les déclarations FOUND par défaut
  useEffect(() => {
    setLoading(true);
    declarationsService.searchPublic("") // On charge tout
      .then((res) => {
        if (res.data) setResults(res.data as ResultDoc[]);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSearch = () => performSearch(query.trim());

  const quickFilters = ["CNI", "Passeport", "Permis", "Diplôme"];

  return (
    <div className="flex flex-col h-full">

      <div className="custom-scroll p-4 sm:p-6 flex flex-col gap-5 pb-24 md:pb-6 max-md:h-[calc(100vh-134px)] md:h-[calc(100vh-64px)] overflow-y-auto">
        <div className="max-w-5xl mx-auto w-full space-y-6">
          {isMatchView ? (
            <Paper bg="yellow.0" bds="1px solid" bdcolor="yellow.3" p="md" radius="md">
              <Group gap="md" align="flex-start">
                <ThemeIcon color="yellow" size="xl" variant="light" radius="md">
                  <i className="fa-solid fa-magnifying-glass-chart text-lg" />
                </ThemeIcon>
                <div className="flex-1">
                  <Text fw={700} size="sm">{t("rechercher_matches_detected")}</Text>
                  <Text size="xs" c="dimmed" mt={2}>
                    {t("rechercher_matches_desc")} <strong>{t("rechercher_its_mine")}</strong> {t("rechercher_matches_desc2")}
                  </Text>
                </div>
                <Button
                  size="xs"
                  variant="outline"
                  color="yellow"
                  radius="xl"
                  leftSection={<i className="fa-solid fa-xmark" />}
                  onClick={() => navigate("/rechercher", { replace: true })}
                >
                  {t("rechercher_close")}
                </Button>
              </Group>
            </Paper>
          ) : (
            <Paper p="md" radius="md" withBorder>
              <Group gap="md" align="flex-start">
                <ThemeIcon color="yellow" size="lg" variant="light" radius="md">
                  <i className="fa-solid fa-shield-halved text-sm" />
                </ThemeIcon>
                <div>
                  <Text fw={700} size="sm">{t("rechercher_data_protection")}</Text>
                  <Text size="xs" c="dimmed" mt={2}>
                    {t("rechercher_data_protection_desc")}
                  </Text>
                </div>
              </Group>
            </Paper>
          )}

          {!isMatchView && (
            <Paper p="md" radius="xl" withBorder>
              <Group gap="sm">
                <TextInput
                  flex={1}
                  leftSection={<i className="fa-solid fa-magnifying-glass" />}
                  rightSection={
                    query ? (
                      <ActionIcon
                        variant="subtle"
                        color="red"
                        size="sm"
                        onClick={() => { setQuery(""); setResults([]); }}
                      >
                        <i className="fa-solid fa-circle-xmark" />
                      </ActionIcon>
                    ) : null
                  }
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  placeholder={t("rechercher_search_placeholder")}
                  radius="xl"
                  size="md"
                />
                <Button
                  onClick={handleSearch}
                  radius="xl"
                  size="md"
                  fw={700}
                  ff="Bricolage Grotesque"
                  style={{ backgroundColor: "#E8923A" }}
                >
                  {t("rechercher_search_btn")}
                </Button>
              </Group>

              <Group gap="xs" mt="md">
                <Text size="10px" fw={700} c="dimmed" tt="uppercase" tracking="widest">
                  {t("rechercher_quick_filters")} :
                </Text>
                {quickFilters.map((f) => (
                  <Badge
                    key={f}
                    variant="outline"
                    size="lg"
                    radius="xl"
                    style={{ cursor: "pointer", fontWeight: 500 }}
                    onClick={() => { setQuery(f); performSearch(f); }}
                    color="dark"
                  >
                    {f}
                  </Badge>
                ))}
              </Group>
            </Paper>
          )}

          {loading ? (
            <SimpleGrid cols={{ base: 1, md: 2, lg: 3 }} spacing="md">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i} radius="xl" withBorder overflow="hidden" p={0}>
                  <Skeleton height={176} />
                  <Stack p="md" gap="sm">
                    <Skeleton height={16} width="75%" />
                    <Skeleton height={12} width="50%" />
                    <Skeleton height={12} width="66%" />
                    <Skeleton height={36} radius="md" />
                  </Stack>
                </Card>
              ))}
            </SimpleGrid>
          ) : results.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Paper
                w={80}
                h={80}
                radius="xl"
                withBorder
                style={{
                  background: "var(--mantine-color-gray-0)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                mb="md"
              >
                <i className="fa-solid fa-magnifying-glass text-3xl text-textMuted" />
              </Paper>
              <Title order={4} ff="Bricolage Grotesque" mb="xs">
                {isMatchView ? t("rechercher_no_matches_loaded") : t("rechercher_no_results")}
              </Title>
              <Text size="sm" c="dimmed" maw={300} mb="lg">
                {isMatchView
                  ? t("rechercher_no_matches_desc")
                  : t("rechercher_no_results_desc_auth")}
              </Text>
              {!isMatchView && (
                <Button
                  component={Link}
                  to="/declarer"
                  radius="xl"
                  leftSection={<i className="fa-solid fa-file-circle-plus" />}
                  style={{ backgroundColor: "#E8923A" }}
                >
                  {t("rechercher_declare_loss")}
                </Button>
              )}
            </div>
          ) : (
            <SimpleGrid cols={{ base: 1, md: 2, lg: 3 }} spacing="md">
              {results.map((doc) => {
                const photoUrl = getFullImageUrl(doc.photo_recto);
                const displayName = typeof doc.owner_name === "string" ? doc.owner_name : t("rechercher_owner");
                const dateField = typeof doc.date_trouvaille === "string" ? doc.date_trouvaille : typeof doc.date_perte === "string" ? doc.date_perte : typeof doc.created_at === "string" ? doc.created_at : "";
                const loc = typeof doc.ville === "string" ? doc.ville : "";
                const docType = (() => {
                  const raw = doc.docTypeInfo;
                  if (raw && typeof raw === "object" && "nom" in raw && typeof (raw as Record<string, unknown>).nom === "string") return (raw as Record<string, unknown>).nom as string;
                  if (doc.doc_type && docTypeMap[doc.doc_type]) return docTypeMap[doc.doc_type];
                  if (doc.document_type && docTypeMap[doc.document_type]) return docTypeMap[doc.document_type];
                  return doc.document_type || doc.doc_type || t("rechercher_document");
                })();
                const showFull = isMatchView;

                return (
                  <Card key={doc.id} radius="xl" withBorder overflow="hidden" p={0}>
                    <div className="relative h-44 bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden">
                      <ProtectedDocumentImage
                        src={photoUrl || undefined}
                        revealed={showFull}
                        className="relative w-full h-full overflow-hidden"
                      />
                      <Badge
                        pos="absolute"
                        top={12}
                        left={12}
                        variant="light"
                        color="dark"
                        size="sm"
                        radius="xl"
                        leftSection={<i className="fa-solid fa-file-lines text-primary text-[9px]" />}
                      >
                        {docType}
                      </Badge>
                    </div>

                    <Stack p="md" gap="sm" style={{ flex: 1 }}>
                      <Group gap="xs">
                        <Text size="10px" fw={700} c="dimmed" tt="uppercase">{t("rechercher_owner_label")} :</Text>
                        <Text size="sm" fw={600}>{displayName}</Text>
                      </Group>
                      <Group gap="xs">
                        <Text size="10px" fw={700} c="dimmed" tt="uppercase">{t("rechercher_date_label")} :</Text>
                        <Text size="xs" fw={700} c="primary" ff="monospace">{formatDate(dateField)}</Text>
                      </Group>
                      {loc && (
                        <Group gap="xs">
                          <Text size="10px" fw={700} c="dimmed" tt="uppercase">{t("rechercher_location_label")} :</Text>
                          <Text size="xs" fw={500}>{loc}</Text>
                        </Group>
                      )}

                      <div className="mt-auto pt-3">
                        {showFull ? (
                          <Button
                            component={Link}
                            to={`/recuperer?id=${resolveLostDeclarationId(doc, lostDeclarationId)}${isMatchView ? `&found=${doc.id}` : ""}`}
                            fullWidth
                            radius="xl"
                            size="sm"
                            leftSection={<i className="fa-solid fa-hand-holding-heart" />}
                            style={{ backgroundColor: "#E8923A" }}
                          >
                            {t("rechercher_its_mine")}
                          </Button>
                        ) : (
                          <Button
                            component={Link}
                            to={`/declarer?from=${encodeURIComponent(doc.id)}`}
                            fullWidth
                            variant="outline"
                            radius="xl"
                            size="sm"
                            leftSection={<i className="fa-solid fa-file-circle-plus" />}
                          >
                            {t("rechercher_declare_to_see")}
                          </Button>
                        )}
                      </div>
                    </Stack>
                  </Card>
                );
              })}
            </SimpleGrid>
          )}
        </div>
      </div>
    </div>
  );
}
