import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";

export function useAttendance() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const liveQuery = useQuery({
    queryKey: [api.attendance.live.path],
    queryFn: async () => {
      const res = await fetch(api.attendance.live.path);
      if (!res.ok) throw new Error("Failed to fetch live data");
      return api.attendance.live.responses[200].parse(await res.json());
    },
    refetchInterval: 30000, // Refresh every 30s
  });

  const checkInMutation = useMutation({
    mutationFn: async (memberId: number) => {
      const res = await fetch(api.attendance.checkIn.path, {
        method: api.attendance.checkIn.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Check-in failed");
      }
      return api.attendance.checkIn.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.attendance.live.path] });
      toast({ title: "Checked In", description: "Member access granted" });
    },
    onError: (err) => {
      toast({ variant: "destructive", title: "Access Denied", description: err.message });
    }
  });

  const checkOutMutation = useMutation({
    mutationFn: async (memberId: number) => {
      const res = await fetch(api.attendance.checkOut.path, {
        method: api.attendance.checkOut.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId }),
      });
      if (!res.ok) throw new Error("Check-out failed");
      return api.attendance.checkOut.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.attendance.live.path] });
      toast({ title: "Checked Out", description: "Have a great day!" });
    },
  });

  return {
    liveData: liveQuery.data,
    checkIn: checkInMutation.mutate,
    checkOut: checkOutMutation.mutate,
  };
}

export function usePaymentStats() {
  return useQuery({
    queryKey: [api.payments.stats.path],
    queryFn: async () => {
      const res = await fetch(api.payments.stats.path);
      if (!res.ok) throw new Error("Failed to fetch stats");
      return api.payments.stats.responses[200].parse(await res.json());
    },
  });
}
