import { Router } from 'express';
import {
	getPatientProfile,
	getPatientProfileImage,
	getDoctorProfile,
	updateDoctorProfile,
	updatePatientProfile,
	uploadPatientReport,
	downloadPatientReport,
} from '../controllers/profile.controller.js';

const router = Router();

router.get('/patient/:id', getPatientProfile);
router.get('/patient/:id/image', getPatientProfileImage);
router.get('/doctor/:id', getDoctorProfile);
router.put('/doctor/profile', updateDoctorProfile);
router.patch('/patient/:id', updatePatientProfile);
router.post('/patient/:id/reports', uploadPatientReport);
router.get('/patient/:id/reports/:reportId/download', downloadPatientReport);

export default router;
