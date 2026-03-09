"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface AbsenzenFormProps {
  onSuccess: () => void;
}

export default function AbsenzenForm({ onSuccess }: AbsenzenFormProps) {
  const [datum, setDatum] = useState("");
  const [typ, setTyp] = useState("");
  const [bezeichnung, setBezeichnung] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!datum || !typ) {
      setError("Datum und Typ sind Pflichtfelder.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/absenzen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          datum,
          typ,
          bezeichnung: bezeichnung || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Fehler beim Speichern");
        return;
      }

      setSuccess(true);
      setDatum("");
      setTyp("");
      setBezeichnung("");
      onSuccess();
    } catch {
      setError("Netzwerkfehler beim Speichern");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Neue Absenz erfassen</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="absenz-datum">Datum</Label>
              <Input
                id="absenz-datum"
                type="date"
                value={datum}
                onChange={(e) => setDatum(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="absenz-typ">Typ</Label>
              <Select value={typ} onValueChange={(val) => setTyp(val ?? "")}>
                <SelectTrigger id="absenz-typ">
                  <SelectValue placeholder="Typ waehlen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FERIEN">Ferien</SelectItem>
                  <SelectItem value="KRANK">Krank</SelectItem>
                  <SelectItem value="FEIERTAG">Feiertag</SelectItem>
                  <SelectItem value="SONSTIGES">Sonstiges</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="absenz-bezeichnung">Bezeichnung</Label>
              <Input
                id="absenz-bezeichnung"
                type="text"
                value={bezeichnung}
                onChange={(e) => setBezeichnung(e.target.value)}
                placeholder="Optional"
                maxLength={200}
              />
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert>
              <AlertDescription>Absenz erfolgreich gespeichert.</AlertDescription>
            </Alert>
          )}

          <Button type="submit" disabled={loading}>
            {loading ? "Speichern..." : "Absenz erfassen"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
