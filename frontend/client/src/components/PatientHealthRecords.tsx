import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, Download, Eye, FileText, Search, Upload, X, Trash2, RotateCw } from "lucide-react";
import { usePatientProfile, useUploadPatientReport } from "@/hooks/useProfile";
import { useToast } from "@/hooks/use-toast";
import axios from "axios";

const fadeInUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -16 },
};

export default function PatientHealthRecords() {
  const { toast } = useToast();
  const loggedInUser = JSON.parse(localStorage.getItem("triveda_user") || "{}");
  const patientId = loggedInUser?.id || "";
  const patientEmail = loggedInUser?.email || "";

  const { data: patientProfileData, isLoading, isError, refetch } = usePatientProfile(patientId, patientEmail);
  const uploadPatientReportMutation = useUploadPatientReport();
  const profilePayload: any = (patientProfileData as any)?.data || patientProfileData || {};
  const effectivePatientId = profilePayload?.id || patientId;

  const [deletingReportId, setDeletingReportId] = useState<string | null>(null);
  const [reanalyzeReportId, setReanalyzeReportId] = useState<string | null>(null);

  const getAnalysisStatus = (summary: string) => {
    if (!summary) return { status: "pending", label: "Pending" };
    if (summary.includes("OCR analysis is unavailable")) return { status: "failed", label: "Failed" };
    return { status: "success", label: "Success" };
  };

  const reports = useMemo(() => {
    const list = Array.isArray(profilePayload?.reports) ? profilePayload.reports : [];
    return list.map((report: any) => ({
      id: report.id,
      fileName: report.fileName,
      mimeType: report.mimeType,
      sizeBytes: report.sizeBytes,
      summary:
        report.summary ||
        "Report uploaded successfully. AI analysis will appear here after processing.",
      createdAt: report.createdAt,
      dateLabel: report.createdAt
        ? new Date(report.createdAt).toLocaleString()
        : "-",
      analysisStatus: getAnalysisStatus(report.summary),
    }));
  }, [profilePayload]);

  const [selectedReport, setSelectedReport] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const handleUploadReport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!effectivePatientId) {
      toast({
        title: "Upload Failed",
        description: "Patient ID is missing.",
        variant: "destructive",
      });
      e.target.value = "";
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
          },
        },
        {
          onSuccess: () => {
            toast({
              title: "Report Uploaded",
              description: "Medical report stored and analyzed successfully.",
            });
            refetch();
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
    e.target.value = "";
  };

  const handleDeleteReport = async (reportId: string) => {
    setDeletingReportId(reportId);
    try {
      await axios.delete(`/api/profile/patient/${effectivePatientId}/reports/${reportId}`);
      toast({
        title: "Report Deleted",
        description: "Report has been removed successfully.",
      });
      refetch();
    } catch (error: any) {
      toast({
        title: "Delete Failed",
        description: error?.message || "Could not delete report.",
        variant: "destructive",
      });
    } finally {
      setDeletingReportId(null);
    }
  };

  const handleReanalyzeReport = async (reportId: string) => {
    setReanalyzeReportId(reportId);
    try {
      await axios.put(`/api/profile/patient/${effectivePatientId}/reports/${reportId}/reanalyze`);
      toast({
        title: "Report Re-analyzed",
        description: "OCR analysis has been re-run for this report.",
      });
      refetch();
    } catch (error: any) {
      toast({
        title: "Re-analysis Failed",
        description: error?.message || "Could not re-analyze report.",
        variant: "destructive",
      });
    } finally {
      setReanalyzeReportId(null);
    }
  };

  const filteredReports = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return reports;

    return reports.filter((report: any) => {
      const name = String(report.fileName || "").toLowerCase();
      const summary = String(report.summary || "").toLowerCase();
      return name.includes(query) || summary.includes(query);
    });
  }, [reports, searchTerm]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground p-6">
        <div className="rounded-xl border border-emerald-100 bg-white p-6 text-sm text-gray-500">
          Loading health records...
        </div>
      </div>
    );
  }

  if (isError || (!patientId && !patientEmail)) {
    return (
      <div className="min-h-screen bg-background text-foreground p-6">
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          Unable to load health records.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-4 sm:p-6 lg:p-8">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto max-w-6xl"
      >
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-[#1F5C3F] to-[#10B981] bg-clip-text text-transparent">
              Health Records
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              AI-extracted insights from your uploaded medical documents.
            </p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <div className="w-full sm:w-80 relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search reports"
                className="w-full rounded-xl border border-emerald-100 bg-white py-2 pl-9 pr-3 text-sm focus:border-emerald-300 focus:outline-none"
              />
            </div>
            <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#1F5C3F] px-3 py-2 text-xs font-medium text-white hover:bg-[#184b33]">
              <Upload className="h-4 w-4" />
              Upload Report
              <input
                type="file"
                onChange={handleUploadReport}
                className="hidden"
                accept=".pdf,.jpg,.jpeg,.png"
              />
            </label>
          </div>
        </div>

        {filteredReports.length === 0 ? (
          <div className="rounded-2xl border border-emerald-100 bg-white p-10 text-center">
            <FileText className="mx-auto mb-3 h-10 w-10 text-gray-300" />
            <p className="text-sm text-gray-500">No health records available yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredReports.map((report: any) => (
              <motion.div
                key={report.id}
                variants={fadeInUp}
                initial="initial"
                animate="animate"
                className="rounded-2xl border border-emerald-100 bg-white p-4 sm:p-5 shadow-sm"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-[#1F5C3F]" />
                      <h2 className="truncate text-base font-semibold text-gray-900">
                        {report.fileName}
                      </h2>
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
                        report.analysisStatus.status === 'success' ? 'bg-green-100 text-green-800' :
                        report.analysisStatus.status === 'failed' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {report.analysisStatus.label}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {report.dateLabel}
                      </span>
                      <span>{report.mimeType || "-"}</span>
                      <span>{Math.round((Number(report.sizeBytes || 0) / 1024) * 10) / 10} KB</span>
                    </div>
                    <p className="mt-3 line-clamp-3 rounded-lg bg-emerald-50 p-3 text-sm text-gray-700 whitespace-pre-wrap">
                      {report.summary}
                    </p>
                  </div>
                  <div className="flex gap-2 sm:flex-col sm:min-w-[160px]">
                    <button
                      onClick={() => setSelectedReport(report)}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#1F5C3F] px-3 py-2 text-xs font-medium text-white hover:bg-[#184b33]"
                    >
                      <Eye className="h-4 w-4" />
                      View
                    </button>
                    {report.id && effectivePatientId && (
                      <a
                        href={`/api/profile/patient/${effectivePatientId}/reports/${report.id}/download`}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-emerald-200 px-3 py-2 text-xs font-medium text-[#1F5C3F] hover:bg-emerald-50"
                      >
                        <Download className="h-4 w-4" />
                        Download
                      </a>
                    )}
                    {report.analysisStatus.status === 'failed' && (
                      <button
                        onClick={() => handleReanalyzeReport(report.id)}
                        disabled={reanalyzeReportId === report.id}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-orange-200 px-3 py-2 text-xs font-medium text-orange-700 hover:bg-orange-50 disabled:opacity-50"
                      >
                        <RotateCw className="h-4 w-4" />
                        {reanalyzeReportId === report.id ? 'Retrying...' : 'Retry'}
                      </button>
                    )}
                    <button
                      onClick={() => {
                        if (confirm('Are you sure you want to delete this report?')) {
                          handleDeleteReport(report.id);
                        }
                      }}
                      disabled={deletingReportId === report.id}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" />
                      {deletingReportId === report.id ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      <AnimatePresence>
        {selectedReport && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => setSelectedReport(null)}
          >
            <motion.div
              initial={{ scale: 0.96, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, y: 10 }}
              className="relative max-h-[85vh] w-full max-w-3xl overflow-auto rounded-2xl bg-white p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setSelectedReport(null)}
                className="absolute right-4 top-4 rounded p-1 text-gray-500 hover:bg-gray-100"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="mb-4 pr-8">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold text-gray-900">{selectedReport.fileName}</h3>
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
                    selectedReport.analysisStatus.status === 'success' ? 'bg-green-100 text-green-800' :
                    selectedReport.analysisStatus.status === 'failed' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {selectedReport.analysisStatus.label}
                  </span>
                </div>
                <p className="mt-1 text-xs text-gray-500">{selectedReport.dateLabel}</p>
              </div>

              <div className="rounded-xl bg-emerald-50 p-4">
                <p className="whitespace-pre-wrap text-sm leading-6 text-gray-700">
                  {selectedReport.summary}
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
