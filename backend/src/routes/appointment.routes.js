import { Router } from "express";
import {
  bookAppointment,
  diagnoseSymptoms,
  getDepartments,
  getDoctorsByDepartment,
  getAvailableSlots,
  saveDoctorPlan,
  getDoctorAppointments,
  getPatientAppointments,
  reschedulePatientAppointment,
  cancelPatientAppointment,
  getPatientDashboardData,
  savePrakritiAssessment,
  getPatientPrakritiAssessments,
} from "../controllers/appointment.controller.js";
import { getDoctorPatients } from "../controllers/doctor.controller.js";

const router = Router();

router.post("/diagnose", diagnoseSymptoms);
router.get("/departments", getDepartments);
router.get("/doctors", getDoctorsByDepartment);
router.get("/slots", getAvailableSlots);
router.post("/book", bookAppointment);
router.get("/:appointmentId/plan", saveDoctorPlan);
router.get("/doctor/:doctorId/patients", getDoctorPatients);
router.get("/doctor/:doctorId", getDoctorAppointments);
router.get("/patient/:patientId", getPatientAppointments);
router.put("/patient/:patientId/:appointmentId/reschedule", reschedulePatientAppointment);
router.delete("/patient/:patientId/:appointmentId", cancelPatientAppointment);
router.get("/patient/:patientId/dashboard", getPatientDashboardData);
router.post("/patient/:patientId/prakriti-assessment", savePrakritiAssessment);
router.get("/patient/:patientId/prakriti-assessment", getPatientPrakritiAssessments);

export default router;
