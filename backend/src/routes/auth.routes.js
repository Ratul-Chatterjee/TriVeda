import { Router } from 'express';
import { staffLogin, patientLogin, patientRegister, logout, changePassword } from '../controllers/auth.controller.js';

const router = Router();

// ==========================================
// LOGIN ROUTES
// ==========================================
router.post("/staff/login",staffLogin);
router.post("/patient/login",patientLogin);
router.post("/patient/register", patientRegister);
router.post("/logout",logout);
router.put('/change-password', changePassword);

export default router;