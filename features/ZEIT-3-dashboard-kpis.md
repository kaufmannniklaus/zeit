# ZEIT-3: Dashboard, Absenzen & KPIs

**Status:** In Review

## User Stories
- Als Benutzer möchte ich meine Überstunden, Durchschnittszeiten und den 26-Wochen-Schnitt sehen.
- Als Benutzer möchte ich wissen, wie viele Stunden ich nächste Woche arbeiten darf (CZV 1).
- Als Benutzer möchte ich Ferien, Krankheit und Feiertage eintragen können.

## Acceptance Criteria
- [ ] 6 KPI-Karten: Überstunden, Ø Woche, Ø Tag, 26W-Schnitt, Erlaubte Std. nächste Woche, Sollstunden
- [ ] Überstunden: grün (positiv) oder rot (negativ)
- [ ] CZV-1 Ampel: grün ≥ Sollstunden, gelb < Sollstunden, rot = 0
- [ ] Absenz-Formular: Datum, Typ (Ferien/Krank/Feiertag/Sonstiges), Bezeichnung
- [ ] Absenz-Tabelle mit farbigen Badges und Löschen
- [ ] Einstellungsseite für Sollstunden/Woche

## KPI-Formeln
- **Überstunden** = Σ(effektivzeit) - (Anzahl KW × Sollstunden/KW)
- **Ø Woche** = Σ(effektivzeit) / Anzahl KW mit Einträgen
- **Ø Tag** = Σ(effektivzeit) / Anzahl Tage mit Einträgen
- **26W-Schnitt** = Σ(letzter 182 Tage) / 26
- **CZV-1**: wenn 26W-Schnitt ≤ 48h → 48h erlaubt; sonst max(0, 48×26 - Σ(letzter 25 Wochen))

## API Routes
- `GET /api/kpis` – Alle KPIs berechnet
- `GET /api/absenzen` – Liste (von, bis, typ, limit)
- `POST /api/absenzen` – Erstellen
- `PUT /api/absenzen/[id]` – Aktualisieren
- `DELETE /api/absenzen/[id]` – Löschen
- `GET /api/einstellungen` – Singleton lesen
- `PUT /api/einstellungen` – Singleton aktualisieren

## Components
- `KpiKarte` – Einzelne KPI-Karte
- `AbsenzenForm` – Eingabeformular
- `AbsenzenTabelle` – Tabelle mit Badges

---

## QA Test Results

**Tested:** 2026-03-09
**App URL:** http://localhost:3000
**Tester:** QA Engineer (AI) -- Code Review & Static Analysis

### Acceptance Criteria Status

#### AC-1: 6 KPI-Karten
- [x] "Ueberstunden" card present
- [x] "Oe Woche" (Durchschnitt pro Woche) card present with subtitle
- [x] "Oe Tag" (Durchschnitt pro Tag) card present with subtitle
- [x] "26-Wochen-Schnitt" card present with subtitle
- [x] "Erlaubt naechste Woche" card present
- [x] "Sollstunden / Woche" card present
- [x] All use KpiKarte component with shadcn Card
- [x] Loading state shows "..." for all values

#### AC-2: Ueberstunden: gruen (positiv) oder rot (negativ)
- [ ] **BUG: Color logic is INVERTED.** DashboardClient.tsx lines 73-78:
  - `ueberstundenMinuten > 0` => `"rot"` (should be `"gruen"` per spec)
  - `ueberstundenMinuten < 0` => `"gruen"` (should be `"rot"` per spec)
  - The spec explicitly states "gruen (positiv) oder rot (negativ)"

#### AC-3: CZV-1 Ampel: gruen >= Sollstunden, gelb < Sollstunden, rot = 0
- [ ] **BUG: CZV-1 Ampel not implemented.** The "Erlaubt naechste Woche" KPI card has a hardcoded `farbe="gelb"`. There is no conditional logic comparing erlaubteMinutenNaechsteWoche against Sollstunden. The spec requires:
  - Green when erlaubt >= Sollstunden
  - Yellow when erlaubt < Sollstunden
  - Red when erlaubt = 0

#### AC-4: Absenz-Formular: Datum, Typ, Bezeichnung
- [x] Date input with label "Datum"
- [x] Select with options: Ferien, Krank, Feiertag, Sonstiges
- [x] Optional text input for "Bezeichnung" (maxLength=200)
- [x] Client-side validation: datum and typ are required
- [x] Server-side Zod validation with AbsenzSchema
- [x] Duplicate check: same date + type returns 409
- [x] Success message shown after save
- [x] Form resets after successful submission
- [x] Loading state during save

#### AC-5: Absenz-Tabelle mit farbigen Badges und Loeschen
- [x] Table with columns: Datum, Typ, Bezeichnung, Aktionen
- [x] Color-coded badges per type:
  - FERIEN: blue (bg-blue-100 text-blue-800)
  - KRANK: red (bg-red-100 text-red-800)
  - FEIERTAG: yellow (bg-yellow-100 text-yellow-800)
  - SONSTIGES: gray (bg-gray-100 text-gray-800)
- [x] Delete with AlertDialog confirmation
- [x] Loading state and empty state

#### AC-6: Einstellungsseite fuer Sollstunden/Woche
- [x] Dedicated `/einstellungen` page
- [x] Input for "Sollstunden pro Woche" (step=0.5, min=1, max=60)
- [x] Input for "Ueberstunden-Anfangssaldo" (step=0.25, min=-500, max=500)
- [x] GET /api/einstellungen loads current values
- [x] PUT /api/einstellungen saves with Zod validation
- [x] Success and error feedback
- [x] Uses singleton pattern (id="singleton") with upsert

