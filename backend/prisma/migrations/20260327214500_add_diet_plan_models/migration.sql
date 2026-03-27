-- CreateEnum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'MealTime'
  ) THEN
    CREATE TYPE "MealTime" AS ENUM (
      'EARLY_MORNING',
      'BREAKFAST',
      'MID_MORNING',
      'LUNCH',
      'EVENING',
      'DINNER',
      'OTHER'
    );
  END IF;
END
$$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "DietPlan" (
  "id" TEXT NOT NULL,
  "treatmentPlanId" TEXT NOT NULL,
  "title" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DietPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "DietItem" (
  "id" TEXT NOT NULL,
  "dietPlanId" TEXT NOT NULL,
  "mealTime" "MealTime" NOT NULL DEFAULT 'OTHER',
  "itemName" TEXT NOT NULL,
  "notes" TEXT,
  "isAvoid" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DietItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "DietPlan_treatmentPlanId_key" ON "DietPlan"("treatmentPlanId");
CREATE INDEX IF NOT EXISTS "DietItem_dietPlanId_mealTime_idx" ON "DietItem"("dietPlanId", "mealTime");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'DietPlan_treatmentPlanId_fkey'
  ) THEN
    ALTER TABLE "DietPlan"
    ADD CONSTRAINT "DietPlan_treatmentPlanId_fkey"
    FOREIGN KEY ("treatmentPlanId") REFERENCES "TreatmentPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'DietItem_dietPlanId_fkey'
  ) THEN
    ALTER TABLE "DietItem"
    ADD CONSTRAINT "DietItem_dietPlanId_fkey"
    FOREIGN KEY ("dietPlanId") REFERENCES "DietPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;
