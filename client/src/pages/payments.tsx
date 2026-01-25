import LayoutShell from "@/components/layout-shell";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { CreditCard, Plus, DollarSign, AlertCircle, TrendingUp } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { format } from "date-fns";

export default function PaymentsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [paymentData, setPaymentData] = useState({
    memberId: "",
    amount: "",
    type: "membership_fee",
    status: "paid",
    description: "",
  });

  const isAdmin = user?.role === "admin";

  const { data: payments, isLoading } = useQuery({
    queryKey: [api.payments.list.path],
    queryFn: async () => {
      const res = await fetch(api.payments.list.path);
      if (!res.ok) throw new Error("Failed to fetch payments");
      return res.json();
    },
  });

  const { data: stats } = useQuery({
    queryKey: [api.payments.stats.path],
    queryFn: async () => {
      const res = await fetch(api.payments.stats.path);
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json();
    },
    enabled: isAdmin,
  });

  const { data: members } = useQuery({
    queryKey: [api.members.list.path],
    queryFn: async () => {
      const res = await fetch(api.members.list.path);
      if (!res.ok) throw new Error("Failed to fetch members");
      return res.json();
    },
    enabled: isAdmin,
  });

  const createPaymentMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(api.payments.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId: parseInt(paymentData.memberId),
          amount: paymentData.amount,
          type: paymentData.type,
          status: paymentData.status,
          description: paymentData.description || `${paymentData.type} payment`,
          dueDate: new Date().toISOString(),
        }),
      });
      if (!res.ok) throw new Error("Failed to create payment");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.payments.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.payments.stats.path] });
      toast({ title: "Payment Recorded", description: "Payment has been recorded successfully" });
      setOpen(false);
      setPaymentData({ memberId: "", amount: "", type: "membership_fee", status: "paid", description: "" });
    },
    onError: (err: Error) => {
      toast({ variant: "destructive", title: "Failed to record payment", description: err.message });
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid": return "bg-green-500/20 text-green-400 border-green-500/50";
      case "pending": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/50";
      case "overdue": return "bg-red-500/20 text-red-400 border-red-500/50";
      default: return "";
    }
  };

  return (
    <LayoutShell>
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Finance</h1>
            <p className="text-muted-foreground mt-1">
              {isAdmin ? "Track payments and manage dues" : "Your payment history"}
            </p>
          </div>
          {isAdmin && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-payment">
                  <Plus className="h-4 w-4 mr-2" />
                  Record Payment
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Record Payment</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Member</Label>
                    <Select value={paymentData.memberId} onValueChange={(v) => setPaymentData({ ...paymentData, memberId: v })}>
                      <SelectTrigger data-testid="select-payment-member">
                        <SelectValue placeholder="Select member" />
                      </SelectTrigger>
                      <SelectContent>
                        {members?.filter((m: any) => m.user?.role === "member").map((m: any) => (
                          <SelectItem key={m.id} value={String(m.id)}>{m.fullName}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Amount ($)</Label>
                      <Input
                        data-testid="input-payment-amount"
                        type="number"
                        step="0.01"
                        value={paymentData.amount}
                        onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })}
                        placeholder="29.99"
                      />
                    </div>
                    <div>
                      <Label>Type</Label>
                      <Select value={paymentData.type} onValueChange={(v) => setPaymentData({ ...paymentData, type: v })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="membership_fee">Membership Fee</SelectItem>
                          <SelectItem value="product_purchase">Product Purchase</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label>Status</Label>
                    <Select value={paymentData.status} onValueChange={(v) => setPaymentData({ ...paymentData, status: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="paid">Paid</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="overdue">Overdue</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Description (Optional)</Label>
                    <Input
                      data-testid="input-payment-description"
                      value={paymentData.description}
                      onChange={(e) => setPaymentData({ ...paymentData, description: e.target.value })}
                      placeholder="Monthly membership - January"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button 
                    data-testid="button-submit-payment"
                    onClick={() => createPaymentMutation.mutate()}
                    disabled={!paymentData.memberId || !paymentData.amount || createPaymentMutation.isPending}
                  >
                    {createPaymentMutation.isPending ? "Recording..." : "Record Payment"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {isAdmin && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border-none shadow-lg bg-gradient-to-br from-green-500/20 to-green-500/5">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground text-sm">Total Revenue</p>
                    <p className="text-3xl font-bold">${stats?.totalRevenue?.toFixed(2) || "0.00"}</p>
                  </div>
                  <TrendingUp className="h-10 w-10 text-green-400 opacity-70" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg bg-gradient-to-br from-yellow-500/20 to-yellow-500/5">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground text-sm">Pending Dues</p>
                    <p className="text-3xl font-bold">${stats?.pendingDues?.toFixed(2) || "0.00"}</p>
                  </div>
                  <DollarSign className="h-10 w-10 text-yellow-400 opacity-70" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg bg-gradient-to-br from-red-500/20 to-red-500/5">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground text-sm">Overdue Payments</p>
                    <p className="text-3xl font-bold">{stats?.overdueCount || 0}</p>
                  </div>
                  <AlertCircle className="h-10 w-10 text-red-400 opacity-70" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <Card className="border-none shadow-lg bg-card/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payment History
            </CardTitle>
            <CardDescription>
              {isAdmin ? "All payment transactions" : "Your payment transactions"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground">Loading payments...</p>
            ) : payments?.length === 0 ? (
              <div className="text-center py-12">
                <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No payment records found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {payments?.map((payment: any) => (
                  <div key={payment.id} className="flex items-center justify-between p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                        <DollarSign className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">${payment.amount}</p>
                        <p className="text-sm text-muted-foreground">
                          {payment.description || payment.type.replace("_", " ")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">
                          {payment.paidDate ? format(new Date(payment.paidDate), "MMM d, yyyy") : 
                           payment.dueDate ? `Due: ${format(new Date(payment.dueDate), "MMM d")}` : "-"}
                        </p>
                      </div>
                      <Badge className={getStatusColor(payment.status)}>
                        {payment.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </LayoutShell>
  );
}
