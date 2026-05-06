-- Zeigt alle Einträge, die 1 Tag zu früh gespeichert wurden
-- (datum = erstelltAm_UTC_Datum - 1 Tag → Tracker-Bug)
SELECT
  id,
  datum::text AS falsch_datum,
  (datum + INTERVAL '1 day')::text AS korrektes_datum,
  erstelltAm::date::text AS erstellt_utc
FROM "Zeiteintrag"
WHERE datum = erstelltAm::date - INTERVAL '1 day'
ORDER BY datum;
