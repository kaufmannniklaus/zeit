"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function EinstellungenPage() {
  const [sollstunden, setSollstunden] = useState<number>(42);
  const [saldoStunden, setSaldoStunden] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/einstellungen");
        if (res.ok) {
          const json = await res.json();
          setSollstunden(json.data.sollstundenProWoche);
          setSaldoStunden(json.data.ueberstundenSaldoStunden ?? 0);
        }
      } catch {
        setError("Fehler beim Laden der Einstellungen");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setSaving(true);

    try {
      const res = await fetch("/api/einstellungen", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sollstundenProWoche: sollstunden,
          ueberstundenSaldoStunden: saldoStunden,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Fehler beim Speichern");
        return;
      }

      setSuccess(true);
    } catch {
      setError("Netzwerkfehler beim Speichern");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <h1 className="text-3xl font-bold mb-6 tracking-tight">Einstellungen</h1>
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Arbeitszeit-Konfiguration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <div className="h-4 w-40 animate-pulse rounded bg-muted" />
              <div className="h-10 w-full animate-pulse rounded bg-muted" />
            </div>
            <div className="space-y-2">
              <div className="h-4 w-56 animate-pulse rounded bg-muted" />
              <div className="h-10 w-full animate-pulse rounded bg-muted" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6 tracking-tight">Einstellungen</h1>

      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>Arbeitszeit-Konfiguration</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="sollstunden">Sollstunden pro Woche</Label>
              <Input
                id="sollstunden"
                type="number"
                step={0.5}
                min={1}
                max={60}
                value={sollstunden}
                onChange={(e) => setSollstunden(Number(e.target.value))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="saldo">
                Überstunden-Anfangssaldo (Stunden)
              </Label>
              <Input
                id="saldo"
                type="number"
                step={0.25}
                min={-500}
                max={500}
                value={saldoStunden}
                onChange={(e) => setSaldoStunden(Number(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">
                Überstundensaldo aus dem Firmenauszug – wird zum berechneten
                Saldo addiert. Negativ = Minusstunden.
              </p>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert>
                <AlertDescription>
                  Einstellungen erfolgreich gespeichert.
                </AlertDescription>
              </Alert>
            )}

            <Button type="submit" disabled={saving}>
              {saving ? "Speichern..." : "Speichern"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
