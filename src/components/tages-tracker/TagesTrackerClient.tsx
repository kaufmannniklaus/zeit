"use client";

import { useEffect, useRef, useState } from "react";
import { Play, Coffee, Sunset, Save, Trash2, BellRing, BellOff, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  arvStatus,
  berechneNettoMinuten,
  berechnePausenDeadlines,
  gesamtPausenMinuten,
  pruefeFeierabendArv,
  type Pause,
} from "@/lib/arv-berechnung";
import { formatiereDauer, zeitStringZuMinuten } from "@/lib/zeit-utils";

interface Session {
  id: string;
  datum: string;
  startzeit: string;
  endzeit: string | null;
  pausen: Pause[];
  abgeschlossen: boolean;
  gesendeteNot: string[];
  naechsteNotAt: string | null;
}

type Phase = "KEIN_TAG" | "LAEUFT" | "FEIERABEND" | "PAUSEN_CHECK" | "ABGESCHLOSSEN";

type PausenCheckSchritt = "FRAGE_GEMACHT" | "FRAGE_NACHGEHOLT";

function jetzt(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

function jetztMinuten(): number {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

export function TagesTrackerClient() {
  const [session, setSession] = useState<Session | null>(null);
  const [phase, setPhase] = useState<Phase>("KEIN_TAG");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Formular-States (leer initialisiert um Hydration-Mismatch zu vermeiden)
  const [startInput, setStartInput] = useState("");
  const [endzeitInput, setEndzeitInput] = useState("");
  const [pauseInput, setPauseInput] = useState("");

  // Live-Timer
  const [tick, setTick] = useState(0);

  // Push
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);

  // ARV Feierabend-Warnung
  const [arvWarnung, setArvWarnung] = useState<string | null>(null);

  // Pausen-Ehrlichkeits-Check
  const [pausenCheckSchritt, setPausenCheckSchritt] = useState<PausenCheckSchritt>("FRAGE_GEMACHT");
  const [effektivePauseInput, setEffektivePauseInput] = useState("");

  const pushCheckRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Uhrzeit-Inputs nach Hydration setzen
  useEffect(() => {
    setStartInput(jetzt());
    setEndzeitInput(jetzt());
  }, []);

  // Session laden
  useEffect(() => {
    fetch("/api/tages-sitzung")
      .then((r) => r.json())
      .then(({ data }) => {
        if (data) {
          setSession(data);
          setPhase(data.abgeschlossen ? "ABGESCHLOSSEN" : "LAEUFT");
        }
      })
      .catch(() => null)
      .finally(() => setLoading(false));
  }, []);

  // Sekunden-Ticker
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 10000); // alle 10s reicht
    return () => clearInterval(id);
  }, []);

  // Push-Check alle 60s (solange Session aktiv)
  useEffect(() => {
    if (phase === "LAEUFT") {
      pushCheckRef.current = setInterval(() => {
        fetch("/api/push/check", { method: "POST" }).catch(() => null);
      }, 60_000);
    }
    return () => {
      if (pushCheckRef.current) clearInterval(pushCheckRef.current);
    };
  }, [phase]);

  // Push-Status prüfen
  useEffect(() => {
    if ("serviceWorker" in navigator && "PushManager" in window) {
      navigator.serviceWorker.ready.then((reg) => {
        reg.pushManager.getSubscription().then((sub) => {
          setPushEnabled(!!sub);
        });
      });
    }
  }, []);

  // --- Berechnungen ---
  const nettoMin = session
    ? berechneNettoMinuten(session.startzeit, jetztMinuten(), session.pausen)
    : 0;
  const gesamtPausen = session ? gesamtPausenMinuten(session.pausen) : 0;
  const status = arvStatus(nettoMin, gesamtPausen);
  const pausenDeadlines = session ? berechnePausenDeadlines(session.startzeit, session.pausen) : null;
  void tick; // Trigger re-render

  // --- Aktionen ---
  async function tagStarten() {
    setSaving(true);
    try {
      const res = await fetch("/api/tages-sitzung", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startzeit: startInput }),
      });
      const { data } = await res.json();
      setSession(data);
      setPhase("LAEUFT");
    } finally {
      setSaving(false);
    }
  }

  async function pauseHinzufuegen(minuten: number) {
    if (!session || minuten < 1) return;
    setSaving(true);
    try {
      const res = await fetch("/api/tages-sitzung", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aktion: "pause_hinzufuegen", minuten }),
      });
      const { data } = await res.json();
      setSession(data);
      setPauseInput("");
    } finally {
      setSaving(false);
    }
  }

  async function feierabendBestaetigen() {
    setEndzeitInput(jetzt());
    setPausenCheckSchritt("FRAGE_GEMACHT");
    setEffektivePauseInput(String(gesamtPausen));
    setPhase("PAUSEN_CHECK");
  }

  async function pausenCheckWeiter(effektiv: number, nachgeholt: boolean | null) {
    if (!session) return;
    // Protokoll nur speichern wenn es Pausen gab
    if (gesamtPausen > 0 || effektiv > 0) {
      await fetch("/api/pausen-protokoll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          datum: session.datum,
          erfassteMinuten: gesamtPausen,
          effektiveMinuten: effektiv,
          zeitNachgeholt: nachgeholt,
        }),
      }).catch(() => null);
    }
    setArvWarnung(null);
    setPhase("FEIERABEND");
  }

  async function tagSpeichern() {
    if (!session) return;

    // ARV >9h Check
    const feierabendArv = pruefeFeierabendArv(session.startzeit, endzeitInput, session.pausen);
    if (feierabendArv.verletzt) {
      setArvWarnung(
        `ARV: Es fehlen noch ${feierabendArv.fehlendeMinuten} min Pause. Bei mehr als 9h Arbeit sind 45 min Pause Pflicht. Trotzdem speichern?`
      );
      return;
    }

    await speichernBestaetigt();
  }

  async function speichernBestaetigt() {
    if (!session) return;
    setSaving(true);
    try {
      // Endzeit setzen
      await fetch("/api/tages-sitzung", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aktion: "endzeit_setzen", endzeit: endzeitInput }),
      });

      // Zeiteintrag erstellen
      const pauseGesamt = gesamtPausenMinuten(session.pausen);
      await fetch("/api/zeiteintraege", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          datum: session.datum,
          startzeit: session.startzeit,
          endzeit: endzeitInput,
          pauseDauer: pauseGesamt,
        }),
      });

      // Draft als abgeschlossen markieren
      await fetch("/api/tages-sitzung", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aktion: "abschliessen" }),
      });

      const res = await fetch("/api/tages-sitzung");
      const { data } = await res.json();
      setSession(data);
      setPhase("ABGESCHLOSSEN");
      setArvWarnung(null);
    } finally {
      setSaving(false);
    }
  }

  async function tagZuruecksetzen() {
    await fetch("/api/tages-sitzung", { method: "DELETE" });
    setSession(null);
    setPhase("KEIN_TAG");
    setStartInput(jetzt());
    setArvWarnung(null);
    setPausenCheckSchritt("FRAGE_GEMACHT");
    setEffektivePauseInput("");
  }

  async function pushAktivieren() {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      alert("Push-Benachrichtigungen werden in diesem Browser nicht unterstützt.");
      return;
    }
    setPushLoading(true);
    try {
      const { publicKey } = await fetch("/api/push/vapid-key").then((r) => r.json());
      if (!publicKey) {
        alert("Push-Service nicht konfiguriert (VAPID_PUBLIC_KEY fehlt).");
        return;
      }

      const reg = await navigator.serviceWorker.ready;
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        alert("Benachrichtigungen wurden abgelehnt.");
        return;
      }

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: publicKey,
      });

      const subJson = sub.toJSON();
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: subJson.endpoint,
          p256dh: subJson.keys?.p256dh,
          auth: subJson.keys?.auth,
        }),
      });

      setPushEnabled(true);
    } catch (err) {
      console.error("Push-Aktivierung fehlgeschlagen:", err);
      alert("Push-Aktivierung fehlgeschlagen.");
    } finally {
      setPushLoading(false);
    }
  }

  async function pushDeaktivieren() {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) await sub.unsubscribe();
    setPushEnabled(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-pulse text-muted-foreground">Laden…</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Push-Button */}
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={pushEnabled ? pushDeaktivieren : pushAktivieren}
          disabled={pushLoading}
          className="gap-2"
        >
          {pushEnabled ? (
            <>
              <BellRing className="h-4 w-4 text-indigo-500" />
              ARV Push aktiv
            </>
          ) : (
            <>
              <BellOff className="h-4 w-4" />
              ARV Push aktivieren
            </>
          )}
        </Button>
      </div>

      {/* ===== PHASE: KEIN TAG ===== */}
      {phase === "KEIN_TAG" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Play className="h-5 w-5 text-indigo-500" />
              Tag starten
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1 block">
                Startzeit
              </label>
              <Input
                type="time"
                value={startInput}
                onChange={(e) => setStartInput(e.target.value)}
                className="max-w-[160px] text-lg"
              />
            </div>
            <Button onClick={tagStarten} disabled={saving} className="gap-2">
              <Play className="h-4 w-4" />
              {saving ? "Starte…" : "Tag starten"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ===== PHASE: LAEUFT ===== */}
      {phase === "LAEUFT" && session && (
        <>
          {/* Live-Timer */}
          <Card className="border-indigo-200 dark:border-indigo-800">
            <CardContent className="pt-6">
              <div className="text-center space-y-1">
                <p className="text-sm text-muted-foreground">Netto-Arbeitszeit</p>
                <p className="text-5xl font-bold tracking-tight text-indigo-600 dark:text-indigo-400">
                  {formatiereDauer(nettoMin)}
                </p>
                <p className="text-sm text-muted-foreground">
                  Start: {session.startzeit} · Pausen: {formatiereDauer(gesamtPausen)}
                </p>
              </div>

              {/* ARV Status */}
              <div
                className={`mt-4 flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${
                  status.farbe === "gruen"
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                    : status.farbe === "gelb"
                    ? "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                    : "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300"
                }`}
              >
                {status.farbe === "gruen" ? (
                  <CheckCircle className="h-4 w-4 shrink-0" />
                ) : (
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                )}
                {status.text}
              </div>

              {/* Späteste Pausenzeiten */}
              {pausenDeadlines && (
                <div className="mt-3 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm">
                  <p className="text-xs font-medium text-muted-foreground mb-1.5">
                    Späteste Pausenzeiten
                  </p>
                  {pausenDeadlines.ersteDeadline && pausenDeadlines.zweiteDeadline ? (
                    <div className="flex justify-around">
                      <div className="flex flex-col items-center">
                        <span className="text-xs text-muted-foreground">1. Pause</span>
                        <span className="font-semibold tabular-nums text-base">{pausenDeadlines.ersteDeadline}</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <span className="text-xs text-muted-foreground">2. Pause</span>
                        <span className="font-semibold tabular-nums text-base">{pausenDeadlines.zweiteDeadline}</span>
                      </div>
                    </div>
                  ) : pausenDeadlines.naechsteDeadline ? (
                    <div className="flex flex-col items-center w-fit">
                      <span className="text-xs text-muted-foreground">
                        Nächste Pause ({pausenDeadlines.naechsteTyp === "sechs_stunden" ? "6h-Regel" : "9h-Regel"})
                      </span>
                      <span className="font-semibold tabular-nums text-base">{pausenDeadlines.naechsteDeadline}</span>
                    </div>
                  ) : null}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pause erfassen */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Coffee className="h-4 w-4" />
                Pause erfassen
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                {[15, 30, 45].map((min) => (
                  <Button
                    key={min}
                    variant="outline"
                    onClick={() => pauseHinzufuegen(min)}
                    disabled={saving}
                    className="flex-1"
                  >
                    +{min} min
                  </Button>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="Eigene Pausenzeit (min)"
                  value={pauseInput}
                  onChange={(e) => setPauseInput(e.target.value)}
                  min={1}
                  max={480}
                  className="flex-1"
                />
                <Button
                  variant="secondary"
                  onClick={() => pauseHinzufuegen(parseInt(pauseInput))}
                  disabled={saving || !pauseInput || parseInt(pauseInput) < 1}
                >
                  Hinzufügen
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Pausenliste */}
          {session.pausen.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Erfasste Pausen</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {session.pausen.map((p, i) => (
                    <div key={i} className="flex items-center justify-between text-sm py-1 border-b last:border-0">
                      <span className="text-muted-foreground">Pause {i + 1}</span>
                      <Badge variant="secondary">{p.minuten} min</Badge>
                    </div>
                  ))}
                  <div className="flex items-center justify-between text-sm pt-2 font-medium">
                    <span>Total</span>
                    <Badge>{gesamtPausen} min</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Feierabend + Reset */}
          <div className="flex gap-2">
            <Button onClick={feierabendBestaetigen} className="flex-1 gap-2" variant="default">
              <Sunset className="h-4 w-4" />
              Feierabend
            </Button>
            <Button variant="ghost" size="icon" onClick={tagZuruecksetzen} title="Tag zurücksetzen">
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </>
      )}

      {/* ===== PHASE: PAUSEN_CHECK ===== */}
      {phase === "PAUSEN_CHECK" && session && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Coffee className="h-4 w-4" />
              Pausen-Check
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Erfasste Pausen: <span className="font-medium text-foreground">{gesamtPausen} min</span>
            </p>

            {pausenCheckSchritt === "FRAGE_GEMACHT" && (
              <>
                <p className="text-sm font-medium">Wurden die Pausen effektiv gemacht?</p>
                <div className="flex gap-2">
                  <Button
                    className="flex-1"
                    onClick={() => pausenCheckWeiter(gesamtPausen, null)}
                  >
                    Ja, alles gemacht
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setPausenCheckSchritt("FRAGE_NACHGEHOLT")}
                  >
                    Nein
                  </Button>
                </div>
              </>
            )}

            {pausenCheckSchritt === "FRAGE_NACHGEHOLT" && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Effektive Pausenzeit (min)</label>
                  <Input
                    type="number"
                    min={0}
                    max={gesamtPausen}
                    value={effektivePauseInput}
                    onChange={(e) => setEffektivePauseInput(e.target.value)}
                    className="max-w-[140px]"
                    autoFocus
                  />
                </div>
                <p className="text-sm font-medium">Wurde die Differenz als Mehrarbeit nachgeholt?</p>
                <div className="flex gap-2">
                  <Button
                    className="flex-1"
                    onClick={() => pausenCheckWeiter(parseInt(effektivePauseInput) || 0, true)}
                    disabled={effektivePauseInput === ""}
                  >
                    Ja, nachgeholt
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => pausenCheckWeiter(parseInt(effektivePauseInput) || 0, false)}
                    disabled={effektivePauseInput === ""}
                  >
                    Nein
                  </Button>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setPausenCheckSchritt("FRAGE_GEMACHT")}>
                  Zurück
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* ===== PHASE: FEIERABEND ===== */}
      {phase === "FEIERABEND" && session && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sunset className="h-5 w-5 text-amber-500" />
              Tag abschliessen
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1 block">
                Endzeit
              </label>
              <Input
                type="time"
                value={endzeitInput}
                onChange={(e) => {
                  setEndzeitInput(e.target.value);
                  setArvWarnung(null);
                }}
                className="max-w-[160px] text-lg"
              />
            </div>

            {/* Zusammenfassung */}
            <div className="rounded-lg bg-muted/50 p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Start</span>
                <span className="font-medium">{session.startzeit}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Ende</span>
                <span className="font-medium">{endzeitInput}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Pausen</span>
                <span className="font-medium">{formatiereDauer(gesamtPausenMinuten(session.pausen))}</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="font-medium">Effektiv</span>
                <span className="font-bold text-indigo-600 dark:text-indigo-400">
                  {formatiereDauer(
                    Math.max(
                      0,
                      zeitStringZuMinuten(endzeitInput) -
                        zeitStringZuMinuten(session.startzeit) -
                        gesamtPausenMinuten(session.pausen)
                    )
                  )}
                </span>
              </div>
            </div>

            {/* ARV-Warnung */}
            {arvWarnung && (
              <div className="flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-amber-950 p-3 text-sm text-amber-700 dark:text-amber-300">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <div className="space-y-2">
                  <p>{arvWarnung}</p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={speichernBestaetigt} disabled={saving}>
                      Trotzdem speichern
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setArvWarnung(null)}>
                      Zurück
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {!arvWarnung && (
              <div className="flex gap-2">
                <Button onClick={tagSpeichern} disabled={saving} className="flex-1 gap-2">
                  <Save className="h-4 w-4" />
                  {saving ? "Speichert…" : "Speichern & Abschliessen"}
                </Button>
                <Button variant="ghost" onClick={() => setPhase("LAEUFT")}>
                  Zurück
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ===== PHASE: ABGESCHLOSSEN ===== */}
      {phase === "ABGESCHLOSSEN" && session && (
        <Card className="border-emerald-200 dark:border-emerald-800">
          <CardContent className="pt-6">
            <div className="text-center space-y-3">
              <CheckCircle className="h-10 w-10 text-emerald-500 mx-auto" />
              <p className="font-semibold text-lg">Tag abgeschlossen</p>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>
                  {session.startzeit} – {session.endzeit}
                </p>
                <p>Pausen: {formatiereDauer(gesamtPausenMinuten(session.pausen))}</p>
              </div>
              <Button variant="outline" onClick={tagZuruecksetzen} className="gap-2 mt-2">
                <Clock className="h-4 w-4" />
                Neuen Tag starten
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

