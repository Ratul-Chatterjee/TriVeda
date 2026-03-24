import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  usePatientProfile,
  useUpdatePatientProfile,
  useUploadPatientReport,
} from "@/hooks/useProfile";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Heart,
  BarChart3,
  User,
  Award,
  Flame,
  Phone,
  Mail,
  Calendar,
  CheckCircle,
  XCircle,
  Star,
  Target,
  MapPin,
  Globe,
  Droplets,
  Wind,
  Leaf,
  Sparkles,
  Activity,
  TrendingUp,
  Shield,
  Clock,
  Edit3,
  Settings,
  Bell,
  ChevronRight,
  FileText,
  Upload,
  Brain,
  Trash2,
  AlertCircle,
  Pill,
  History,
  Plus,
} from "lucide-react";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

// Mock data (updated with array for allergies)
const defaultProfile = {
  name: "Priya Sharma",
  age: 34,
  gender: "Female",
  avatar: "https://randomuser.me/api/portraits/women/44.jpg",
  prakriti: "Pitta",
  bmi: 24.5,
  weight: 72,
  height: 165,
  email: "priya.sharma@example.com",
  phone: "+91-9000000000",
  dietary_habits: "Vegetarian",
  allergies: ["Peanuts", "Dust"], // Converted to array
  chronic_conditions: ["None"],
  goals: ["Weight Management", "Better Digestion"],
  compliance: 85,
  streak: 12,
  doshaScores: [
    { dosha: "Vata", score: 60 },
    { dosha: "Pitta", score: 90 },
    { dosha: "Kapha", score: 40 },
  ],
  recentActivity: [
    {
      type: "meal",
      label: "Logged Lunch",
      date: "2025-09-16",
      status: "on-plan",
      icon: "Flame",
    },
    {
      type: "reminder",
      label: "Took Evening Snack",
      date: "2025-09-15",
      status: "on-plan",
      icon: "CheckCircle",
    },
    {
      type: "feedback",
      label: "Received feedback: Great compliance!",
      date: "2025-09-15",
      status: "positive",
      icon: "Award",
    },
    {
      type: "meal",
      label: "Logged Dinner",
      date: "2025-09-14",
      status: "off-plan",
      icon: "XCircle",
    },
  ],
  languages: ["English", "Hindi"],
};

// Icon mapping
const activityIcons = {
  Flame: Flame,
  CheckCircle: CheckCircle,
  Award: Award,
  XCircle: XCircle,
};

type ActivityIconKey = keyof typeof activityIcons;

// Animation variants
const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const compressImageToBase64 = (
  file: File,
  maxDimension = 512,
  quality = 0.8
): Promise<{ base64: string; mimeType: string; sizeBytes: number; previewUrl: string }> => {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");

      if (!context) {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("Unable to process selected image."));
        return;
      }

      let targetWidth = image.width;
      let targetHeight = image.height;

      if (targetWidth > targetHeight && targetWidth > maxDimension) {
        targetHeight = Math.round((targetHeight * maxDimension) / targetWidth);
        targetWidth = maxDimension;
      } else if (targetHeight >= targetWidth && targetHeight > maxDimension) {
        targetWidth = Math.round((targetWidth * maxDimension) / targetHeight);
        targetHeight = maxDimension;
      }

      canvas.width = targetWidth;
      canvas.height = targetHeight;
      context.drawImage(image, 0, 0, targetWidth, targetHeight);

      const outputMime = file.type === "image/png" ? "image/png" : "image/jpeg";
      const dataUrl = canvas.toDataURL(outputMime, outputMime === "image/jpeg" ? quality : undefined);
      const base64 = dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl;

      URL.revokeObjectURL(objectUrl);
      resolve({
        base64,
        mimeType: outputMime,
        sizeBytes: Math.ceil((base64.length * 3) / 4),
        previewUrl: dataUrl,
      });
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Unable to read selected image."));
    };

    image.src = objectUrl;
  });
};

