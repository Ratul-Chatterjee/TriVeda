ALTER TABLE "DoctorProfile"
ADD COLUMN "qualifications" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "locality" TEXT,
ADD COLUMN "certificates" TEXT,
ADD COLUMN "previousWork" TEXT,
ADD COLUMN "extraInfo" TEXT;
