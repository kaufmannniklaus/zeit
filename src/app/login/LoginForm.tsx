"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Clock } from "lucide-react";

export default function LoginForm() {
  const searchParams = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [fehler, setFehler] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setFehler(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        setFehler(data.error || "Login fehlgeschlagen");
        return;
      }

      // Nur relative Pfade erlaubt (Open-Redirect-Schutz)
      const raw = searchParams.get("redirect") || "/zeiterfassung";
      const redirect =
        raw.startsWith("/") && !raw.startsWith("//") ? raw : "/zeiterfassung";
      window.location.href = redirect;
    } catch {
      setFehler("Verbindungsfehler. Bitte versuche es erneut.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-sidebar">
      <div className="w-full max-w-sm">
        {/* Logo & App-Name */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-sidebar-primary flex items-center justify-center mb-5 shadow-lg">
            <Clock className="h-8 w-8 text-sidebar-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-sidebar-foreground tracking-tight">
            Zeit
          </h1>
          <p className="text-sm text-sidebar-foreground/50 mt-1">
            Persönliche Zeiterfassung
          </p>
        </div>

        {/* Login Card */}
        <Card className="shadow-2xl border-0">
          <CardContent className="p-6 pt-6">
            <form onSubmit={handleLogin} className="space-y-4">
              {fehler && (
                <Alert variant="destructive">
                  <AlertDescription>{fehler}</AlertDescription>
                </Alert>
              )}
              <div className="space-y-2">
                <Label htmlFor="username">Benutzername</Label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  required
                  disabled={loading}
                  placeholder="Benutzername"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Passwort</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                  disabled={loading}
                  placeholder="••••••••"
                />
              </div>
              <Button type="submit" className="w-full mt-2" disabled={loading}>
                {loading ? "Anmelden…" : "Anmelden"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
