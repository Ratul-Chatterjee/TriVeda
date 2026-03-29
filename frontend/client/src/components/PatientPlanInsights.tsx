import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { Skeleton } from "@/components/ui/skeleton";
import { useLatestTreatmentPlan } from "@/hooks/useAppointments";
import { appointmentApi } from "@/api/appointment.api";
import {
  Activity,
  AlertCircle,
  CheckCircle,
  Download,
  Dumbbell,
  Filter,
  Leaf,
  Pill,
  Share2,
  Sparkles,
  Target,
} from "lucide-react";

type Mode = "asanas" | "medicines";

type PlanRow = {
  slot: string;
  time: string;
  title: string;
  recommended: string[];
  caution: string[];
  rationale: string;
  compliance: "on-plan" | "off-plan";
};

const slotOrder = ["EARLY_MORNING", "MORNING", "MIDDAY", "EVENING", "NIGHT", "OTHER"];
const slotLabel: Record<string, string> = {
  EARLY_MORNING: "Early Morning",
  MORNING: "Morning",
  MIDDAY: "Midday",
  EVENING: "Evening",
  NIGHT: "Night",
  OTHER: "Anytime",
};

const slotTime: Record<string, string> = {
  EARLY_MORNING: "6:00 AM",
  MORNING: "8:00 AM",
  MIDDAY: "1:00 PM",
  EVENING: "6:00 PM",
  NIGHT: "9:00 PM",
  OTHER: "--",
};

function normalizeSlot(value: string): string {
  const raw = String(value || "").toLowerCase();
  if (raw.includes("early") || raw.includes("empty") || raw.includes("before breakfast")) return "EARLY_MORNING";
  if (raw.includes("morning") || raw.includes("breakfast") || raw.includes("am")) return "MORNING";
  if (raw.includes("lunch") || raw.includes("mid") || raw.includes("noon") || raw.includes("afternoon")) return "MIDDAY";
  if (raw.includes("evening") || raw.includes("sunset") || raw.includes("pm")) return "EVENING";
  if (raw.includes("night") || raw.includes("sleep") || raw.includes("bed")) return "NIGHT";
  return "OTHER";
}

function asStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item === "string") return item.trim();
      if (!item || typeof item !== "object") return "";
      const candidate =
        String((item as any).name || "").trim() ||
        String((item as any).title || "").trim() ||
        String((item as any).itemName || "").trim() ||
        String((item as any).label || "").trim();
      return candidate;
    })
    .filter(Boolean);
}

function usePatientId(): string {
  const user = JSON.parse(localStorage.getItem("triveda_user") || "{}");
  const portal = String(user?.portal || "").trim().toUpperCase();
  const role = String(user?.role || "").trim().toUpperCase();
  const rawPatientId = String(user?.id || user?.patientId || "").trim();
  const rememberedPatientId =
    typeof window !== "undefined"
      ? String(window.sessionStorage.getItem("patient:active-id") || "").trim()
      : "";

  const isPatientSession =
    portal === "PATIENT" || role === "PATIENT" || (!!rawPatientId && role !== "DOCTOR" && role !== "ADMIN");

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (rawPatientId) window.sessionStorage.setItem("patient:active-id", rawPatientId);
  }, [rawPatientId]);

  return isPatientSession ? rawPatientId || rememberedPatientId : "";
}

function modeConfig(mode: Mode) {
  if (mode === "asanas") {
    return {
      title: "My Asanas & Exercise Plan",
      subtitle: "Personalized movement and daily routine guidance",
      emptyTitle: "No active asana plan prescribed yet",
      emptyDescription:
        "Please attend your scheduled consultation. Your prescribed asanas and daily movement routine will appear here after your doctor finalizes treatment.",
      errorTitle: "Unable to load asana plan",
      sessionDescription: "Please login as a patient account to view your prescribed asanas and exercise routine.",
      exportSheet: "AsanasPlan",
      exportFile: "asanas_plan.xlsx",
      badge: "Asanas",
      icon: Dumbbell,
      gradient: "from-emerald-500 to-teal-500",
      glow: "bg-emerald-500",
      recommendedHeader: "Recommended Asanas / Exercises",
      cautionHeader: "Cautions",
      filterLabels: ["all", "morning", "midday", "evening", "night"],
    };
  }

  return {
    title: "My Medicines & Herbs Plan",
    subtitle: "Doctor-prescribed herbal medicines and intake schedule",
    emptyTitle: "No active medicines plan prescribed yet",
    emptyDescription:
      "Please attend your scheduled consultation. Your prescribed medicines and herbs will appear here after your doctor finalizes treatment.",
    errorTitle: "Unable to load medicines plan",
    sessionDescription: "Please login as a patient account to view your prescribed medicines and herbs.",
    exportSheet: "MedicinesPlan",
    exportFile: "medicines_plan.xlsx",
    badge: "Medicines",
    icon: Pill,
    gradient: "from-emerald-500 to-cyan-500",
    glow: "bg-emerald-500",
    recommendedHeader: "Medicines / Herbs",
    cautionHeader: "Avoid / Special Notes",
    filterLabels: ["all", "morning", "midday", "evening", "night"],
  };
}

