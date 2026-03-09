# ZEIT-1: Zeiterfassung

**Status:** In Review

## User Stories
- Als Benutzer möchte ich Start-, Endzeit und Pause für jeden Arbeitstag erfassen, damit ich meine effektive Arbeitszeit berechnen kann.
- Als Benutzer möchte ich vergangene Einträge bearbeiten und löschen können.
- Als Benutzer möchte ich die effektive Zeit sofort als Vorschau sehen, bevor ich speichere.

## Acceptance Criteria
- [ ] Formular mit Datum, Von, Bis, Pause (Min) und optionaler Notiz
- [ ] Live-Berechnung: "Effektive Zeit: Xh Ym"
- [ ] Fehlerhinweis wenn Endzeit ≤ Startzeit
- [ ] Liste aller Einträge, sortiert nach Datum absteigend
- [ ] Inline-Bearbeitung über Formular
- [ ] Löschung mit Bestätigungsdialog

## API Routes
- `GET /api/zeiteintraege` – Liste (von, bis, limit, offset)
- `POST /api/zeiteintraege` – Erstellen
- `GET /api/zeiteintraege/[id]` – Einzeleintrag
- `PUT /api/zeiteintraege/[id]` – Aktualisieren
- `DELETE /api/zeiteintraege/[id]` – Löschen

## Components
- `ZeiterfassungForm` – Formular mit Live-Berechnung
- `ZeiteintraegeTabelle` – Tabelle mit Aktionen

---

## QA Test Results

**Tested:** 2026-03-09
**App URL:** http://localhost:3000
**Tester:** QA Engineer (AI) -- Code Review & Static Analysis

### Acceptance Criteria Status

#### AC-1: Formular mit Datum, Von, Bis, Pause (Min) und optionaler Notiz
- [x] Form contains date input (type="date")
- [x] Form contains "Von" time input (type="time")
- [x] Form contains "Bis" time input (type="time")
- [x] Form contains "Pause in Minuten" number input (min=0, max=480)
- [x] Form contains optional "Notiz" text input (maxLength=500)
- [x] Zod validation enforces YYYY-MM-DD, HH:MM, int 0-480, string max 500

#### AC-2: Live-Berechnung "Effektive Zeit: Xh Ym"
- [x] Effektivzeit is calculated client-side using `berechneEffektivzeit()`
- [x] Displayed as "Effektive Zeit: {formatiereDauer(effektivzeit)}" with format "Xh Ym"
- [x] Shows "--" when time error is present

#### AC-3: Fehlerhinweis wenn Endzeit <= Startzeit
- [x] Client-side: `zeitFehler` variable checks `endMinuten <= startMinuten`
- [x] Shows destructive Alert with message
- [x] Server-side: POST and PUT routes check `endMinuten <= startMinuten` and return 400
- [x] Submit button disabled when `zeitFehler` is true

#### AC-4: Liste aller Eintraege, sortiert nach Datum absteigend
- [x] GET /api/zeiteintraege orders by `[{ datum: "desc" }, { erstelltAm: "desc" }]`
- [x] ZeiteintraegeTabelle renders all entries with columns: Datum, Von, Bis, Pause, Effektiv, Notiz, Aktionen
- [x] Empty state shown when no entries exist
- [x] Loading state shown while fetching

#### AC-5: Inline-Bearbeitung ueber Formular
- [x] "Bearbeiten" button calls onEdit which sets editEntry state
- [x] Form pre-fills with editEntry data via useEffect
- [x] PUT request sent to /api/zeiteintraege/[id]
- [x] Cancel button resets form and clears editEntry
- [x] Card title changes to "Eintrag bearbeiten" when editing

#### AC-6: Loeschung mit Bestaetigungsdialog
- [x] AlertDialog used with confirmation prompt
- [x] DELETE request sent to /api/zeiteintraege/[id]
- [x] Server checks existence before deleting, returns 404 if not found
- [x] Table refreshes after successful deletion

### Edge Cases Status

#### EC-1: Pause >= work duration
- [x] Server-side validation: `pauseDauer >= endMinuten - startMinuten` returns 400
- [x] Client-side validation: same check prevents submission

#### EC-2: Negative pause value
- [x] Zod schema enforces `z.number().int().min(0).max(480)`
- [x] HTML input has `min={0}`

