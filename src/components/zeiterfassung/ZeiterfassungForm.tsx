"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { berechneEffektivzeit, formatiereDauer, zeitStringZuMinuten } from "@/lib/zeit-utils";
import type { ZeitEintrag } from "@/types";

interface ZeiterfassungFormProps {
  onSuccess: () => void;
  editEntry?: ZeitEintrag | null;
  onCancelEdit?: () => void;
}

export function ZeiterfassungForm({
  onSuccess,
  editEntry,
  onCancelEdit,
}: ZeiterfassungFormProps) {
  const [datum, setDatum] = useState(() => new Date().toISOString().split("T")[0]);
  const [startzeit, setStartzeit] = useState("08:00");
  const [endzeit, setEndzeit] = useState("17:00");
  const [pauseDauer, setPauseDauer] = useState(60);
  const [notiz, setNotiz] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isEditing = !!editEntry;

  useEffect(() => {
    if (editEntry) {
      setDatum(editEntry.datum);
      setStartzeit(editEntry.startzeit);
      setEndzeit(editEntry.endzeit);
      setPauseDauer(editEntry.pauseDauer);
      setNotiz(editEntry.notiz ?? "");
      setError(null);
    }
  }, [editEntry]);

  const startMinuten = zeitStringZuMinuten(startzeit);
  const endMinuten = zeitStringZuMinuten(endzeit);
  const zeitFehler = startzeit && endzeit && endMinuten <= startMinuten;

  const effektivzeit =
    startzeit && endzeit && !zeitFehler
      ? berechneEffektivzeit(startzeit, endzeit, pauseDauer)
      : 0;

  const resetForm = () => {
    setDatum(new Date().toISOString().split("T")[0]);
    setStartzeit("08:00");
    setEndzeit("17:00");
    setPauseDauer(60);
    setNotiz("");
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (zeitFehler) {
      setError("Die Endzeit muss nach der Startzeit liegen.");
      return;
    }

    if (pauseDauer >= endMinuten - startMinuten) {
      setError(
        "Die Pausendauer muss kleiner als die Differenz zwischen Start- und Endzeit sein."
      );
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        datum,
        startzeit,
        endzeit,
        pauseDauer,
        notiz: notiz || undefined,
      };

      const url = isEditing
        ? `/api/zeiteintraege/${editEntry.id}`
        : "/api/zeiteintraege";

      const res = await fetch(url, {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const json = await res.json();
        setError(json.error || "Ein Fehler ist aufgetreten.");
        return;
      }

      if (!isEditing) {
        resetForm();
      }
      onSuccess();
    } catch {
      setError("Ein Fehler ist aufgetreten.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    resetForm();
    onCancelEdit?.();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {isEditing ? "Eintrag bearbeiten" : "Neuer Zeiteintrag"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="datum">Datum</Label>
              <Input
                id="datum"
                type="date"
                value={datum}
                onChange={(e) => setDatum(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="startzeit">Von</Label>
              <Input
                id="startzeit"
                type="time"
                value={startzeit}
                onChange={(e) => setStartzeit(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endzeit">Bis</Label>
              <Input
                id="endzeit"
                type="time"
                value={endzeit}
                onChange={(e) => setEndzeit(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pauseDauer">Pause in Minuten</Label>
              <Input
                id="pauseDauer"
                type="number"
                min={0}
                max={480}
                value={pauseDauer}
                onChange={(e) => setPauseDauer(Number(e.target.value))}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notiz">Notiz</Label>
            <Input
              id="notiz"
              type="text"
              value={notiz}
              onChange={(e) => setNotiz(e.target.value)}
              placeholder="Optionale Notiz..."
              maxLength={500}
            />
          </div>

          {zeitFehler && (
            <Alert variant="destructive">
              <AlertDescription>
                Die Endzeit muss nach der Startzeit liegen.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Effektive Zeit:{" "}
              <span className="font-semibold">
                {zeitFehler ? "--" : formatiereDauer(effektivzeit)}
              </span>
            </p>

            <div className="flex gap-2">
              {isEditing && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                >
                  Abbrechen
                </Button>
              )}
              <Button type="submit" disabled={submitting || !!zeitFehler}>
                {submitting
                  ? "Wird gespeichert..."
                  : isEditing
                    ? "Speichern"
                    : "Eintragen"}
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
