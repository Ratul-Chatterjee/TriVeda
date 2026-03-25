import { Router } from "express";
import {
	createStaff,
	checkStaffEmailAvailability,
	getDepartments,
	getDoctors,
	getPatients,
	deleteDoctor,
	deletePatient,
} from "../controllers/admin.controller.js";

const router = Router();
router.get("/departments", getDepartments);
router.get("/doctors", getDoctors);
router.get("/patients", getPatients);
router.get("/staff-email-availability", checkStaffEmailAvailability);
router.post("/create-staff", createStaff);
router.post("/create-doctor", createStaff);
router.delete("/doctors/:doctorId", deleteDoctor);
router.delete("/patients/:patientId", deletePatient);
export default router;