#### EC-3: Very long notiz
- [x] Zod schema enforces `.max(500)`
- [x] HTML input has `maxLength={500}`
- [x] Table cell truncates with `max-w-[200px] truncate`

#### EC-4: Invalid date format in query params
- [x] `new Date(von)` will produce Invalid Date but no crash -- Prisma will reject it gracefully via try/catch
- [ ] BUG: No explicit validation of `von`/`bis` query params format -- invalid strings pass through to `new Date()` which may produce unexpected filter behavior (e.g. `?von=abc` produces `Invalid Date` passed to Prisma)

#### EC-5: Concurrent edits
- [ ] BUG: No optimistic locking -- if two browser tabs edit the same entry simultaneously, last write wins silently

### Security Audit Results

#### SEC-1: Authentication on API routes
- [ ] **CRITICAL BUG: No authentication check on ANY API route.** The file `src/proxy.ts` contains session-verification logic, but there is NO `middleware.ts` file at the project root or in `src/`. Next.js requires a file named exactly `middleware.ts` (or `.js`) to activate middleware. The proxy function is never called. All API routes (GET, POST, PUT, DELETE for zeiteintraege, absenzen, kpis, einstellungen, ocr) can be accessed by any unauthenticated user.

#### SEC-2: Authorization (multi-user data isolation)
- [x] N/A -- Single-user application by design (one set of credentials in env vars, no user_id column in DB)

#### SEC-3: Input injection (XSS)
- [x] React auto-escapes JSX output -- no `dangerouslySetInnerHTML` found
- [x] Zod validation on all input fields
- [x] Prisma parameterized queries prevent SQL injection

#### SEC-4: Rate limiting on auth endpoint
- [ ] BUG: No rate limiting on POST /api/auth/login -- brute-force attacks are possible

#### SEC-5: Open redirect via login redirect param
- [ ] BUG: LoginForm reads `searchParams.get("redirect")` and passes it directly to `window.location.href`. An attacker can craft a URL like `/login?redirect=https://evil.com` to redirect the user after login.

#### SEC-6: Security headers
- [ ] BUG: No security headers configured (X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Strict-Transport-Security). The `next.config.ts` has no `headers()` configuration.

#### SEC-7: Secrets in source control
- [x] `.env*` is in `.gitignore`
- [x] `.env.local.example` contains only placeholder values
- [ ] BUG: `.env` file exists with a dummy `DATABASE_URL` containing `johndoe:randompassword`. While this appears to be a placeholder, the file pattern `.env` is correctly gitignored. Low risk but worth noting.

#### SEC-8: File upload security (OCR)
- [x] File size limited to 10MB server-side
- [x] Client checks MIME type against allowlist
- [ ] BUG: Server-side OCR route (`POST /api/ocr`) does NOT validate file MIME type. Only the client checks `ERLAUBTE_TYPEN`. An attacker can POST any file type directly to the API. The file is passed directly to Tesseract which will attempt processing -- this could potentially be exploited with malformed files.

#### SEC-9: ID enumeration / IDOR
- [x] Uses CUID for IDs (not sequential integers) -- reduces but does not eliminate enumeration risk
- [x] Single-user app so IDOR is not a concern in current design

### Bugs Found

#### BUG-1: No middleware.ts -- Authentication completely bypassed
- **Severity:** Critical
- **Steps to Reproduce:**
  1. Open a new browser (no session cookie)
  2. Navigate directly to `http://localhost:3000/api/zeiteintraege`
  3. Expected: 401 Unauthorized response
  4. Actual: Full JSON response with all time entries
- **Root Cause:** `src/proxy.ts` exists with correct auth logic but is never invoked. Next.js requires a file named `middleware.ts` at the project root or `src/middleware.ts`. No such file exists.
- **Impact:** All data (time entries, absences, KPIs, settings) is publicly readable and writable without any authentication.
- **Priority:** Fix before deployment -- BLOCKING

#### BUG-2: Open redirect in login flow
- **Severity:** High
- **Steps to Reproduce:**
  1. Craft URL: `http://localhost:3000/login?redirect=https://evil.com`
  2. Log in with valid credentials
  3. Expected: Redirect to internal page only
  4. Actual: `window.location.href = "https://evil.com"` executes
