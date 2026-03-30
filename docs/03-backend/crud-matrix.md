# Backend CRUD Matrix

## Objective
Map key Create/Read/Update/Delete operations per module.

## Appointments
- Create:
  - `POST /api/appointments/book`
  - creates `Appointment`
- Read:
  - doctor appointments, patient appointments, slots, dashboard, timeline
- Update:
  - `PUT /api/appointments/:id/live`
  - `PUT /api/appointments/:id/plan`
  - `PUT /api/appointments/patient/:patientId/:appointmentId/reschedule`
- Delete:
  - `DELETE /api/appointments/patient/:patientId/:appointmentId` (soft-delete by status `CANCELLED`)

## Treatment Plan + Lifecycle
- Create/Upsert:
  - on doctor plan save
  - `TreatmentPlan`, `TreatmentPlanLifecycle`, `DietPlan`, `DietItem`, `TreatmentMedication`
- Read:
  - latest plan + timeline endpoints
- Update:
  - lifecycle statuses via patient feedback events
- Delete:
  - child collections replaced during plan save (`deleteMany` then `createMany`)

## Auth and User Accounts
- Create:
  - patient register
  - admin create staff
- Read:
  - staff/patient lookup on login
- Update:
  - change password
- Delete:
  - doctor/patient delete endpoints (guarded)

## Profiles and Reports
- Create:
  - upload patient report
- Read:
  - patient/doctor profile and image/report download
- Update:
  - doctor and patient profile updates
  - report reanalysis summary update
- Delete:
  - patient report delete

## Catalog
- Read only
  - foods/asanas/medicines catalogs

## Transaction-Critical Paths
- `saveDoctorPlan` uses transaction for consistency.
- `submitPatientTreatmentPlanFeedback` uses transaction for lifecycle + feedback synchronization.
