import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AbsenzSchema } from "@/lib/validierung";
import { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const von = searchParams.get("von");
    const bis = searchParams.get("bis");
    const typ = searchParams.get("typ");
    const limit = Math.min(Number(searchParams.get("limit") ?? 100), 500);

    const where: Prisma.AbsenzWhereInput = {};

    if (von || bis) {
      where.datum = {};
      if (von) where.datum.gte = new Date(von + "T00:00:00.000Z");
      if (bis) where.datum.lte = new Date(bis + "T00:00:00.000Z");
    }

    if (typ) {
      where.typ = typ as Prisma.EnumAbsenzTypFilter["equals"];
    }

    const absenzen = await prisma.absenz.findMany({
      where,
      orderBy: { datum: "desc" },
      take: limit,
    });

    const data = absenzen.map((a) => ({
      ...a,
      datum: a.datum.toISOString().split("T")[0],
      erstelltAm: a.erstelltAm.toISOString(),
    }));

    return NextResponse.json({ data });
  } catch (error) {
    console.error("GET /api/absenzen error:", error);
    return NextResponse.json(
      { error: "Fehler beim Laden der Absenzen" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = AbsenzSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Ungueltige Eingabe", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { datum, typ, bezeichnung } = parsed.data;
    const datumDate = new Date(datum + "T00:00:00.000Z");

    // Duplikat-Pruefung: gleicher Tag + gleicher Typ
    const existing = await prisma.absenz.findFirst({
      where: { datum: datumDate, typ },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Absenz fuer dieses Datum und Typ existiert bereits" },
        { status: 409 }
      );
    }

    const record = await prisma.absenz.create({
      data: {
        datum: datumDate,
        typ,
        bezeichnung: bezeichnung ?? null,
      },
    });

    const data = {
      ...record,
      datum: record.datum.toISOString().split("T")[0],
      erstelltAm: record.erstelltAm.toISOString(),
    };

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error("POST /api/absenzen error:", error);
    return NextResponse.json(
      { error: "Fehler beim Erstellen der Absenz" },
      { status: 500 }
    );
  }
}
