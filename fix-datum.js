const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  const check = await pool.query(
    `SELECT id, datum::text AS falsch, (datum + INTERVAL '1 day')::text AS korrekt
     FROM "Zeiteintrag"
     WHERE datum = "erstelltAm"::date - INTERVAL '1 day'
     ORDER BY datum`
  );
  console.log('Betroffen:', check.rowCount, 'Einträge');
  check.rows.forEach(r => console.log(' ', r.falsch, '->', r.korrekt));

  if (check.rowCount === 0) {
    console.log('Nichts zu korrigieren.');
    await pool.end();
    return;
  }

  const update = await pool.query(
    `UPDATE "Zeiteintrag"
     SET datum = datum + INTERVAL '1 day'
     WHERE datum = "erstelltAm"::date - INTERVAL '1 day'`
  );
  console.log('Korrigiert:', update.rowCount, 'Einträge');
  await pool.end();
}

run().catch(e => { console.error(e.message); process.exit(1); });