- **Priority:** Fix before deployment

#### BUG-3: No rate limiting on login endpoint
- **Severity:** High
- **Steps to Reproduce:**
  1. Send rapid POST requests to `/api/auth/login` with different passwords
  2. Expected: After N failed attempts, requests should be throttled or blocked
  3. Actual: Unlimited login attempts are accepted
- **Priority:** Fix before deployment

#### BUG-4: No server-side MIME type validation for OCR uploads
- **Severity:** Medium
- **Steps to Reproduce:**
  1. Use curl: `curl -F "bild=@malicious.exe" http://localhost:3000/api/ocr`
  2. Expected: 400 error for invalid file type
  3. Actual: File is passed to Tesseract for processing
- **Priority:** Fix before deployment

#### BUG-5: No security headers configured
- **Severity:** Medium
- **Steps to Reproduce:**
  1. Open browser DevTools, check response headers on any page
  2. Expected: X-Frame-Options, X-Content-Type-Options, etc.
  3. Actual: None of the recommended security headers are present
- **Priority:** Fix before deployment

#### BUG-6: Ueberstunden color logic is inverted
- **Severity:** Medium
- **Steps to Reproduce:**
  1. Open Dashboard with positive overtime (more hours worked than required)
  2. Expected: Green for positive overtime (good -- extra hours banked)
  3. Actual: Code in DashboardClient.tsx line 74-78 sets `"rot"` when `ueberstundenMinuten > 0` and `"gruen"` when `< 0`. Positive overtime is shown red, negative (deficit) is shown green. This contradicts typical UX expectations where positive overtime is favorable.
- **Note:** This may be an intentional design choice (red = warning about too many hours), but the spec says "gruen (positiv) oder rot (negativ)" which means green for positive and red for negative -- the opposite of the code.
- **Priority:** Fix in next sprint

#### BUG-7: No validation of von/bis query params on GET /api/zeiteintraege
- **Severity:** Low
- **Steps to Reproduce:**
  1. Request `GET /api/zeiteintraege?von=invalid-date`
  2. Expected: 400 error with validation message
  3. Actual: `new Date("invalid-date")` produces `Invalid Date`, behavior depends on Prisma adapter handling
- **Priority:** Fix in next sprint

#### BUG-8: No optimistic locking for concurrent edits
- **Severity:** Low
- **Steps to Reproduce:**
  1. Open the same entry in two browser tabs
  2. Edit and save in tab 1
  3. Edit and save in tab 2 (tab 2 still has old data)
  4. Expected: Conflict detection or warning
  5. Actual: Last write wins silently, first edit is lost
- **Priority:** Nice to have

#### BUG-9: Mobile bottom nav has no logout option
- **Severity:** Low
- **Steps to Reproduce:**
  1. View app at 375px width (mobile)
  2. Expected: Ability to log out
  3. Actual: Bottom nav only shows 4 page links; no logout button visible on mobile
- **Priority:** Fix in next sprint

### Cross-Browser / Responsive Notes (Code Review)
- Responsive grid: ZeiterfassungForm uses `grid-cols-1 md:grid-cols-2 lg:grid-cols-4` -- OK
- Dashboard KPIs use `grid-cols-2 sm:grid-cols-2 lg:grid-cols-3` -- OK
- Mobile bottom nav is present with `md:hidden` -- OK
- Sidebar hidden on mobile with `hidden md:flex` -- OK
- AbsenzenForm uses `grid-cols-1 sm:grid-cols-3` -- OK
- Scan page uses `max-w-4xl` with responsive padding -- OK
- All forms use shadcn/ui components with proper Label/Input pairing -- OK
- Note: Actual cross-browser testing requires running the app; code structure appears sound for Chrome/Firefox/Safari

### Summary
- **Acceptance Criteria:** 6/6 passed (all criteria met in code)
- **Bugs Found:** 9 total (1 critical, 2 high, 3 medium, 3 low)
- **Security:** CRITICAL ISSUES FOUND -- authentication is completely non-functional
- **Production Ready:** NO
- **Recommendation:** Fix BUG-1 (middleware.ts) immediately. Fix BUG-2, BUG-3, BUG-4, BUG-5 before deployment. BUG-6 through BUG-9 can be addressed in the next sprint.
