import { useEffect } from "react";
import { Select } from "@mantine/core";
import {
  useLocations,
  type LocationState,
} from "../../hooks/useLocations";

interface LocationSelectProps {
  value?: LocationState;
  onChange: (value: LocationState) => void;
  showArrondissement?: boolean;
  error?: string;
  /** Commune sortie d'un épinglage sur la carte : elle préremplit l'arrondissement tant que rien n'est choisi. */
  autoCity?: string;
}

export default function LocationSelect({
  value,
  onChange,
  showArrondissement = true,
  error,
  autoCity,
}: LocationSelectProps) {
  const {
    regions,
    departments,
    arrondissements,
    region,
    department,
    arrondissement,
    loadingRegions,
    loadingDepts,
    loadingArrs,
    setRegion,
    setDepartment,
    setArrondissement,
  } = useLocations({
    initialRegion: value?.region || "",
    initialDepartment: value?.department || "",
    initialArrondissement: value?.arrondissement || "",
  });

  const emitChange = (r: string, d: string, a: string) => {
    onChange({ region: r, department: d, arrondissement: a });
  };

  const handleRegion = (val: string | null) => {
    const r = val || "";
    setRegion(r);
    setDepartment("");
    setArrondissement("");
    emitChange(r, "", "");
  };

  const handleDepartment = (val: string | null) => {
    const d = val || "";
    setDepartment(d);
    setArrondissement("");
    emitChange(region, d, "");
  };

  const handleArrondissement = (val: string | null) => {
    const a = val || "";
    setArrondissement(a);
    emitChange(region, department, a);
  };

  // Le champ reste vide alors qu'une commune est connue : c'est un rechargement de
  // liste (region ou department vient de changer) ou le premier épinglage sur la carte.
  useEffect(() => {
    if (!autoCity || arrondissement) return;
    setArrondissement(autoCity);
    emitChange(region, department, autoCity);
  }, [autoCity, arrondissement]);

  const regionData = regions.map((r) => ({ value: r.region, label: r.region }));
  const deptData = departments.map((d) => ({ value: d.name, label: d.name }));
  // La commune géocodée n'est pas toujours une découpe administrative du référentiel :
  // elle est ajoutée aux options pour rester affichable et modifiable.
  const arrData = (
    autoCity && !arrondissements.includes(autoCity) ? [...arrondissements, autoCity] : arrondissements
  ).map((a) => ({ value: a, label: a }));

  const selectStyles = {
    input: {
      fontSize: 13,
      fontWeight: 500,
    },
    dropdown: {
      maxHeight: 280,
      overflowY: "auto" as const,
    },
    option: {
      fontSize: 13,
      whiteSpace: "normal" as const,
      wordBreak: "break-word" as const,
    },
  };

  return (
    <div className="space-y-3">
      <Select
        label="Région"
        placeholder="Sélectionner une région"
        data={regionData}
        value={region || null}
        onChange={handleRegion}
        searchable
        clearable
        loading={loadingRegions}
        leftSection={<i className="fa-solid fa-map" style={{ fontSize: 13, color: "var(--color-primary)" }} />}
        error={error}
        styles={selectStyles}
      />

      <Select
        label="Département"
        placeholder={region ? "Sélectionner un département" : "D'abord choisir une région"}
        data={deptData}
        value={department || null}
        onChange={handleDepartment}
        searchable
        clearable
        disabled={!region}
        loading={loadingDepts}
        leftSection={<i className="fa-solid fa-building" style={{ fontSize: 13, color: "var(--color-primary)" }} />}
        styles={selectStyles}
      />

      {showArrondissement && (
        <Select
          label="Arrondissement"
          placeholder={department ? "Sélectionner un arrondissement" : "D'abord choisir un département"}
          data={arrData}
          value={arrondissement || null}
          onChange={handleArrondissement}
          searchable
          clearable
          disabled={!department}
          loading={loadingArrs}
          leftSection={<i className="fa-solid fa-location-dot" style={{ fontSize: 13, color: "var(--color-primary)" }} />}
          styles={selectStyles}
        />
      )}
    </div>
  );
}
