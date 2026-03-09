# ZEIT-2: Scan-Abgleich

**Status:** In Review

## User Stories
- Als Benutzer möchte ich ein Foto oder einen Scan der Firmenzeitabrechnung hochladen, damit die Zeiten automatisch extrahiert werden.
- Als Benutzer möchte ich die extrahierten Zeiten mit meinen eigenen erfassten Zeiten vergleichen, damit ich Abweichungen erkennen kann.

## Acceptance Criteria
- [ ] Datei-Upload via Klick oder Drag-and-Drop (JPEG, PNG, PDF)
- [ ] OCR-Verarbeitung mit Tesseract.js (server-side)
- [ ] Anzeige der extrahierten Zeitpaare (Start, Ende, Pause)
- [ ] Konfidenz-Badge: grün ≥80, gelb 60-79, rot <60
- [ ] Rohtextansicht der OCR-Ausgabe (Accordion)
- [ ] Abgleichstabelle: OCR-Zeiten vs. erfasste Zeiten
- [ ] Abweichung > 5 Min: gelbe Markierung
- [ ] Fehlender Eintrag: rote Markierung
- [ ] Zusammenfassung: "X Abweichungen gefunden"

## API Routes
- `POST /api/ocr` – Bild hochladen, Zeiten extrahieren (Node.js runtime, max 10MB)

## Components
- `BildUpload` – Drag-and-Drop Upload mit Progress
- `OcrErgebnis` – Extrahierte Zeiten + Rohtext
- `AbgleichTabelle` – Farblicher Vergleich

---

## QA Test Results

**Tested:** 2026-03-09
**App URL:** http://localhost:3000
**Tester:** QA Engineer (AI) -- Code Review & Static Analysis

### Acceptance Criteria Status

#### AC-1: Datei-Upload via Klick oder Drag-and-Drop (JPEG, PNG, PDF)
- [x] Click-to-upload: hidden input triggered via `inputRef.current?.click()`
- [x] Drag-and-drop: `onDragOver`, `onDragLeave`, `onDrop` handlers implemented
- [x] Accepted types: `image/jpeg,image/png,application/pdf` on input accept attribute
- [x] Client-side MIME type validation against `ERLAUBTE_TYPEN` array
- [x] File size validation: 10MB limit client-side
- [x] Image preview via `URL.createObjectURL()` for image files
- [x] PDF placeholder shown for PDF files
- [x] File name and size displayed after selection
- [x] Visual feedback during drag (border and background color change)
- [x] Keyboard accessible: Enter/Space triggers file picker

#### AC-2: OCR-Verarbeitung mit Tesseract.js (server-side)
- [x] `POST /api/ocr` processes file with Tesseract.js
- [x] `runtime = "nodejs"` configured for the route
- [x] Server-side max 10MB check
- [x] Tesseract worker created with `["deu", "eng"]` languages
- [x] Worker terminated after use to prevent memory leaks
- [x] Progress indication shown during processing (animated Progress bar)

#### AC-3: Anzeige der extrahierten Zeitpaare (Start, Ende, Pause)
- [x] OcrErgebnis component displays table with columns: Zeile, Start, Ende, Pause, Rohtext
- [x] Count of recognized time pairs shown in CardTitle
- [x] "-" shown for missing values
- [x] Empty state: "Keine Zeitpaare im Bild erkannt."

#### AC-4: Konfidenz-Badge: gruen >=80, gelb 60-79, rot <60
- [x] `vertrauenBadgeClass()` returns green classes for >=80
- [x] Returns yellow classes for 60-79
- [x] Returns red/destructive classes for <60
- [x] Badge shows "{X}% Vertrauen" text

#### AC-5: Rohtextansicht der OCR-Ausgabe (Accordion)
- [x] Accordion component used with trigger "Rohen OCR-Text anzeigen"
- [x] Pre-formatted text block with `whitespace-pre-wrap font-mono`
- [x] Fallback: "Kein Text erkannt." when empty

#### AC-6: Abgleichstabelle: OCR-Zeiten vs. erfasste Zeiten
- [x] AbgleichTabelle renders two-column comparison (Scan OCR vs Erfasst)
- [x] Date range selector to load comparison entries
- [x] Entries loaded from `/api/zeiteintraege?von=X&bis=Y`
- [x] Empty state handled: "Keine Daten zum Vergleichen vorhanden."

