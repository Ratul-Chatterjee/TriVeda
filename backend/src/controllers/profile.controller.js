import { prisma } from '../db/config.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';

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

export const getPatientProfile = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const emailQuery = req.query?.email ? String(req.query.email).trim().toLowerCase() : '';

    if (!id && !emailQuery) {
        throw new ApiError(400, 'Patient ID or email is required.');
    }

    const includeQuery = {
        select: {
            id: true,
            name: true,
            email: true,
            phoneNumber: true,
            age: true,
            dateOfBirth: true,
            gender: true,
            bloodGroup: true,
            prakriti: true,
            vikriti: true,
            dietaryPref: true,
            allergies: true,
            clinicalData: true,
            profileImageMimeType: true,
            appointments: {
                orderBy: { scheduledAt: 'desc' },
                take: 30,
                select: {
                    id: true,
                    status: true,
                    scheduledAt: true,
                    doctor: {
                        select: {
                            id: true,
                            name: true,
                            doctorProfile: {
                                select: {
                                    specialty: true,
                                },
                            },
                        },
                    },
                },
            },
            assessments: {
                orderBy: { createdAt: 'desc' },
                take: 1,
                select: {
                    id: true,
                    primaryDosha: true,
                    vataScore: true,
                    pittaScore: true,
                    kaphaScore: true,
                    answer1: true,
                    answer2: true,
                    answer3: true,
                    answer4: true,
                    answer5: true,
                    answer6: true,
                    answer7: true,
                    answer8: true,
                    createdAt: true,
                },
            },
            reports: {
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    fileName: true,
                    mimeType: true,
                    sizeBytes: true,
                    summary: true,
                    createdAt: true,
                },
            },
        },
    };

    let patient = null;

    if (id) {
        patient = await prisma.patient.findUnique({
            where: { id },
            ...includeQuery,
        });
    }

    if (!patient && emailQuery) {
        patient = await prisma.patient.findFirst({
            where: {
                email: {
                    equals: emailQuery,
                    mode: 'insensitive',
                },
            },
            ...includeQuery,
        });
    }

    if (!patient) {
        throw new ApiError(404, 'Patient not found.');
    }

    const latestAssessment = Array.isArray(patient.assessments) && patient.assessments.length > 0
        ? patient.assessments[0]
        : null;

    const answeredCount = latestAssessment
        ? [
            latestAssessment.answer1,
            latestAssessment.answer2,
            latestAssessment.answer3,
            latestAssessment.answer4,
            latestAssessment.answer5,
            latestAssessment.answer6,
            latestAssessment.answer7,
            latestAssessment.answer8,
        ].filter(Boolean).length
        : 0;

    const maxDoshaScore = (answeredCount || 8) * 3;
    const imageVersion = Date.now();

    const responsePatient = {
        ...patient,
        profileImageUrl: patient.profileImageMimeType
            ? `/api/profile/patient/${patient.id}/image?v=${imageVersion}`
            : null,
        maxDoshaScore,
    };

    delete responsePatient.profileImageMimeType;

    return res
        .status(200)
        .json(new ApiResponse(200, responsePatient, 'Patient profile fetched successfully.'));
});

export const getPatientProfileImage = asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!id) {
        throw new ApiError(400, 'Patient ID is required.');
    }

    const patient = await prisma.patient.findUnique({
        where: { id },
        select: {
            id: true,
            profileImageData: true,
            profileImageMimeType: true,
        },
    });

    if (!patient) {
        throw new ApiError(404, 'Patient not found.');
    }

    if (!patient.profileImageData || !patient.profileImageMimeType) {
        throw new ApiError(404, 'Profile image not found.');
    }

    res.setHeader('Content-Type', patient.profileImageMimeType);
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    return res.status(200).send(Buffer.from(patient.profileImageData));
});

export const getDoctorProfile = asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!id) {
        throw new ApiError(400, 'Doctor ID is required.');
    }

    const doctor = await prisma.hospitalStaff.findUnique({
        where: { id },
        include: {
            doctorProfile: true,
            appointmentsAsDoc: {
                orderBy: { scheduledAt: 'desc' },
                include: {
                    patient: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            age: true,
                            gender: true,
                            prakriti: true,
                            vikriti: true,
                        },
                    },
                },
            },
        },
    });

    if (!doctor || doctor.role !== 'DOCTOR') {
        throw new ApiError(404, 'Doctor not found.');
    }

    return res
        .status(200)
        .json(new ApiResponse(200, doctor, 'Doctor profile fetched successfully.'));
});

