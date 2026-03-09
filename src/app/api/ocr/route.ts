import { NextRequest, NextResponse } from "next/server";
import { verarbeiteOcrBild } from "@/lib/ocr-service";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("bild") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "Kein Bild hochgeladen." },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "Datei ist zu gross. Maximale Groesse: 10MB." },
        { status: 400 }
      );
    }

    // MIME-Typ-Validierung
    const erlaubteMimeTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!erlaubteMimeTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Ungültiger Dateityp. Erlaubt: JPEG, PNG, WebP, PDF." },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const ergebnis = await verarbeiteOcrBild(buffer);

    return NextResponse.json({ data: ergebnis });
  } catch (error) {
    console.error("POST /api/ocr error:", error);
    return NextResponse.json(
      { error: "OCR-Verarbeitung fehlgeschlagen" },
      { status: 500 }
    );
  }
}
