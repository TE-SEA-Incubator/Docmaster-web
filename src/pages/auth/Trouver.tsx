import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { declarationsService, documentTypesService } from "../../services/declarationsService";
import Topbar from "../../layout/Topbar";
import { useI18n } from "../../context/I18nContext";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface DocTypeItem {
  id: string;
  code: string;
  nom: string;
  icone: string;
}

interface LocationData {
  lat: number;
  lng: number;
  city: string;
}

const STEP_LABELS = ["trouver_step_type", "trouver_step_infos", "trouver_step_location", "trouver_step_photos", "trouver_step_contact"];

export default function Trouver() {
  const { t } = useI18n();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [docTypes, setDocTypes] = useState<DocTypeItem[]>([]);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [autreType, setAutreType] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [docNum, setDocNum] = useState("");
  const [etat, setEtat] = useState("bon");
  const [details, setDetails] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [ville, setVille] = useState("");
  const [dateFound, setDateFound] = useState(() => new Date().toISOString().split("T")[0]);
  const [locationData, setLocationData] = useState<LocationData | null>(null);
  const [fileRecto, setFileRecto] = useState<File | null>(null);
  const [fileVerso, setFileVerso] = useState<File | null>(null);
  const [previewRecto, setPreviewRecto] = useState<string | null>(null);
  const [previewVerso, setPreviewVerso] = useState<string | null>(null);
  const [contactTel, setContactTel] = useState("");
  const [contactMode, setContactMode] = useState("APP_CHAT");
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [success, setSuccess] = useState(false);
  const [refNumber, setRefNumber] = useState("");

  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInitRef = useRef(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    documentTypesService.getActive().then((res) => {
      console.log("[Trouver] getActive doc types response:", res);
      if (res.success && Array.isArray(res.data)) {
        setDocTypes(res.data as DocTypeItem[]);
      }
    });
  }, []);

  useEffect(() => {
    if (step === 3 && !mapInitRef.current) {
      setTimeout(initMap, 150);
    }
  }, [step]);

  const initMap = useCallback(() => {
    if (mapInitRef.current || !mapContainerRef.current) return;
    mapInitRef.current = true;

    const lat = 4.0511;
    const lng = 9.7679;

    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: false,
    }).setView([lat, lng], 14);

    L.tileLayer("https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}", {
      maxZoom: 20,
    }).addTo(map);

    L.control.zoom({ position: "bottomright" }).addTo(map);

    const marker = L.marker([lat, lng], { draggable: true }).addTo(map);

    map.on("click", (e: L.LeafletMouseEvent) => {
      marker.setLatLng(e.latlng);
      updateLocation(e.latlng);
    });

    marker.on("dragend", () => {
      updateLocation(marker.getLatLng());
    });

    mapRef.current = map;
    markerRef.current = marker;

    updateLocation({ lat, lng });

    const loader = document.getElementById("map-loader");
    if (loader) {
      loader.style.opacity = "0";
      setTimeout(() => loader.classList.add("hidden"), 500);
    }
  }, []);

  const updateLocation = useCallback(async (latlng: L.LatLng) => {
    const data: LocationData = { lat: latlng.lat, lng: latlng.lng, city: "" };
    setLocationData(data);

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latlng.lat}&lon=${latlng.lng}&zoom=18&addressdetails=1`
      );
      const json = await res.json();
      const city =
        json.address?.city ||
        json.address?.town ||
        json.address?.village ||
        json.address?.suburb ||
        "";
      data.city = city;
      setLocationData({ ...data });
      if (city) setVille(city);
    } catch {
      // silent
    }
  }, []);

  const searchLocation = useCallback(async () => {
    const input = document.getElementById("map-search-input") as HTMLInputElement;
    if (!input?.value.trim()) return;

    const resultsBox = document.getElementById("map-search-results")!;
    resultsBox.innerHTML =
      `<div class="p-3 text-[12px] text-textMuted italic flex items-center gap-2"><i class="fa-solid fa-spinner fa-spin"></i> ${t("trouver_searching")}</div>`;
    resultsBox.classList.remove("hidden");

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(input.value)}&countrycodes=cm&limit=5`
      );
      const data = await res.json();

      if (data.length === 0) {
        resultsBox.innerHTML =
          `<div class="p-3 text-[12px] text-red-500 italic">${t("trouver_no_results")}</div>`;
        return;
      }

      resultsBox.innerHTML = data
        .map(
          (item: any) =>
            `<div class="p-3 hover:bg-surface2 cursor-pointer border-b border-borderMain last:border-0 transition-colors" 
               onclick="window.selectSearchResult && window.selectSearchResult(${item.lat}, ${item.lon}, '${item.display_name.replace(/'/g, "\\'")}')">
              <div class="text-[12.5px] font-bold text-textMain truncate">${item.display_name.split(",")[0]}</div>
              <div class="text-[11px] text-textMuted truncate">${item.display_name.split(",").slice(1).join(",")}</div>
            </div>`
        )
        .join("");
    } catch {
      resultsBox.innerHTML =
        `<div class="p-3 text-[12px] text-red-500 italic">${t("trouver_connection_error")}</div>`;
    }
  }, []);

  useEffect(() => {
    (window as any).selectSearchResult = (lat: number, lon: number, name: string) => {
      const map = mapRef.current;
      const marker = markerRef.current;
      if (!map || !marker) return;
      const latlng = L.latLng(lat, lon);
      map.setView(latlng, 16);
      marker.setLatLng(latlng);
      updateLocation(latlng);
      document.getElementById("map-search-results")?.classList.add("hidden");
      const inp = document.getElementById("map-search-input") as HTMLInputElement;
      if (inp) inp.value = name.split(",")[0];
    };
    return () => {
      delete (window as any).selectSearchResult;
    };
  }, [updateLocation]);

  const goToStep = (n: number) => {
    if (n === 2 && !selectedType) {
      alert(t("trouver_select_type"));
      return;
    }
    if (n > step && step === 2 && n === 3) {
      if (!ownerName || ownerName.trim().length < 2) {
        alert(t("trouver_enter_owner"));
        return;
      }
      if (docNum && !/\d/.test(docNum)) {
        alert(t("trouver_digit_required"));
        return;
      }
    }
    if (n > step && step === 3 && n === 4) {
      if (!ville || ville.trim().length < 2) {
        alert(t("trouver_enter_city"));
        return;
      }
      if (dateFound) {
        const d = new Date(dateFound);
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        if (d > today) {
          alert(t("trouver_future_date"));
          return;
        }
      }
    }
    setStep(n);
    const panel = document.getElementById("panel-area");
    if (panel) panel.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === "Enter" || e.key === ",") && tagInput.trim()) {
      e.preventDefault();
      const v = tagInput.trim().replace(",", "");
      if (v && !tags.includes(v)) {
        setTags((prev) => [...prev, v]);
      }
      setTagInput("");
    }
  };

  const removeTag = (v: string) => {
    setTags((prev) => prev.filter((t) => t !== v));
  };

  const handleFileSelect = (
    file: File | null,
    setFile: (f: File | null) => void,
    setPreview: (s: string | null) => void
  ) => {
    if (!file) return;
    setFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleDrop = (
    e: React.DragEvent,
    setFile: (f: File | null) => void,
    setPreview: (s: string | null) => void
  ) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file?.type.startsWith("image/")) {
      handleFileSelect(file, setFile, setPreview);
    }
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert(t("trouver_geolocation_not_supported"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const map = mapRef.current;
        const marker = markerRef.current;
        if (!map || !marker) return;
        const latlng = L.latLng(pos.coords.latitude, pos.coords.longitude);
        map.setView(latlng, 16);
        marker.setLatLng(latlng);
        updateLocation(latlng);
      },
      () => alert(t("trouver_position_failed")),
      { enableHighAccuracy: true }
    );
  };

  const submitDeclaration = async () => {
    if (!consent) {
      alert(t("trouver_accept_terms"));
      return;
    }
    if (!selectedType) {
      alert(t("trouver_select_type"));
      return;
    }
    if (!ownerName) {
      alert(t("trouver_enter_owner_short"));
      return;
    }
    if (!ville) {
      alert(t("trouver_enter_city"));
      return;
    }
    if (docNum && !/\d/.test(docNum)) {
      alert(t("trouver_digit_required"));
      return;
    }
    if (dateFound) {
      const d = new Date(dateFound);
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      if (d > today) {
        alert(t("trouver_future_date"));
        return;
      }
    }

    setSubmitting(true);

    const formData = new FormData();
    formData.append("doc_type", selectedType);
    formData.append("owner_name", ownerName);
    formData.append("document_number", docNum);
    formData.append("etat_physique", etat);
    formData.append("ville", ville);
    formData.append("region", t("trouver_region_not_specified"));
    formData.append("pays", t("trouver_country_cameroon"));
    formData.append("date_perte", dateFound);
    formData.append("mode_contact", contactMode);
    formData.append("telephone_contact", contactTel);

    let description = details;
    if (tags.length > 0) {
      description = description
        ? `${description}\n\n${t("trouver_keywords_prefix")}: ${tags.join(", ")}`
        : `${t("trouver_keywords_prefix")}: ${tags.join(", ")}`;
    }
    formData.append("description", description);

    if (fileRecto) formData.append("photo_recto", fileRecto);
    if (fileVerso) formData.append("photo_verso", fileVerso);

    if (locationData) {
      formData.append("found_location", `${locationData.lat},${locationData.lng}`);
      formData.append("found_location_city", locationData.city || ville);
    }

    let p = 0;
    const interval = setInterval(() => {
      p += 10;
      if (p > 90) clearInterval(interval);
      setProgress(p);
    }, 200);

    try {
      const result = await declarationsService.createFound(formData);
      console.log("[Trouver] createFound response:", result);
      clearInterval(interval);
      setProgress(100);

      if (result.success) {
        setRefNumber(result.data?.identifiant_doc_dm || "DOC-FND-SUCCESS");
        setSuccess(true);
      } else {
        alert(result.message || t("trouver_publish_error"));
        setSubmitting(false);
        setProgress(0);
      }
    } catch (e: any) {
      clearInterval(interval);
      const msg = e.response?.data?.message || e.response?.data?.error || t("trouver_server_error");
      alert(msg);
      setSubmitting(false);
      setProgress(0);
    }
  };

  const photoCount = [fileRecto, fileVerso].filter(Boolean).length;

  const selectedDoc = docTypes.find((d) => d.id === selectedType);

  const getIconStyle = (icone: string) => {
    if (icone === "id-card") return { cls: "text-green-mid", bg: "bg-green-light" };
    if (icone === "passport") return { cls: "text-blue-500", bg: "bg-blue-50" };
    return { cls: "text-primary", bg: "bg-primary/10" };
  };

  if (success) {
    return (
      <div className="flex flex-col h-full">
        <Topbar
          title={t("trouver_title")}
          breadcrumbs={[{ label: t("trouver_breadcrumb_found"), to: "/trouver" }, { label: t("trouver_success") }]}
        />
        <div
          className="p-4 sm:p-6 lg:p-8 custom-scrollbar max-md:h-[calc(100vh-134px)] md:h-[calc(100vh-64px)] overflow-y-auto pb-24 md:pb-0"
        >
          <div className="max-w-lg mx-auto">
            <div className="bg-white border border-borderMain rounded-[16px] p-5 text-center">
              <div className="w-14 h-14 rounded-[18px] bg-green-light flex items-center justify-center mx-auto mb-3">
                <i className="fa-solid fa-circle-check text-green-mid text-3xl"></i>
              </div>
              <h2 className="font-bricolage text-xl font-extrabold text-textMain mb-1">
                {t("trouver_declaration_published")}
              </h2>
              <div className="p-3 bg-bgMain border border-borderMain rounded-[12px] mb-4 text-left">
                <p className="text-[10px] font-bold text-textMuted uppercase mb-1.5">
                  {t("trouver_declaration_number")}
                </p>
                <div className="flex items-center gap-2">
                  <span className="font-bricolage text-lg font-extrabold text-textMain tracking-widest flex-1">
                    {refNumber}
                  </span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(refNumber);
                    }}
                    className="px-2.5 py-1.5 bg-primary text-white text-[11px] font-bold rounded-[7px] hover:shadow-md hover:-translate-y-0.5 transition-all active:scale-95"
                  >
                    {t("trouver_copy")}
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => window.location.reload()}
                  className="py-2.5 rounded-[12px] bg-bgMain border border-borderMain text-textMain font-bold hover:border-primary hover:text-primary hover:shadow-sm transition-all active:scale-95"
                  >
                    {t("trouver_new")}
                  </button>
                <button
                  onClick={() => navigate("/mes-declarations")}
                  className="py-2.5 rounded-[12px] bg-primary text-white font-bold hover:shadow-lg hover:-translate-y-0.5 transition-all active:scale-95"
                  >
                    {t("trouver_my_declarations")}
                  </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <Topbar
        title={t("trouver_title")}
        breadcrumbs={[{ label: t("trouver_breadcrumb_found"), to: "/trouver" }, { label: t("trouver_breadcrumb_current") }]}
      />
      <div
        className="p-4 sm:p-6 lg:p-8 custom-scrollbar max-md:h-[calc(100vh-134px)] md:h-[calc(100vh-64px)] overflow-y-auto pb-24 md:pb-0"
      >
        <div className="max-w-4xl mx-auto space-y-4">
          {/* Hero */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[13px] bg-green-light border border-green-dark/10 flex items-center justify-center flex-shrink-0">
              <i className="fa-solid fa-hand-holding-heart text-green-mid text-lg"></i>
            </div>
            <div>
              <h1 className="font-bricolage text-[17px] font-extrabold text-textMain tracking-tight leading-tight">
                {t("trouver_hero_title")}
              </h1>
              <p className="text-[12px] text-textMuted leading-snug">
                {t("trouver_hero_desc")}
              </p>
            </div>
          </div>

          {/* Step Indicator */}
          <div className="bg-white border border-borderMain rounded-[14px] px-4 py-3">
            <div className="flex items-center">
              {STEP_LABELS.map((label, i) => {
                const idx = i + 1;
                const isDone = idx < step;
                const isActive = idx === step;
                const circleCls = isDone
                  ? "bg-green-500 text-white shadow-[0_0_0_3px_rgba(16,185,129,0.15)]"
                  : isActive
                    ? "bg-primary text-white shadow-[0_0_0_4px_rgba(245,166,75,0.2)]"
                    : "bg-[#f4efe6] border-2 border-[#eae3d8] text-[#9ca3af]";
                const labelCls = isDone
                  ? "text-green-500 font-bold"
                  : isActive
                    ? "text-primary font-bold"
                    : "text-[#9ca3af] font-semibold";
                const lineCls = isDone ? "bg-green-500" : "bg-[#eae3d8]";

                return (
                  <div key={i} className="flex flex-col items-center gap-[3px] flex-1 relative">
                    {i < STEP_LABELS.length - 1 && (
                      <div
                        className={`absolute top-4 left-[calc(50%+16px)] right-[calc(-50%+16px)] h-[2px] ${lineCls} z-0 transition-all duration-400`}
                      />
                    )}
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold transition-all duration-300 relative z-1 flex-shrink-0 ${circleCls}`}
                    >
                      {isDone ? (
                        <i className="fa-solid fa-check text-[9px]"></i>
                      ) : (
                        <span>{idx}</span>
                      )}
                    </div>
                    <span className={`text-[10px] whitespace-nowrap ${labelCls}`}>{t(label)}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Step 1 - Type */}
          {step === 1 && (
            <div className="bg-white border border-borderMain rounded-[16px] p-4 panel-content">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-[8px] bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <i className="fa-solid fa-tag text-primary text-xs"></i>
                </div>
                <h2 className="font-bricolage text-[15px] font-bold text-textMain">
                  {t("trouver_step1_title")}
                </h2>
              </div>

              <div className="mb-4">
                <p className="text-[11px] font-bold text-textMain mb-2 uppercase tracking-wider opacity-60">
                  {t("trouver_doc_types")}
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-3">
                  {docTypes.map((d) => {
                    const st = getIconStyle(d.icone);
                    return (
                      <button
                        key={d.id}
                        onClick={() => {
                          setSelectedType(d.id);
                          setAutreType("");
                        }}
                        className={`doc-type-card border-2 rounded-[12px] p-[10px_6px] cursor-pointer text-center bg-white relative transition-all duration-180 hover:border-primary hover:-translate-y-[1px] hover:shadow-[0_4px_12px_rgba(245,166,75,0.12)] ${
                          selectedType === d.id
                            ? "!border-primary !bg-[#fef0dc] !shadow-[0_0_0_3px_rgba(245,166,75,0.12)]"
                            : "border-[#eae3d8]"
                        }`}
                      >
                        <div
                          className={`w-9 h-9 rounded-[10px] ${st.bg} flex items-center justify-center mx-auto mb-2`}
                        >
                          <i className={`fa-solid fa-${d.icone || "file-lines"} ${st.cls} text-lg`}></i>
                        </div>
                        <div className="text-[12px] font-bold text-textMain">{d.nom}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className={`${selectedType !== "autre" ? "hidden" : ""} mb-4`}>
                <label className="form-label">{t("trouver_specify_type")}</label>
                <input
                  type="text"
                  value={autreType}
                  onChange={(e) => setAutreType(e.target.value)}
                  className="w-full p-[10px_13px] border-[1.5px] border-[#eae3d8] rounded-[11px] text-[13px] text-textMain bg-[#faf7f2] outline-none focus:border-primary focus:bg-white focus:shadow-[0_0_0_3px_rgba(245,166,75,0.1)]"
                  placeholder={t("trouver_specify_type_placeholder")}
                />
              </div>

              <button
                onClick={() => goToStep(2)}
                disabled={!selectedType}
                className="w-full py-3 rounded-[12px] bg-primary text-white font-bricolage text-[14px] font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary-dark transition-all active:scale-[.98]"
              >
                {t("trouver_continue")} <i className="fa-solid fa-arrow-right ml-1 text-[12px]"></i>
              </button>
            </div>
          )}

          {/* Step 2 - Infos */}
          {step === 2 && (
            <div className="bg-white border border-borderMain rounded-[16px] p-4 panel-content">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-[8px] bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <i className="fa-solid fa-user text-primary text-xs"></i>
                </div>
                <div>
                  <h2 className="font-bricolage text-[15px] font-bold text-textMain">
                    {t("trouver_step2_title")}
                  </h2>
                  <p className="text-[11px] text-textMuted">
                    {t("trouver_step2_desc")}
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-3 mb-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-[#4b5563] mb-1 block tracking-[0.3px]">
                      {t("trouver_owner_name")} <span className="text-textMuted font-normal">({t("trouver_if_readable")})</span>
                    </label>
                    <input
                      type="text"
                      value={ownerName}
                      onChange={(e) => setOwnerName(e.target.value)}
                      className="w-full p-[10px_13px] border-[1.5px] border-[#eae3d8] rounded-[11px] text-[13px] text-textMain bg-[#faf7f2] outline-none focus:border-primary focus:bg-white focus:shadow-[0_0_0_3px_rgba(245,166,75,0.1)]"
                      placeholder={t("trouver_owner_name_placeholder")}
                    />
                    <p className="text-[10.5px] text-[#9ca3af] mt-1">
                      <i className="fa-solid fa-eye-slash text-[10px]"></i> {t("trouver_shared_only")}
                    </p>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-[#4b5563] mb-1 block tracking-[0.3px]">
                      {t("trouver_doc_number")} <span className="text-textMuted font-normal">({t("trouver_if_visible")})</span>
                    </label>
                    <input
                      type="text"
                      value={docNum}
                      onChange={(e) => setDocNum(e.target.value)}
                      className="w-full p-[10px_13px] border-[1.5px] border-[#eae3d8] rounded-[11px] text-[13px] text-textMain bg-[#faf7f2] outline-none focus:border-primary focus:bg-white focus:shadow-[0_0_0_3px_rgba(245,166,75,0.1)]"
                      placeholder={t("trouver_doc_number_placeholder")}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-[#4b5563] mb-1 block tracking-[0.3px]">
                    {t("trouver_doc_condition")}
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: "bon", label: t("trouver_condition_good"), icon: "fa-circle-check", cls: "text-green-500" },
                      { value: "moyen", label: t("trouver_condition_fair"), icon: "fa-triangle-exclamation", cls: "text-amber-500" },
                      { value: "abime", label: t("trouver_condition_damaged"), icon: "fa-circle-xmark", cls: "text-red-400" },
                    ].map((opt) => (
                      <div key={opt.value} className="radio-pill">
                        <input
                          type="radio"
                          name="etat"
                          id={`e-${opt.value}`}
                          value={opt.value}
                          checked={etat === opt.value}
                          onChange={() => setEtat(opt.value)}
                          className="hidden"
                        />
                        <label
                          htmlFor={`e-${opt.value}`}
                          className={`flex items-center gap-[6px] p-[8px_12px] border-[1.5px] border-[#eae3d8] rounded-[20px] cursor-pointer text-[12px] font-semibold text-[#4b5563] transition-all duration-180 bg-white whitespace-nowrap ${
                            etat === opt.value
                              ? "!border-primary !bg-[#fef0dc] !text-[#d98a30]"
                              : ""
                          }`}
                        >
                          <i className={`fa-solid ${opt.icon} ${opt.cls} text-xs`}></i>
                          {opt.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-[#4b5563] mb-1 block tracking-[0.3px]">
                    {t("trouver_details_share")}
                  </label>
                  <textarea
                    rows={2}
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    className="w-full p-[10px_13px] border-[1.5px] border-[#eae3d8] rounded-[11px] text-[13px] text-textMain bg-[#faf7f2] outline-none focus:border-primary focus:bg-white focus:shadow-[0_0_0_3px_rgba(245,166,75,0.1)] resize-none"
                    placeholder={t("trouver_details_placeholder")}
                  />
                  <p className="text-[10.5px] text-[#9ca3af] mt-1">
                    {t("trouver_details_warning")}
                  </p>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-[#4b5563] mb-1 block tracking-[0.3px]">
                    {t("trouver_keywords")} <span className="text-textMuted font-normal">({t("trouver_enter_to_add")})</span>
                  </label>
                  <div
                    className="flex flex-wrap items-center gap-1.5 p-2 border-[1.5px] border-[#eae3d8] rounded-[11px] bg-[#faf7f2] min-h-[40px] cursor-text"
                    onClick={() => document.getElementById("tag-input")?.focus()}
                  >
                    <div className="flex flex-wrap gap-1">
                      {tags.map((t) => (
                        <span
                          key={t}
                          className="inline-flex items-center gap-1 bg-[#fef0dc] border border-primary rounded-[20px] px-2 py-0.5 text-[11px] font-semibold text-[#d98a30]"
                        >
                          {t}
                          <button
                            onClick={() => removeTag(t)}
                            className="bg-none border-none cursor-pointer text-[#d98a30] text-[10px] p-0"
                          >
                            ✕
                          </button>
                        </span>
                      ))}
                    </div>
                    <input
                      id="tag-input"
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={handleTagKeyDown}
                      placeholder={t("trouver_keywords_placeholder")}
                      className="bg-transparent outline-none border-none text-[12.5px] text-textMain placeholder:text-textMuted flex-1 min-w-[100px]"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => goToStep(1)}
                  className="px-4 py-2.5 rounded-[12px] bg-bgMain border border-borderMain text-textMain text-[13px] font-bold hover:border-textMain transition-colors flex items-center gap-1.5"
                >
                  <i className="fa-solid fa-arrow-left text-[11px]"></i> {t("trouver_back")}
                </button>
                <button
                  onClick={() => goToStep(3)}
                  className="flex-1 py-2.5 rounded-[12px] bg-primary text-white font-bricolage text-[14px] font-bold hover:bg-primary-dark transition-all active:scale-[.98]"
                >
                  {t("trouver_continue")} <i className="fa-solid fa-arrow-right ml-1 text-[11px]"></i>
                </button>
              </div>
            </div>
          )}

          {/* Step 3 - Lieu */}
          {step === 3 && (
            <div className="bg-white border border-borderMain rounded-[16px] p-4 panel-content">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-[8px] bg-green-light flex items-center justify-center flex-shrink-0">
                  <i className="fa-solid fa-location-dot text-green-mid text-xs"></i>
                </div>
                <div>
                  <h2 className="font-bricolage text-[15px] font-bold text-textMain">
                    {t("trouver_step3_title")}
                  </h2>
                  <p className="text-[11px] text-textMuted">
                    {t("trouver_step3_desc")}
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-4 mb-4">
                {/* Map */}
                <div className="w-full h-[400px] sm:h-[450px] rounded-[18px] border border-borderMain overflow-hidden shadow-inner bg-surface2 relative">
                  <div
                    id="map-loader"
                    className="absolute inset-0 z-10 bg-surface2 flex flex-col items-center justify-center gap-2 transition-opacity duration-500"
                  >
                    <i className="fa-solid fa-spinner fa-spin text-primary text-xl"></i>
                  </div>
                  <div ref={mapContainerRef} className="w-full h-full"></div>
                </div>

                {/* Search */}
                <div className="relative group/search">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-textMuted group-focus-within/search:text-primary transition-colors">
                    <i className="fa-solid fa-magnifying-glass text-[13px]"></i>
                  </div>
                  <input
                    id="map-search-input"
                    type="text"
                    placeholder={t("trouver_search_placeholder")}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") searchLocation();
                    }}
                    className="w-full pl-10 pr-12 py-3 bg-white border border-borderMain rounded-xl text-[12.5px] focus:border-primary focus:ring-0 outline-none transition-all"
                  />
                  <button
                    onClick={searchLocation}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center hover:bg-primary-dark transition-all shadow-sm"
                  >
                    <i className="fa-solid fa-arrow-right text-[11px]"></i>
                  </button>
                  <button
                    onClick={useCurrentLocation}
                    className="absolute -bottom-12 right-0 bg-white border border-borderMain rounded-xl px-3 py-2 text-[11px] font-bold text-textMain hover:border-primary hover:text-primary transition-all shadow-sm flex items-center gap-1.5 z-[1002]"
                  >
                    <i className="fa-solid fa-location-crosshairs text-primary"></i>
                    {t("trouver_my_location")}
                  </button>
                  <div
                    id="map-search-results"
                    className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl border border-borderMain shadow-xl max-h-[200px] overflow-y-auto hidden z-[1001]"
                  ></div>
                </div>

                {/* Location badge */}
                <div
                  className={`bg-green-light/30 border border-green-mid/10 p-3 rounded-xl flex items-center gap-3 transition-all duration-300 ${
                    locationData ? "visible opacity-100" : "invisible opacity-0"
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-white border border-green-mid/20 flex items-center justify-center flex-shrink-0 shadow-sm">
                    <i className="fa-solid fa-location-dot text-green-mid text-lg"></i>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold text-green-mid uppercase tracking-wider">
                      {t("trouver_found_location")}
                    </p>
                    <p className="text-[12px] text-textMain font-bold truncate">
                      {locationData?.city || t("trouver_loading_address")}
                    </p>
                  </div>
                  <div className="text-[10px] font-mono text-textMuted bg-white px-2 py-1 rounded border border-borderMain shadow-sm">
                    {locationData
                      ? `${locationData.lat.toFixed(4)}, ${locationData.lng.toFixed(4)}`
                      : "0.000, 0.000"}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="text-[11px] font-bold text-[#4b5563] mb-1 block tracking-[0.3px]">
                    {t("trouver_city_district")} <span className="text-textMuted font-normal">({t("trouver_auto_filled")})</span>
                  </label>
                  <input
                    type="text"
                    value={ville}
                    onChange={(e) => setVille(e.target.value)}
                    className="w-full p-[10px_13px] border-[1.5px] border-[#eae3d8] rounded-[11px] text-[13px] text-textMain bg-[#faf7f2] outline-none focus:border-primary focus:bg-white focus:shadow-[0_0_0_3px_rgba(245,166,75,0.1)]"
                    placeholder={t("trouver_city_placeholder")}
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-[#4b5563] mb-1 block tracking-[0.3px]">
                    {t("trouver_date_found")}
                  </label>
                  <input
                    type="date"
                    value={dateFound}
                    onChange={(e) => setDateFound(e.target.value)}
                    className="w-full p-[10px_13px] border-[1.5px] border-[#eae3d8] rounded-[11px] text-[13px] text-textMain bg-[#faf7f2] outline-none focus:border-primary focus:bg-white focus:shadow-[0_0_0_3px_rgba(245,166,75,0.1)]"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => goToStep(2)}
                  className="px-4 py-2.5 rounded-[12px] bg-bgMain border border-borderMain text-textMain text-[13px] font-bold hover:border-textMain transition-colors flex items-center gap-1.5"
                >
                  <i className="fa-solid fa-arrow-left text-[11px]"></i> {t("trouver_back")}
                </button>
                <button
                  onClick={() => goToStep(4)}
                  className="flex-1 py-2.5 rounded-[12px] bg-primary text-white font-bricolage text-[14px] font-bold hover:bg-primary-dark transition-all active:scale-[.98]"
                >
                  {t("trouver_continue")} <i className="fa-solid fa-arrow-right ml-1 text-[11px]"></i>
                </button>
              </div>
            </div>
          )}

          {/* Step 4 - Photos */}
          {step === 4 && (
            <div className="bg-white border border-borderMain rounded-[16px] p-4 panel-content">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-[8px] bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <i className="fa-solid fa-camera text-primary text-xs"></i>
                </div>
                <h2 className="font-bricolage text-[15px] font-bold text-textMain">
                  {t("trouver_step4_title")}
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="text-[11px] font-bold text-[#4b5563] mb-1 block tracking-[0.3px]">
                    {t("trouver_photo_recto")}
                  </label>
                  <div
                    className="border-2 border-dashed border-[#eae3d8] rounded-[12px] p-4 text-center cursor-pointer hover:border-primary hover:bg-[#fef0dc] transition-all"
                    onClick={() => document.getElementById("file-recto")?.click()}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.add("border-primary", "bg-[#fef0dc]");
                    }}
                    onDragLeave={(e) => {
                      e.currentTarget.classList.remove("border-primary", "bg-[#fef0dc]");
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.remove("border-primary", "bg-[#fef0dc]");
                      handleDrop(e, setFileRecto, setPreviewRecto);
                    }}
                  >
                    <input
                      id="file-recto"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) =>
                        handleFileSelect(e.target.files?.[0] || null, setFileRecto, setPreviewRecto)
                      }
                    />
                    {previewRecto ? (
                      <img
                        src={previewRecto}
                        className="w-full max-h-28 object-contain rounded-[8px] mb-1.5 mx-auto"
                        alt={t("trouver_alt_recto")}
                      />
                    ) : (
                      <>
                        <i className="fa-solid fa-cloud-arrow-up text-2xl text-textMuted mb-1 block"></i>
                        <p className="text-[13px] font-bold text-textMain">
                          {t("trouver_drag_recto")}
                        </p>
                      </>
                    )}
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-[#4b5563] mb-1 block tracking-[0.3px]">
                    {t("trouver_photo_verso")} <span className="text-textMuted font-normal">({t("trouver_optional")})</span>
                  </label>
                  <div
                    className="border-2 border-dashed border-[#eae3d8] rounded-[12px] p-4 text-center cursor-pointer hover:border-primary hover:bg-[#fef0dc] transition-all"
                    onClick={() => document.getElementById("file-verso")?.click()}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.add("border-primary", "bg-[#fef0dc]");
                    }}
                    onDragLeave={(e) => {
                      e.currentTarget.classList.remove("border-primary", "bg-[#fef0dc]");
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.remove("border-primary", "bg-[#fef0dc]");
                      handleDrop(e, setFileVerso, setPreviewVerso);
                    }}
                  >
                    <input
                      id="file-verso"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) =>
                        handleFileSelect(e.target.files?.[0] || null, setFileVerso, setPreviewVerso)
                      }
                    />
                    {previewVerso ? (
                      <img
                        src={previewVerso}
                        className="w-full max-h-28 object-contain rounded-[8px] mb-1.5 mx-auto"
                        alt={t("trouver_alt_verso")}
                      />
                    ) : (
                      <>
                        <i className="fa-solid fa-rotate-right text-2xl text-textMuted mb-1 block"></i>
                        <p className="text-[13px] font-bold text-textMain">
                          {t("trouver_drag_verso")}
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => goToStep(3)}
                  className="px-4 py-2.5 rounded-[12px] bg-bgMain border border-borderMain text-textMain text-[13px] font-bold hover:border-textMain transition-colors flex items-center gap-1.5"
                >
                  <i className="fa-solid fa-arrow-left text-[11px]"></i> {t("trouver_back")}
                </button>
                <button
                  onClick={() => goToStep(5)}
                  className="flex-1 py-2.5 rounded-[12px] bg-primary text-white font-bricolage text-[14px] font-bold hover:bg-primary-dark transition-all active:scale-[.98]"
                >
                  {t("trouver_continue")} <i className="fa-solid fa-arrow-right ml-1 text-[11px]"></i>
                </button>
              </div>
            </div>
          )}

          {/* Step 5 - Contact */}
          {step === 5 && (
            <div className="bg-white border border-borderMain rounded-[16px] p-4 panel-content">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-[8px] bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <i className="fa-solid fa-handshake text-primary text-xs"></i>
                </div>
                <h2 className="font-bricolage text-[15px] font-bold text-textMain">
                  {t("trouver_step5_title")}
                </h2>
              </div>

              <div className="flex flex-col gap-3 mb-4">
                <input
                  type="tel"
                  value={contactTel}
                  onChange={(e) => setContactTel(e.target.value)}
                  className="w-full p-[10px_13px] border-[1.5px] border-[#eae3d8] rounded-[11px] text-[13px] text-textMain bg-[#faf7f2] outline-none focus:border-primary focus:bg-white focus:shadow-[0_0_0_3px_rgba(245,166,75,0.1)]"
                  placeholder={t("trouver_phone_placeholder")}
                />

                <div>
                  <label className="text-[11px] font-bold text-[#4b5563] mb-1 block tracking-[0.3px]">
                    {t("trouver_contact_mode")}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: "APP_CHAT", label: t("trouver_contact_app") },
                      { value: "PHONE", label: t("trouver_contact_phone") },
                    ].map((opt) => (
                      <div key={opt.value} className="radio-pill">
                        <input
                          type="radio"
                          name="contact-mode"
                          id={`cm-${opt.value}`}
                          value={opt.value}
                          checked={contactMode === opt.value}
                          onChange={() => setContactMode(opt.value)}
                          className="hidden"
                        />
                        <label
                          htmlFor={`cm-${opt.value}`}
                          className={`flex items-center gap-[6px] p-[8px_12px] border-[1.5px] border-[#eae3d8] rounded-[20px] cursor-pointer text-[12px] font-semibold text-[#4b5563] transition-all duration-180 bg-white ${
                            contactMode === opt.value
                              ? "!border-primary !bg-[#fef0dc] !text-[#d98a30]"
                              : ""
                          }`}
                        >
                          {opt.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-3 bg-bgMain border border-borderMain rounded-[12px]">
                  <p className="text-[10px] font-bold text-textMuted uppercase mb-2">
                    {t("trouver_summary")}
                  </p>
                  <div className="text-[12px] flex flex-col gap-1">
                    <div className="flex justify-between">
                      <span className="text-textMuted">{t("trouver_summary_type")}</span>
                      <span className="font-bold">
                        {selectedDoc?.nom || autreType || "—"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-textMuted">{t("trouver_summary_location")}</span>
                      <span className="font-bold">{ville || "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-textMuted">{t("trouver_summary_date")}</span>
                      <span className="font-bold">
                        {dateFound
                          ? new Date(dateFound).toLocaleDateString("fr-FR")
                          : "—"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-textMuted">{t("trouver_summary_photos")}</span>
                      <span className="font-bold text-green-mid">{photoCount}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 p-3 bg-amber-50 border border-amber-100 rounded-[10px]">
                  <input
                    type="checkbox"
                    id="consent-found"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                    className="mt-0.5 accent-primary cursor-pointer"
                  />
                  <label
                    htmlFor="consent-found"
                    className="text-[11.5px] text-textMain cursor-pointer"
                  >
                    {t("trouver_certify")}
                  </label>
                </div>
              </div>

              {submitting && (
                <div className="mb-3">
                  <div className="h-[4px] bg-[#eae3d8] rounded-[10px] overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-green-500 to-green-mid rounded-[10px] transition-all duration-350"
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => goToStep(4)}
                  disabled={submitting}
                  className="px-4 py-2.5 rounded-[12px] bg-bgMain border border-borderMain text-textMain text-[13px] font-bold hover:border-textMain transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  <i className="fa-solid fa-arrow-left text-[11px]"></i> Retour
                </button>
                <button
                  onClick={submitDeclaration}
                  disabled={submitting}
                  className="flex-1 py-2.5 rounded-[12px] bg-green-dark text-white font-bricolage text-[14px] font-bold hover:shadow-lg hover:-translate-y-0.5 transition-all active:scale-95 disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <i className="fa-solid fa-spinner fa-spin text-[12px]"></i> {t("trouver_publishing")}
                    </>
                  ) : (
                    t("trouver_publish")
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
