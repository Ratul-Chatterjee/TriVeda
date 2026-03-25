import { prisma } from '../db/config.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';

const ALLOWED_STAFF_ROLES = [
    "ADMIN",
    "DOCTOR",
    "RECEPTIONIST",
    "PHARMACIST",
    "NURSE",
    "THERAPIST",
    "BILLING",
];

const resolveHospitalIdFromRequest = async (req) => {
    const token = req.cookies?.triveda_auth;
    if (!token) return null;

    try {
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET || "fallback_super_secret_triveda_key_do_not_use_in_prod"
        );

        const loggedInStaff = await prisma.hospitalStaff.findUnique({
            where: { id: decoded.id },
            select: { hospitalId: true, role: true },
        });

        if (loggedInStaff?.role === "ADMIN") {
            return loggedInStaff.hospitalId;
        }
    } catch (error) {
        return null;
    }

    return null;
};

export const getDepartments = asyncHandler(async (req, res) => {
    const departments = await prisma.department.findMany({
        select: { id: true, name: true, description: true }
    });

    return res.status(200).json(new ApiResponse(200, departments, "Departments fetched successfully."));
});

export const checkStaffEmailAvailability = asyncHandler(async (req, res) => {
    const emailRaw = req.query?.email;
    const email = typeof emailRaw === "string" ? emailRaw.trim().toLowerCase() : "";

    if (!email) {
        throw new ApiError(400, "Email is required.");
    }

    const existingStaff = await prisma.hospitalStaff.findFirst({
        where: {
            email: {
                equals: email,
                mode: "insensitive",
            },
        },
        select: { id: true },
    });

    return res.status(200).json(
        new ApiResponse(
            200,
            { email, exists: !!existingStaff },
            existingStaff ? "Email is already in use." : "Email is available."
        )
    );
});

export const createStaff = asyncHandler(async (req, res) => {
    const { name, email, specialization, departmentId, hospitalId, role = "DOCTOR" } = req.body;
    const normalizedRole = String(role || "DOCTOR").trim().toUpperCase();
    const normalizedEmail = String(email || "").trim().toLowerCase();

    if (!name || !normalizedEmail || !normalizedRole) {
        throw new ApiError(400, "Missing required fields.");
    }

    if (!ALLOWED_STAFF_ROLES.includes(normalizedRole)) {
        throw new ApiError(400, "Invalid staff role selected.");
    }

    if (normalizedRole === "DOCTOR" && (!specialization || !departmentId)) {
        throw new ApiError(400, "Specialization and department are required for doctor role.");
    }

    let finalHospitalId = hospitalId;

    if (!finalHospitalId) {
        const token = req.cookies?.triveda_auth;

        if (token) {
            try {
                const decoded = jwt.verify(
                    token,
                    process.env.JWT_SECRET || "fallback_super_secret_triveda_key_do_not_use_in_prod"
                );

                const loggedInStaff = await prisma.hospitalStaff.findUnique({
                    where: { id: decoded.id },
                    select: { hospitalId: true, role: true }
                });

                if (loggedInStaff?.role === "ADMIN") {
                    finalHospitalId = loggedInStaff.hospitalId;
                }
            } catch (error) {
                // If token verification fails, we keep finalHospitalId as-is and fail validation below.
            }
        }
    }

    if (!finalHospitalId) {
        throw new ApiError(400, "Hospital ID is required. Please log in again.");
    }

    // 1. Check if email exists
    const existingStaff = await prisma.hospitalStaff.findFirst({
        where: {
            email: {
                equals: normalizedEmail,
                mode: "insensitive",
            },
        },
    });
    if (existingStaff) throw new ApiError(400, "Email is already registered.");

    // 2. Auto-Generate the Password (e.g. Doc-4f8a2b)
    const randomHex = crypto.randomBytes(3).toString('hex');
    const generatedPassword = `Doc-${randomHex}`;
    
    // Hash it before saving to the database
    const hashedPassword = await bcrypt.hash(generatedPassword, 10);

    let finalDepartmentId = null;

    if (normalizedRole === "DOCTOR") {
        finalDepartmentId = departmentId;

        if (departmentId) {
            const department = await prisma.department.findUnique({ where: { id: departmentId } });
            if (!department) {
                throw new ApiError(404, "Department not found.");
            }
        }
    }

    const createData = {
        name,
        email: normalizedEmail,
        password: hashedPassword,
        role: normalizedRole,
        hospitalId: finalHospitalId,
    };

    if (normalizedRole === "DOCTOR") {
        createData.doctorProfile = {
            create: {
                specialty: specialization,
                departmentId: finalDepartmentId,
                experienceYrs: 0,
            },
        };
    }

    const newStaff = await prisma.hospitalStaff.create({
        data: createData,
    });

    return res.status(201).json(new ApiResponse(201, { 
        staffId: newStaff.id,
        role: normalizedRole,
        temporaryPassword: generatedPassword 
    }, `${normalizedRole} added successfully.`));
});

