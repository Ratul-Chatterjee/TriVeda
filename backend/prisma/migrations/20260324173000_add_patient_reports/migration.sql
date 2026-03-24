CREATE TABLE "PatientReport" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "fileData" BYTEA NOT NULL,
    "summary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PatientReport_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PatientReport_patientId_createdAt_idx" ON "PatientReport"("patientId", "createdAt");

ALTER TABLE "PatientReport" ADD CONSTRAINT "PatientReport_patientId_fkey"
FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