#### AC-7: Abweichung > 5 Min: gelbe Markierung
- [x] `zeitenWeichenAb()` function uses threshold of 5 minutes
- [x] Cells with deviations get `bg-yellow-50 text-yellow-900` classes

#### AC-8: Fehlender Eintrag: rote Markierung
- [x] Missing erfasst entry (OCR exists, no match): `bg-red-50` row class
- [x] Missing OCR entry (erfasst exists, no OCR): `bg-orange-50` row class
- [ ] BUG: Spec says "rote Markierung" for missing entries. The code uses `bg-red-50` for missing-erfasst and `bg-orange-50` for missing-OCR. The orange color for missing-OCR is not specified in the acceptance criteria.

#### AC-9: Zusammenfassung "X Abweichungen gefunden"
- [x] Deviation counter incremented for each row with issues
- [x] Alert shows "{X} Abweichung(en) gefunden" (with correct singular/plural)
- [x] Green alert "Keine Abweichungen gefunden" when count is 0

### Edge Cases Status

#### EC-1: OCR extracts no time pairs
- [x] Regex requires at least 2 time matches per line to extract
- [x] UI shows "Keine Zeitpaare im Bild erkannt."

#### EC-2: More OCR rows than erfasst rows (or vice versa)
- [x] `maxRows = Math.max(extrahierteZeilen.length, erfassteEintraege.length)` handles asymmetric data
- [x] Missing rows show "-" in cells

#### EC-3: OCR matching logic by index vs by date
- [ ] BUG: The AbgleichTabelle matches OCR lines to erfasst entries purely by array index position. It does NOT match by date. If the OCR extracts 5 lines and there are 5 erfasst entries, they are matched 1:1 by position regardless of whether dates align. This could produce false deviations.

#### EC-4: Large file upload
- [x] 10MB limit enforced both client and server side
- [x] Error message shown when file too large

#### EC-5: Unsupported file type
- [x] Client-side MIME check blocks unsupported types with error message
- [ ] BUG: Server-side does NOT check MIME type (see ZEIT-1 BUG-4)

### Security Audit Results
- [ ] **CRITICAL: No authentication on POST /api/ocr** (see ZEIT-1 BUG-1)
- [ ] BUG: No server-side MIME type validation (see ZEIT-1 BUG-4)
- [x] File size limited server-side
- [x] No file stored permanently on disk -- buffer passed directly to Tesseract
- [x] No user-uploaded content rendered as HTML (XSS safe)

### Bugs Found

#### BUG-1: No authentication on OCR endpoint (shared with ZEIT-1)
- **Severity:** Critical
- **Reference:** ZEIT-1 BUG-1
- **Priority:** Fix before deployment -- BLOCKING

#### BUG-2: OCR-to-erfasst matching is by index, not by date
- **Severity:** Medium
- **Steps to Reproduce:**
  1. Upload a scan that produces OCR lines for dates 01.03, 02.03, 03.03
  2. Set comparison range that returns entries for 02.03, 03.03 (missing 01.03)
  3. Expected: 01.03 OCR line shown as unmatched, 02.03 and 03.03 matched correctly
  4. Actual: OCR line 1 (01.03) is compared against erfasst entry 1 (02.03), producing a false deviation
- **Priority:** Fix in next sprint

#### BUG-3: No server-side MIME type validation (shared with ZEIT-1)
- **Severity:** Medium
- **Reference:** ZEIT-1 BUG-4
- **Priority:** Fix before deployment

#### BUG-4: Orange used for missing-OCR rows instead of red
- **Severity:** Low
- **Steps to Reproduce:**
  1. Compare data where erfasst entries exist but OCR has fewer rows
  2. Expected: Red marking per spec
  3. Actual: Orange (`bg-orange-50`) background used
- **Note:** Orange may be a deliberate design choice to distinguish from missing-erfasst (red). Clarify with product owner.
- **Priority:** Nice to have

### Summary
- **Acceptance Criteria:** 8/9 passed, 1 partial (AC-8 color mismatch)
- **Bugs Found:** 4 total (1 critical [shared], 0 high, 2 medium, 1 low)
- **Security:** CRITICAL -- no authentication (shared issue)
- **Production Ready:** NO
- **Recommendation:** Fix ZEIT-1 BUG-1 (middleware) which also fixes this feature's auth issue. Fix BUG-2 (index-based matching) and BUG-3 (MIME validation) before deployment.
