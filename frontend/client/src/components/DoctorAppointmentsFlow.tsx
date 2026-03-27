import React, { useMemo, useState } from "react";
import {
  Calendar,
  Clock,
  Download,
  RefreshCw,
  Stethoscope,
  User,
} from "lucide-react";
import { downloadAppointmentPdf } from "@/lib/appointment-booking";
import { useDoctorAppointments, useSetAppointmentLive } from "@/hooks/useAppointments";

type DoctorAppointmentItem = {
  id: string;
  scheduledAt: string;
  status: "SCHEDULED" | "LIVE" | "COMPLETED" | "CANCELLED";
  patientSymptoms?: string;
  aiSummary?: string;
  problemDescription?: string;
  severity?: string;
  duration?: string;
  doctorNotes?: string;
  patient?: {
    id: string;
    name: string;
    age?: number;
    gender?: string;
    prakriti?: string;
  };
};

type StatusFilter = "ALL" | "SCHEDULED" | "LIVE" | "COMPLETED";

export default function DoctorAppointmentsFlow() {
  const loggedInUser = JSON.parse(localStorage.getItem("triveda_user") || "{}");
  const doctorId =
    loggedInUser?.portal === "DOCTOR" || loggedInUser?.role === "DOCTOR"
      ? loggedInUser?.id || ""
      : "";

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const { data: doctorAppointmentsData, isLoading, refetch } = useDoctorAppointments(doctorId);
  const setAppointmentLiveMutation = useSetAppointmentLive();

  const appointmentsPayload: DoctorAppointmentItem[] =
    ((doctorAppointmentsData as any)?.data || doctorAppointmentsData || []) as DoctorAppointmentItem[];

  const allAppointments = useMemo(() => {
    return (Array.isArray(appointmentsPayload) ? appointmentsPayload : [])
      .filter((appointment) => String(appointment?.status || "").toUpperCase() !== "CANCELLED")
      .map((appointment) => ({
        ...appointment,
        status: String(appointment.status || "SCHEDULED").toUpperCase() as DoctorAppointmentItem["status"],
      }));
  }, [appointmentsPayload]);

  const filteredAppointments = useMemo(() => {
    if (statusFilter === "ALL") return allAppointments;
    return allAppointments.filter((appointment) => appointment.status === statusFilter);
  }, [allAppointments, statusFilter]);

  const upcomingAppointments = useMemo(() => {
    return filteredAppointments
      .filter((appointment) => appointment.status === "SCHEDULED" || appointment.status === "LIVE")
      .sort(
        (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
      );
  }, [filteredAppointments]);

  const completedAppointments = useMemo(() => {
    return filteredAppointments
      .filter((appointment) => appointment.status === "COMPLETED")
      .sort(
        (a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime()
      );
  }, [filteredAppointments]);

  const getStatusBadgeClass = (status: DoctorAppointmentItem["status"]) => {
    if (status === "LIVE") return "bg-green-100 text-green-700 border-green-200";
    if (status === "COMPLETED") return "bg-slate-100 text-slate-700 border-slate-200";
    return "bg-blue-100 text-blue-700 border-blue-200";
  };

  const formatDateTime = (scheduledAt: string) => {
    const date = new Date(scheduledAt);
    if (Number.isNaN(date.getTime())) {
      return { dateLabel: "-", timeLabel: "-" };
    }

    return {
      dateLabel: date.toLocaleDateString(),
      timeLabel: date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      }),
    };
  };

  const handleOpenConsultation = async (appointment: DoctorAppointmentItem) => {
    if (!appointment?.patient?.id) return;

    if (appointment.status === "SCHEDULED") {
      await setAppointmentLiveMutation.mutateAsync(appointment.id);
      await refetch();
    }

    window.sessionStorage.setItem(`doctor:patient-mode:${appointment.patient.id}`, "consult");
    window.sessionStorage.setItem(`doctor:patient-appointment:${appointment.patient.id}`, appointment.id);
    window.location.href = `/doctor/${appointment.patient.id}`;
  };

  const toPdfBooking = (appointment: DoctorAppointmentItem) => {
    const { dateLabel, timeLabel } = formatDateTime(appointment.scheduledAt);
    return {
      id: appointment.id,
      bookingId: `APT-${String(appointment.id || "").slice(0, 6).toUpperCase()}`,
      createdAt: appointment.scheduledAt,
      diagnosis: appointment.problemDescription || appointment.aiSummary || "Consultation",
      symptoms: appointment.patientSymptoms || "-",
      duration: appointment.duration || "-",
      severity:
        String(appointment.severity || "").toLowerCase() === "severe"
          ? "severe"
          : String(appointment.severity || "").toLowerCase() === "moderate"
          ? "moderate"
          : "mild",
      doctorCategory: "general",
      selectedDate: dateLabel,
      selectedTime: timeLabel,
      consultationMode: "clinic",
      patientName: appointment.patient?.name || "Patient",
      patientAge: String(appointment.patient?.age ?? "-"),
      patientGender: appointment.patient?.gender || "-",
      currentMedications: "-",
      allergies: "-",
      medicalHistory: "-",
      additionalNotes: appointment.doctorNotes || "",
      assignedDoctor: {
        id: doctorId || "doctor",
        name: loggedInUser?.name || "Doctor",
        department: "Ayurveda",
        experience: 0,
        clinic: "TriVeda",
      },
      status: appointment.status,
    } as any;
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-gray-200 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Doctor Appointments</h2>
            <button
              className="bg-[#1F5C3F] hover:bg-[#1F5C3F]/90 text-white px-4 py-2 rounded-lg flex items-center justify-center space-x-2 w-full sm:w-auto"
              onClick={() => refetch()}
            >
              <RefreshCw className="w-4 h-4" />
              <span>Refresh</span>
            </button>
          </div>

          <div className="px-4 sm:px-6 pt-4 flex flex-wrap gap-2 border-b border-gray-100 pb-4">
            {(["ALL", "SCHEDULED", "LIVE", "COMPLETED"] as StatusFilter[]).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                  statusFilter === status
                    ? "bg-[#1F5C3F] text-white border-[#1F5C3F]"
                    : "bg-white text-slate-700 border-slate-200 hover:border-[#1F5C3F]/40"
                }`}
              >
                {status}
              </button>
            ))}
          </div>

          <div className="p-4 sm:p-6 space-y-8">
            {isLoading ? (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-sm text-slate-600">
                Loading appointments...
              </div>
            ) : (
              <>
                <section>
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-slate-900">Upcoming Appointments</h3>
                    <span className="text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800 px-2 py-1">
                      {upcomingAppointments.length}
                    </span>
                  </div>

                  {upcomingAppointments.length === 0 ? (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 text-sm text-[#1F5C3F]">
                      No upcoming appointments for selected filter.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {upcomingAppointments.map((appointment) => {
                        const { dateLabel, timeLabel } = formatDateTime(appointment.scheduledAt);
                        return (
                          <div key={appointment.id} className="bg-white border border-emerald-200 rounded-xl p-4 shadow-sm">
                            <div className="flex items-start justify-between gap-3 mb-3">
                              <div>
                                <p className="font-semibold text-slate-900">{appointment.patient?.name || "Patient"}</p>
                                <p className="text-xs text-slate-500">APT-{String(appointment.id).slice(0, 6).toUpperCase()}</p>
                              </div>
                              <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${getStatusBadgeClass(appointment.status)}`}>
                                {appointment.status}
                              </span>
                            </div>

                            <div className="space-y-2 text-sm text-slate-700 mb-4">
                              <p><Calendar className="w-4 h-4 inline mr-1 text-[#1F5C3F]" /> {dateLabel}</p>
                              <p><Clock className="w-4 h-4 inline mr-1 text-[#1F5C3F]" /> {timeLabel}</p>
                              <p><User className="w-4 h-4 inline mr-1 text-[#1F5C3F]" /> {appointment.patient?.age ?? "-"}y, {appointment.patient?.gender || "-"}</p>
                              <p><Stethoscope className="w-4 h-4 inline mr-1 text-[#1F5C3F]" /> {appointment.problemDescription || appointment.aiSummary || "Consultation"}</p>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => handleOpenConsultation(appointment)}
                                className="px-3 py-2 rounded-lg bg-gradient-to-r from-[#1F5C3F] to-[#10B981] text-white text-sm font-medium"
                              >
                                {appointment.status === "LIVE" ? "Live Appointment" : "Start Appointment"}
                              </button>
                              <button
                                type="button"
                                onClick={() => downloadAppointmentPdf(toPdfBooking(appointment))}
                                className="px-3 py-2 rounded-lg border border-[#1F5C3F]/30 text-[#1F5C3F] text-sm"
                              >
                                <Download className="w-4 h-4 inline mr-1" /> PDF
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>

                <section>
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-slate-900">Completed Appointments</h3>
                    <span className="text-xs font-semibold rounded-full bg-slate-200 text-slate-700 px-2 py-1">
                      {completedAppointments.length}
                    </span>
                  </div>

                  {completedAppointments.length === 0 ? (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-sm text-slate-600">
                      No completed appointments for selected filter.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {completedAppointments.map((appointment) => {
                        const { dateLabel, timeLabel } = formatDateTime(appointment.scheduledAt);
                        return (
                          <div key={appointment.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                            <div className="flex items-start justify-between gap-3 mb-3">
                              <div>
                                <p className="font-semibold text-slate-900">{appointment.patient?.name || "Patient"}</p>
                                <p className="text-xs text-slate-500">APT-{String(appointment.id).slice(0, 6).toUpperCase()}</p>
                              </div>
                              <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${getStatusBadgeClass(appointment.status)}`}>
                                COMPLETED
                              </span>
                            </div>

                            <div className="space-y-2 text-sm text-slate-700 mb-4">
                              <p><Calendar className="w-4 h-4 inline mr-1 text-[#1F5C3F]" /> {dateLabel}</p>
                              <p><Clock className="w-4 h-4 inline mr-1 text-[#1F5C3F]" /> {timeLabel}</p>
                              <p><User className="w-4 h-4 inline mr-1 text-[#1F5C3F]" /> {appointment.patient?.age ?? "-"}y, {appointment.patient?.gender || "-"}</p>
                            </div>

                            <button
                              type="button"
                              onClick={() => downloadAppointmentPdf(toPdfBooking(appointment))}
                              className="px-3 py-2 rounded-lg border border-[#1F5C3F]/30 text-[#1F5C3F] text-sm"
                            >
                              <Download className="w-4 h-4 inline mr-1" /> Download PDF
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
