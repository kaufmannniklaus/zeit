"use client";

import { useEffect, useState, useCallback } from "react";
import type { Absenz, KpiDaten } from "@/types";
import KpiKarte from "@/components/dashboard/KpiKarte";
import AbsenzenForm from "@/components/dashboard/AbsenzenForm";
import AbsenzenTabelle from "@/components/dashboard/AbsenzenTabelle";

function formatMinuten(minuten: number): string {
  const h = Math.floor(Math.abs(minuten) / 60);
  const m = Math.abs(minuten) % 60;
  const sign = minuten < 0 ? "-" : "";
  return `${sign}${h}h ${m.toString().padStart(2, "0")}min`;
}

export default function DashboardClient() {
  const [kpis, setKpis] = useState<KpiDaten | null>(null);
  const [absenzen, setAbsenzen] = useState<Absenz[]>([]);
  const [loadingKpis, setLoadingKpis] = useState(true);
  const [loadingAbsenzen, setLoadingAbsenzen] = useState(true);

  const loadKpis = useCallback(async () => {
    setLoadingKpis(true);
    try {
      const res = await fetch("/api/kpis");
      if (res.ok) {
        const json = await res.json();
        setKpis(json.data);
      }
    } catch {
      console.error("Fehler beim Laden der KPIs");
    } finally {
      setLoadingKpis(false);
    }
  }, []);

  const loadAbsenzen = useCallback(async () => {
    setLoadingAbsenzen(true);
    try {
      const res = await fetch("/api/absenzen");
      if (res.ok) {
        const json = await res.json();
        setAbsenzen(json.data);
      }
    } catch {
      console.error("Fehler beim Laden der Absenzen");
    } finally {
      setLoadingAbsenzen(false);
    }
  }, []);

  useEffect(() => {
    loadKpis();
    loadAbsenzen();
  }, [loadKpis, loadAbsenzen]);

  async function handleDeleteAbsenz(id: string) {
    try {
      const res = await fetch(`/api/absenzen/${id}`, { method: "DELETE" });
      if (res.ok) {
        setAbsenzen((prev) => prev.filter((a) => a.id !== id));
      }
    } catch {
      console.error("Fehler beim Loeschen der Absenz");
    }
  }

  function handleAbsenzSuccess() {
    loadAbsenzen();
    loadKpis();
  }

  const ueberstundenFarbe =
    kpis && kpis.ueberstundenMinuten > 0
      ? "gruen"
      : kpis && kpis.ueberstundenMinuten < 0
        ? "rot"
        : "standard";

  // CZV-1 Ampel
  const czv1Farbe: "gruen" | "gelb" | "rot" =
    !kpis || kpis.erlaubteMinutenNaechsteWoche === 0
      ? "rot"
      : kpis.erlaubteMinutenNaechsteWoche >= kpis.sollstundenProWocheMinuten
        ? "gruen"
        : "gelb";

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <KpiKarte
          titel="Ueberstunden"
          wert={
            loadingKpis || !kpis ? "..." : formatMinuten(kpis.ueberstundenMinuten)
          }
          farbe={loadingKpis || !kpis ? "standard" : (ueberstundenFarbe as "gruen" | "rot" | "standard")}
        />
        <KpiKarte
          titel="Oe Woche"
          wert={
            loadingKpis || !kpis
              ? "..."
              : formatMinuten(kpis.durchschnittWocheMinuten)
          }
          untertitel="Durchschnitt pro Woche"
        />
        <KpiKarte
          titel="Oe Tag"
          wert={
            loadingKpis || !kpis
              ? "..."
              : formatMinuten(kpis.durchschnittTagMinuten)
          }
          untertitel="Durchschnitt pro Tag"
        />
        <KpiKarte
          titel="26-Wochen-Schnitt"
          wert={
            loadingKpis || !kpis
              ? "..."
              : formatMinuten(kpis.schnitt26WochenMinuten)
          }
          untertitel="Letzte 26 Wochen"
        />
        <KpiKarte
          titel="Erlaubt naechste Woche"
          wert={
            loadingKpis || !kpis
              ? "..."
              : formatMinuten(kpis.erlaubteMinutenNaechsteWoche)
          }
          farbe={loadingKpis || !kpis ? "standard" : czv1Farbe}
          untertitel={czv1Farbe === "rot" ? "Muss Woche frei nehmen!" : czv1Farbe === "gelb" ? "Unter Sollstunden" : "CZV 1 OK"}
        />
        <KpiKarte
          titel="Sollstunden / Woche"
          wert={
            loadingKpis || !kpis
              ? "..."
              : formatMinuten(kpis.sollstundenProWocheMinuten)
          }
        />
      </div>

      {/* Absenzen Form */}
      <AbsenzenForm onSuccess={handleAbsenzSuccess} />

      {/* Absenzen Tabelle */}
      <div>
        <h2 className="text-lg font-semibold mb-2">Absenzen</h2>
        <AbsenzenTabelle
          absenzen={absenzen}
          onDelete={handleDeleteAbsenz}
          loading={loadingAbsenzen}
        />
      </div>
    </div>
  );
}
