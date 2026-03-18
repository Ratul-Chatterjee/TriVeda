import {Router} from 'express';
import {diagnoseSymptoms, getAvailableSlots} from "../controllers/appointment.controller.js";

const router = Router();

router.post("/diagnose", diagnoseSymptoms);
router.get("/slots", getAvailableSlots);

export default router;