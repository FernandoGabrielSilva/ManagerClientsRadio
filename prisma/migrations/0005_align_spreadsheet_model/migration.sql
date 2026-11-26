-- Align database with the new spreadsheet model (v4)

-- Client: cadastral + prospection fields
ALTER TABLE "Client" ADD COLUMN "contactRole" TEXT;
ALTER TABLE "Client" ADD COLUMN "offeredMediaType" TEXT;

-- Contract: control sheet fields
ALTER TABLE "Contract" ADD COLUMN "program" TEXT;
ALTER TABLE "Contract" ADD COLUMN "durationMonths" INTEGER;
ALTER TABLE "Contract" ADD COLUMN "insertionsPerDay" INTEGER;
ALTER TABLE "Contract" ADD COLUMN "insertionsPerMonth" INTEGER;
ALTER TABLE "Contract" ADD COLUMN "totalValue" DOUBLE PRECISION;
ALTER TABLE "Contract" ADD COLUMN "paymentInfo" TEXT;

-- Media type became free text (e.g. "Spot 30s + Testemunhal 60s")
ALTER TABLE "Contract" ALTER COLUMN "mediaType" DROP DEFAULT;
ALTER TABLE "Contract" ALTER COLUMN "mediaType" TYPE TEXT USING "mediaType"::text;
ALTER TABLE "Contract" ALTER COLUMN "mediaType" SET DEFAULT 'Spot 30s';
DROP TYPE IF EXISTS "MediaType";
