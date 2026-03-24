-- Add date of birth field for patient profile edits and age derivation
ALTER TABLE "Patient"
ADD COLUMN "dateOfBirth" TIMESTAMP(3);
