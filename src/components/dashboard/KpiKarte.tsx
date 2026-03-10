"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface KpiKarteProps {
  titel: string;
  wert: string;
  untertitel?: string;
  farbe?: "gruen" | "rot" | "gelb" | "standard";
}

const farbKlassen: Record<string, string> = {
  gruen: "text-green-600",
  rot: "text-red-500",
  gelb: "text-amber-500",
  standard: "text-foreground",
};

const hintergrundKlassen: Record<string, string> = {
  gruen: "border-green-200/60 bg-green-50/40",
  rot: "border-red-200/60 bg-red-50/40",
  gelb: "border-amber-200/60 bg-amber-50/40",
  standard: "",
};

const akzentKlassen: Record<string, string> = {
  gruen: "bg-green-500",
  rot: "bg-red-500",
  gelb: "bg-amber-400",
  standard: "bg-primary/30",
};

export default function KpiKarte({
  titel,
  wert,
  untertitel,
  farbe = "standard",
}: KpiKarteProps) {
  const isLoading = wert === "...";

  return (
    <Card className={`relative overflow-hidden shadow-sm ${hintergrundKlassen[farbe]}`}>
      {/* Farbiger Akzentbalken oben */}
      <div className={`absolute top-0 left-0 right-0 h-0.5 ${akzentKlassen[farbe]}`} />
      <CardHeader className="pb-1 pt-5">
        <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {titel}
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-5">
        {isLoading ? (
          <div className="h-8 w-28 animate-pulse rounded-md bg-muted" />
        ) : (
          <p className={`text-2xl font-bold tabular-nums ${farbKlassen[farbe]}`}>
            {wert}
          </p>
        )}
        {untertitel && (
          <p className="text-xs text-muted-foreground mt-1.5">{untertitel}</p>
        )}
      </CardContent>
    </Card>
  );
}
