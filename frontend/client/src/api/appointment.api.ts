import { apiClient } from "./client";

export type DiagnosisResponse = {
  final_symptoms: string[];
  final_severity: string;
  final_duration: string;
  dosha_indicator: string;
  recommended_department_id: string;
  recommended_department_name: string;
  recommended_department_description: string;
  matchedDepartment: { id: string; name: string } | null;
  availableDepartments: Array<{
    id: string;
    name: string;
    description?: string;
    _count?: { doctors: number };
  }>;
  debug?: {
    departmentHint: string;
    departmentsFound: number;
    matchedFound: boolean;
  };
};

export const appointmentApi = {
  // 1. Smart Triage (NLP Diagnosis)
  diagnoseSymptoms: async (data: {
    problemDescription?: string;
    providedSymptoms?: string[];
    providedSeverity?: string | null;
    providedDuration?: string | null;
  }): Promise<DiagnosisResponse> => {
    return apiClient.post("/appointments/diagnose", data) as any;
  },

  getDepartments: async () => {
    return apiClient.get("/appointments/departments");
  },

  getDoctorsByDepartment: async (params: {
    departmentId?: string;
    departmentName?: string;
  }) => {
    const query = new URLSearchParams();
    if (params.departmentId) query.set("departmentId", params.departmentId);
    if (params.departmentName) query.set("departmentName", params.departmentName);
    return apiClient.get(`/appointments/doctors?${query.toString()}`);
  },

  // 2. Fetch Available Time Slots
  getAvailableSlots: async (
    departmentId: string,
    date: string,
    doctorId?: string,
  ) => {
    let url = `/appointments/slots?departmentId=${departmentId}&date=${date}`;
    if (doctorId) url += `&doctorId=${doctorId}`; // Hybrid Flow bypass
    return apiClient.get(url);
  },

  // 3. Book the Appointment
  bookAppointment: async (bookingPayload: any) => {
    return apiClient.post("/appointments/book", bookingPayload);
  },

  // 4. Fetch Doctor's Dashboard Appointments
  getDoctorAppointments: async (doctorId: string) => {
    return apiClient.get(`/appointments/doctor/${doctorId}`);
  },

  // 5. Save the Doctor's Ayurvedic Diet/Routine Plan
  saveDoctorPlan: async (appointmentId: string, planData: any) => {
    return apiClient.put(`/appointments/${appointmentId}/plan`, planData);
  },
  
  // 6. Fetch Patient's Appointments
  getPatientAppointments: async (patientId: string) => {
        return apiClient.get(`/appointments/patient/${patientId}`);
    },

  // 7. Fetch Patient Dashboard Data (profile + appointments + plans)
  getPatientDashboard: async (patientId: string) => {
    return apiClient.get(`/appointments/patient/${patientId}/dashboard`);
  },

  reschedulePatientAppointment: async (
    patientId: string,
    appointmentId: string,
    payload: { date: string; time: string }
  ) => {
    return apiClient.put(
      `/appointments/patient/${patientId}/${appointmentId}/reschedule`,
      { patientId, ...payload }
    );
  },

  cancelPatientAppointment: async (patientId: string, appointmentId: string) => {
    return apiClient.delete(`/appointments/patient/${patientId}/${appointmentId}`, {
      data: { patientId },
    });
  },
  deletePatientAppointment: async (patientId: string, appointmentId: string) => {
    return appointmentApi.cancelPatientAppointment(patientId, appointmentId);
  },

  // 8. Save Prakriti Assessment Results
  savePrakritiAssessment: async (patientId: string, payload: any) => {
    return apiClient.post(
      `/appointments/patient/${patientId}/prakriti-assessment`,
      payload,
    );
  },

  getLatestPrakritiAssessment: async (patientId: string) => {
    return apiClient.get(`/appointments/patient/${patientId}/prakriti-assessment?latest=true`);
  }
};
