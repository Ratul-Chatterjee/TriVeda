# End-to-End Traceability Matrix

## Purpose
This matrix links product features to:
- frontend components/pages
- frontend hooks/API clients
- backend endpoints/controllers
- database tables/models
- AI service endpoints/modules

It helps with impact analysis, debugging, onboarding, and release validation.

## Matrix
| Feature / Module | Frontend Pages or Components | Frontend Hook / API | Backend Endpoint(s) | Backend Controller | DB Tables / Models | AI Service Touchpoint |
|---|---|---|---|---|---|---|
| Staff login (Admin/Doctor) | `LoginSelection`, `LoginForm` | `useStaffLogin`, `authApi.staffLogin` | `POST /api/auth/staff/login` | `auth.controller.staffLogin` | `HospitalStaff`, `DoctorProfile`, `TherapistProfile` | None |
| Patient registration | `PatientRegistration` | `authApi.patientRegister` | `POST /api/auth/patient/register` | `auth.controller.patientRegister` | `Patient` | None |
| Patient login | `LoginForm` | `usePatientLogin`, `authApi.patientLogin` | `POST /api/auth/patient/login` | `auth.controller.patientLogin` | `Patient` | None |
| Password change | Settings views | `authApi.changePassword` | `PUT /api/auth/change-password` | `auth.controller.changePassword` | `HospitalStaff`, `Patient` | None |
| Smart diagnosis (triage) | `PatientAppointments`, intake UI | `useDiagnoseSymptoms`, `appointmentApi.diagnoseSymptoms` | `POST /api/appointments/diagnose` | `appointment.controller.diagnoseSymptoms` | `Department` (lookup context) | `POST /api/triage` (NLP707070/app.py) |
| Department and doctor fetch for booking | `PatientAppointments` | `appointmentApi.getDepartments`, `appointmentApi.getDoctorsByDepartment` | `GET /api/appointments/departments`, `GET /api/appointments/doctors` | `appointment.controller.getDepartments`, `appointment.controller.getDoctorsByDepartment` | `Department`, `DoctorProfile`, `HospitalStaff` | None |
| Slot discovery | `PatientAppointments` | `useAvailableSlots`, `appointmentApi.getAvailableSlots` | `GET /api/appointments/slots` | `appointment.controller.getAvailableSlots` | `Appointment`, `DoctorProfile` | None |
| Appointment booking | `PatientAppointments` | `appointmentApi.bookAppointment` | `POST /api/appointments/book` | `appointment.controller.bookAppointment` | `Appointment`, `Patient`, `DoctorProfile` | Matchmaker call in booking flow (`/api/matchmaker`, deployment-specific) |
| Doctor dashboard appointments | `DoctorDashboard`, `DoctorAppointmentsFlow` | `useDoctorAppointments`, `appointmentApi.getDoctorAppointments` | `GET /api/appointments/doctor/:doctorId` | `appointment.controller.getDoctorAppointments` | `Appointment`, `Patient`, `HospitalStaff` | None |
| Doctor patient list (aggregated) | `DoctorDashboard` | doctor-patient query path | `GET /api/appointments/doctor/:doctorId/patients` | `doctor.controller.getDoctorPatients` | `Appointment`, `Patient`, `HospitalStaff` | None |
| Mark consultation LIVE | `DoctorDashboard`, `DoctorAppointmentsFlow` | `useSetAppointmentLive`, `appointmentApi.setAppointmentLive` | `PUT /api/appointments/:appointmentId/live` | `appointment.controller.markAppointmentLive` | `Appointment` | None |
| Save doctor treatment plan | `DoctorDashboard`, `DietChartGenerator`, monitoring panels | `useSaveDoctorPlan`, `appointmentApi.saveDoctorPlan` | `PUT /api/appointments/:appointmentId/plan` | `appointment.controller.saveDoctorPlan` | `Appointment`, `TreatmentPlan`, `TreatmentPlanLifecycle`, `TreatmentPlanDomainConfig`, `DietPlan`, `DietItem`, `TreatmentMedication` | None |
| Patient appointments list | `PatientAppointmentsMain`, `PatientDashboard` | `usePatientAppointments`, `appointmentApi.getPatientAppointments` | `GET /api/appointments/patient/:patientId` | `appointment.controller.getPatientAppointments` | `Appointment`, `TreatmentPlan`, `DietPlan`, `TreatmentMedication` | None |
| Patient dashboard aggregate | `PatientDashboard` | `usePatientDashboard`, `appointmentApi.getPatientDashboard` | `GET /api/appointments/patient/:patientId/dashboard` | `appointment.controller.getPatientDashboardData` | `Patient`, `Appointment` | None |
| Latest treatment plan | `PatientDietCharts`, `PatientAsanas`, `PatientMedicines`, insights views | `useLatestTreatmentPlan`, `appointmentApi.getLatestTreatmentPlan` | `GET /api/appointments/patient/:patientId/treatment-plan` | `appointment.controller.getLatestTreatmentPlan` | `TreatmentPlan`, `TreatmentPlanLifecycle`, `DietPlan`, `TreatmentMedication` | None |
| Treatment plan timeline | Timeline/insights views | `useTreatmentPlanTimeline`, `appointmentApi.getTreatmentPlanTimeline` | `GET /api/appointments/patient/:patientId/treatment-plan/timeline` | `appointment.controller.getPatientTreatmentPlanTimeline` | `TreatmentPlan`, `TreatmentPlanLifecycle`, `TreatmentPlanDomainConfig`, `TreatmentPlanFeedback` | None |
| Patient plan feedback submission | patient plan cards and feedback actions | `appointmentApi.submitTreatmentPlanFeedback` | `POST /api/appointments/patient/:patientId/treatment-plan/feedback` | `appointment.controller.submitPatientTreatmentPlanFeedback` | `TreatmentPlanFeedback`, `TreatmentPlanLifecycle`, `TreatmentPlanDomainConfig`, `TreatmentPlan`, `Appointment` | None |
| Doctor feedback inbox and read-ack | doctor alert panels | feedback fetch/mutate APIs | `GET /api/appointments/doctor/:doctorId/treatment-plan/feedback`, `PUT /api/appointments/doctor/:doctorId/treatment-plan/feedback/:feedbackId/read` | `appointment.controller.getDoctorTreatmentPlanFeedback`, `appointment.controller.markTreatmentPlanFeedbackRead` | `TreatmentPlanFeedback` | None |
| Appointment reschedule/cancel | `PatientAppointmentsMain` actions | `appointmentApi.reschedulePatientAppointment`, `appointmentApi.cancelPatientAppointment` | `PUT /api/appointments/patient/:patientId/:appointmentId/reschedule`, `DELETE /api/appointments/patient/:patientId/:appointmentId` | `appointment.controller.reschedulePatientAppointment`, `appointment.controller.cancelPatientAppointment` | `Appointment` | None |
| Prakriti assessment save/read | `PrakritiAssessment`, patient profile widgets | `useSavePrakritiAssessment`, `useLatestPrakritiAssessment` | `POST /api/appointments/patient/:patientId/prakriti-assessment`, `GET /api/appointments/patient/:patientId/prakriti-assessment` | `appointment.controller.savePrakritiAssessment`, `appointment.controller.getPatientPrakritiAssessments` | `PrakritiAssessment`, `Patient` | None |
| Vaidya Assist (RAG chat) | `consultation/VaidyaAssistBot` | direct fetch to `/api/appointments/vaidya-assist` | `POST /api/appointments/vaidya-assist` | `appointment.controller.askVaidyaAssist` | None (read-only AI response) | `POST /api/rag/ask`, RAG engine (`RAG_code.py`) |
| Patient profile fetch/update | `PatientProfile`, `PatientSettings` | profile APIs | `GET /api/profile/patient/:id`, `PATCH /api/profile/patient/:id`, `GET /api/profile/patient/:id/image` | `profile.controller.getPatientProfile`, `updatePatientProfile`, `getPatientProfileImage` | `Patient`, `PrakritiAssessment`, `PatientReport`, `Appointment` | None |
| Doctor profile fetch/update | `DoctorProfile` | profile APIs | `GET /api/profile/doctor/:id`, `PUT /api/profile/doctor/profile` | `profile.controller.getDoctorProfile`, `updateDoctorProfile` | `HospitalStaff`, `DoctorProfile`, `Appointment` | None |
| Patient report upload/download/delete/reanalyze | `PatientReports` | report APIs | `POST /api/profile/patient/:id/reports`, `GET /api/profile/patient/:id/reports/:reportId/download`, `DELETE /api/profile/patient/:id/reports/:reportId`, `PUT /api/profile/patient/:id/reports/:reportId/reanalyze` | `profile.controller.uploadPatientReport`, `downloadPatientReport`, `deletePatientReport`, `reanalyzePatientReport` | `PatientReport`, `Patient` | `POST /api/medical-ocr/analyze` |
| Admin staff provisioning | `AdminDashboard`, registration/admin management pages | `authApi.createStaff` alias path | `POST /api/admin/create-staff` | `admin.controller.createStaff` | `HospitalStaff`, `DoctorProfile`, `Department`, `Hospital` | None |
| Admin doctor/patient listing | `AdminDashboard` | admin list APIs | `GET /api/admin/doctors`, `GET /api/admin/patients` | `admin.controller.getDoctors`, `admin.controller.getPatients` | `HospitalStaff`, `DoctorProfile`, `Patient`, `Appointment` | None |
| Admin delete doctor/patient | admin management views | delete APIs | `DELETE /api/admin/doctors/:doctorId`, `DELETE /api/admin/patients/:patientId` | `admin.controller.deleteDoctor`, `admin.controller.deletePatient` | `HospitalStaff`, `Patient`, `Appointment` | None |
| Treatment catalogs | plan generation UIs | catalog API | `GET /api/catalogs/treatment` | `catalog.controller.getTreatmentCatalogs` | `foods`, `ayurveda_props`, `asanas`, `medicines` | None |

## Operational Validation Checklist
- Frontend route/component exists and is mapped to expected endpoint.
- Backend endpoint exists in route file and correct controller is exported.
- Controller writes/reads expected table(s).
- AI endpoint availability verified where applicable.
- Response field shape aligns with frontend expectations.

## Known Coupling Notes
- Backend booking flow includes matchmaker call path that depends on deployed AI service exposing `/api/matchmaker`.
- Frontend API interceptor expects backend envelope format and unwraps to `data`.
