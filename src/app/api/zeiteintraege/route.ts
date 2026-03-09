import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ZeitEintragSchema } from "@/lib/validierung";
import {
  berechneEffektivzeit,
  zeitStringZuMinuten,
  datumZuString,
  datumZuZeitString,
} from "@/lib/zeit-utils";

function serializeEintrag(record: {
  id: string;
  datum: Date;
  startzeit: Date;
  endzeit: Date;
  pauseDauer: number;
  effektivzeit: number;
  notiz: string | null;
  erstelltAm: Date;
  aktualisiertAm: Date;
}) {
  return {
    id: record.id,
    datum: datumZuString(record.datum),
    startzeit: datumZuZeitString(record.startzeit),
    endzeit: datumZuZeitString(record.endzeit),
    pauseDauer: record.pauseDauer,
    effektivzeit: record.effektivzeit,
    notiz: record.notiz,
    erstelltAm: record.erstelltAm.toISOString(),
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const von = searchParams.get("von");
    const bis = searchParams.get("bis");
    const limit = Math.min(
      Math.max(1, Number(searchParams.get("limit")) || 100),
      200
    );
    const offset = Math.max(0, Number(searchParams.get("offset")) || 0);

    const where: Record<string, unknown> = {};
    if (von || bis) {
      where.datum = {};
      if (von) (where.datum as Record<string, unknown>).gte = new Date(von);
      if (bis) (where.datum as Record<string, unknown>).lte = new Date(bis);
    }

    const [records, total] = await Promise.all([
      prisma.zeiteintrag.findMany({
        where,
        orderBy: [{ datum: "desc" }, { erstelltAm: "desc" }],
        take: limit,
        skip: offset,
      }),
      prisma.zeiteintrag.count({ where }),
    ]);

    return NextResponse.json({
      data: records.map(serializeEintrag),
      total,
    });
  } catch (error) {
    console.error("GET /api/zeiteintraege error:", error);
    return NextResponse.json(
      { error: "Fehler beim Laden der Zeiteintraege." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = ZeitEintragSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Ungueltige Eingabe.", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { datum, startzeit, endzeit, pauseDauer, notiz } = parsed.data;

    const startMinuten = zeitStringZuMinuten(startzeit);
    const endMinuten = zeitStringZuMinuten(endzeit);

    if (endMinuten <= startMinuten) {
      return NextResponse.json(
        { error: "Die Endzeit muss nach der Startzeit liegen." },
        { status: 400 }
      );
    }

    if (pauseDauer >= endMinuten - startMinuten) {
      return NextResponse.json(
        {
          error:
            "Die Pausendauer muss kleiner als die Differenz zwischen Start- und Endzeit sein.",
        },
        { status: 400 }
      );
    }

    const effektivzeit = berechneEffektivzeit(startzeit, endzeit, pauseDauer);

    const record = await prisma.zeiteintrag.create({
      data: {
        datum: new Date(datum),
        startzeit: new Date(`1970-01-01T${startzeit}:00.000Z`),
        endzeit: new Date(`1970-01-01T${endzeit}:00.000Z`),
        pauseDauer,
        effektivzeit,
        notiz: notiz ?? null,
      },
    });

    return NextResponse.json({ data: serializeEintrag(record) }, { status: 201 });
  } catch (error) {
    console.error("POST /api/zeiteintraege error:", error);
    return NextResponse.json(
      { error: "Fehler beim Erstellen des Zeiteintrags." },
      { status: 500 }
    );
  }
}
