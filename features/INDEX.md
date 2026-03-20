# Zeit – Feature Index

| ID | Feature | Status |
|---|---|---|
| ZEIT-1 | Zeiterfassung (CRUD) | In Review |
| ZEIT-2 | Scan-Abgleich (OCR) | In Review |
| ZEIT-3 | Dashboard, Absenzen & KPIs | In Review |
| ZEIT-4 | Tages-Tracker mit ARV-Push | Deployed |
| ZEIT-5 | Pausen-Ehrlichkeits-Protokoll | In Progress |

## Tech Stack
- Next.js 14 (App Router)
- Prisma 7 + PostgreSQL (db.geld-herr.com)
- shadcn/ui + Tailwind CSS
- iron-session (persistente Cookie-Authentifizierung, 30 Tage)
- Tesseract.js (server-side OCR)
- Docker (Deployment, nur App-Container)
