import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { 
  Dumbbell, 
  LayoutDashboard, 
  Users, 
  CreditCard, 
  ShoppingBag, 
  CalendarDays,
  LogOut,
  Menu,
  X,
  Settings,
  UserCircle,
  ClipboardCheck
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export default function LayoutShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isAdmin = user?.role === "admin";
  const isTrainer = user?.role === "trainer";
  const isMember = user?.role === "member";

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, show: true },
    { href: "/my-profile", label: "My Profile", icon: UserCircle, show: isMember },
    { href: "/members", label: "Members", icon: Users, show: isAdmin || isTrainer },
    { href: "/attendance", label: "Attendance", icon: ClipboardCheck, show: isAdmin || isTrainer },
    { href: "/workouts", label: "Workouts", icon: CalendarDays, show: true },
    { href: "/pos", label: "Store", icon: ShoppingBag, show: true },
    { href: "/payments", label: "Finance", icon: CreditCard, show: isAdmin || isMember },
    { href: "/settings", label: "Settings", icon: Settings, show: isAdmin },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 border-b border-border bg-card">
        <div className="flex items-center gap-2">
          <Dumbbell className="h-6 w-6 text-primary" />
          <span className="font-display font-bold text-xl tracking-tight">IRON<span className="text-primary">CORE</span></span>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X /> : <Menu />}
        </Button>
      </div>

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border transform transition-transform duration-200 ease-in-out md:relative md:translate-x-0 flex flex-col",
        mobileOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-6 hidden md:flex items-center gap-2">
          <div className="bg-primary/20 p-2 rounded-lg">
            <Dumbbell className="h-6 w-6 text-primary" />
          </div>
          <span className="font-display font-bold text-xl tracking-tight">IRON<span className="text-primary">CORE</span></span>
        </div>

        <div className="p-6 md:hidden">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Menu</p>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          {navItems.filter(item => item.show).map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <div className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all cursor-pointer",
                  isActive 
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/20" 
                    : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                )}>
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border mt-auto">
          <div className="flex items-center gap-3 px-4 py-3 mb-2">
            <div className="h-8 w-8 rounded-full bg-accent flex items-center justify-center text-accent-foreground font-bold">
              {user?.username.substring(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium truncate">{user?.username}</p>
              <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
            </div>
          </div>
          <Button 
            variant="outline" 
            className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10 hover:border-destructive/50"
            onClick={() => logout()}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto h-[calc(100vh-65px)] md:h-screen p-4 md:p-8">
        <div className="max-w-7xl mx-auto animate-in">
          {children}
        </div>
      </main>

      {/* Overlay for mobile sidebar */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}
    </div>
  );
}
