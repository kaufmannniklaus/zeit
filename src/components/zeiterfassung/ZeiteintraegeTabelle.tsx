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
import { formatiereDauer } from "@/lib/zeit-utils";
import type { ZeitEintrag } from "@/types";

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

export function ZeiteintraegeTabelle({
  eintraege,
  onEdit,
  onDelete,
  loading,
}: ZeiteintraegeProps) {
  if (loading) {
    return (
      <p className="text-center text-muted-foreground py-8">
        Lade Eintraege...
      </p>
    );
  }

  if (eintraege.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-8">
        Noch keine Eintraege vorhanden.
      </p>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
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
              <TableCell>{formatDatum(eintrag.datum)}</TableCell>
              <TableCell>{eintrag.startzeit}</TableCell>
              <TableCell>{eintrag.endzeit}</TableCell>
              <TableCell>{eintrag.pauseDauer}m</TableCell>
              <TableCell>{formatiereDauer(eintrag.effektivzeit)}</TableCell>
              <TableCell className="max-w-[200px] truncate">
                {eintrag.notiz || "-"}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEdit(eintrag)}
                  >
                    Bearbeiten
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger
                      render={
                        <Button variant="destructive" size="sm" />
                      }
                    >
                      Loeschen
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          Eintrag loeschen?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          Moechten Sie den Zeiteintrag vom{" "}
                          {formatDatum(eintrag.datum)} wirklich loeschen? Diese
                          Aktion kann nicht rueckgaengig gemacht werden.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => onDelete(eintrag.id)}
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
  );
}
