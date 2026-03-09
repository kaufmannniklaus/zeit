import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { EinstellungSchema } from "@/lib/validierung";

const DEFAULT = { sollstundenProWoche: 42.0, ueberstundenSaldoMinuten: 0 };

export async function GET() {
  try {
    const einstellung = await prisma.einstellung.upsert({
      where: { id: "singleton" },
      update: {},
      create: { id: "singleton", ...DEFAULT },
    });

    return NextResponse.json({
      data: {
        sollstundenProWoche: einstellung.sollstundenProWoche,
        ueberstundenSaldoStunden: einstellung.ueberstundenSaldoMinuten / 60,
      },
    });
  } catch (error) {
    console.error("GET /api/einstellungen error:", error);
    return NextResponse.json(
      { error: "Fehler beim Laden der Einstellungen" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = EinstellungSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Ungueltige Eingabe", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { sollstundenProWoche, ueberstundenSaldoStunden } = parsed.data;
    const ueberstundenSaldoMinuten =
      ueberstundenSaldoStunden !== undefined
        ? Math.round(ueberstundenSaldoStunden * 60)
        : undefined;

    const record = await prisma.einstellung.upsert({
      where: { id: "singleton" },
      update: {
        sollstundenProWoche,
        ...(ueberstundenSaldoMinuten !== undefined && { ueberstundenSaldoMinuten }),
      },
      create: {
        id: "singleton",
        sollstundenProWoche,
        ueberstundenSaldoMinuten: ueberstundenSaldoMinuten ?? 0,
      },
    });

    return NextResponse.json({
      data: {
        sollstundenProWoche: record.sollstundenProWoche,
        ueberstundenSaldoStunden: record.ueberstundenSaldoMinuten / 60,
      },
    });
  } catch (error) {
    console.error("PUT /api/einstellungen error:", error);
    return NextResponse.json(
      { error: "Fehler beim Speichern der Einstellungen" },
      { status: 500 }
    );
  }
}