export default function PatientProfile() {
  const { toast } = useToast();
  const loggedInUser = JSON.parse(localStorage.getItem("triveda_user") || "{}");
  const patientId = loggedInUser?.id || "";
  const patientEmail = loggedInUser?.email || "";
  const { data: patientProfileData, isLoading, isError } = usePatientProfile(patientId, patientEmail);
  const updatePatientProfileMutation = useUpdatePatientProfile();
  const uploadPatientReportMutation = useUploadPatientReport();

  const profilePayload: any = (patientProfileData as any)?.data || patientProfileData || {};
  const resolvedProfileImageUrl =
    typeof profilePayload?.profileImageUrl === "string" && profilePayload.profileImageUrl.startsWith("/")
      ? profilePayload.profileImageUrl
      : profilePayload?.profileImageUrl;
  const effectivePatientId = profilePayload?.id || patientId;
  const maxDoshaScore = Number(profilePayload?.maxDoshaScore || 24);
  const latestAssessment = Array.isArray(profilePayload?.assessments)
    ? profilePayload.assessments[0]
    : null;
  const clinicalData = profilePayload?.clinicalData && typeof profilePayload.clinicalData === "object"
    ? profilePayload.clinicalData
    : {};

  const weight = Number(clinicalData?.weight ?? 0) || 0;
  const height = Number(clinicalData?.height ?? 0) || 0;
  const bmi = height > 0 ? Number((weight / ((height / 100) * (height / 100))).toFixed(1)) : 0;

  const appointments = Array.isArray(profilePayload?.appointments)
    ? profilePayload.appointments
    : [];
  const completedAppointments = appointments.filter((appointment: any) => appointment?.status === "COMPLETED").length;
  const compliance = appointments.length > 0 ? Math.round((completedAppointments / appointments.length) * 100) : 0;

  const doshaScores = [
    { dosha: "Vata", score: Number(latestAssessment?.vataScore ?? profilePayload?.vataScore ?? 0) },
    { dosha: "Pitta", score: Number(latestAssessment?.pittaScore ?? profilePayload?.pittaScore ?? 0) },
    { dosha: "Kapha", score: Number(latestAssessment?.kaphaScore ?? profilePayload?.kaphaScore ?? 0) },
  ];

  const recentActivity = appointments.slice(0, 5).map((appointment: any) => ({
    type: "appointment",
    label: `${appointment?.doctor?.name || "Doctor consultation"} appointment`,
    date: appointment?.scheduledAt
      ? new Date(appointment.scheduledAt).toISOString().split("T")[0]
      : "-",
    status:
      appointment?.status === "COMPLETED"
        ? "on-plan"
        : appointment?.status === "CANCELLED"
          ? "off-plan"
          : "positive",
    icon:
      appointment?.status === "COMPLETED"
        ? "CheckCircle"
        : appointment?.status === "CANCELLED"
          ? "XCircle"
          : "Award",
  }));

  const mockProfile = {
    ...defaultProfile,
    name: profilePayload?.name || loggedInUser?.name || defaultProfile.name,
    age: profilePayload?.age ?? defaultProfile.age,
    gender: profilePayload?.gender || "Not specified",
    prakriti: profilePayload?.prakriti || "Not Assessed",
    bmi: bmi || defaultProfile.bmi,
    weight: weight || defaultProfile.weight,
    height: height || defaultProfile.height,
    email: profilePayload?.email || loggedInUser?.email || defaultProfile.email,
    phone: profilePayload?.phoneNumber || defaultProfile.phone,
    dietary_habits: profilePayload?.dietaryPref || "Not specified",
    allergies: Array.isArray(profilePayload?.allergies) ? profilePayload.allergies : [],
    chronic_conditions: Array.isArray(clinicalData?.chronicConditions) ? clinicalData.chronicConditions : ["None"],
    goals: Array.isArray(clinicalData?.healthGoals) ? clinicalData.healthGoals : [],
    compliance,
    streak: completedAppointments,
    doshaScores,
    recentActivity: recentActivity.length ? recentActivity : defaultProfile.recentActivity,
    bloodGroup: profilePayload?.bloodGroup || "Not specified",
    vikriti: profilePayload?.vikriti || "Not specified",
    avatar: resolvedProfileImageUrl || defaultProfile.avatar,
    languages: ["English"],
  };

  const persistedReports = Array.isArray(profilePayload?.reports)
    ? profilePayload.reports.map((report: any) => ({
        id: report.id,
        name: report.fileName,
        summary:
          report.summary ||
          "Analysis complete: Report uploaded and stored successfully.",
        date: report.createdAt
          ? new Date(report.createdAt).toLocaleDateString()
          : "-",
      }))
    : [];

  const [activeTab, setActiveTab] = useState<"overview" | "activity" | "history">("overview");

  // Patient History States
  const [allergies, setAllergies] = useState<string[]>(mockProfile.allergies);
  const [conditions, setConditions] = useState<string[]>(mockProfile.chronic_conditions);
  const [reports, setReports] = useState<any[]>([]);
  
  const [newAllergy, setNewAllergy] = useState("");
  const [newCondition, setNewCondition] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    phoneNumber: "",
    gender: "",
    bloodGroup: "",
    dateOfBirth: "",
    dietaryPref: "",
    allergies: "",
    healthGoals: "",
    chronicConditions: "",
    weight: "",
    height: "",
  });

  useEffect(() => {
    setAllergies(mockProfile.allergies);
    setConditions(mockProfile.chronic_conditions);

    const existingDob = profilePayload?.dateOfBirth
      ? new Date(profilePayload.dateOfBirth).toISOString().split("T")[0]
      : "";
    const currentClinicalData =
      profilePayload?.clinicalData && typeof profilePayload.clinicalData === "object"
        ? profilePayload.clinicalData
        : {};

    setEditForm({
      name: profilePayload?.name || "",
      phoneNumber: profilePayload?.phoneNumber || "",
      gender: profilePayload?.gender || "",
      bloodGroup: profilePayload?.bloodGroup || "",
      dateOfBirth: existingDob,
      dietaryPref: profilePayload?.dietaryPref || "",
      allergies: Array.isArray(profilePayload?.allergies)
        ? profilePayload.allergies.join(", ")
        : "",
      healthGoals: Array.isArray(currentClinicalData?.healthGoals)
        ? currentClinicalData.healthGoals.join(", ")
        : "",
      chronicConditions: Array.isArray(currentClinicalData?.chronicConditions)
        ? currentClinicalData.chronicConditions.join(", ")
        : "",
      weight:
        currentClinicalData?.weight !== undefined && currentClinicalData?.weight !== null
          ? String(currentClinicalData.weight)
          : "",
      height:
        currentClinicalData?.height !== undefined && currentClinicalData?.height !== null
          ? String(currentClinicalData.height)
          : "",
    });

    setReports(persistedReports);

    if (profilePayload?.profileImageUrl) {
      setAvatarPreview(null);
    }
  }, [patientProfileData]);

  const handleSaveProfile = () => {
    if (!effectivePatientId) return;

    if (!editForm.dateOfBirth) {
      toast({
        title: "Validation Error",
        description: "Date of birth is required.",
        variant: "destructive",
      });
      return;
    }

    updatePatientProfileMutation.mutate(
      {
        id: effectivePatientId,
        payload: {
          name: editForm.name,
          phoneNumber: editForm.phoneNumber,
          gender: editForm.gender,
          bloodGroup: editForm.bloodGroup,
          dateOfBirth: editForm.dateOfBirth,
          dietaryPref: editForm.dietaryPref,
          allergies: editForm.allergies
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
          healthGoals: editForm.healthGoals
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
          chronicConditions: editForm.chronicConditions
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
          weight: editForm.weight ? Number(editForm.weight) : null,
          height: editForm.height ? Number(editForm.height) : null,
        },
      },
      {
        onSuccess: () => {
          toast({
            title: "Profile Updated",
            description: "Your profile changes were saved successfully.",
          });
          setShowEditModal(false);
        },
        onError: (error: any) => {
          toast({
            title: "Update Failed",
            description: error?.message || "Could not update profile.",
            variant: "destructive",
          });
        },
      }
    );
  };

  const persistHistory = (
    nextAllergies: string[],
    nextConditions: string[]
  ) => {
    if (!effectivePatientId) return;

    updatePatientProfileMutation.mutate(
      {
        id: effectivePatientId,
        payload: {
          allergies: nextAllergies,
          chronicConditions: nextConditions,
        },
      },
      {
        onError: (error: any) => {
          toast({
            title: "History Update Failed",
            description: error?.message || "Could not save patient history.",
            variant: "destructive",
          });
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground p-6 space-y-6">
        <Skeleton className="h-10 w-60" />
        <Skeleton className="h-40 w-full rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-28 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (isError || (!patientId && !patientEmail)) {
    return (
      <div className="min-h-screen bg-background text-foreground p-6">
        <div className="rounded-xl border border-red-200 bg-red-50 text-red-700 p-4">
          Unable to load patient profile.
        </div>
      </div>
    );
  }

  // Patient History Handlers
  const handleAddAllergy = () => {
    if (!newAllergy.trim()) return;
    const nextAllergies = [...allergies, newAllergy.trim()];
    setAllergies(nextAllergies);
    persistHistory(nextAllergies, conditions);
    setNewAllergy("");
  };

  const handleRemoveAllergy = (index: number) => {
    const nextAllergies = allergies.filter((_, i) => i !== index);
    setAllergies(nextAllergies);
    persistHistory(nextAllergies, conditions);
  };

  const handleAddCondition = () => {
    if (!newCondition.trim()) return;
    const sanitizedCurrent = conditions.filter((condition) => condition !== "None");
    const nextConditions = [...sanitizedCurrent, newCondition.trim()];
    setConditions(nextConditions);
    persistHistory(allergies, nextConditions);
    setNewCondition("");
  };

  const handleRemoveCondition = (index: number) => {
    const nextConditionsRaw = conditions.filter((_, i) => i !== index);
    const nextConditions = nextConditionsRaw.length > 0 ? nextConditionsRaw : ["None"];
    setConditions(nextConditions);
    persistHistory(allergies, nextConditions.filter((condition) => condition !== "None"));
  };

  const handleUploadReport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!effectivePatientId) {
      toast({
        title: "Upload Failed",
        description: "Patient ID is missing.",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        toast({
          title: "Upload Failed",
          description: "Unable to read selected file.",
          variant: "destructive",
        });
        return;
      }

      const fileBase64 = result.includes(",") ? result.split(",")[1] : result;

      uploadPatientReportMutation.mutate(
        {
          id: effectivePatientId,
          payload: {
            fileName: file.name,
            mimeType: file.type || "application/octet-stream",
            sizeBytes: file.size,
            fileBase64,
            summary:
              "Analysis complete: No critical abnormalities detected. Recommended: Follow up on Vitamin D levels and maintain current diet plan.",
          },
        },
        {
          onSuccess: () => {
            toast({
              title: "Report Uploaded",
              description: "Medical report stored in database successfully.",
            });
          },
          onError: (error: any) => {
            toast({
              title: "Upload Failed",
              description: error?.message || "Could not upload report.",
              variant: "destructive",
            });
          },
        }
      );
    };

    reader.readAsDataURL(file);
  };

  const handleProfileImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !effectivePatientId) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Image Upload Failed",
        description: "Please select a valid image file.",
        variant: "destructive",
      });
      e.target.value = "";
      return;
    }

    try {
      const compressed = await compressImageToBase64(file);

      if (compressed.sizeBytes > 2 * 1024 * 1024) {
        toast({
          title: "Image Upload Failed",
          description: "Image is too large after compression. Please choose a smaller file.",
          variant: "destructive",
        });
        e.target.value = "";
        return;
      }

      setAvatarPreview(compressed.previewUrl);

      updatePatientProfileMutation.mutate(
        {
          id: effectivePatientId,
          payload: {
            profileImageBase64: compressed.base64,
            profileImageMimeType: compressed.mimeType,
          },
        },
        {
          onSuccess: () => {
            toast({ title: "Profile picture updated" });
          },
          onError: (error: any) => {
            setAvatarPreview(null);
            toast({
              title: "Image Upload Failed",
              description: error?.message || "Could not upload profile image.",
              variant: "destructive",
            });
          },
        }
      );
    } catch (error: any) {
      toast({
        title: "Image Upload Failed",
        description: error?.message || "Unable to process selected image.",
        variant: "destructive",
      });
    } finally {
      e.target.value = "";
    }
  };

  const doshaStyleMap: Record<string, { label: string; value: string; track: string; fill: string }> = {
    Vata: {
      label: "text-violet-700",
      value: "text-violet-600",
      track: "bg-violet-100",
      fill: "bg-violet-500",
    },
    Pitta: {
      label: "text-amber-700",
      value: "text-amber-600",
      track: "bg-amber-100",
      fill: "bg-amber-500",
    },
    Kapha: {
      label: "text-emerald-700",
      value: "text-emerald-600",
      track: "bg-emerald-100",
      fill: "bg-emerald-500",
    },
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-background text-foreground">

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* Header */}
        <motion.div
          className="mb-8"
        >
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3 sm:gap-4 min-w-0">
              <div className="relative">
                <div className="absolute inset-0 bg-emerald-500 rounded-2xl blur-lg opacity-50"></div>
                <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-r from-emerald-500 to-[#10B981] flex items-center justify-center">
                  <User className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                </div>
              </div>
              <div className="min-w-0">
                <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-emerald-600 via-[#10B981] to-[#0D9488] bg-clip-text text-transparent leading-tight break-words">
                  Patient Profile
                </h1>
                <p className="text-gray-600 text-base sm:text-lg leading-relaxed">View and manage your health journey</p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap w-full lg:w-auto gap-2">
              <motion.button
                whileTap={{ scale: 0.95 }}
                className="p-2 bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200 hover:bg-white transition-all"
              >
                <Bell className="w-5 h-5 text-gray-600" />
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.95 }}
                className="p-2 bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200 hover:bg-white transition-all"
              >
                <Settings className="w-5 h-5 text-gray-600" />
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.95 }}
                className="px-3 sm:px-4 py-2 bg-gradient-to-r from-emerald-500 to-[#10B981] text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all flex items-center gap-2 text-sm sm:text-base"
                onClick={() => setShowEditModal(true)}
              >
                <Edit3 className="w-4 h-4" />
                Edit Profile
              </motion.button>
            </div>
          </div>

          {/* Tab Navigation - Updated with History Tab */}
          <div className="mt-6 w-full">
            <div className="grid grid-cols-3 gap-2 bg-white/80 backdrop-blur-sm rounded-xl p-1 w-full">
            <button
              onClick={() => setActiveTab("overview")}
              className={`h-11 px-2 sm:px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center whitespace-nowrap ${
                activeTab === "overview"
                  ? "bg-gradient-to-r from-emerald-500 to-[#10B981] text-white shadow-lg"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab("activity")}
              className={`h-11 px-2 sm:px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center whitespace-nowrap ${
                activeTab === "activity"
                  ? "bg-gradient-to-r from-emerald-500 to-[#10B981] text-white shadow-lg"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <span className="sm:hidden">Timeline</span>
              <span className="hidden sm:inline">Activity Timeline</span>
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`h-11 px-2 sm:px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-1 whitespace-nowrap ${
                activeTab === "history"
                  ? "bg-gradient-to-r from-emerald-500 to-[#10B981] text-white shadow-lg"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <History className="hidden sm:block w-4 h-4 shrink-0" />
              <span className="sm:hidden">History</span>
              <span className="hidden sm:inline">Patient History</span>
            </button>
            </div>
          </div>
        </motion.div>

        {showEditModal && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-gray-200 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-5 border-b border-gray-200">
                <h3 className="text-xl font-semibold text-gray-900">Edit Profile</h3>
                <button
                  className="text-gray-500 hover:text-gray-800"
                  onClick={() => setShowEditModal(false)}
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-600">Full Name</label>
                  <input
                    className="mt-1 w-full border rounded-lg px-3 py-2"
                    value={editForm.name}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-600">Phone Number</label>
                  <input
                    className="mt-1 w-full border rounded-lg px-3 py-2"
                    value={editForm.phoneNumber}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, phoneNumber: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-600">Gender</label>
                  <input
                    className="mt-1 w-full border rounded-lg px-3 py-2"
                    value={editForm.gender}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, gender: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-600">Blood Group</label>
                  <input
                    className="mt-1 w-full border rounded-lg px-3 py-2"
                    value={editForm.bloodGroup}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, bloodGroup: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-600">Date of Birth</label>
                  <input
                    type="date"
                    className="mt-1 w-full border rounded-lg px-3 py-2"
                    value={editForm.dateOfBirth}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, dateOfBirth: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-600">Age (Auto-calculated)</label>
                  <input
                    className="mt-1 w-full border rounded-lg px-3 py-2 bg-gray-100"
                    value={String(mockProfile.age || "")}
                    readOnly
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-600">Weight (kg)</label>
                  <input
                    type="number"
                    className="mt-1 w-full border rounded-lg px-3 py-2"
                    value={editForm.weight}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, weight: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-600">Height (cm)</label>
                  <input
                    type="number"
                    className="mt-1 w-full border rounded-lg px-3 py-2"
                    value={editForm.height}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, height: e.target.value }))}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm text-gray-600">Dietary Preference</label>
                  <input
                    className="mt-1 w-full border rounded-lg px-3 py-2"
                    value={editForm.dietaryPref}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, dietaryPref: e.target.value }))}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm text-gray-600">Allergies (comma separated)</label>
                  <input
                    className="mt-1 w-full border rounded-lg px-3 py-2"
                    value={editForm.allergies}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, allergies: e.target.value }))}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm text-gray-600">Health Goals (comma separated)</label>
                  <input
                    className="mt-1 w-full border rounded-lg px-3 py-2"
                    value={editForm.healthGoals}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, healthGoals: e.target.value }))}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm text-gray-600">Chronic Conditions (comma separated)</label>
                  <input
                    className="mt-1 w-full border rounded-lg px-3 py-2"
                    value={editForm.chronicConditions}
                    onChange={(e) =>
                      setEditForm((prev) => ({ ...prev, chronicConditions: e.target.value }))
                    }
                  />
                </div>
                <div className="md:col-span-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                  Prakriti, Vikriti, and dosha scores are system-calculated and cannot be edited.
                </div>
              </div>

              <div className="p-5 border-t border-gray-200 flex justify-end gap-3">
                <button
                  className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700"
                  onClick={() => setShowEditModal(false)}
                >
                  Cancel
                </button>
                <button
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-[#10B981] text-white"
                  onClick={handleSaveProfile}
                  disabled={updatePatientProfileMutation.isPending}
                >
                  {updatePatientProfileMutation.isPending ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Profile Header Card */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 p-4 sm:p-6 lg:p-8 mb-6 sm:mb-8 relative overflow-hidden group"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-emerald-500/5"></div>
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-emerald-200/20 rounded-full blur-3xl"></div>
          
          <div className="relative flex flex-col md:flex-row items-center gap-4 sm:gap-8">
            {/* Avatar */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-[#10B981] rounded-full blur-xl opacity-50"></div>
              <img
                src={avatarPreview || mockProfile.avatar}
                alt="avatar"
                className="relative w-24 h-24 sm:w-32 sm:h-32 rounded-full border-4 border-white shadow-xl object-cover"
              />
              <label
                className="absolute top-1 right-1 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-r from-emerald-500 to-[#10B981] text-white shadow-lg border-2 border-white flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity"
                title="Change profile photo"
              >
                <Plus className="w-4 h-4" />
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={handleProfileImageUpload}
                />
              </label>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3 }}
                className="absolute -bottom-2 -right-2 bg-gradient-to-r from-emerald-500 to-[#10B981] text-white rounded-full px-4 py-1.5 text-xs font-bold shadow-lg border-2 border-white"
              >
                Patient
              </motion.div>
            </div>

            {/* Info */}
            <div className="flex-1 text-center md:text-left min-w-0">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 break-words">{mockProfile.name}</h2>
              
              <div className="flex flex-wrap gap-2 mb-3 justify-center md:justify-start">
                {mockProfile.languages.map((lang) => (
                  <span
                    key={lang}
                    className="px-3 py-1 bg-gradient-to-r from-emerald-100 to-emerald-100 text-[#1F5C3F] rounded-full text-xs font-medium border border-emerald-200"
                  >
                    <Globe className="w-3 h-3 inline mr-1" />
                    {lang}
                  </span>
                ))}
              </div>

              <div className="flex flex-wrap gap-3 sm:gap-4 text-sm text-gray-600 justify-center md:justify-start">
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4 text-emerald-500" />
                  Age: {mockProfile.age}
                </span>
                <span className="flex items-center gap-1">
                  <Mail className="w-4 h-4 text-emerald-500" />
                  {mockProfile.email}
                </span>
                <span className="flex items-center gap-1">
                  <Phone className="w-4 h-4 text-emerald-500" />
                  {mockProfile.phone}
                </span>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="flex items-center justify-center gap-3 w-full md:w-auto">
              <div className="text-center">
                <div className="text-2xl font-bold text-amber-600">{mockProfile.prakriti}</div>
                <div className="text-xs text-gray-500">Prakriti</div>
              </div>
              <div className="w-px h-10 bg-gray-200"></div>
              <div className="text-center">
                <div className="text-2xl font-bold text-emerald-600">{mockProfile.bmi}</div>
                <div className="text-xs text-gray-500">BMI</div>
              </div>
            </div>
          </div>
        </motion.div>

        <AnimatePresence mode="wait">
          {activeTab === "overview" ? (
            <motion.div
              key="overview"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
            >
              {/* Stats Cards */}
              <motion.div
                variants={staggerContainer}
                initial="initial"
                animate="animate"
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
              >
                <motion.div
                  variants={fadeInUp}
                  className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/50 p-6"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-gradient-to-br from-orange-100 to-amber-100 rounded-xl">
                      <Flame className="w-6 h-6 text-orange-500" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">BMI</p>
                      <p className="text-2xl font-bold text-gray-900">{mockProfile.bmi}</p>
                      <p className="text-xs text-gray-400">Body Mass Index</p>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  variants={fadeInUp}
                  className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/50 p-6"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-xl">
                      <Target className="w-6 h-6 text-emerald-500" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-600">Compliance</p>
                      <p className="text-2xl font-bold text-gray-900">{mockProfile.compliance}%</p>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${mockProfile.compliance}%` }}
                          transition={{ duration: 1, delay: 0.5 }}
                          className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-[#10B981]"
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  variants={fadeInUp}
                  className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/50 p-6"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-gradient-to-br from-emerald-100 to-emerald-50 rounded-xl">
                      <Award className="w-6 h-6 text-[#10B981]" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Streak</p>
                      <p className="text-2xl font-bold text-gray-900">{mockProfile.streak} days</p>
                      <p className="text-xs text-gray-400">Current streak</p>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  variants={fadeInUp}
                  className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/50 p-6"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-gradient-to-br from-amber-100 to-yellow-100 rounded-xl">
                      <Star className="w-6 h-6 text-amber-500" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Prakriti</p>
                      <p className="text-2xl font-bold text-amber-600">{mockProfile.prakriti}</p>
                      <p className="text-xs text-gray-400">Ayurvedic Constitution</p>
                    </div>
                  </div>
                </motion.div>
              </motion.div>

              {/* Profile Details & Dosha Chart */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                {/* Profile Overview */}
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="lg:col-span-2 bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 p-6"
                >
                  <div className="flex items-center gap-2 mb-6">
                    <div className="p-2 bg-gradient-to-r from-rose-100 to-rose-50 rounded-lg">
                      <Heart className="w-5 h-5 text-rose-500" />
                    </div>
                    <h2 className="text-xl font-semibold bg-gradient-to-r from-rose-600 to-rose-500 bg-clip-text text-transparent">
                      Profile Overview
                    </h2>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <InfoRow label="Gender" value={mockProfile.gender} />
                      <InfoRow label="Blood Group" value={mockProfile.bloodGroup} />
                      <InfoRow label="Weight" value={`${mockProfile.weight} kg`} />
                      <InfoRow label="Height" value={`${mockProfile.height} cm`} />
                      <InfoRow label="Dietary Habits" value={mockProfile.dietary_habits} />
                      <InfoRow label="Vikriti" value={mockProfile.vikriti} />
                      
                      <div>
                        <span className="text-sm font-medium text-gray-700">Allergies:</span>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {allergies.map((allergy, index) => (
                            <span
                              key={index}
                              className="px-3 py-1 bg-gradient-to-r from-rose-100 to-rose-50 text-rose-700 rounded-full text-xs font-medium border border-rose-200"
                            >
                              {allergy}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div>
                        <span className="text-sm font-medium text-gray-700">Chronic Conditions:</span>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {conditions.map((condition, index) => (
                            <span
                              key={index}
                              className="px-3 py-1 bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-800 rounded-full text-xs font-medium border border-amber-200"
                            >
                              {condition}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div>
                        <span className="text-sm font-medium text-gray-700">Goals:</span>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {mockProfile.goals.map((g: string) => (
                            <span
                              key={g}
                              className="px-3 py-1 bg-gradient-to-r from-emerald-100 to-teal-100 text-emerald-800 rounded-full text-xs font-medium border border-emerald-200"
                            >
                              {g}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Dosha Radar Chart */}
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-full h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <RadarChart data={mockProfile.doshaScores}>
                            <PolarGrid stroke="#e5e7eb" />
                            <PolarAngleAxis dataKey="dosha" stroke="#6b7280" />
                            <PolarRadiusAxis angle={30} domain={[0, maxDoshaScore]} stroke="#6b7280" />
                            <Radar
                              name="Dosha"
                              dataKey="score"
                              stroke="#f59e42"
                              fill="#f59e42"
                              fillOpacity={0.3}
                            />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: "white",
                                border: "none",
                                borderRadius: "12px",
                                boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)",
                              }}
                            />
                          </RadarChart>
                        </ResponsiveContainer>
                      </div>
                      <p className="text-xs text-gray-400 mt-3 text-center w-full">
                        Prakriti Dosha Profile
                      </p>
                    </div>
                  </div>

                  {/* Dosha Details */}
                  <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                    {mockProfile.doshaScores.map((dosha) => {
                      const styles =
                        doshaStyleMap[dosha.dosha] || {
                          label: "text-slate-700",
                          value: "text-slate-600",
                          track: "bg-slate-100",
                          fill: "bg-slate-500",
                        };
                      const normalizedScore = Math.max(0, Number(dosha.score) || 0);
                      const barWidth =
                        normalizedScore > 0
                          ? Math.max((normalizedScore / Math.max(maxDoshaScore, 1)) * 100, 4)
                          : 0;
                      return (
                        <div key={dosha.dosha} className="text-center">
                          <div className={`text-sm font-medium mb-1 ${styles.label}`}>
                            {dosha.dosha}
                          </div>
                          <div className={`text-2xl font-bold ${styles.value}`}>
                            {dosha.score}
                          </div>
                          <div className={`w-full h-1.5 rounded-full mt-2 ${styles.track}`}>
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${barWidth}%` }}
                              transition={{ duration: 1, delay: 0.5 }}
                              className={`h-full rounded-full ${styles.fill}`}
                            />
                          </div>
                          <div className="text-xs text-gray-500 mt-1">/{maxDoshaScore}</div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>

                {/* Quick Stats Card */}
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="bg-gradient-to-br from-emerald-500 to-[#10B981] rounded-2xl shadow-xl p-6 text-white relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-black/10"></div>
                  <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
                  
                  <div className="relative">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Activity className="w-5 h-5" />
                      Health Summary
                    </h3>

                    <div className="space-y-4">
                      <div>
                        <p className="text-white/80 text-sm">Overall Health</p>
                        <div className="flex items-center gap-2">
                          <div className="text-2xl font-bold">Good</div>
                          <span className="px-2 py-1 bg-white/20 rounded-full text-xs">+5%</span>
                        </div>
                      </div>

                      <div>
                        <p className="text-white/80 text-sm">Dosha Balance</p>
                        <div className="text-2xl font-bold">75%</div>
                      </div>

                      <div>
                        <p className="text-white/80 text-sm">Next Checkup</p>
                        <div className="text-lg font-semibold">Oct 15, 2025</div>
                      </div>

                      <div className="pt-4 border-t border-white/20">
                        <button className="w-full px-4 py-2 bg-white/20 backdrop-blur-sm rounded-xl hover:bg-white/30 transition-all text-sm font-medium">
                          View Full Report
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          ) : activeTab === "activity" ? (
            <motion.div
              key="activity"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
            >
              {/* Activity Timeline */}
              <motion.div
                variants={staggerContainer}
                initial="initial"
                animate="animate"
                className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 p-4 sm:p-8"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6 sm:mb-8">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-gradient-to-r from-emerald-100 to-emerald-100 rounded-lg">
                      <BarChart3 className="w-5 h-5 text-[#1F5C3F]" />
                    </div>
                    <h2 className="text-xl font-semibold bg-gradient-to-r from-[#1F5C3F] to-[#10B981] bg-clip-text text-transparent">
                      Recent Activity
                    </h2>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    <button className="px-3 py-1.5 bg-gray-100 rounded-lg text-sm text-gray-600 hover:bg-gray-200 transition-colors">
                      This Week
                    </button>
                    <button className="px-3 py-1.5 bg-gradient-to-r from-[#1F5C3F] to-[#10B981] text-white rounded-lg text-sm shadow-md">
                      All Time
                    </button>
                  </div>
                </div>

                <div className="space-y-4 sm:space-y-6">
                  {mockProfile.recentActivity.map((a: any, i: number) => {
                    const Icon = activityIcons[a.icon as ActivityIconKey] || Flame;
                    const statusColor = 
                      a.status === "on-plan" ? "emerald" :
                      a.status === "off-plan" ? "rose" :
                      "blue";

                    return (
                      <motion.div
                        key={i}
                        variants={fadeInUp}
                        className="flex items-start gap-4 group"
                      >
                        <div className="relative">
                          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br from-${statusColor}-100 to-${statusColor}-200 flex items-center justify-center shadow-md group-hover:scale-110 transition-transform`}>
                            <Icon className={`w-5 h-5 text-${statusColor}-600`} />
                          </div>
                          {i !== mockProfile.recentActivity.length - 1 && (
                            <div className="absolute top-10 left-1/2 w-0.5 h-12 bg-gradient-to-b from-gray-200 to-transparent -translate-x-1/2"></div>
                          )}
                        </div>
                        
                        <div className="flex-1 bg-gray-50 rounded-xl p-4 group-hover:bg-white group-hover:shadow-md transition-all">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-semibold text-gray-900">{a.label}</span>
                            <span className={`text-xs px-2 py-1 rounded-full bg-${statusColor}-100 text-${statusColor}-700 font-medium`}>
                              {a.status}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <Clock className="w-3 h-3" />
                            {a.date}
                            <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                            <span className="capitalize">{a.type}</span>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>

                {/* Activity Stats */}
                <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                  <div className="text-center p-4 bg-emerald-50 rounded-xl">
                    <div className="text-2xl font-bold text-emerald-600">85%</div>
                    <div className="text-xs text-gray-600">On-Plan Rate</div>
                  </div>
                  <div className="text-center p-4 bg-emerald-50 rounded-xl">
                    <div className="text-2xl font-bold text-[#1F5C3F]">12</div>
                    <div className="text-xs text-gray-600">Total Activities</div>
                  </div>
                  <div className="text-center p-4 bg-amber-50 rounded-xl">
                    <div className="text-2xl font-bold text-amber-600">3</div>
                    <div className="text-xs text-gray-600">This Week</div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          ) : (
            // PATIENT HISTORY TAB
            <motion.div
              key="history"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              {/* Allergies Section */}
              <motion.div
                variants={fadeInUp}
                className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 p-4 sm:p-6"
              >
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 bg-gradient-to-r from-rose-100 to-rose-50 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-rose-600" />
                  </div>
                  <h2 className="text-lg sm:text-xl font-semibold bg-gradient-to-r from-rose-600 to-rose-500 bg-clip-text text-transparent break-words">
                    Allergies
                  </h2>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mb-4">
                  <input
                    type="text"
                    value={newAllergy}
                    onChange={(e) => setNewAllergy(e.target.value)}
                    placeholder="Add allergy (e.g., Peanuts, Dust)"
                    className="flex-1 px-3 sm:px-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white/50 min-w-0"
                    onKeyPress={(e) => e.key === 'Enter' && handleAddAllergy()}
                  />
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={handleAddAllergy}
                    className="px-3 sm:px-4 py-2 whitespace-nowrap bg-gradient-to-r from-rose-500 to-rose-600 text-white rounded-lg font-medium shadow-md hover:shadow-lg transition-all flex items-center gap-2 text-sm"
                  >
                    <Plus className="w-4 h-4" />
                    Add
                  </motion.button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {allergies.map((allergy, index) => (
                    <motion.span
                      key={index}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="group relative px-4 py-2 bg-gradient-to-r from-rose-100 to-rose-50 text-rose-700 rounded-full text-sm font-medium border border-rose-200 flex items-center gap-2 shadow-sm"
                    >
                      {allergy}
                      <button
                        onClick={() => handleRemoveAllergy(index)}
                        className="hover:text-rose-900 transition-colors"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </motion.span>
                  ))}
                  {allergies.length === 0 && (
                    <p className="text-gray-400 text-sm">No allergies added yet</p>
                  )}
                </div>
              </motion.div>

              {/* Previous Medical Conditions */}
              <motion.div
                variants={fadeInUp}
                className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 p-4 sm:p-6"
              >
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 bg-gradient-to-r from-amber-100 to-yellow-100 rounded-lg">
                    <Heart className="w-5 h-5 text-amber-600" />
                  </div>
                  <h2 className="text-lg sm:text-xl font-semibold bg-gradient-to-r from-amber-600 to-yellow-600 bg-clip-text text-transparent break-words">
                    Previous Medical Conditions
                  </h2>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mb-4">
                  <input
                    type="text"
                    value={newCondition}
                    onChange={(e) => setNewCondition(e.target.value)}
                    placeholder="Add condition (e.g., Diabetes, Hypertension)"
                    className="flex-1 px-3 sm:px-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white/50 min-w-0"
                    onKeyPress={(e) => e.key === 'Enter' && handleAddCondition()}
                  />
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={handleAddCondition}
                    className="px-3 sm:px-4 py-2 whitespace-nowrap bg-gradient-to-r from-amber-500 to-yellow-600 text-white rounded-lg font-medium shadow-md hover:shadow-lg transition-all flex items-center gap-2 text-sm"
                  >
                    <Plus className="w-4 h-4" />
                    Add
                  </motion.button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {conditions.map((condition, index) => (
                    <motion.span
                      key={index}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="group relative px-4 py-2 bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-800 rounded-full text-sm font-medium border border-amber-200 flex items-center gap-2 shadow-sm"
                    >
                      {condition}
                      <button
                        onClick={() => handleRemoveCondition(index)}
                        className="hover:text-amber-900 transition-colors"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </motion.span>
                  ))}
                  {conditions.length === 1 && conditions[0] === "None" && (
                    <p className="text-gray-400 text-sm">No conditions added yet</p>
                  )}
                </div>
              </motion.div>

              {/* Medical Report Upload */}
              <motion.div
                variants={fadeInUp}
                className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 p-4 sm:p-6"
              >
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 bg-gradient-to-r from-emerald-100 to-emerald-50 rounded-lg">
                    <Upload className="w-5 h-5 text-[#1F5C3F]" />
                  </div>
                  <h2 className="text-lg sm:text-xl font-semibold bg-gradient-to-r from-[#1F5C3F] to-[#10B981] bg-clip-text text-transparent break-words">
                    Upload Medical Report
                  </h2>
                </div>

                <div className="relative">
                  <input
                    type="file"
                    onChange={handleUploadReport}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    accept=".pdf,.jpg,.jpeg,.png"
                  />
                  <div className="border-2 border-dashed border-emerald-200 rounded-xl p-4 sm:p-8 text-center hover:border-emerald-400 transition-colors bg-emerald-50/30">
                    <Upload className="w-10 h-10 sm:w-12 sm:h-12 text-emerald-400 mx-auto mb-3" />
                    <p className="text-sm sm:text-base text-[#1F5C3F] font-medium break-words">Click to upload or drag and drop</p>
                    <p className="text-xs sm:text-sm text-gray-500 mt-1">PDF, JPG, PNG (Max 10MB)</p>
                  </div>
                </div>
              </motion.div>

              {/* AI Health Report Analyzer */}
              <motion.div
                variants={fadeInUp}
                className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 p-4 sm:p-6"
              >
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 bg-gradient-to-r from-emerald-100 to-emerald-100 rounded-lg">
                    <Brain className="w-5 h-5 text-[#1F5C3F]" />
                  </div>
                  <h2 className="text-lg sm:text-xl font-semibold bg-gradient-to-r from-[#1F5C3F] to-[#10B981] bg-clip-text text-transparent break-words">
                    AI Health Report Analyzer
                  </h2>
                </div>

                {reports.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50/50 rounded-xl">
                    <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-500">
                      Upload a medical report to see AI-powered analysis
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {reports.map((report, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="border border-emerald-100 rounded-xl p-4 bg-gradient-to-r from-emerald-50 to-emerald-50/70"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <FileText className="w-5 h-5 text-[#1F5C3F]" />
                            <span className="font-semibold text-gray-900">{report.name}</span>
                          </div>
                          <span className="text-xs text-gray-500">{report.date}</span>
                        </div>
                        <p className="text-sm text-gray-700 bg-white/80 rounded-lg p-3">
                          {report.summary}
                        </p>
                        {report.id && effectivePatientId && (
                          <div className="mt-2">
                            <a
                              href={`/api/profile/patient/${effectivePatientId}/reports/${report.id}/download`}
                              className="text-xs sm:text-sm font-medium text-[#1F5C3F] hover:text-[#10B981]"
                            >
                              Download Report
                            </a>
                          </div>
                        )}
                        {report.summary.includes("analyzing") && (
                          <div className="flex items-center gap-2 mt-2">
                            <div className="w-4 h-4 border-2 border-[#1F5C3F] border-t-transparent rounded-full animate-spin"></div>
                            <span className="text-xs text-[#1F5C3F]">Processing...</span>
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

    </div>
  );
}

// Helper component for info rows
const InfoRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
    <span className="text-sm font-medium text-gray-700">{label}:</span>
    <span className="text-sm text-gray-900">{value}</span>
  </div>
);