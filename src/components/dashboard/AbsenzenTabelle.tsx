"use client";

import { useState } from "react";
import type { Absenz } from "@/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface AbsenzenTabelleProps {
  absenzen: Absenz[];
  onDelete: (id: string) => void;
  loading: boolean;
}

const typBadgeVarianten: Record<
  Absenz["typ"],
  { label: string; className: string }
> = {
  FERIEN: {
    label: "Ferien",
    className: "bg-blue-100 text-blue-800 hover:bg-blue-100",
  },
  KRANK: {
    label: "Krank",
    className: "bg-red-100 text-red-800 hover:bg-red-100",
  },
  FEIERTAG: {
    label: "Feiertag",
    className: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
  },
  SONSTIGES: {
    label: "Sonstiges",
    className: "bg-gray-100 text-gray-800 hover:bg-gray-100",
  },
};

function formatDatum(isoDate: string): string {
  const [year, month, day] = isoDate.split("-");
  return `${day}.${month}.${year}`;
}

export default function AbsenzenTabelle({
  absenzen,
  onDelete,
  loading,
}: AbsenzenTabelleProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function handleDelete(id: string) {
    setDeletingId(id);
    onDelete(id);
  }

  if (loading) {
    return (
      <div className="rounded-lg border shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead>Datum</TableHead>
              <TableHead>Typ</TableHead>
              <TableHead>Bezeichnung</TableHead>
              <TableHead className="text-right">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 3 }).map((_, i) => (
              <TableRow key={i}>
                {Array.from({ length: 4 }).map((_, j) => (
                  <TableCell key={j}>
                    <div className="h-4 w-16 animate-pulse rounded bg-muted" />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (absenzen.length === 0) {
    return (
      <p className="text-center text-sm text-muted-foreground py-10">
        Keine Absenzen vorhanden.
      </p>
    );
  }

  return (
    <div className="rounded-lg border shadow-sm overflow-hidden">
    <Table>
      <TableHeader>
        <TableRow className="bg-muted/40 hover:bg-muted/40">
          <TableHead>Datum</TableHead>
          <TableHead>Typ</TableHead>
          <TableHead>Bezeichnung</TableHead>
          <TableHead className="text-right">Aktionen</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {absenzen.map((absenz) => {
          const badge = typBadgeVarianten[absenz.typ];
          return (
            <TableRow key={absenz.id}>
              <TableCell>{formatDatum(absenz.datum)}</TableCell>
              <TableCell>
                <Badge variant="secondary" className={badge.className}>
                  {badge.label}
                </Badge>
              </TableCell>
              <TableCell>{absenz.bezeichnung ?? "-"}</TableCell>
              <TableCell className="text-right">
                <AlertDialog>
                  <AlertDialogTrigger
                    render={
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={deletingId === absenz.id}
                      />
                    }
                  >
                    {deletingId === absenz.id ? "..." : "Loeschen"}
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Absenz loeschen?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Diese Aktion kann nicht rueckgaengig gemacht werden. Die
                        Absenz vom {formatDatum(absenz.datum)} wird
                        unwiderruflich geloescht.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDelete(absenz.id)}
                      >
                        Loeschen
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
    </div>
  );
}
