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
  gelb: "text-amber-600",
  standard: "text-foreground",
};

const hintergrundKlassen: Record<string, string> = {
  gruen: "border-green-200 bg-green-50/50",
  rot: "border-red-200 bg-red-50/50",
  gelb: "border-amber-200 bg-amber-50/50",
  standard: "",
};

export default function KpiKarte({
  titel,
  wert,
  untertitel,
  farbe = "standard",
}: KpiKarteProps) {
  const isLoading = wert === "...";

  return (
    <Card className={hintergrundKlassen[farbe]}>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {titel}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-8 w-24 animate-pulse rounded bg-muted" />
        ) : (
          <p className={`text-2xl font-bold tabular-nums ${farbKlassen[farbe]}`}>
            {wert}
          </p>
        )}
        {untertitel && (
          <p className="text-xs text-muted-foreground mt-1">{untertitel}</p>
        )}
      </CardContent>
    </Card>
  );
}
