import { Router } from 'express';
import {
	getPatientProfile,
	getDoctorProfile,
	updatePatientProfile,
	uploadPatientReport,
} from '../controllers/profile.controller.js';

const router = Router();

router.get('/patient/:id', getPatientProfile);
router.get('/doctor/:id', getDoctorProfile);
router.patch('/patient/:id', updatePatientProfile);
router.post('/patient/:id/reports', uploadPatientReport);

export default router;