export const updatePatientProfile = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const {
        name,
        phoneNumber,
        gender,
        bloodGroup,
        dateOfBirth,
        profileImageBase64,
        profileImageMimeType,
        dietaryPref,
        allergies,
        healthGoals,
        chronicConditions,
        weight,
        height,
    } = req.body;

    if (!id) {
        throw new ApiError(400, 'Patient ID is required.');
    }

    const existingPatient = await prisma.patient.findUnique({ where: { id } });
    if (!existingPatient) {
        throw new ApiError(404, 'Patient not found.');
    }

    let parsedDob = existingPatient.dateOfBirth;
    let computedAge = existingPatient.age;

    if (dateOfBirth) {
        parsedDob = new Date(dateOfBirth);
        if (Number.isNaN(parsedDob.getTime())) {
            throw new ApiError(400, 'Invalid dateOfBirth provided.');
        }

        if (parsedDob > new Date()) {
            throw new ApiError(400, 'dateOfBirth cannot be in the future.');
        }

        computedAge = computeAgeFromDob(parsedDob);
        if (computedAge < 0) {
            throw new ApiError(400, 'Invalid age derived from dateOfBirth.');
        }
    }

    const currentClinicalData =
        existingPatient.clinicalData && typeof existingPatient.clinicalData === 'object'
            ? existingPatient.clinicalData
            : {};

    const nextClinicalData = {
        ...currentClinicalData,
        weight: weight !== undefined && weight !== null && weight !== '' ? Number(weight) : currentClinicalData.weight ?? null,
        height: height !== undefined && height !== null && height !== '' ? Number(height) : currentClinicalData.height ?? null,
        healthGoals: Array.isArray(healthGoals) ? healthGoals : currentClinicalData.healthGoals || [],
        chronicConditions: Array.isArray(chronicConditions)
            ? chronicConditions
            : currentClinicalData.chronicConditions || [],
    };

    let nextProfileImageData;
    let nextProfileImageMimeType;

    if (profileImageBase64 && profileImageMimeType) {
        try {
            nextProfileImageData = Buffer.from(String(profileImageBase64), 'base64');
        } catch (_error) {
            throw new ApiError(400, 'Invalid profile image payload.');
        }

        if (nextProfileImageData.length > 2 * 1024 * 1024) {
            throw new ApiError(400, 'Profile image is too large. Max allowed size is 2MB.');
        }

        nextProfileImageMimeType = String(profileImageMimeType);
    }

    const updateData = {
        name: typeof name === 'string' ? name.trim() : existingPatient.name,
        phoneNumber:
            typeof phoneNumber === 'string' && phoneNumber.trim().length > 0
                ? phoneNumber.trim()
                : existingPatient.phoneNumber,
        gender: typeof gender === 'string' ? gender : existingPatient.gender,
        bloodGroup:
            typeof bloodGroup === 'string' && bloodGroup.trim().length > 0
                ? bloodGroup.trim().toUpperCase()
                : existingPatient.bloodGroup,
        dietaryPref: typeof dietaryPref === 'string' ? dietaryPref : existingPatient.dietaryPref,
        allergies: Array.isArray(allergies)
            ? allergies.map((item) => String(item).trim()).filter(Boolean)
            : existingPatient.allergies,
        dateOfBirth: parsedDob,
        age: computedAge,
        clinicalData: nextClinicalData,
    };

    if (nextProfileImageData && nextProfileImageMimeType) {
        updateData.profileImageData = nextProfileImageData;
        updateData.profileImageMimeType = nextProfileImageMimeType;
    }

    const updatedPatient = await prisma.patient.update({
        where: { id },
        data: updateData,
        select: {
            id: true,
            name: true,
            email: true,
            phoneNumber: true,
            age: true,
            dateOfBirth: true,
            gender: true,
            bloodGroup: true,
            prakriti: true,
            vikriti: true,
            dietaryPref: true,
            allergies: true,
            clinicalData: true,
            profileImageData: true,
            profileImageMimeType: true,
        },
    });

    const responsePayload = {
        ...updatedPatient,
        profileImageUrl: updatedPatient.profileImageMimeType
            ? `/api/profile/patient/${updatedPatient.id}/image?v=${Date.now()}`
            : null,
    };

    delete responsePayload.profileImageData;
    delete responsePayload.profileImageMimeType;

    return res
        .status(200)
        .json(new ApiResponse(200, responsePayload, 'Patient profile updated successfully.'));
});

export const uploadPatientReport = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { fileName, mimeType, sizeBytes, fileBase64, summary } = req.body;

    if (!id) {
        throw new ApiError(400, 'Patient ID is required.');
    }

    if (!fileName || !mimeType || !sizeBytes || !fileBase64) {
        throw new ApiError(400, 'fileName, mimeType, sizeBytes, and fileBase64 are required.');
    }

    const patient = await prisma.patient.findUnique({ where: { id }, select: { id: true } });
    if (!patient) {
        throw new ApiError(404, 'Patient not found.');
    }

    let fileBuffer;
    try {
        fileBuffer = Buffer.from(String(fileBase64), 'base64');
    } catch (_error) {
        throw new ApiError(400, 'Invalid fileBase64 payload.');
    }

    const report = await prisma.patientReport.create({
        data: {
            patientId: id,
            fileName: String(fileName),
            mimeType: String(mimeType),
            sizeBytes: Number(sizeBytes),
            fileData: fileBuffer,
            summary:
                typeof summary === 'string' && summary.trim().length > 0
                    ? summary.trim()
                    : 'Analysis complete: Report uploaded and stored successfully.',
        },
        select: {
            id: true,
            fileName: true,
            mimeType: true,
            sizeBytes: true,
            summary: true,
            createdAt: true,
        },
    });

    return res
        .status(201)
        .json(new ApiResponse(201, report, 'Patient report uploaded successfully.'));
});

export const downloadPatientReport = asyncHandler(async (req, res) => {
    const { id, reportId } = req.params;

    if (!id || !reportId) {
        throw new ApiError(400, 'Patient ID and report ID are required.');
    }

    const report = await prisma.patientReport.findFirst({
        where: {
            id: reportId,
            patientId: id,
        },
        select: {
            fileName: true,
            mimeType: true,
            fileData: true,
        },
    });

    if (!report) {
        throw new ApiError(404, 'Report not found.');
    }

    res.setHeader('Content-Type', report.mimeType || 'application/octet-stream');
    res.setHeader(
        'Content-Disposition',
        `attachment; filename="${(report.fileName || 'report').replace(/"/g, '')}"`
    );

    return res.status(200).send(Buffer.from(report.fileData));
});
