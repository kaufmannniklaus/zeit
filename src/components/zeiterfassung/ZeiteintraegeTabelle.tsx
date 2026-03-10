"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { formatiereDauer } from "@/lib/zeit-utils";
import type { ZeitEintrag } from "@/types";
import { Pencil, Trash2 } from "lucide-react";

interface ZeiteintraegeProps {
  eintraege: ZeitEintrag[];
  onEdit: (eintrag: ZeitEintrag) => void;
  onDelete: (id: string) => void;
  loading: boolean;
}

function formatDatum(isoDate: string): string {
  const [year, month, day] = isoDate.split("-");
  return `${day}.${month}.${year}`;
}

function formatWochentag(isoDate: string): string {
  const date = new Date(isoDate + "T00:00:00");
  return date.toLocaleDateString("de-CH", { weekday: "short" });
}

function SkeletonRow() {
  return (
    <TableRow>
      {Array.from({ length: 7 }).map((_, i) => (
        <TableCell key={i}>
          <div className="h-4 w-16 animate-pulse rounded bg-muted" />
        </TableCell>
      ))}
    </TableRow>
  );
}

export function ZeiteintraegeTabelle({
  eintraege,
  onEdit,
  onDelete,
  loading,
}: ZeiteintraegeProps) {
  if (loading) {
    return (
      <div className="rounded-lg border shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead>Datum</TableHead>
              <TableHead>Von</TableHead>
              <TableHead>Bis</TableHead>
              <TableHead>Pause</TableHead>
              <TableHead>Effektiv</TableHead>
              <TableHead className="hidden sm:table-cell">Notiz</TableHead>
              <TableHead className="text-right">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonRow key={i} />
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (eintraege.length === 0) {
    return (
      <Card className="shadow-sm">
        <CardContent className="py-16 text-center">
          <p className="text-sm text-muted-foreground">
            Noch keine Einträge vorhanden. Erfasse deinen ersten Arbeitstag oben.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {/* Desktop-Tabelle */}
      <div className="hidden sm:block rounded-lg border shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead>Datum</TableHead>
              <TableHead>Von</TableHead>
              <TableHead>Bis</TableHead>
              <TableHead>Pause</TableHead>
              <TableHead>Effektiv</TableHead>
              <TableHead>Notiz</TableHead>
              <TableHead className="text-right">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {eintraege.map((eintrag) => (
              <TableRow key={eintrag.id}>
                <TableCell className="font-medium">
                  <span className="text-muted-foreground text-xs mr-1.5">
                    {formatWochentag(eintrag.datum)}
                  </span>
                  {formatDatum(eintrag.datum)}
                </TableCell>
                <TableCell>{eintrag.startzeit}</TableCell>
                <TableCell>{eintrag.endzeit}</TableCell>
                <TableCell>{eintrag.pauseDauer}m</TableCell>
                <TableCell className="font-medium">
                  {formatiereDauer(eintrag.effektivzeit)}
                </TableCell>
                <TableCell className="max-w-[200px] truncate text-muted-foreground">
                  {eintrag.notiz || "-"}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(eintrag)}
                      aria-label={`Eintrag vom ${formatDatum(eintrag.datum)} bearbeiten`}
                    >
                      <Pencil className="h-4 w-4" />
                      <span className="sr-only lg:not-sr-only lg:ml-1">
                        Bearbeiten
                      </span>
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger
                        render={
                          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10" />
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only lg:not-sr-only lg:ml-1">
                          Loeschen
                        </span>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            Eintrag loeschen?
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            Moechtest du den Zeiteintrag vom{" "}
                            {formatDatum(eintrag.datum)} wirklich loeschen? Diese
                            Aktion kann nicht rueckgaengig gemacht werden.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => onDelete(eintrag.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Loeschen
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Karten-Ansicht */}
      <div className="sm:hidden space-y-3">
        {eintraege.map((eintrag) => (
          <Card key={eintrag.id} className="shadow-sm">
            <CardHeader className="pb-2 pt-4 px-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs text-muted-foreground mr-1.5">
                    {formatWochentag(eintrag.datum)}
                  </span>
                  <span className="font-medium">
                    {formatDatum(eintrag.datum)}
                  </span>
                </div>
                <span className="text-sm font-semibold">
                  {formatiereDauer(eintrag.effektivzeit)}
                </span>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-3 pt-0">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>{eintrag.startzeit} - {eintrag.endzeit}</span>
                <span>Pause: {eintrag.pauseDauer}m</span>
              </div>
              {eintrag.notiz && (
                <p className="mt-1 text-xs text-muted-foreground truncate">
                  {eintrag.notiz}
                </p>
              )}
              <div className="flex justify-end gap-1 mt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit(eintrag)}
                  aria-label={`Eintrag vom ${formatDatum(eintrag.datum)} bearbeiten`}
                >
                  <Pencil className="h-4 w-4 mr-1" />
                  Bearbeiten
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger
                    render={
                      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10" />
                    }
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Loeschen
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Eintrag loeschen?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Moechtest du den Zeiteintrag vom{" "}
                        {formatDatum(eintrag.datum)} wirklich loeschen?
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => onDelete(eintrag.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Loeschen
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
