import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { profileApi, type UpdateDoctorProfilePayload } from '@/api/profile.api';

export const usePatientProfile = (id?: string, email?: string) => {
  return useQuery({
    queryKey: ['patientProfile', id, email],
    queryFn: () => profileApi.getPatientProfile(id || 'me', email),
    enabled: !!id || !!email,
  });
};

export const useDoctorProfile = (id?: string) => {
  return useQuery({
    queryKey: ['doctorProfile', id],
    queryFn: () => profileApi.getDoctorProfile(id as string),
    enabled: !!id,
  });
};

export const useUpdatePatientProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) =>
      profileApi.updatePatientProfile(id, payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['patientProfile', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['patientProfile'] });
    },
  });
};

export const useUploadPatientReport = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) =>
      profileApi.uploadPatientReport(id, payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['patientProfile', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['patientProfile'] });
    },
  });
};

export const useUpdateDoctorProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateDoctorProfilePayload) =>
      profileApi.updateDoctorProfile(payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['doctorProfile', variables.staffId] });
      queryClient.invalidateQueries({ queryKey: ['doctorProfile'] });
    },
  });
};
