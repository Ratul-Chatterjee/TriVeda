import { apiClient } from './client';

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
};
