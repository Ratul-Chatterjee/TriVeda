# Environment Variables and Important Fields

## Environment Variables

## Backend (`backend/.env`)
- `PORT`: backend port (default 5000)
- `FRONTEND_URL`: CORS origin for frontend
- `DATABASE_URL`: Prisma DB connection
- `DIRECT_URL`: alternative direct DB connection
- `JWT_SECRET`: token signing secret
- `AI_MICROSERVICE_URL`: AI service base URL
- `NODE_ENV`: environment mode

## AI Service (optional/environment-specific)
- `OLLAMA_URL`
- model names/config via module constants

## Critical Database Fields

## Patient
- Identity and access:
  - `id`, `email`, `phoneNumber`, `password`, `isAppRegistered`
- Clinical profile:
  - `prakriti`, `vikriti`, `vataScore`, `pittaScore`, `kaphaScore`
  - `dietaryPref`, `allergies`, `clinicalData`

## HospitalStaff + DoctorProfile
- Staff identity:
  - `id`, `email`, `role`, `hospitalId`
- Doctor capability:
  - `specialty`, `experienceYrs`, `departmentId`, `isAvailable`

## Appointment
- Scheduling:
  - `patientId`, `doctorId`, `scheduledAt`, `status`
- Clinical/session fields:
  - `problemDescription`, `patientSymptoms`, `severity`, `duration`, `aiSummary`
  - `diagnosis`, `dietChart`, `routinePlan`, `medications`, `doctorNotes`

## Treatment Lifecycle
- `TreatmentPlanLifecycle.overallStatus`
- `TreatmentPlanDomainConfig.domain`, `status`, `stopConditions`, `reviewCadenceDays`
- `TreatmentPlanFeedback.planType`, `feedbackType`, `message`, `readByDoctor`

## Report and OCR
- `PatientReport.fileData`, `mimeType`, `summary`
- AI OCR response fields:
  - `medical_summary`, `ayurvedic_summary`, `ocr_char_count`

## Frontend Runtime Keys
- `localStorage['triveda_user']`
- React Query keys:
  - `appointments`, `doctorPatients`, `patientAppointments`, `patientDashboard`, `patientTreatmentPlan`
