import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: LucideIcon;
  trend?: "up" | "down" | "neutral";
  className?: string;
}

export function StatCard({ title, value, description, icon: Icon, trend, className }: StatCardProps) {
  return (
    <Card className={cn("overflow-hidden border-none shadow-lg bg-card/50 backdrop-blur-sm", className)}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-display font-bold text-foreground tracking-tight">{value}</p>
          </div>
          <div className={cn(
            "p-3 rounded-xl bg-primary/10 text-primary",
            trend === "down" && "bg-destructive/10 text-destructive",
            trend === "neutral" && "bg-secondary text-secondary-foreground"
          )}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
        {description && (
          <p className="mt-4 text-xs text-muted-foreground">
            {description}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
