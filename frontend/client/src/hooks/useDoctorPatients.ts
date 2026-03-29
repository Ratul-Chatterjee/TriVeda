import { useQuery } from '@tanstack/react-query';

export const appointmentApi = {
  getDoctorPatients: async (doctorId: string) => {
    const response = await fetch(`/api/appointments/doctor/${doctorId}/patients`, {
      credentials: "include",
    });
    if (!response.ok) {
      throw new Error('Failed to fetch doctor patients');
    }
    return response.json();
  },
};

export const useDoctorPatients = (doctorId?: string) => {
  return useQuery({
    queryKey: ['doctorPatients', doctorId],
    queryFn: () => appointmentApi.getDoctorPatients(doctorId || ''),
    enabled: !!doctorId,
    staleTime: 0,
    gcTime: 60 * 60 * 1000,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchInterval: 30 * 1000,
    retry: 2,
    placeholderData: (previous) => previous,
  });
};
