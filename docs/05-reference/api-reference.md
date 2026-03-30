# API Reference (Backend)

Base URL prefix: `/api`

## Auth
- `POST /auth/staff/login`
- `POST /auth/patient/login`
- `POST /auth/patient/register`
- `POST /auth/logout`
- `PUT /auth/change-password`

## Appointments
- `POST /appointments/diagnose`
- `POST /appointments/vaidya-assist`
- `GET /appointments/departments`
- `GET /appointments/doctors`
- `GET /appointments/slots`
- `POST /appointments/book`
- `PUT /appointments/:appointmentId/plan`
- `PUT /appointments/:appointmentId/live`
- `GET /appointments/doctor/:doctorId/patients`
- `GET /appointments/doctor/:doctorId`
- `GET /appointments/patient/:patientId`
- `GET /appointments/patient/:patientId/treatment-plan`
- `GET /appointments/patient/:patientId/treatment-plan/timeline`
- `POST /appointments/patient/:patientId/treatment-plan/feedback`
- `GET /appointments/doctor/:doctorId/treatment-plan/feedback`
- `PUT /appointments/doctor/:doctorId/treatment-plan/feedback/:feedbackId/read`
- `PUT /appointments/patient/:patientId/:appointmentId/reschedule`
- `DELETE /appointments/patient/:patientId/:appointmentId`
- `GET /appointments/patient/:patientId/dashboard`
- `POST /appointments/patient/:patientId/prakriti-assessment`
- `GET /appointments/patient/:patientId/prakriti-assessment`

## Admin
- `GET /admin/departments`
- `GET /admin/doctors`
- `GET /admin/patients`
- `GET /admin/staff-email-availability`
- `POST /admin/create-staff`
- `POST /admin/create-doctor`
- `DELETE /admin/doctors/:doctorId`
- `DELETE /admin/patients/:patientId`

## Profile
- `GET /profile/patient/:id`
- `GET /profile/patient/:id/image`
- `PATCH /profile/patient/:id`
- `GET /profile/doctor/:id`
- `PUT /profile/doctor/profile`
- `POST /profile/patient/:id/reports`
- `GET /profile/patient/:id/reports/:reportId/download`
- `DELETE /profile/patient/:id/reports/:reportId`
- `PUT /profile/patient/:id/reports/:reportId/reanalyze`

## Catalogs
- `GET /catalogs/treatment`

## AI Service Endpoints (called by backend)
- `POST http://<AI_MICROSERVICE_URL>/api/triage`
- `POST http://<AI_MICROSERVICE_URL>/api/rag/ask`
- `POST http://<AI_MICROSERVICE_URL>/api/medical-ocr/analyze`
- `POST http://<AI_MICROSERVICE_URL>/api/matchmaker` (deployment-specific)
