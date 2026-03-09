"use client";

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";

interface KpiKarteProps {
  titel: string;
  wert: string;
  untertitel?: string;
  farbe?: "gruen" | "rot" | "gelb" | "standard";
}

const farbKlassen: Record<string, string> = {
  gruen: "text-green-600",
  rot: "text-red-600",
  gelb: "text-yellow-600",
  standard: "text-foreground",
};

export default function KpiKarte({
  titel,
  wert,
  untertitel,
  farbe = "standard",
}: KpiKarteProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {titel}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className={`text-2xl font-bold ${farbKlassen[farbe]}`}>{wert}</p>
        {untertitel && (
          <p className="text-xs text-muted-foreground mt-1">{untertitel}</p>
        )}
      </CardContent>
    </Card>
  );
}
