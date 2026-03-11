import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const SubscribeSchema = z.object({
  endpoint: z.string().url(),
  p256dh: z.string().min(1),
  auth: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = SubscribeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Ungültige Subscription." }, { status: 400 });
    }

    await prisma.pushSubscription.upsert({
      where: { endpoint: parsed.data.endpoint },
      update: { p256dh: parsed.data.p256dh, auth: parsed.data.auth },
      create: parsed.data,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("POST /api/push/subscribe error:", error);
    return NextResponse.json({ error: "Fehler beim Speichern." }, { status: 500 });
  }
}
