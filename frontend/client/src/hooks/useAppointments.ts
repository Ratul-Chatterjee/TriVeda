import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { appointmentApi } from "../api/appointment.api";
import { useToast } from "./use-toast"; // Assuming you use shadcn/ui toasts

// --- QUERIES (GET REQUESTS) ---

export const useDoctorAppointments = (doctorId: string) => {
  return useQuery({
    queryKey: ["appointments", "doctor", doctorId],
    queryFn: () => appointmentApi.getDoctorAppointments(doctorId),
    enabled: !!doctorId, // Only run the query if doctorId is provided
  });
};

export const useAvailableSlots = (
  departmentId: string,
  date: string,
  doctorId?: string,
) => {
  return useQuery({
    queryKey: ["slots", departmentId, date, doctorId],
    queryFn: () =>
      appointmentApi.getAvailableSlots(departmentId, date, doctorId),
    enabled: !!departmentId && !!date,
  });
};

// --- MUTATIONS (POST/PUT REQUESTS) ---

export const useDiagnoseSymptoms = () => {
  const { toast } = useToast();

  return useMutation({
    mutationFn: appointmentApi.diagnoseSymptoms,
    onError: (error: Error) => {
      toast({
        title: "Diagnosis Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useSaveDoctorPlan = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({
      appointmentId,
      planData,
    }: {
      appointmentId: string;
      planData: any;
    }) => appointmentApi.saveDoctorPlan(appointmentId, planData),
    onSuccess: () => {
      // MAGIC: This tells React Query to automatically refresh the doctor's dashboard!
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      toast({ title: "Success", description: "Treatment plan saved." });
    },
    onError: (error: Error) => {
      toast({
        title: "Save Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useSetAppointmentLive = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (appointmentId: string) => appointmentApi.setAppointmentLive(appointmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Could not start appointment",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const usePatientAppointments = (patientId: string) => {
  return useQuery({
    queryKey: ["patientAppointments", patientId],
    queryFn: () => appointmentApi.getPatientAppointments(patientId),
    enabled: !!patientId, // Only run if we actually have a logged-in patient ID
  });
};

export const usePatientDashboard = (patientId: string) => {
  return useQuery({
    queryKey: ["patientDashboard", patientId],
    queryFn: () => appointmentApi.getPatientDashboard(patientId),
    enabled: !!patientId,
  });
};

export const useLatestTreatmentPlan = (patientId: string) => {
  return useQuery({
    queryKey: ["patientTreatmentPlan", patientId],
    queryFn: () => appointmentApi.getLatestTreatmentPlan(patientId),
    enabled: !!patientId,
  });
};

export const useSavePrakritiAssessment = () => {
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ patientId, payload }: { patientId: string; payload: any }) =>
      appointmentApi.savePrakritiAssessment(patientId, payload),
    onError: (error: Error) => {
      toast({
        title: "Assessment Save Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useLatestPrakritiAssessment = (patientId?: string) => {
  return useQuery({
    queryKey: ["prakritiAssessment", "latest", patientId],
    queryFn: () => appointmentApi.getLatestPrakritiAssessment(patientId as string),
    enabled: !!patientId,
  });
};
