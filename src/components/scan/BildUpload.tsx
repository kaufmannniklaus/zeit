"use client";

import { useState, useRef, useCallback } from "react";
import { Upload } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { OcrResult } from "@/types/ocr";

interface BildUploadProps {
  onOcrComplete: (result: OcrResult) => void;
}

const ERLAUBTE_TYPEN = [
  "image/jpeg",
  "image/png",
  "application/pdf",
];

function formatDateiGroesse(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function BildUpload({ onOcrComplete }: BildUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [vorschauUrl, setVorschauUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const verarbeiteFile = useCallback((file: File) => {
    setError(null);

    if (!ERLAUBTE_TYPEN.includes(file.type)) {
      setError("Nur JPEG, PNG und PDF Dateien sind erlaubt.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("Die Datei ist zu gross. Maximale Groesse: 10MB.");
      return;
    }

    setSelectedFile(file);

    if (file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      setVorschauUrl(url);
    } else {
      setVorschauUrl(null);
    }
  }, []);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) verarbeiteFile(file);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (file) verarbeiteFile(file);
  }

  function handleZoneClick() {
    inputRef.current?.click();
  }

  async function starteOcr() {
    if (!selectedFile) return;

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("bild", selectedFile);

      const response = await fetch("/api/ocr", {
        method: "POST",
        body: formData,
      });

      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.error || "OCR-Verarbeitung fehlgeschlagen");
      }

      onOcrComplete(json.data);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "OCR-Verarbeitung fehlgeschlagen"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <div
          role="button"
          tabIndex={0}
          aria-label="Bild zum Hochladen auswaehlen oder hierher ziehen"
          onClick={handleZoneClick}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") handleZoneClick();
          }}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`flex min-h-[200px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
            dragActive
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-primary/50"
          }`}
        >
          <Upload className="mb-3 h-10 w-10 text-muted-foreground" />
          <p className="text-sm font-medium">
            Bild hierher ziehen oder klicken zum Auswaehlen
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            JPEG, PNG oder PDF (max. 10MB)
          </p>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,application/pdf"
          onChange={handleFileChange}
          className="hidden"
          aria-hidden="true"
        />

        {selectedFile && (
          <div className="flex items-center gap-4 rounded-lg border p-3">
            {vorschauUrl ? (
              <img
                src={vorschauUrl}
                alt="Vorschau"
                className="h-16 w-16 rounded object-cover"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded bg-muted text-xs font-medium text-muted-foreground">
                PDF
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-medium">
                {selectedFile.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatDateiGroesse(selectedFile.size)}
              </p>
            </div>
            <Button onClick={starteOcr} disabled={loading}>
              {loading ? "Wird verarbeitet..." : "OCR starten"}
            </Button>
          </div>
        )}

        {loading && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Bild wird analysiert...
            </p>
            <Progress value={null} className="animate-pulse" />
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
