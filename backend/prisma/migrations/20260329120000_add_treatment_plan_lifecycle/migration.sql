-- CreateEnum
CREATE TYPE "PlanDomain" AS ENUM ('DIET', 'ASANAS', 'MEDICINES');

-- CreateEnum
CREATE TYPE "PlanFeedbackType" AS ENUM ('WORKING', 'NOT_EFFECTIVE', 'TERMINATE_REQUEST', 'STOPPED');

-- CreateEnum
CREATE TYPE "PlanLifecycleStatus" AS ENUM ('ACTIVE', 'WORKING', 'NOT_EFFECTIVE', 'STOP_REQUESTED', 'STOPPED', 'COMPLETED', 'SUPERSEDED');

-- CreateTable
CREATE TABLE "TreatmentPlanLifecycle" (
    "id" TEXT NOT NULL,
    "treatmentPlanId" TEXT NOT NULL,
    "effectiveFrom" TIMESTAMP(3),
    "effectiveTo" TIMESTAMP(3),
    "overallStatus" "PlanLifecycleStatus" NOT NULL DEFAULT 'ACTIVE',
    "notifyOnWorking" BOOLEAN NOT NULL DEFAULT true,
    "notifyOnNotEffective" BOOLEAN NOT NULL DEFAULT true,
    "notifyOnTerminateRequest" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TreatmentPlanLifecycle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TreatmentPlanDomainConfig" (
    "id" TEXT NOT NULL,
    "lifecycleId" TEXT NOT NULL,
    "domain" "PlanDomain" NOT NULL,
    "status" "PlanLifecycleStatus" NOT NULL DEFAULT 'ACTIVE',
    "stopConditions" TEXT,
    "reviewCadenceDays" INTEGER,
    "patientGuidance" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TreatmentPlanDomainConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TreatmentPlanFeedback" (
    "id" TEXT NOT NULL,
    "lifecycleId" TEXT NOT NULL,
    "treatmentPlanId" TEXT NOT NULL,
    "appointmentId" TEXT,
    "patientId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "planType" "PlanDomain" NOT NULL,
    "feedbackType" "PlanFeedbackType" NOT NULL,
    "message" TEXT,
    "readByDoctor" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TreatmentPlanFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TreatmentPlanLifecycle_treatmentPlanId_key" ON "TreatmentPlanLifecycle"("treatmentPlanId");

-- CreateIndex
CREATE INDEX "TreatmentPlanLifecycle_overallStatus_createdAt_idx" ON "TreatmentPlanLifecycle"("overallStatus", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "TreatmentPlanDomainConfig_lifecycleId_domain_key" ON "TreatmentPlanDomainConfig"("lifecycleId", "domain");

-- CreateIndex
CREATE INDEX "TreatmentPlanDomainConfig_domain_status_idx" ON "TreatmentPlanDomainConfig"("domain", "status");

-- CreateIndex
CREATE INDEX "TreatmentPlanFeedback_doctorId_readByDoctor_createdAt_idx" ON "TreatmentPlanFeedback"("doctorId", "readByDoctor", "createdAt");

-- CreateIndex
CREATE INDEX "TreatmentPlanFeedback_patientId_createdAt_idx" ON "TreatmentPlanFeedback"("patientId", "createdAt");

-- CreateIndex
CREATE INDEX "TreatmentPlanFeedback_treatmentPlanId_createdAt_idx" ON "TreatmentPlanFeedback"("treatmentPlanId", "createdAt");

-- AddForeignKey
ALTER TABLE "TreatmentPlanLifecycle" ADD CONSTRAINT "TreatmentPlanLifecycle_treatmentPlanId_fkey" FOREIGN KEY ("treatmentPlanId") REFERENCES "TreatmentPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TreatmentPlanDomainConfig" ADD CONSTRAINT "TreatmentPlanDomainConfig_lifecycleId_fkey" FOREIGN KEY ("lifecycleId") REFERENCES "TreatmentPlanLifecycle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TreatmentPlanFeedback" ADD CONSTRAINT "TreatmentPlanFeedback_lifecycleId_fkey" FOREIGN KEY ("lifecycleId") REFERENCES "TreatmentPlanLifecycle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TreatmentPlanFeedback" ADD CONSTRAINT "TreatmentPlanFeedback_treatmentPlanId_fkey" FOREIGN KEY ("treatmentPlanId") REFERENCES "TreatmentPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TreatmentPlanFeedback" ADD CONSTRAINT "TreatmentPlanFeedback_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TreatmentPlanFeedback" ADD CONSTRAINT "TreatmentPlanFeedback_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TreatmentPlanFeedback" ADD CONSTRAINT "TreatmentPlanFeedback_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "HospitalStaff"("id") ON DELETE CASCADE ON UPDATE CASCADE;
