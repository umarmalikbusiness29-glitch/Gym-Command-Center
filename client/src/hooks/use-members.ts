import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";
import { getApiUrl } from "@/lib/api";
import type { CreateMemberRequest } from "@shared/schema";

export function useMembers() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const membersQuery = useQuery({
    queryKey: [api.members.list.path],
    queryFn: async () => {
      const res = await fetch(getApiUrl(api.members.list.path));
      if (!res.ok) throw new Error("Failed to fetch members");
      return api.members.list.responses[200].parse(await res.json());
    },
  });

  const createMemberMutation = useMutation({
    mutationFn: async (data: CreateMemberRequest) => {
      const res = await fetch(getApiUrl(api.members.create.path), {
        method: api.members.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to create member");
      }
      return api.members.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.members.list.path] });
      toast({ title: "Success", description: "Member created successfully" });
    },
    onError: (err) => {
      toast({ variant: "destructive", title: "Error", description: err.message });
    }
  });

  return {
    members: membersQuery.data,
    isLoading: membersQuery.isLoading,
    createMember: createMemberMutation.mutate,
    isCreating: createMemberMutation.isPending,
  };
}

export function useMember(id: number) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const memberQuery = useQuery({
    queryKey: [api.members.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.members.get.path, { id });
      const res = await fetch(getApiUrl(url));
      if (!res.ok) throw new Error("Member not found");
      return api.members.get.responses[200].parse(await res.json());
    },
    enabled: !!id,
  });

  const freezeMutation = useMutation({
    mutationFn: async () => {
      const url = buildUrl(api.members.freeze.path, { id });
      const res = await fetch(getApiUrl(url), { method: api.members.freeze.method });
      if (!res.ok) throw new Error("Failed to freeze member");
      return api.members.freeze.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.members.get.path, id] });
      queryClient.invalidateQueries({ queryKey: [api.members.list.path] });
      toast({ title: "Success", description: "Member status updated" });
    },
  });

  return {
    member: memberQuery.data,
    isLoading: memberQuery.isLoading,
    freezeMember: freezeMutation.mutate,
    isFreezing: freezeMutation.isPending,
  };
}
