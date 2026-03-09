import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AbsenzSchema } from "@/lib/validierung";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = AbsenzSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Ungueltige Eingabe", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { datum, typ, bezeichnung } = parsed.data;

    const existing = await prisma.absenz.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Absenz nicht gefunden" },
        { status: 404 }
      );
    }

    const record = await prisma.absenz.update({
      where: { id },
      data: {
        datum: new Date(datum + "T00:00:00.000Z"),
        typ,
        bezeichnung: bezeichnung ?? null,
      },
    });

    const data = {
      ...record,
      datum: record.datum.toISOString().split("T")[0],
      erstelltAm: record.erstelltAm.toISOString(),
    };

    return NextResponse.json({ data });
  } catch (error) {
    console.error("PUT /api/absenzen/[id] error:", error);
    return NextResponse.json(
      { error: "Fehler beim Aktualisieren der Absenz" },
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

    const existing = await prisma.absenz.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Absenz nicht gefunden" },
        { status: 404 }
      );
    }

    await prisma.absenz.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/absenzen/[id] error:", error);
    return NextResponse.json(
      { error: "Fehler beim Loeschen der Absenz" },
      { status: 500 }
    );
  }
}
