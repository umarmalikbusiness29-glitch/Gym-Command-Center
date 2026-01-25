import LayoutShell from "@/components/layout-shell";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Users, LogIn, LogOut, Activity, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { format } from "date-fns";

export default function AttendancePage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  const { data: liveData, isLoading: liveLoading } = useQuery({
    queryKey: [api.attendance.live.path],
    queryFn: async () => {
      const res = await fetch(api.attendance.live.path);
      if (!res.ok) throw new Error("Failed to fetch live attendance");
      return res.json();
    },
    refetchInterval: 15000,
  });

  const { data: members } = useQuery({
    queryKey: [api.members.list.path],
    queryFn: async () => {
      const res = await fetch(api.members.list.path);
      if (!res.ok) throw new Error("Failed to fetch members");
      return res.json();
    },
  });

  const checkInMutation = useMutation({
    mutationFn: async (memberId: number) => {
      const res = await fetch(api.attendance.checkIn.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Check-in failed");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.attendance.live.path] });
      toast({ title: "Checked In", description: "Member checked in successfully" });
    },
    onError: (err: Error) => {
      toast({ variant: "destructive", title: "Check-in failed", description: err.message });
    },
  });

  const checkOutMutation = useMutation({
    mutationFn: async (memberId: number) => {
      const res = await fetch(api.attendance.checkOut.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Check-out failed");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.attendance.live.path] });
      toast({ title: "Checked Out", description: "Member checked out successfully" });
    },
    onError: (err: Error) => {
      toast({ variant: "destructive", title: "Check-out failed", description: err.message });
    },
  });

  const presentMemberIds = new Set(liveData?.attendees?.map((a: any) => a.id) || []);
  const filteredMembers = members?.filter((m: any) => 
    m.fullName.toLowerCase().includes(search.toLowerCase()) ||
    m.user?.username.toLowerCase().includes(search.toLowerCase())
  );

  const getCrowdColor = (status: string) => {
    switch (status) {
      case "Low": return "text-green-400";
      case "Moderate": return "text-yellow-400";
      case "High": return "text-orange-400";
      case "Full": return "text-red-400";
      default: return "text-muted-foreground";
    }
  };

  return (
    <LayoutShell>
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Attendance</h1>
            <p className="text-muted-foreground mt-1">Manage member check-ins and check-outs</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="border-none shadow-lg bg-gradient-to-br from-primary/20 to-accent/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Currently In Gym</p>
                  <p className="text-4xl font-bold">{liveData?.count || 0}</p>
                </div>
                <Users className="h-10 w-10 text-primary opacity-70" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-card/50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Capacity</p>
                  <p className="text-4xl font-bold">{liveData?.capacity || 50}</p>
                </div>
                <Activity className="h-10 w-10 text-muted-foreground opacity-70" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-card/50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Occupancy</p>
                  <p className="text-4xl font-bold">{liveData?.occupancyRate || 0}%</p>
                </div>
                <div className="h-10 w-10 rounded-full border-4 border-primary flex items-center justify-center">
                  <span className="text-xs font-bold">{liveData?.occupancyRate || 0}%</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-card/50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Status</p>
                  <p className={`text-2xl font-bold ${getCrowdColor(liveData?.crowdStatus)}`}>
                    {liveData?.crowdStatus || "Unknown"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="border-none shadow-lg bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Check In/Out Member</CardTitle>
              <CardDescription>Search for a member to check them in or out</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  data-testid="input-search-member"
                  placeholder="Search by name or username..."
                  className="pl-10"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredMembers?.slice(0, 10).map((member: any) => {
                  const isPresent = presentMemberIds.has(member.id);
                  return (
                    <div key={member.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center font-bold text-sm">
                          {member.fullName.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium">{member.fullName}</p>
                          <p className="text-xs text-muted-foreground">@{member.user?.username}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isPresent ? (
                          <>
                            <Badge variant="default" className="bg-green-500/20 text-green-400 border-green-500/50">In Gym</Badge>
                            <Button 
                              data-testid={`button-checkout-${member.id}`}
                              size="sm" 
                              variant="destructive"
                              onClick={() => checkOutMutation.mutate(member.id)}
                              disabled={checkOutMutation.isPending}
                            >
                              <LogOut className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <Button 
                            data-testid={`button-checkin-${member.id}`}
                            size="sm"
                            disabled={checkInMutation.isPending || member.status !== "active"}
                            onClick={() => checkInMutation.mutate(member.id)}
                          >
                            <LogIn className="h-4 w-4 mr-1" />
                            Check In
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
                {filteredMembers?.length === 0 && (
                  <p className="text-muted-foreground text-center py-8">No members found</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Currently In Gym</CardTitle>
              <CardDescription>{liveData?.count || 0} members present</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {liveData?.attendees?.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No one is currently in the gym</p>
                ) : (
                  liveData?.attendees?.map((member: any) => (
                    <div key={member.id} className="flex items-center justify-between p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-green-500/20 flex items-center justify-center font-bold text-sm text-green-400">
                          {member.fullName.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium">{member.fullName}</p>
                          <p className="text-xs text-muted-foreground capitalize">{member.planType} Plan</p>
                        </div>
                      </div>
                      <Button 
                        data-testid={`button-checkout-live-${member.id}`}
                        size="sm" 
                        variant="outline"
                        onClick={() => checkOutMutation.mutate(member.id)}
                        disabled={checkOutMutation.isPending}
                      >
                        <LogOut className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </LayoutShell>
  );
}