function getPlanRows(mode: Mode, treatmentPlan: any): PlanRow[] {
  if (mode === "asanas") {
    const routinePlan = treatmentPlan?.routinePlan || {};
    const exercises = asStringList(routinePlan?.exercisesAndAsanas);
    const therapies = asStringList(routinePlan?.therapy);
    const tests = asStringList(routinePlan?.tests);

    const merged = [
      ...exercises.map((name) => ({ label: name, note: "Follow correct posture and breath rhythm." })),
      ...therapies.map((name) => ({ label: `Therapy: ${name}`, note: "Complete under therapist guidance." })),
      ...tests.map((name) => ({ label: `Check: ${name}`, note: "Track before next follow-up." })),
    ];

    if (merged.length === 0) return [];

    return merged.map((item, index) => {
      const cycleSlot = slotOrder[index % (slotOrder.length - 1)];
      return {
        slot: cycleSlot,
        time: slotTime[cycleSlot],
        title: slotLabel[cycleSlot],
        recommended: [item.label],
        caution: [],
        rationale: item.note,
        compliance: "on-plan",
      };
    });
  }

  const medications = Array.isArray(treatmentPlan?.medications) ? treatmentPlan.medications : [];
  if (medications.length === 0) return [];

  const groups = new Map<string, PlanRow>();

  medications.forEach((medication: any) => {
    const name = String(medication?.name || "").trim();
    if (!name) return;

    const dosage = String(medication?.dosage || "").trim();
    const timing = String(medication?.timing || "").trim();
    const medicineType = String(medication?.medicineType || "").trim();
    const days = medication?.durationDays ? `${medication.durationDays} day(s)` : "";
    const itemText = [name, dosage, medicineType, days].filter(Boolean).join(" | ");

    const slot = normalizeSlot(timing);
    if (!groups.has(slot)) {
      groups.set(slot, {
        slot,
        time: slotTime[slot],
        title: slotLabel[slot],
        recommended: [],
        caution: [],
        rationale: "Take medicines exactly as prescribed by your doctor.",
        compliance: "on-plan",
      });
    }

    const row = groups.get(slot)!;
    row.recommended.push(itemText);

    const doctorNotes = String(medication?.doctorNotes || "").trim();
    if (doctorNotes) row.caution.push(`${name}: ${doctorNotes}`);
  });

  return slotOrder
    .filter((slot) => groups.has(slot))
    .map((slot) => groups.get(slot)!);
}

