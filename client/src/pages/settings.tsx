import LayoutShell from "@/components/layout-shell";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Settings as SettingsIcon, Building, DollarSign, Users, Dumbbell, ShoppingBag, Save } from "lucide-react";
import { useState, useEffect } from "react";

export default function SettingsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: [api.settings.list.path],
    queryFn: async () => {
      const res = await fetch(api.settings.list.path);
      if (!res.ok) throw new Error("Failed to fetch settings");
      return res.json();
    },
  });

  const [formData, setFormData] = useState({
    gym_name: "",
    gym_capacity: "50",
    monthly_fee_classic: "29.99",
    monthly_fee_premium: "49.99",
    monthly_fee_vip: "79.99",
    grace_period_days: "5",
    enable_store: true,
    enable_workouts: true,
    enable_diets: true,
  });

  useEffect(() => {
    if (settings) {
      const settingsMap = Object.fromEntries(settings.map((s: any) => [s.key, s.value]));
      setFormData({
        gym_name: settingsMap.gym_name || "FitZone Gym",
        gym_capacity: settingsMap.gym_capacity || "50",
        monthly_fee_classic: settingsMap.monthly_fee_classic || "29.99",
        monthly_fee_premium: settingsMap.monthly_fee_premium || "49.99",
        monthly_fee_vip: settingsMap.monthly_fee_vip || "79.99",
        grace_period_days: settingsMap.grace_period_days || "5",
        enable_store: settingsMap.enable_store === "true",
        enable_workouts: settingsMap.enable_workouts === "true",
        enable_diets: settingsMap.enable_diets === "true",
      });
    }
  }, [settings]);

  const updateMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      const res = await fetch(`/api/settings/${key}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value }),
      });
      if (!res.ok) throw new Error("Failed to update setting");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.settings.list.path] });
    },
  });

  const saveAllSettings = async () => {
    try {
      const updates = Object.entries(formData).map(([key, value]) => 
        updateMutation.mutateAsync({ key, value: String(value) })
      );
      await Promise.all(updates);
      toast({ title: "Settings Saved", description: "All settings have been updated" });
    } catch (err) {
      toast({ variant: "destructive", title: "Failed to save settings" });
    }
  };

  return (
    <LayoutShell>
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Settings</h1>
            <p className="text-muted-foreground mt-1">Configure your gym management system</p>
          </div>
          <Button data-testid="button-save-settings" onClick={saveAllSettings} disabled={updateMutation.isPending}>
            <Save className="h-4 w-4 mr-2" />
            {updateMutation.isPending ? "Saving..." : "Save All Changes"}
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border-none shadow-lg bg-card/50">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Building className="h-5 w-5 text-primary" />
                <CardTitle>General Settings</CardTitle>
              </div>
              <CardDescription>Basic gym configuration</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Gym Name</Label>
                <Input
                  data-testid="input-gym-name"
                  value={formData.gym_name}
                  onChange={(e) => setFormData({ ...formData, gym_name: e.target.value })}
                  placeholder="My Gym"
                />
              </div>
              <div>
                <Label>Maximum Capacity</Label>
                <Input
                  data-testid="input-gym-capacity"
                  type="number"
                  value={formData.gym_capacity}
                  onChange={(e) => setFormData({ ...formData, gym_capacity: e.target.value })}
                  placeholder="50"
                />
                <p className="text-xs text-muted-foreground mt-1">Maximum number of members allowed in the gym at once</p>
              </div>
              <div>
                <Label>Grace Period (Days)</Label>
                <Input
                  data-testid="input-grace-period"
                  type="number"
                  value={formData.grace_period_days}
                  onChange={(e) => setFormData({ ...formData, grace_period_days: e.target.value })}
                  placeholder="5"
                />
                <p className="text-xs text-muted-foreground mt-1">Days after due date before marking payment overdue</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-card/50">
            <CardHeader>
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                <CardTitle>Pricing</CardTitle>
              </div>
              <CardDescription>Monthly membership fees by plan</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Classic Plan ($)</Label>
                <Input
                  data-testid="input-fee-classic"
                  type="number"
                  step="0.01"
                  value={formData.monthly_fee_classic}
                  onChange={(e) => setFormData({ ...formData, monthly_fee_classic: e.target.value })}
                />
              </div>
              <div>
                <Label>Premium Plan ($)</Label>
                <Input
                  data-testid="input-fee-premium"
                  type="number"
                  step="0.01"
                  value={formData.monthly_fee_premium}
                  onChange={(e) => setFormData({ ...formData, monthly_fee_premium: e.target.value })}
                />
              </div>
              <div>
                <Label>VIP Plan ($)</Label>
                <Input
                  data-testid="input-fee-vip"
                  type="number"
                  step="0.01"
                  value={formData.monthly_fee_vip}
                  onChange={(e) => setFormData({ ...formData, monthly_fee_vip: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-card/50 lg:col-span-2">
            <CardHeader>
              <div className="flex items-center gap-2">
                <SettingsIcon className="h-5 w-5 text-primary" />
                <CardTitle>Feature Toggles</CardTitle>
              </div>
              <CardDescription>Enable or disable features in your gym system</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
                  <div className="flex items-center gap-3">
                    <ShoppingBag className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Store</p>
                      <p className="text-xs text-muted-foreground">Product sales & inventory</p>
                    </div>
                  </div>
                  <Switch
                    data-testid="switch-enable-store"
                    checked={formData.enable_store}
                    onCheckedChange={(checked) => setFormData({ ...formData, enable_store: checked })}
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
                  <div className="flex items-center gap-3">
                    <Dumbbell className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Workouts</p>
                      <p className="text-xs text-muted-foreground">Workout plan assignments</p>
                    </div>
                  </div>
                  <Switch
                    data-testid="switch-enable-workouts"
                    checked={formData.enable_workouts}
                    onCheckedChange={(checked) => setFormData({ ...formData, enable_workouts: checked })}
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Diet Plans</p>
                      <p className="text-xs text-muted-foreground">Nutrition tracking</p>
                    </div>
                  </div>
                  <Switch
                    data-testid="switch-enable-diets"
                    checked={formData.enable_diets}
                    onCheckedChange={(checked) => setFormData({ ...formData, enable_diets: checked })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </LayoutShell>
  );
}
