import { apiClient } from './client';

export interface UpdateDoctorProfilePayload {
  staffId: string;
  name: string;
  gender: string;
  dateOfBirth: string;
  qualifications: string[];
  locality: string;
  languages: string[];
  specialty: string;
  experienceYrs: number;
  certificates: string;
  previousWork: string;
  extraInfo: string;
  caseSummaries: string[];
  education: string[];
}

export const profileApi = {
  getPatientProfile: async (id: string, email?: string) => {
    const query = email ? `?email=${encodeURIComponent(email)}` : '';
    return apiClient.get(`/profile/patient/${id}${query}`);
  },
  getDoctorProfile: async (id: string) => {
    return apiClient.get(`/profile/doctor/${id}`);
  },
  updatePatientProfile: async (id: string, payload: any) => {
    return apiClient.patch(`/profile/patient/${id}`, payload);
  },
  uploadPatientReport: async (id: string, payload: any) => {
    return apiClient.post(`/profile/patient/${id}/reports`, payload);
  },
  updateDoctorProfile: async (data: UpdateDoctorProfilePayload) => {
    return apiClient.put('/doctor/profile', data);
  },
};
