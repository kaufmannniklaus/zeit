"use client";

import { useEffect, useState, useCallback } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
  const [errorKpis, setErrorKpis] = useState<string | null>(null);

  const loadKpis = useCallback(async () => {
    setLoadingKpis(true);
    setErrorKpis(null);
    try {
      const res = await fetch("/api/kpis");
      if (!res.ok) throw new Error("KPIs konnten nicht geladen werden");
      const json = await res.json();
      setKpis(json.data);
    } catch {
      setErrorKpis("KPIs konnten nicht geladen werden. Bitte Seite neu laden.");
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
      // Fehler wird in der Tabelle behandelt
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
        loadKpis();
      }
    } catch {
      // Fehler wird still behandelt
    }
  }

  function handleAbsenzSuccess() {
    loadAbsenzen();
    loadKpis();
  }

  // Gruen = positiv (mehr gearbeitet als Soll), Rot = negativ (Minusstunden)
  const ueberstundenFarbe: "gruen" | "rot" | "standard" =
    kpis && kpis.ueberstundenMinuten > 0
      ? "gruen"
      : kpis && kpis.ueberstundenMinuten < 0
        ? "rot"
        : "standard";

  // CZV-1 Ampel: gruen >= Soll, gelb < Soll, rot = 0
  const czv1Farbe: "gruen" | "gelb" | "rot" =
    !kpis || kpis.erlaubteMinutenNaechsteWoche === 0
      ? "rot"
      : kpis.erlaubteMinutenNaechsteWoche >= kpis.sollstundenProWocheMinuten
        ? "gruen"
        : "gelb";

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>

      {errorKpis && (
        <Alert variant="destructive">
          <AlertDescription>{errorKpis}</AlertDescription>
        </Alert>
      )}

      {/* KPI Grid */}
      <div
        className="grid grid-cols-2 lg:grid-cols-3 gap-4"
        aria-label="Kennzahlen"
      >
        <KpiKarte
          titel="Ueberstunden"
          wert={
            loadingKpis || !kpis
              ? "..."
              : formatMinuten(kpis.ueberstundenMinuten)
          }
          farbe={
            loadingKpis || !kpis ? "standard" : ueberstundenFarbe
          }
        />
        <KpiKarte
          titel="Durchschnitt / Woche"
          wert={
            loadingKpis || !kpis
              ? "..."
              : formatMinuten(kpis.durchschnittWocheMinuten)
          }
        />
        <KpiKarte
          titel="Durchschnitt / Tag"
          wert={
            loadingKpis || !kpis
              ? "..."
              : formatMinuten(kpis.durchschnittTagMinuten)
          }
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
          untertitel={
            loadingKpis || !kpis
              ? undefined
              : czv1Farbe === "rot"
                ? "Muss Woche frei nehmen!"
                : czv1Farbe === "gelb"
                  ? "Unter Sollstunden"
                  : "CZV-1 OK"
          }
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

      {/* Absenzen Bereich */}
      <section aria-label="Absenzen">
        <AbsenzenForm onSuccess={handleAbsenzSuccess} />

        <div className="mt-6">
          <h2 className="text-lg font-semibold mb-3">Absenzen</h2>
          <AbsenzenTabelle
            absenzen={absenzen}
            onDelete={handleDeleteAbsenz}
            loading={loadingAbsenzen}
          />
        </div>
      </section>
    </div>
  );
}