### KPI Formula Verification

#### Ueberstunden = sum(effektivzeit) - (Anzahl KW x Sollstunden/KW) + Saldo
- [x] `gesamtIstMinuten = alleEintraege.reduce(sum + effektivzeit)`
- [x] `anzahlKW = countDistinktKW(alleEintraege)` using ISO week
- [x] `gesamtSollMinuten = anzahlKW * sollMinutenProWoche`
- [x] `ueberstundenMinuten = ueberstundenSaldoMinuten + gesamtIstMinuten - gesamtSollMinuten`

#### Oe Woche = sum(effektivzeit) / Anzahl KW mit Eintraegen
- [x] `durchschnittWocheMinuten = gesamtIstMinuten / anzahlKW` (with 0 check)

#### Oe Tag = sum(effektivzeit) / Anzahl Tage mit Eintraegen
- [x] `durchschnittTagMinuten = gesamtIstMinuten / anzahlTage` (with 0 check)

#### 26W-Schnitt = sum(letzte 182 Tage) / 26
- [x] `vor26Wochen = subDays(heute, 182)`
- [x] Filters entries within range
- [x] `schnitt26WochenMinuten = summe26W / 26`

#### CZV-1
- [x] If 26W average <= 48h: 48h allowed
- [x] Else: max(0, 48*26*60 - sum(last 25 weeks))
- [x] 25 weeks = `subDays(heute, 175)`

### Edge Cases Status

#### EC-1: No entries at all
- [x] KPIs default to 0 when no entries exist
- [x] Division by zero protected (returns 0 when anzahlKW or anzahlTage is 0)

#### EC-2: Duplicate absenz (same date + type)
- [x] Server returns 409 Conflict with error message

#### EC-3: KPI API fetches ALL entries (no pagination)
- [ ] BUG: `GET /api/kpis` calls `prisma.zeiteintrag.findMany()` with no limit, loading ALL entries into memory. For a user with years of data, this could be slow and memory-intensive.

### Security Audit Results
- [ ] **CRITICAL: No authentication on ANY API route** (see ZEIT-1 BUG-1)
- [x] Zod validation on all POST/PUT routes
- [x] Absenz duplicate check prevents data corruption
- [x] Einstellung uses singleton pattern -- no user can create extra settings records

### Bugs Found

#### BUG-1: No authentication (shared with ZEIT-1)
- **Severity:** Critical
- **Reference:** ZEIT-1 BUG-1
- **Priority:** Fix before deployment -- BLOCKING

#### BUG-2: Ueberstunden color logic inverted
- **Severity:** Medium
- **Steps to Reproduce:**
  1. Have time entries resulting in positive overtime (worked more than Soll)
  2. Open Dashboard
  3. Expected: "Ueberstunden" card value shown in GREEN (per spec: "gruen (positiv)")
  4. Actual: Value shown in RED because code checks `> 0 => "rot"` and `< 0 => "gruen"`
- **Code Location:** `src/components/dashboard/DashboardClient.tsx` lines 73-78
- **Priority:** Fix before deployment

#### BUG-3: CZV-1 Ampel not implemented -- always yellow
- **Severity:** Medium
- **Steps to Reproduce:**
  1. Open Dashboard
  2. "Erlaubt naechste Woche" card always shows yellow color
  3. Expected: Color changes based on comparison with Sollstunden:
     - Green: erlaubt >= Sollstunden
     - Yellow: erlaubt < Sollstunden
     - Red: erlaubt = 0
  4. Actual: Hardcoded `farbe="gelb"`
- **Code Location:** `src/components/dashboard/DashboardClient.tsx` line 128
- **Priority:** Fix before deployment

#### BUG-4: KPI endpoint loads all entries without limit
- **Severity:** Low
- **Steps to Reproduce:**
  1. Have thousands of time entries in database
  2. Load Dashboard
  3. Expected: Efficient query with reasonable performance
  4. Actual: All entries loaded into memory at once
- **Note:** For a personal time tracker this is unlikely to be a real issue (a few years = ~1000 entries), but violates backend rules about using `.limit()` on all list queries.
- **Priority:** Nice to have

#### BUG-5: Absenzen not deducted from Sollstunden in KPI calculation
- **Severity:** Medium
- **Steps to Reproduce:**
  1. Add a "FERIEN" absence for a workday
  2. Check Ueberstunden KPI
  3. Expected: The Soll for that week should be reduced (vacation day should not count as a missing work day)
  4. Actual: The KPI calculation in `kpi-berechnung.ts` does NOT consider absences at all. `berechneKpis()` only receives `alleEintraege` (Zeiteintrag records), not Absenz records. A vacation week still counts full Sollstunden, making overtime calculation incorrect.
- **Priority:** Fix in next sprint (functional correctness issue)

### Summary
- **Acceptance Criteria:** 4/6 passed, 2 failed (AC-2 color inversion, AC-3 CZV Ampel missing)
- **Bugs Found:** 5 total (1 critical [shared], 0 high, 3 medium, 1 low)
- **Security:** CRITICAL -- no authentication (shared issue)
- **Production Ready:** NO
- **Recommendation:** Fix ZEIT-1 BUG-1 (middleware) first. Then fix BUG-2 (color inversion), BUG-3 (CZV Ampel), and BUG-5 (absences in KPI) before deployment.
