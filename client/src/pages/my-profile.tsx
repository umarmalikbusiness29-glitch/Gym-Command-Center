import LayoutShell from "@/components/layout-shell";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { LogIn, LogOut, Activity, CreditCard, Dumbbell, Calendar, Users, Clock } from "lucide-react";
import { format } from "date-fns";

export default function MyProfilePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: [api.profile.me.path],
    queryFn: async () => {
      const res = await fetch(api.profile.me.path);
      if (!res.ok) throw new Error("Failed to fetch profile");
      return res.json();
    },
  });

  const { data: checkStatus } = useQuery({
    queryKey: [api.profile.isCheckedIn.path],
    queryFn: async () => {
      const res = await fetch(api.profile.isCheckedIn.path);
      if (!res.ok) throw new Error("Failed to fetch status");
      return res.json();
    },
    refetchInterval: 30000,
  });

  const { data: liveData } = useQuery({
    queryKey: [api.attendance.live.path],
    queryFn: async () => {
      const res = await fetch(api.attendance.live.path);
      if (!res.ok) return null;
      return res.json();
    },
    refetchInterval: 15000,
  });

  const { data: myWorkouts } = useQuery({
    queryKey: [api.profile.myWorkouts.path],
    queryFn: async () => {
      const res = await fetch(api.profile.myWorkouts.path);
      if (!res.ok) throw new Error("Failed to fetch workouts");
      return res.json();
    },
  });

  const { data: myPayments } = useQuery({
    queryKey: [api.profile.myPayments.path],
    queryFn: async () => {
      const res = await fetch(api.profile.myPayments.path);
      if (!res.ok) throw new Error("Failed to fetch payments");
      return res.json();
    },
  });

  const checkInMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(api.profile.checkInSelf.path, { method: "POST" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Check-in failed");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.profile.isCheckedIn.path] });
      toast({ title: "Checked In", description: "Welcome to the gym!" });
    },
    onError: (err: Error) => {
      toast({ variant: "destructive", title: "Check-in failed", description: err.message });
    },
  });

  const checkOutMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(api.profile.checkOutSelf.path, { method: "POST" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Check-out failed");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.profile.isCheckedIn.path] });
      toast({ title: "Checked Out", description: "See you next time!" });
    },
    onError: (err: Error) => {
      toast({ variant: "destructive", title: "Check-out failed", description: err.message });
    },
  });

  const isCheckedIn = checkStatus?.isCheckedIn;
  const todayWorkout = myWorkouts?.find((w: any) => w.date === new Date().toISOString().split('T')[0]);

  return (
    <LayoutShell>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">My Profile</h1>
          <p className="text-muted-foreground mt-1">Your membership details and gym access</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 border-none shadow-lg bg-card/50 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <div>
                <CardTitle>{profile?.fullName || "Loading..."}</CardTitle>
                <CardDescription>
                  {profile?.email || profile?.phone || "No contact info"}
                </CardDescription>
              </div>
              <Badge variant={profile?.status === "active" ? "default" : "destructive"} className="capitalize">
                {profile?.status}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Plan</p>
                  <p className="font-medium capitalize">{profile?.planType} Plan</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Monthly Fee</p>
                  <p className="font-medium">${profile?.monthlyFee}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Member Since</p>
                  <p className="font-medium">{profile?.joinDate ? format(new Date(profile.joinDate), "MMM d, yyyy") : "-"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Next Payment Due</p>
                  <p className="font-medium">{profile?.nextDueDate ? format(new Date(profile.nextDueDate), "MMM d, yyyy") : "-"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-gradient-to-br from-primary/20 to-accent/20">
            <CardHeader>
              <CardTitle className="text-lg">Gym Access</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center py-4">
                <div className={`inline-flex items-center justify-center h-20 w-20 rounded-full mb-4 ${isCheckedIn ? "bg-green-500/20 text-green-400" : "bg-muted text-muted-foreground"}`}>
                  {isCheckedIn ? <Activity className="h-10 w-10" /> : <LogIn className="h-10 w-10" />}
                </div>
                <p className="text-lg font-medium">
                  {isCheckedIn ? "Currently In Gym" : "Not Checked In"}
                </p>
              </div>
              
              {isCheckedIn ? (
                <Button 
                  data-testid="button-check-out"
                  className="w-full" 
                  variant="destructive"
                  onClick={() => checkOutMutation.mutate()}
                  disabled={checkOutMutation.isPending}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  {checkOutMutation.isPending ? "Checking out..." : "Check Out"}
                </Button>
              ) : (
                <Button 
                  data-testid="button-check-in"
                  className="w-full bg-accent text-accent-foreground hover:bg-accent/90" 
                  onClick={() => checkInMutation.mutate()}
                  disabled={checkInMutation.isPending || profile?.status !== "active"}
                >
                  <LogIn className="mr-2 h-4 w-4" />
                  {checkInMutation.isPending ? "Checking in..." : "Check In"}
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="border-none shadow-lg bg-card/50 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>Gym Occupancy</CardTitle>
              <CardDescription>Real-time gym capacity status</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {liveData ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 rounded-lg bg-muted/30">
                  <p className="text-3xl font-bold text-primary">{liveData.count}</p>
                  <p className="text-sm text-muted-foreground">People Now</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-muted/30">
                  <p className="text-3xl font-bold">{liveData.capacity}</p>
                  <p className="text-sm text-muted-foreground">Max Capacity</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-muted/30">
                  <p className={`text-3xl font-bold ${liveData.capacity - liveData.count <= 5 ? "text-red-400" : liveData.capacity - liveData.count <= 15 ? "text-yellow-400" : "text-green-400"}`}>
                    {Math.max(0, liveData.capacity - liveData.count)}
                  </p>
                  <p className="text-sm text-muted-foreground">Spots Left</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-muted/30">
                  <p className={`text-xl font-bold ${
                    liveData.crowdStatus === "Low" ? "text-green-400" :
                    liveData.crowdStatus === "Moderate" ? "text-yellow-400" :
                    liveData.crowdStatus === "High" ? "text-orange-400" : "text-red-400"
                  }`}>
                    {liveData.crowdStatus}
                  </p>
                  <p className="text-sm text-muted-foreground">Status</p>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">Loading gym status...</p>
            )}
            
            {liveData?.crowdStatus === "Full" && (
              <div className="mt-4 p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                <div className="flex items-center gap-2 text-red-400">
                  <Clock className="h-5 w-5" />
                  <p className="font-medium">Gym is at full capacity</p>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Peak hours are typically 5-8 PM on weekdays. Try visiting during off-peak hours (early morning or mid-afternoon) for a less crowded experience.
                </p>
              </div>
            )}
            
            {liveData?.crowdStatus === "High" && (
              <div className="mt-4 p-4 rounded-lg bg-orange-500/10 border border-orange-500/20">
                <div className="flex items-center gap-2 text-orange-400">
                  <Clock className="h-5 w-5" />
                  <p className="font-medium">Gym is getting busy</p>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Only {liveData.capacity - liveData.count} spots remaining. Consider visiting soon or waiting for it to slow down.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border-none shadow-lg bg-card/50 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center gap-2">
              <Dumbbell className="h-5 w-5 text-primary" />
              <CardTitle>Today's Workout</CardTitle>
            </CardHeader>
            <CardContent>
              {todayWorkout ? (
                <div className="space-y-3">
                  {(todayWorkout.content as any)?.exercises?.map((ex: any, i: number) => (
                    <div key={i} className="flex justify-between items-center py-2 border-b border-border/50 last:border-0">
                      <span className="font-medium">{ex.name}</span>
                      <span className="text-muted-foreground text-sm">{ex.sets} x {ex.reps}</span>
                    </div>
                  ))}
                  {todayWorkout.completed && (
                    <Badge variant="secondary" className="mt-2">Completed</Badge>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">No workout assigned for today</p>
              )}
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-card/50 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              <CardTitle>Recent Payments</CardTitle>
            </CardHeader>
            <CardContent>
              {myPayments?.length > 0 ? (
                <div className="space-y-3">
                  {myPayments.slice(0, 5).map((p: any) => (
                    <div key={p.id} className="flex justify-between items-center py-2 border-b border-border/50 last:border-0">
                      <div>
                        <p className="font-medium">${p.amount}</p>
                        <p className="text-xs text-muted-foreground">{p.description || p.type}</p>
                      </div>
                      <Badge variant={p.status === "paid" ? "default" : p.status === "overdue" ? "destructive" : "secondary"}>
                        {p.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">No payment history</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </LayoutShell>
  );
}
