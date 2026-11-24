import "dotenv/config";
import { defineConfig, env } from "prisma/config";

const rawDatabaseUrl =
  process.env.DIRECT_DATABASE_URL ??
  process.env.DATABASE_URL_UNPOOLED ??
  env("DATABASE_URL");

const databaseUrl = rawDatabaseUrl.replace(
  /sslmode=(prefer|require|verify-ca)/g,
  "sslmode=verify-full",
);

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: databaseUrl,
  },
});
