import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendePushNotification } from "@/lib/push-service";
import { naechsteArvNotification, type Pause } from "@/lib/arv-berechnung";

export async function POST() {
  try {
    const jetzt = new Date();

    // Heutige Session mit fälliger Benachrichtigung suchen
    const draft = await prisma.tagessitzungDraft.findFirst({
      where: {
        abgeschlossen: false,
        naechsteNotAt: { lte: jetzt },
        naechsteNotTyp: { not: null },
      },
    });

    if (!draft) {
      return NextResponse.json({ sent: false });
    }

    const subscription = await prisma.pushSubscription.findFirst();
    if (!subscription) {
      return NextResponse.json({ sent: false, reason: "Keine Subscription." });
    }

    const pausen = draft.pausen as unknown as Pause[];
    const gesendeteNot = draft.gesendeteNot as unknown as string[];
    const notTyp = draft.naechsteNotTyp!;

    // Suche die passende Notification-Definition
    const notifMap: Record<string, { titel: string; body: string }> = {
      ARV_6H_30MIN: { titel: "ARV Erinnerung", body: "In 30 min sind 6h Arbeitszeit erreicht – mindestens 15 min Pause nötig." },
      ARV_6H_15MIN: { titel: "ARV Pause fällig!", body: "In 15 min Pause fällig. Bis 6h Arbeitszeit: mind. 15 min Pause." },
      ARV_9H_30MIN: { titel: "ARV Erinnerung", body: "In 30 min sind 9h Arbeitszeit erreicht – mindestens 30 min Pause total nötig." },
      ARV_9H_15MIN: { titel: "ARV Pause fällig!", body: "In 15 min Pause fällig. Bis 9h Arbeitszeit: mind. 30 min Pause total." },
    };

    const notif = notifMap[notTyp];
    if (notif) {
      await sendePushNotification(subscription, { ...notif, tag: notTyp });
    }

    // Als gesendet markieren und nächste berechnen
    const neueGesendete = [...gesendeteNot, notTyp];
    const naechste = naechsteArvNotification(draft.startzeit, pausen, neueGesendete);

    await prisma.tagessitzungDraft.update({
      where: { id: draft.id },
      data: {
        gesendeteNot: neueGesendete,
        naechsteNotAt: naechste?.faelligUm ?? null,
        naechsteNotTyp: naechste?.typ ?? null,
      },
    });

    return NextResponse.json({
      sent: true,
      typ: notTyp,
      naechsteNotAt: naechste?.faelligUm?.toISOString() ?? null,
    });
  } catch (error) {
    console.error("POST /api/push/check error:", error);
    return NextResponse.json({ error: "Fehler beim Check." }, { status: 500 });
  }
}
