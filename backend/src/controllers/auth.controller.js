import { prisma } from '../db/config.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';

// Helper function to generate the token and set the cookie
const generateTokenAndSetCookie = (user, role, res) => {
    // 1. Create the JWT Payload (The data hidden inside the token)
    const payload = {
        id: user.id,
        role: role,
        email: user.email
    };

    // 2. Sign the token (Make sure you add JWT_SECRET to your .env!)
    const token = jwt.sign(
        payload, 
        process.env.JWT_SECRET || "fallback_super_secret_triveda_key_do_not_use_in_prod", 
        { expiresIn: '7d' }
    );

    // 3. Set the HTTP-Only Cookie
    const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production', // Only true if HTTPS
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    };

    res.cookie('triveda_auth', token, cookieOptions);
    return token;
};

const computeAgeFromDob = (dob) => {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    const dayDiff = today.getDate() - birthDate.getDate();

    if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
        age -= 1;
    }

    return age;
};

// ==========================================
// HOSPITAL STAFF LOGIN (B2B)
// ==========================================
export const staffLogin = asyncHandler(async (req, res) => {
    const { email, password, role } = req.body;

    if (!email || !password || !role) {
        throw new ApiError(400, "Email, password, and role are required.");
    }

    // 1. Find the staff member
    const staff = await prisma.hospitalStaff.findUnique({
        where: { email },
        include: { doctorProfile: true, therapistProfile: true }
    });

    if (!staff) {
        throw new ApiError(404, "Staff member not found.");
    }

    // 2. Verify their role matches the portal they are using
    if (staff.role !== role) {
        throw new ApiError(403, `Access denied. This portal is for ${role}s only.`);
    }

    // 3. Check the password
    // NOTE: In a real app, passwords MUST be hashed. For the MVP, if they aren't hashed in DB, use direct compare.
    const isPasswordValid = await bcrypt.compare(password, staff.password).catch(() => password === staff.password);
    
    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid credentials.");
    }

    // 4. Generate Token & Cookie
    generateTokenAndSetCookie(staff, staff.role, res);

    // 5. Send safe user data back to React
    const safeUserData = {
        id: staff.id,
        name: staff.name,
        email: staff.email,
        role: staff.role,
        hospitalId: staff.hospitalId,
        // If they are a doctor, send their specific profile ID too!
        profileId: staff.doctorProfile?.id || staff.therapistProfile?.id || null 
    };

    return res.status(200).json(
        new ApiResponse(200, { user: safeUserData }, "Login successful.")
    );
});

// ==========================================
// PATIENT LOGIN (B2C)
// ==========================================
export const patientLogin = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        throw new ApiError(400, "Email and password are required.");
    }

    const patient = await prisma.patient.findUnique({ where: { email } });

    if (!patient || !patient.isAppRegistered) {
        throw new ApiError(404, "Patient account not found. Please register.");
    }

    const isPasswordValid = await bcrypt.compare(password, patient.password).catch(() => password === patient.password);
    
    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid credentials.");
    }

    generateTokenAndSetCookie(patient, "PATIENT", res);

    const safeUserData = {
        id: patient.id,
        name: patient.name,
        email: patient.email,
        prakriti: patient.prakriti
    };

    return res.status(200).json(
        new ApiResponse(200, { user: safeUserData }, "Login successful.")
    );
});