export const getDoctors = asyncHandler(async (req, res) => {
    const hospitalIdFromToken = await resolveHospitalIdFromRequest(req);
    const hospitalId = req.query?.hospitalId || hospitalIdFromToken;

    const whereClause = {
        role: "DOCTOR",
        ...(hospitalId ? { hospitalId } : {}),
    };

    const doctors = await prisma.hospitalStaff.findMany({
        where: whereClause,
        include: {
            hospital: {
                select: { name: true },
            },
            doctorProfile: {
                select: {
                    specialty: true,
                    experienceYrs: true,
                    isAvailable: true,
                },
            },
            appointmentsAsDoc: {
                select: {
                    patientId: true,
                },
            },
        },
        orderBy: { createdAt: "desc" },
    });

    const mapped = doctors.map((doctor) => {
        const uniquePatients = new Set(doctor.appointmentsAsDoc.map((a) => a.patientId)).size;
        const consultations = doctor.appointmentsAsDoc.length;

        return {
            id: doctor.id,
            name: doctor.name,
            specialization: doctor.doctorProfile?.specialty || "General Ayurveda",
            patients: uniquePatients,
            experience: `${doctor.doctorProfile?.experienceYrs || 0} years`,
            rating: 4.8,
            status: doctor.doctorProfile?.isAvailable ? "active" : "inactive",
            joinDate: doctor.createdAt.toISOString().split("T")[0],
            phone: "N/A",
            email: doctor.email,
            location: doctor.hospital?.name || "Clinic",
            image: null,
            achievements: [],
            consultations,
            revenue: consultations * 1000,
        };
    });

    return res
        .status(200)
        .json(new ApiResponse(200, mapped, "Doctors fetched successfully."));
});

export const getPatients = asyncHandler(async (req, res) => {
    const patients = await prisma.patient.findMany({
        include: {
            appointments: {
                include: {
                    doctor: {
                        select: { name: true },
                    },
                },
                orderBy: { scheduledAt: "desc" },
            },
        },
        orderBy: { createdAt: "desc" },
    });

    const now = new Date();

    const mapped = patients.map((patient) => {
        const lastAppointment = patient.appointments[0] || null;
        const nextAppointment = patient.appointments
            .filter((a) => new Date(a.scheduledAt) >= now)
            .sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt))[0] || null;

        const doctorName =
            nextAppointment?.doctor?.name || lastAppointment?.doctor?.name || "Unassigned";

        return {
            id: patient.id,
            name: patient.name,
            doctor: doctorName,
            lastVisit:
                (lastAppointment?.scheduledAt || patient.createdAt).toISOString().split("T")[0],
            status: patient.isAppRegistered ? "active" : "inactive",
            condition: patient.vikriti || "General Wellness",
            priority: "medium",
            age: patient.age || 0,
            phone: patient.phoneNumber || "N/A",
            nextAppointment:
                (nextAppointment?.scheduledAt || patient.createdAt).toISOString().split("T")[0],
            image: null,
            treatmentProgress: 50,
            lastVitals: { bp: "N/A", hr: "N/A", temp: "N/A" },
        };
    });

    return res
        .status(200)
        .json(new ApiResponse(200, mapped, "Patients fetched successfully."));
});

export const deleteDoctor = asyncHandler(async (req, res) => {
    const { doctorId } = req.params;

    if (!doctorId) {
        throw new ApiError(400, "Doctor ID is required.");
    }

    const doctor = await prisma.hospitalStaff.findUnique({
        where: { id: doctorId },
        select: { id: true, role: true, name: true },
    });

    if (!doctor || doctor.role !== "DOCTOR") {
        throw new ApiError(404, "Doctor not found.");
    }

    const appointmentCount = await prisma.appointment.count({
        where: { doctorId },
    });

    if (appointmentCount > 0) {
        throw new ApiError(
            409,
            "Doctor cannot be deleted because appointments exist. Reassign or clear appointments first."
        );
    }

    await prisma.hospitalStaff.delete({ where: { id: doctorId } });

    return res
        .status(200)
        .json(new ApiResponse(200, { doctorId }, "Doctor deleted successfully."));
});

export const deletePatient = asyncHandler(async (req, res) => {
    const { patientId } = req.params;

    if (!patientId) {
        throw new ApiError(400, "Patient ID is required.");
    }

    const patient = await prisma.patient.findUnique({
        where: { id: patientId },
        select: { id: true },
    });

    if (!patient) {
        throw new ApiError(404, "Patient not found.");
    }

    const appointmentCount = await prisma.appointment.count({
        where: { patientId },
    });

    if (appointmentCount > 0) {
        throw new ApiError(
            409,
            "Patient cannot be deleted because appointments exist. Clear appointments first."
        );
    }

    await prisma.patient.delete({ where: { id: patientId } });

    return res
        .status(200)
        .json(new ApiResponse(200, { patientId }, "Patient deleted successfully."));
});