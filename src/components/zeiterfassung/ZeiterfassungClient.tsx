"use client";

import { useCallback, useEffect, useState } from "react";
import { ZeiterfassungForm } from "./ZeiterfassungForm";
import { ZeiteintraegeTabelle } from "./ZeiteintraegeTabelle";
import type { ZeitEintrag } from "@/types";

export function ZeiterfassungClient() {
  const [eintraege, setEintraege] = useState<ZeitEintrag[]>([]);
  const [loading, setLoading] = useState(true);
  const [editEntry, setEditEntry] = useState<ZeitEintrag | null>(null);

  const fetchEintraege = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/zeiteintraege?limit=200");
      if (!res.ok) throw new Error("Fehler beim Laden");
      const json = await res.json();
      setEintraege(json.data);
    } catch (error) {
      console.error("Fehler beim Laden der Eintraege:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEintraege();
  }, [fetchEintraege]);

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/zeiteintraege/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Fehler beim Loeschen");
      await fetchEintraege();
    } catch (error) {
      console.error("Fehler beim Loeschen:", error);
    }
  };

  const handleEdit = (eintrag: ZeitEintrag) => {
    setEditEntry(eintrag);
  };

  const handleCancelEdit = () => {
    setEditEntry(null);
  };

  const handleSuccess = () => {
    setEditEntry(null);
    fetchEintraege();
  };

  return (
    <div className="space-y-8">
      <ZeiterfassungForm
        onSuccess={handleSuccess}
        editEntry={editEntry}
        onCancelEdit={handleCancelEdit}
      />
      <ZeiteintraegeTabelle
        eintraege={eintraege}
        onEdit={handleEdit}
        onDelete={handleDelete}
        loading={loading}
      />
    </div>
  );
}
