import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import bcrypt from "bcryptjs";
import { sessionOptions, SessionData } from "@/lib/session";
import { LoginSchema } from "@/lib/validierung";

// Einfaches In-Memory Rate Limiting: max. 10 Versuche pro IP in 15 Minuten
const loginVersuche = new Map<string, { count: number; resetAt: number }>();
const MAX_VERSUCHE = 10;
const FENSTER_MS = 15 * 60 * 1000;

function checkRateLimit(ip: string): boolean {
  const jetzt = Date.now();
  const eintrag = loginVersuche.get(ip);

  if (!eintrag || jetzt > eintrag.resetAt) {
    loginVersuche.set(ip, { count: 1, resetAt: jetzt + FENSTER_MS });
    return true;
  }

  if (eintrag.count >= MAX_VERSUCHE) return false;

  eintrag.count++;
  return true;
}

export async function POST(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";

  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: "Zu viele Versuche. Bitte warte 15 Minuten." },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const parsed = LoginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Ungültige Eingabe" },
        { status: 400 }
      );
    }

    const { username, password } = parsed.data;
    const expectedUsername = process.env.APP_USERNAME;
    const expectedHash = process.env.APP_PASSWORD_HASH;

    if (!expectedUsername || !expectedHash) {
      return NextResponse.json(
        { error: "Server-Konfigurationsfehler" },
        { status: 500 }
      );
    }

    const usernameMatch = username === expectedUsername;
    const passwordMatch = await bcrypt.compare(password, expectedHash);

    if (!usernameMatch || !passwordMatch) {
      return NextResponse.json(
        { error: "Ungültige Zugangsdaten" },
        { status: 401 }
      );
    }

    const response = NextResponse.json({ success: true });
    const session = await getIronSession<SessionData>(
      request,
      response,
      sessionOptions
    );
    session.isLoggedIn = true;
    await session.save();

    return response;
  } catch {
    return NextResponse.json({ error: "Serverfehler" }, { status: 500 });
  }
}
