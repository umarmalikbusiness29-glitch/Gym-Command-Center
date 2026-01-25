import LayoutShell from "@/components/layout-shell";
import { useAuth } from "@/hooks/use-auth";
import { useAttendance, usePaymentStats } from "@/hooks/use-dashboard";
import { StatCard } from "@/components/stat-card";
import { Users, CreditCard, Activity, TrendingUp, UserCheck, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { format } from "date-fns";

export default function Dashboard() {
  const { user } = useAuth();
  const { liveData, checkIn } = useAttendance();
  const { data: paymentStats } = usePaymentStats();

  const isAdmin = user?.role === "admin";
  const isMember = user?.role === "member";

  // Mock chart data - in a real app this would come from an analytics endpoint
  const attendanceData = [
    { name: 'Mon', count: 45 },
    { name: 'Tue', count: 52 },
    { name: 'Wed', count: 38 },
    { name: 'Thu', count: 65 },
    { name: 'Fri', count: 48 },
    { name: 'Sat', count: 85 },
    { name: 'Sun', count: 30 },
  ];

  return (
    <LayoutShell>
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground mt-1">Overview of your gym activity</p>
          </div>
          {isMember && (
            <Button 
              size="lg" 
              className="bg-accent text-accent-foreground hover:bg-accent/90 shadow-lg shadow-accent/20"
              // In real app, this would show a QR code
              onClick={() => {}} 
            >
              <UserCheck className="mr-2 h-5 w-5" />
              My Access Pass
            </Button>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {isAdmin && (
            <>
              <StatCard
                title="Live Occupancy"
                value={liveData?.count || 0}
                description={`${liveData?.occupancyRate || 0}% of capacity`}
                icon={Users}
                className="border-l-4 border-l-primary"
              />
              <StatCard
                title="Revenue (M)"
                value={`$${paymentStats?.totalRevenue || 0}`}
                description="Total collected this month"
                icon={TrendingUp}
                trend="up"
              />
              <StatCard
                title="Pending Dues"
                value={`$${paymentStats?.pendingDues || 0}`}
                description={`${paymentStats?.overdueCount || 0} members overdue`}
                icon={AlertCircle}
                trend="down"
              />
              <StatCard
                title="Active Members"
                value="124"
                description="+12 this month"
                icon={Activity}
                trend="up"
              />
            </>
          )}
          {isMember && (
             <>
               <StatCard
                 title="Days Attended"
                 value="12"
                 description="This month"
                 icon={Users}
                 trend="up"
               />
               <StatCard
                 title="Next Payment"
                 value="$45.00"
                 description="Due in 5 days"
                 icon={CreditCard}
                 trend="neutral"
               />
               <StatCard
                 title="Workout Streak"
                 value="3 Days"
                 description="Keep it up!"
                 icon={Activity}
                 className="border-l-4 border-l-accent"
               />
             </>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Chart Section */}
          <Card className="lg:col-span-2 border-none shadow-lg bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Attendance Trends</CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={attendanceData}>
                  <XAxis 
                    dataKey="name" 
                    stroke="#888888" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false} 
                  />
                  <YAxis 
                    stroke="#888888" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false} 
                    tickFormatter={(value) => `${value}`} 
                  />
                  <Tooltip 
                    cursor={{fill: 'rgba(255,255,255,0.05)'}}
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                  />
                  <Bar 
                    dataKey="count" 
                    fill="hsl(var(--primary))" 
                    radius={[4, 4, 0, 0]} 
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Live Activity Feed */}
          <Card className="border-none shadow-lg bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Live Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {liveData?.attendees?.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No one is currently in the gym.</p>
                ) : (
                  liveData?.attendees?.slice(0, 5).map((person) => (
                    <div key={person.id} className="flex items-center gap-3 pb-3 border-b border-border/50 last:border-0 last:pb-0">
                      <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center text-xs font-bold">
                        {person.fullName.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{person.fullName}</p>
                        <p className="text-xs text-muted-foreground">Checked in recently</p>
                      </div>
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
