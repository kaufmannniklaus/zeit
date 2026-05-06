-- Schritt 1: Prüfen welche Einträge betroffen sind
SELECT
  id,
  datum::text AS falsch_datum,
  (datum + INTERVAL '1 day')::text AS korrektes_datum,
  erstelltAm::date::text AS erstellt_utc
FROM "Zeiteintrag"
WHERE datum = erstelltAm::date - INTERVAL '1 day'
ORDER BY datum;

-- Schritt 2: Korrektur – datum um 1 Tag vorwärts
UPDATE "Zeiteintrag"
SET datum = datum + INTERVAL '1 day'
WHERE datum = erstelltAm::date - INTERVAL '1 day';
