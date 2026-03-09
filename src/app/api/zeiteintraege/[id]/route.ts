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

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const record = await prisma.zeiteintrag.findUnique({ where: { id } });

    if (!record) {
      return NextResponse.json(
        { error: "Zeiteintrag nicht gefunden." },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: serializeEintrag(record) });
  } catch (error) {
    console.error("GET /api/zeiteintraege/[id] error:", error);
    return NextResponse.json(
      { error: "Fehler beim Laden des Zeiteintrags." },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    const existing = await prisma.zeiteintrag.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Zeiteintrag nicht gefunden." },
        { status: 404 }
      );
    }

    const effektivzeit = berechneEffektivzeit(startzeit, endzeit, pauseDauer);

    const record = await prisma.zeiteintrag.update({
      where: { id },
      data: {
        datum: new Date(datum),
        startzeit: new Date(`1970-01-01T${startzeit}:00.000Z`),
        endzeit: new Date(`1970-01-01T${endzeit}:00.000Z`),
        pauseDauer,
        effektivzeit,
        notiz: notiz ?? null,
      },
    });

    return NextResponse.json({ data: serializeEintrag(record) });
  } catch (error) {
    console.error("PUT /api/zeiteintraege/[id] error:", error);
    return NextResponse.json(
      { error: "Fehler beim Aktualisieren des Zeiteintrags." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await prisma.zeiteintrag.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Zeiteintrag nicht gefunden." },
        { status: 404 }
      );
    }

    await prisma.zeiteintrag.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/zeiteintraege/[id] error:", error);
    return NextResponse.json(
      { error: "Fehler beim Loeschen des Zeiteintrags." },
      { status: 500 }
    );
  }
}