// ==========================================
// PATIENT REGISTRATION (B2C)
// ==========================================
export const patientRegister = asyncHandler(async (req, res) => {
    const {
        name,
        dateOfBirth,
        gender,
        bloodGroup,
        weight,
        height,
        email,
        password,
        phone,
        dietaryHabits,
        healthGoals,
        allergies,
        chronicConditions,
    } = req.body;

    if (!name || !email || !password || !phone || !gender || !dateOfBirth || !bloodGroup) {
        throw new ApiError(400, "Name, email, password, phone, gender, dateOfBirth, and bloodGroup are required.");
    }

    if (String(password).length < 8) {
        throw new ApiError(400, "Password must be at least 8 characters long.");
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const parsedDob = new Date(dateOfBirth);
    if (Number.isNaN(parsedDob.getTime())) {
        throw new ApiError(400, "Invalid dateOfBirth.");
    }
    if (parsedDob > new Date()) {
        throw new ApiError(400, "dateOfBirth cannot be in the future.");
    }
    const calculatedAge = computeAgeFromDob(parsedDob);
    if (calculatedAge < 0) {
        throw new ApiError(400, "Invalid dateOfBirth.");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const parsedAllergies = String(allergies || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

    const clinicalData = {
        weight: weight ? Number(weight) : null,
        height: height ? Number(height) : null,
        healthGoals: Array.isArray(healthGoals) ? healthGoals : [],
        chronicConditions: Array.isArray(chronicConditions) ? chronicConditions : [],
    };

    const existingPatient = await prisma.patient.findUnique({
        where: { email: normalizedEmail },
    });

    if (existingPatient?.isAppRegistered) {
        throw new ApiError(409, "An account with this email already exists. Please login.");
    }

    const patient = existingPatient
        ? await prisma.patient.update({
            where: { id: existingPatient.id },
            data: {
                name: String(name).trim(),
                password: hashedPassword,
                phoneNumber: String(phone).trim(),
                age: calculatedAge,
                dateOfBirth: parsedDob,
                gender: String(gender),
                bloodGroup: String(bloodGroup).trim().toUpperCase(),
                dietaryPref: dietaryHabits || null,
                allergies: parsedAllergies,
                clinicalData,
                isAppRegistered: true,
            },
        })
        : await prisma.patient.create({
            data: {
                name: String(name).trim(),
                email: normalizedEmail,
                password: hashedPassword,
                phoneNumber: String(phone).trim(),
                age: calculatedAge,
                dateOfBirth: parsedDob,
                gender: String(gender),
                bloodGroup: String(bloodGroup).trim().toUpperCase(),
                dietaryPref: dietaryHabits || null,
                allergies: parsedAllergies,
                clinicalData,
                isAppRegistered: true,
            },
        });

    const safeUserData = {
        id: patient.id,
        name: patient.name,
        email: patient.email,
    };

    return res.status(201).json(
        new ApiResponse(201, { user: safeUserData }, "Patient registered successfully.")
    );
});

// ==========================================
// LOGOUT (Clears the cookie)
// ==========================================
export const logout = asyncHandler(async (req, res) => {
    res.clearCookie('triveda_auth', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
    });

    return res.status(200).json(new ApiResponse(200, {}, "Logged out successfully."));
});

export const changePassword = asyncHandler(async (req, res) => {
    const { staffId, patientId, currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
        throw new ApiError(400, 'currentPassword and newPassword are required.');
    }

    if (String(newPassword).length < 8) {
        throw new ApiError(400, 'New password must be at least 8 characters long.');
    }

    if (currentPassword === newPassword) {
        throw new ApiError(400, 'New password must be different from current password.');
    }

    if (!staffId && !patientId) {
        throw new ApiError(400, 'staffId or patientId is required.');
    }

    const hashedPassword = await bcrypt.hash(String(newPassword), 10);

    if (staffId) {
        const staff = await prisma.hospitalStaff.findUnique({ where: { id: staffId } });
        if (!staff) {
            throw new ApiError(404, 'Staff member not found.');
        }

        const isPasswordValid = await bcrypt
            .compare(String(currentPassword), staff.password)
            .catch(() => String(currentPassword) === staff.password);

        if (!isPasswordValid) {
            throw new ApiError(401, 'Current password is incorrect.');
        }

        await prisma.hospitalStaff.update({
            where: { id: staffId },
            data: { password: hashedPassword },
        });

        return res
            .status(200)
            .json(new ApiResponse(200, { staffId }, 'Password updated successfully.'));
    }

    const patient = await prisma.patient.findUnique({ where: { id: patientId } });
    if (!patient) {
        throw new ApiError(404, 'Patient not found.');
    }

    const isPasswordValid = await bcrypt
        .compare(String(currentPassword), patient.password || '')
        .catch(() => String(currentPassword) === patient.password);

    if (!isPasswordValid) {
        throw new ApiError(401, 'Current password is incorrect.');
    }

    await prisma.patient.update({
        where: { id: patientId },
        data: { password: hashedPassword },
    });

    return res
        .status(200)
        .json(new ApiResponse(200, { patientId }, 'Password updated successfully.'));
});