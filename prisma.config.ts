import "dotenv/config";
import { defineConfig } from "prisma/config";

// Lade .env.local für CLI-Operationen (prisma migrate, prisma studio, etc.)
// Die Next.js-App lädt .env.local automatisch zur Laufzeit.
import { config } from "dotenv";
config({ path: ".env.local", override: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
