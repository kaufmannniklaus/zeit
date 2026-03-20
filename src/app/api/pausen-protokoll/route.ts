import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const PostSchema = z.object({
  datum: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  erfassteMinuten: z.number().int().min(0),
  effektiveMinuten: z.number().int().min(0),
  zeitNachgeholt: z.boolean().nullable().optional(),
});

export async function GET() {
  const eintraege = await prisma.pausenProtokoll.findMany({
    orderBy: { datum: "desc" },
    take: 90,
  });

  const bilanzMinuten = eintraege.reduce(
    (sum, e) => sum + (e.effektiveMinuten - e.erfassteMinuten),
    0
  );

  return NextResponse.json({ eintraege, bilanzMinuten });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = PostSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Ungültige Eingabe" }, { status: 400 });
  }

  const { datum, erfassteMinuten, effektiveMinuten, zeitNachgeholt } = parsed.data;

  const eintrag = await prisma.pausenProtokoll.create({
    data: {
      datum: new Date(datum),
      erfassteMinuten,
      effektiveMinuten,
      zeitNachgeholt: zeitNachgeholt ?? null,
    },
  });

  return NextResponse.json({ eintrag }, { status: 201 });
}
