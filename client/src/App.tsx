import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

import LoginPage from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import MembersPage from "@/pages/members";
import MyProfilePage from "@/pages/my-profile";
import AttendancePage from "@/pages/attendance";
import WorkoutsPage from "@/pages/workouts";
import POSPage from "@/pages/pos";
import PaymentsPage from "@/pages/payments";
import SettingsPage from "@/pages/settings";
import NotFound from "@/pages/not-found";

// Protected Route Component
function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/login" />;
  }

  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
      <Route path="/dashboard">
        <ProtectedRoute component={Dashboard} />
      </Route>
      <Route path="/members">
        <ProtectedRoute component={MembersPage} />
      </Route>
      <Route path="/my-profile">
        <ProtectedRoute component={MyProfilePage} />
      </Route>
      <Route path="/attendance">
        <ProtectedRoute component={AttendancePage} />
      </Route>
      <Route path="/workouts">
        <ProtectedRoute component={WorkoutsPage} />
      </Route>
      <Route path="/pos">
        <ProtectedRoute component={POSPage} />
      </Route>
      <Route path="/payments">
        <ProtectedRoute component={PaymentsPage} />
      </Route>
      <Route path="/settings">
        <ProtectedRoute component={SettingsPage} />
      </Route>
      
      {/* Default Redirect */}
      <Route path="/" component={() => <Redirect to="/dashboard" />} />
      
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