export default function PatientPlanInsights({ mode }: { mode: Mode }) {
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [showAlert, setShowAlert] = useState(false);
  const [feedbackLoading, setFeedbackLoading] = useState<"working" | "not_effective" | "terminate_request" | null>(null);

  const config = modeConfig(mode);
  const Icon = config.icon;

  const patientId = usePatientId();
  const { data, isLoading, isError, error } = useLatestTreatmentPlan(patientId);
  const treatmentPlan = data as any;

  const planRows = useMemo(() => getPlanRows(mode, treatmentPlan), [mode, treatmentPlan]);
  const hasPlan = planRows.length > 0;

  const filteredRows = useMemo(() => {
    if (selectedFilter === "all") return planRows;
    return planRows.filter((row) => row.slot.toLowerCase().includes(selectedFilter));
  }, [planRows, selectedFilter]);

  const submitFeedback = async (feedbackType: "working" | "not_effective" | "terminate_request") => {
    if (!patientId || !treatmentPlan?.id) return;
    try {
      setFeedbackLoading(feedbackType);
      await appointmentApi.submitTreatmentPlanFeedback(patientId, {
        treatmentPlanId: treatmentPlan.id,
        planType: mode,
        feedbackType,
        message:
          feedbackType === "working"
            ? "Patient reports this plan is working well."
            : feedbackType === "not_effective"
              ? "Patient reports this plan is not effective enough."
              : "Patient requests doctor review for termination.",
      });
      setShowAlert(true);
    } finally {
      setFeedbackLoading(null);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen relative bg-background text-foreground">
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 space-y-6">
          <Skeleton className="h-24 w-full rounded-2xl" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            <Skeleton className="h-40 rounded-2xl" />
            <Skeleton className="h-40 rounded-2xl" />
            <Skeleton className="h-40 rounded-2xl" />
          </div>
          <Skeleton className="h-96 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!patientId) {
    return (
      <div className="min-h-screen relative bg-background text-foreground">
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <motion.div initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-white/90 backdrop-blur-sm rounded-2xl border border-amber-100 shadow-xl p-8 text-center">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Patient session not detected</h2>
            <p className="text-slate-600 max-w-2xl mx-auto">{config.sessionDescription}</p>
          </motion.div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen relative bg-background text-foreground">
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <motion.div initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-white/90 backdrop-blur-sm rounded-2xl border border-red-100 shadow-xl p-8 text-center">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">{config.errorTitle}</h2>
            <p className="text-slate-600 max-w-2xl mx-auto">{(error as Error)?.message || "Something went wrong while loading your treatment plan."}</p>
          </motion.div>
        </div>
      </div>
    );
  }

  if (!hasPlan) {
    return (
      <div className="min-h-screen relative bg-background text-foreground">
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <motion.div initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-white/90 backdrop-blur-sm rounded-2xl border border-emerald-100 shadow-xl p-8 text-center">
            <div className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100`}>
              <Icon className="h-7 w-7 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">{config.emptyTitle}</h2>
            <p className="text-slate-600 max-w-2xl mx-auto">{config.emptyDescription}</p>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative bg-background text-foreground">
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 space-y-6">
        <motion.div className="mb-2">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 min-w-0 w-full lg:w-auto">
              <div className="relative">
                <div className={`absolute inset-0 ${config.glow} rounded-2xl blur-lg opacity-50`} />
                <div className={`relative w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-r ${config.gradient} flex items-center justify-center`}>
                  <Icon className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                </div>
              </div>
              <div className="min-w-0 w-full max-w-full">
                <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-emerald-600 via-[#10B981] to-[#0D9488] bg-clip-text text-transparent leading-tight break-words whitespace-normal">
                  {config.title}
                </h1>
                <p className="text-sm sm:text-lg text-gray-600 mt-1 leading-relaxed break-words max-w-full">{config.subtitle}</p>
              </div>
            </div>

            <div className="flex flex-wrap w-full lg:w-auto gap-2 sm:gap-3 justify-start lg:justify-end">
              <button type="button" className="flex items-center px-3 sm:px-4 py-2 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-xl hover:bg-white hover:shadow-lg transition-all text-sm sm:text-base">
                <Filter className="w-4 h-4 mr-2 text-gray-600" />
                <span className="text-gray-700">Filter</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const exportRows = planRows.map((row) => ({
                    Slot: row.title,
                    Time: row.time,
                    Recommended: row.recommended.join("; "),
                    Caution: row.caution.join("; "),
                    Rationale: row.rationale,
                  }));
                  const ws = XLSX.utils.json_to_sheet(exportRows);
                  const wb = XLSX.utils.book_new();
                  XLSX.utils.book_append_sheet(wb, ws, config.exportSheet);
                  const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
                  saveAs(new Blob([wbout], { type: "application/octet-stream" }), config.exportFile);
                }}
                className="flex items-center px-3 sm:px-4 py-2 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-xl hover:bg-white hover:shadow-lg transition-all text-sm sm:text-base"
              >
                <Download className="w-4 h-4 mr-2 text-gray-600" />
                <span className="text-gray-700">Export</span>
              </button>

              <button
                type="button"
                onClick={() => setShowAlert(true)}
                className="flex items-center px-3 sm:px-4 py-2 bg-gradient-to-r from-emerald-500 to-[#10B981] text-white rounded-xl shadow-lg hover:shadow-xl transition-all text-sm sm:text-base"
              >
                <Share2 className="w-4 h-4 mr-2" />
                <span>Share</span>
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 sm:px-4 py-1.5 bg-gradient-to-r from-emerald-100 to-emerald-200 text-emerald-800 rounded-full text-xs sm:text-sm font-medium border border-emerald-300">
              Patient Dashboard
            </span>
            <span className="px-3 sm:px-4 py-1.5 bg-white border border-gray-200 text-gray-700 rounded-full text-xs sm:text-sm font-medium">
              {config.badge}
            </span>
            <span className="text-xs sm:text-sm text-gray-500">Updated from your latest treatment plan</span>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          <div className="bg-white rounded-2xl border border-emerald-100 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-gray-500">Total Slots</p>
              <Target className="w-5 h-5 text-emerald-500" />
            </div>
            <p className="text-3xl font-bold text-slate-900">{planRows.length}</p>
          </div>
          <div className="bg-white rounded-2xl border border-emerald-100 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-gray-500">Recommended Items</p>
              <CheckCircle className="w-5 h-5 text-emerald-500" />
            </div>
            <p className="text-3xl font-bold text-slate-900">{planRows.reduce((acc, row) => acc + row.recommended.length, 0)}</p>
          </div>
          <div className="bg-white rounded-2xl border border-emerald-100 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-gray-500">Caution Notes</p>
              <AlertCircle className="w-5 h-5 text-amber-500" />
            </div>
            <p className="text-3xl font-bold text-slate-900">{planRows.reduce((acc, row) => acc + row.caution.length, 0)}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-semibold text-slate-900">Daily Prescription Schedule</h2>
            <div className="flex flex-wrap gap-2">
              {config.filterLabels.map((filter) => (
                <button
                  type="button"
                  key={filter}
                  onClick={() => setSelectedFilter(filter)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    selectedFilter === filter
                      ? "bg-emerald-500 border-emerald-500 text-white"
                      : "bg-white border-gray-200 text-gray-600 hover:border-emerald-300"
                  }`}
                >
                  {filter === "all" ? "All" : filter.charAt(0).toUpperCase() + filter.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="divide-y divide-gray-100">
            {filteredRows.map((row, index) => (
              <div key={`${row.slot}-${index}`} className="p-5">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3 mb-3">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">{row.title}</h3>
                    <p className="text-sm text-gray-500">{row.time}</p>
                  </div>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 border border-emerald-200 w-fit">
                    {row.compliance === "on-plan" ? "On Plan" : "Review Needed"}
                  </span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-4">
                    <p className="text-sm font-semibold text-emerald-700 mb-2">{config.recommendedHeader}</p>
                    {row.recommended.length === 0 ? (
                      <p className="text-sm text-gray-500">No items for this slot.</p>
                    ) : (
                      <ul className="space-y-1.5">
                        {row.recommended.map((item, idx) => (
                          <li key={idx} className="text-sm text-slate-700 flex items-start gap-2">
                            <Leaf className="w-4 h-4 mt-0.5 text-emerald-500 shrink-0" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="rounded-xl border border-amber-100 bg-amber-50/40 p-4">
                    <p className="text-sm font-semibold text-amber-700 mb-2">{config.cautionHeader}</p>
                    {row.caution.length === 0 ? (
                      <p className="text-sm text-gray-500">No caution notes.</p>
                    ) : (
                      <ul className="space-y-1.5">
                        {row.caution.map((item, idx) => (
                          <li key={idx} className="text-sm text-slate-700 flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 mt-0.5 text-amber-500 shrink-0" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                <p className="mt-3 text-sm text-gray-600 italic">{row.rationale}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Plan Outcome Feedback</h2>
          <p className="text-sm text-slate-600 mb-4">
            Send progress updates to your doctor so they can continue, adjust, or stop this plan.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => submitFeedback("working")}
              disabled={feedbackLoading !== null}
              className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-60"
            >
              {feedbackLoading === "working" ? "Sending..." : "It is Working"}
            </button>
            <button
              type="button"
              onClick={() => submitFeedback("not_effective")}
              disabled={feedbackLoading !== null}
              className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700 hover:bg-amber-100 disabled:opacity-60"
            >
              {feedbackLoading === "not_effective" ? "Sending..." : "Not Effective"}
            </button>
            <button
              type="button"
              onClick={() => submitFeedback("terminate_request")}
              disabled={feedbackLoading !== null}
              className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700 hover:bg-rose-100 disabled:opacity-60"
            >
              {feedbackLoading === "terminate_request" ? "Sending..." : "Request Termination Review"}
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">Recent Plan Timeline</h2>
          <div className="space-y-3">
            {planRows.map((row, index) => (
              <div key={`timeline-${index}`} className="rounded-xl border border-gray-100 p-4 bg-gray-50/50">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <p className="font-medium text-slate-900">{row.title}</p>
                  <span className="text-xs text-gray-500">{row.time}</span>
                </div>
                <p className="text-sm text-gray-600">{row.rationale}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showAlert && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md bg-white rounded-2xl border border-emerald-100 p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-emerald-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">Share Plan</h3>
            </div>
            <p className="text-sm text-slate-600 mb-4">
              Share actions will be connected to your preferred channel in the next iteration.
            </p>
            <button
              type="button"
              onClick={() => setShowAlert(false)}
              className="w-full px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-[#10B981] text-white font-medium"
            >
              Close
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
}
