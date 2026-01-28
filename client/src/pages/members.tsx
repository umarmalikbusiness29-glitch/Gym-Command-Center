import { useState } from "react";
import LayoutShell from "@/components/layout-shell";
import { useMembers } from "@/hooks/use-members";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, MoreHorizontal, Loader2, Eye, Edit, Snowflake } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api, buildUrl } from "@shared/routes";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

// Schema for creating member + user
const createMemberSchema = z.intersection(
  api.members.create.input,
  z.object({ confirmPassword: z.string() })
).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type CreateMemberForm = z.infer<typeof createMemberSchema>;

export default function MembersPage() {
  const { members, isLoading, createMember, isCreating } = useMembers();
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [viewMember, setViewMember] = useState<any>(null);
  const [editMember, setEditMember] = useState<any>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const freezeMutation = useMutation({
    mutationFn: async (memberId: number) => {
      const url = buildUrl(api.members.freeze.path, { id: memberId });
      const res = await fetch(url, { method: "POST" });
      if (!res.ok) throw new Error("Failed to update status");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [api.members.list.path] });
      toast({ title: "Success", description: `Member ${data.status === 'frozen' ? 'frozen' : 'unfrozen'} successfully` });
    },
    onError: (err: Error) => {
      toast({ variant: "destructive", title: "Failed", description: err.message });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: { id: number; updates: any }) => {
      const url = buildUrl(api.members.update.path, { id: data.id });
      const res = await fetch(url, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data.updates) });
      if (!res.ok) throw new Error("Failed to update member");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.members.list.path] });
      toast({ title: "Success", description: "Member updated successfully" });
      setEditMember(null);
    },
    onError: (err: Error) => {
      toast({ variant: "destructive", title: "Failed", description: err.message });
    },
  });

  const form = useForm<CreateMemberForm>({
    resolver: zodResolver(createMemberSchema),
    defaultValues: {
      role: "member",
      planType: "classic",
      gender: "male",
      status: "active",
      monthlyFee: "50",
    }
  });

  const onSubmit = (data: CreateMemberForm) => {
    // Convert string to number for schema validation on server
    // (Though the input is text, backend expects string for decimal, so this is fine)
    createMember(data, {
      onSuccess: () => {
        setIsOpen(false);
        form.reset();
      }
    });
  };

  const filteredMembers = members?.filter(m => 
    m.fullName.toLowerCase().includes(search.toLowerCase()) || 
    m.user.username.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <LayoutShell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold">Member Management</h1>
            <p className="text-muted-foreground">Manage gym members and staff</p>
          </div>
          
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button className="shadow-lg shadow-primary/20">
                <Plus className="mr-2 h-4 w-4" /> Add Member
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl bg-card border-border">
              <DialogHeader>
                <DialogTitle>Add New Member</DialogTitle>
              </DialogHeader>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Full Name</Label>
                    <Input {...form.register("fullName")} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Username</Label>
                    <Input {...form.register("username")} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Password</Label>
                    <Input type="password" {...form.register("password")} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Confirm Password</Label>
                    <Input type="password" {...form.register("confirmPassword")} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input type="email" {...form.register("email")} />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input {...form.register("phone")} />
                  </div>
                  <div className="space-y-2">
                    <Label>Plan Type</Label>
                    <Select onValueChange={(val: any) => form.setValue("planType", val)} defaultValue="classic">
                      <SelectTrigger>
                        <SelectValue placeholder="Select Plan" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="classic">Classic</SelectItem>
                        <SelectItem value="premium">Premium</SelectItem>
                        <SelectItem value="vip">VIP</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Monthly Fee ($)</Label>
                    <Input type="number" {...form.register("monthlyFee")} defaultValue="50" />
                  </div>
                  <div className="space-y-2">
                    <Label>Gender</Label>
                    <Select onValueChange={(val: any) => form.setValue("gender", val)} defaultValue="male">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Join Date</Label>
                    <Input type="date" {...form.register("joinDate")} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Next Due Date</Label>
                    <Input type="date" {...form.register("nextDueDate")} required />
                  </div>
                </div>
                
                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={isCreating}>
                    {isCreating ? <Loader2 className="animate-spin mr-2 h-4 w-4"/> : null}
                    Create Member
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="border-none shadow-md bg-card/50">
          <CardHeader className="pb-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search members..." 
                className="pl-9 bg-background/50 border-input/50 max-w-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border border-border/50 overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Next Due</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        Loading members...
                      </TableCell>
                    </TableRow>
                  ) : filteredMembers?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No members found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredMembers?.map((member) => (
                      <TableRow key={member.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell className="font-medium">
                          <div className="flex flex-col">
                            <span>{member.fullName}</span>
                            <span className="text-xs text-muted-foreground">@{member.user.username}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize border-primary/20 bg-primary/5 text-primary">
                            {member.planType}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant="secondary" 
                            className={member.status === 'active' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}
                          >
                            {member.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{member.nextDueDate}</TableCell>
                        <TableCell>{member.joinDate}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0" data-testid={`button-member-actions-${member.id}`}>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem 
                                data-testid={`button-view-member-${member.id}`}
                                onClick={() => setViewMember(member)}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                data-testid={`button-edit-member-${member.id}`}
                                onClick={() => setEditMember(member)}
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                Edit Profile
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                data-testid={`button-freeze-member-${member.id}`}
                                className={member.status === 'frozen' ? 'text-green-500' : 'text-destructive'}
                                onClick={() => freezeMutation.mutate(member.id)}
                              >
                                <Snowflake className="h-4 w-4 mr-2" />
                                {member.status === 'active' ? 'Freeze Membership' : 'Unfreeze Membership'}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!viewMember} onOpenChange={() => setViewMember(null)}>
        <DialogContent className="max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle>Member Details</DialogTitle>
          </DialogHeader>
          {viewMember && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground text-xs">Full Name</Label>
                  <p className="font-medium">{viewMember.fullName}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Username</Label>
                  <p className="font-medium">@{viewMember.user?.username}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Email</Label>
                  <p className="font-medium">{viewMember.email || "-"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Phone</Label>
                  <p className="font-medium">{viewMember.phone || "-"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Plan</Label>
                  <Badge variant="outline" className="capitalize">{viewMember.planType}</Badge>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Status</Label>
                  <Badge variant={viewMember.status === 'active' ? 'default' : 'destructive'} className="capitalize">
                    {viewMember.status}
                  </Badge>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Monthly Fee</Label>
                  <p className="font-medium">${viewMember.monthlyFee}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Gender</Label>
                  <p className="font-medium capitalize">{viewMember.gender}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Join Date</Label>
                  <p className="font-medium">{viewMember.joinDate}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Next Due Date</Label>
                  <p className="font-medium">{viewMember.nextDueDate}</p>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button 
                  variant={viewMember.status === 'frozen' ? 'default' : 'destructive'}
                  onClick={() => {
                    freezeMutation.mutate(viewMember.id);
                    setViewMember(null);
                  }}
                >
                  <Snowflake className="h-4 w-4 mr-2" />
                  {viewMember.status === 'active' ? 'Freeze' : 'Unfreeze'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!editMember} onOpenChange={() => setEditMember(null)}>
        <DialogContent className="max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle>Edit Member</DialogTitle>
          </DialogHeader>
          {editMember && (
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              updateMutation.mutate({
                id: editMember.id,
                updates: {
                  fullName: formData.get("fullName"),
                  email: formData.get("email"),
                  phone: formData.get("phone"),
                  planType: formData.get("planType"),
                  monthlyFee: Number(formData.get("monthlyFee")),
                }
              });
            }} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-fullName">Full Name</Label>
                <Input id="edit-fullName" name="fullName" defaultValue={editMember.fullName} data-testid="input-edit-fullName" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input id="edit-email" name="email" type="email" defaultValue={editMember.email || ""} data-testid="input-edit-email" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-phone">Phone</Label>
                <Input id="edit-phone" name="phone" defaultValue={editMember.phone || ""} data-testid="input-edit-phone" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-planType">Plan Type</Label>
                <Select name="planType" defaultValue={editMember.planType}>
                  <SelectTrigger data-testid="select-edit-planType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="classic">Classic</SelectItem>
                    <SelectItem value="premium">Premium</SelectItem>
                    <SelectItem value="vip">VIP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-monthlyFee">Monthly Fee ($)</Label>
                <Input id="edit-monthlyFee" name="monthlyFee" type="number" defaultValue={editMember.monthlyFee} data-testid="input-edit-monthlyFee" />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setEditMember(null)}>Cancel</Button>
                <Button type="submit" disabled={updateMutation.isPending} data-testid="button-save-member">
                  {updateMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </LayoutShell>
  );
}
