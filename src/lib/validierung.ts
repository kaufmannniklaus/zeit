import { z } from "zod";

export const ZeitEintragSchema = z.object({
  datum: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Ungültiges Datum (YYYY-MM-DD)"),
  startzeit: z.string().regex(/^\d{2}:\d{2}$/, "Ungültige Startzeit (HH:MM)"),
  endzeit: z.string().regex(/^\d{2}:\d{2}$/, "Ungültige Endzeit (HH:MM)"),
  pauseDauer: z.number().int().min(0).max(480),
  notiz: z.string().max(500).optional(),
});

export const AbsenzSchema = z.object({
  datum: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Ungültiges Datum (YYYY-MM-DD)"),
  typ: z.enum(["FERIEN", "KRANK", "FEIERTAG", "SONSTIGES"]),
  bezeichnung: z.string().max(200).optional(),
});

export const EinstellungSchema = z.object({
  sollstundenProWoche: z.number().min(1).max(60),
  ueberstundenSaldoStunden: z.number().min(-500).max(500).optional(),
});

export const LoginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});
