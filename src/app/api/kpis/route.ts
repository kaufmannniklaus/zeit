import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { berechneKpis } from "@/lib/kpi-berechnung";

export async function GET() {
  try {
    const [eintraege, einstellung] = await Promise.all([
      prisma.zeiteintrag.findMany({
        select: { datum: true, effektivzeit: true },
      }),
      prisma.einstellung.upsert({
        where: { id: "singleton" },
        update: {},
        create: { id: "singleton", sollstundenProWoche: 42.0, ueberstundenSaldoMinuten: 0 },
      }),
    ]);

    const mapped = eintraege.map((e) => ({
      datum: e.datum,
      effektivzeit: e.effektivzeit,
    }));

    const kpiErgebnis = berechneKpis(
      mapped,
      einstellung.sollstundenProWoche,
      einstellung.ueberstundenSaldoMinuten
    );

    return NextResponse.json({ data: kpiErgebnis });
  } catch (error) {
    console.error("GET /api/kpis error:", error);
    return NextResponse.json(
      { error: "Fehler beim Berechnen der KPIs" },
      { status: 500 }
    );
  }
}
