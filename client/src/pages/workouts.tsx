import LayoutShell from "@/components/layout-shell";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Dumbbell, Plus, Trash2, Check, Calendar } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { format } from "date-fns";

export default function WorkoutsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState("");
  const [workoutDate, setWorkoutDate] = useState(new Date().toISOString().split('T')[0]);
  const [exercises, setExercises] = useState([{ name: "", sets: "3", reps: "10" }]);

  const isStaff = user?.role === "admin" || user?.role === "trainer";
  const isMember = user?.role === "member";

  const { data: workouts, isLoading } = useQuery({
    queryKey: [api.workouts.list.path],
    queryFn: async () => {
      const res = await fetch(api.workouts.list.path);
      if (!res.ok) throw new Error("Failed to fetch workouts");
      return res.json();
    },
  });

  const { data: members } = useQuery({
    queryKey: [api.members.list.path],
    queryFn: async () => {
      const res = await fetch(api.members.list.path);
      if (!res.ok) throw new Error("Failed to fetch members");
      return res.json();
    },
    enabled: isStaff,
  });

  const assignMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(api.workouts.assign.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId: parseInt(selectedMember),
          date: workoutDate,
          content: { exercises: exercises.filter(e => e.name.trim()) },
          completed: false,
        }),
      });
      if (!res.ok) throw new Error("Failed to assign workout");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.workouts.list.path] });
      toast({ title: "Workout Assigned", description: "Workout plan has been assigned successfully" });
      setOpen(false);
      setExercises([{ name: "", sets: "3", reps: "10" }]);
      setSelectedMember("");
    },
    onError: (err: Error) => {
      toast({ variant: "destructive", title: "Failed to assign workout", description: err.message });
    },
  });

  const completeMutation = useMutation({
    mutationFn: async (workoutId: number) => {
      const res = await fetch(`/api/workouts/${workoutId}/complete`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error("Failed to complete workout");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.workouts.list.path] });
      toast({ title: "Workout Completed", description: "Great job!" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (workoutId: number) => {
      const res = await fetch(`/api/workouts/${workoutId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete workout");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.workouts.list.path] });
      toast({ title: "Workout Deleted" });
    },
  });

  const addExercise = () => {
    setExercises([...exercises, { name: "", sets: "3", reps: "10" }]);
  };

  const updateExercise = (index: number, field: string, value: string) => {
    const updated = [...exercises];
    updated[index] = { ...updated[index], [field]: value };
    setExercises(updated);
  };

  const removeExercise = (index: number) => {
    setExercises(exercises.filter((_, i) => i !== index));
  };

  return (
    <LayoutShell>
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Workouts</h1>
            <p className="text-muted-foreground mt-1">
              {isMember ? "Your assigned workout plans" : "Manage and assign workout plans"}
            </p>
          </div>
          {isStaff && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-workout">
                  <Plus className="h-4 w-4 mr-2" />
                  Assign Workout
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Assign New Workout</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Member</Label>
                      <Select value={selectedMember} onValueChange={setSelectedMember}>
                        <SelectTrigger data-testid="select-member">
                          <SelectValue placeholder="Select member" />
                        </SelectTrigger>
                        <SelectContent>
                          {members?.filter((m: any) => m.user?.role === "member").map((m: any) => (
                            <SelectItem key={m.id} value={String(m.id)}>{m.fullName}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Date</Label>
                      <Input
                        data-testid="input-workout-date"
                        type="date"
                        value={workoutDate}
                        onChange={(e) => setWorkoutDate(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Exercises</Label>
                    {exercises.map((ex, i) => (
                      <div key={i} className="flex gap-2 items-center">
                        <Input
                          data-testid={`input-exercise-name-${i}`}
                          placeholder="Exercise name"
                          value={ex.name}
                          onChange={(e) => updateExercise(i, "name", e.target.value)}
                          className="flex-1"
                        />
                        <Input
                          data-testid={`input-exercise-sets-${i}`}
                          placeholder="Sets"
                          value={ex.sets}
                          onChange={(e) => updateExercise(i, "sets", e.target.value)}
                          className="w-16"
                        />
                        <Input
                          data-testid={`input-exercise-reps-${i}`}
                          placeholder="Reps"
                          value={ex.reps}
                          onChange={(e) => updateExercise(i, "reps", e.target.value)}
                          className="w-16"
                        />
                        {exercises.length > 1 && (
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            onClick={() => removeExercise(i)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                    <Button variant="outline" size="sm" onClick={addExercise}>
                      <Plus className="h-4 w-4 mr-1" />
                      Add Exercise
                    </Button>
                  </div>
                </div>
                <DialogFooter>
                  <Button 
                    data-testid="button-submit-workout"
                    onClick={() => assignMutation.mutate()}
                    disabled={!selectedMember || exercises.every(e => !e.name.trim()) || assignMutation.isPending}
                  >
                    {assignMutation.isPending ? "Assigning..." : "Assign Workout"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {workouts?.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <Dumbbell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No workouts assigned yet</p>
            </div>
          ) : (
            workouts?.map((workout: any) => (
              <Card key={workout.id} className={`border-none shadow-lg ${workout.completed ? "bg-green-500/10" : "bg-card/50"}`}>
                <CardHeader className="flex flex-row items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <CardTitle className="text-base">
                        {format(new Date(workout.date), "EEEE, MMM d")}
                      </CardTitle>
                    </div>
                    {isStaff && (
                      <CardDescription className="mt-1">
                        Member ID: {workout.memberId}
                      </CardDescription>
                    )}
                  </div>
                  <Badge variant={workout.completed ? "default" : "secondary"}>
                    {workout.completed ? "Done" : "Pending"}
                  </Badge>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {(workout.content as any)?.exercises?.map((ex: any, i: number) => (
                      <div key={i} className="flex justify-between items-center text-sm py-1 border-b border-border/30 last:border-0">
                        <span>{ex.name}</span>
                        <span className="text-muted-foreground">{ex.sets} x {ex.reps}</span>
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex gap-2 mt-4">
                    {!workout.completed && isMember && (
                      <Button 
                        data-testid={`button-complete-workout-${workout.id}`}
                        size="sm" 
                        className="flex-1"
                        onClick={() => completeMutation.mutate(workout.id)}
                        disabled={completeMutation.isPending}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Mark Complete
                      </Button>
                    )}
                    {isStaff && (
                      <Button 
                        data-testid={`button-delete-workout-${workout.id}`}
                        size="sm" 
                        variant="ghost"
                        onClick={() => deleteMutation.mutate(workout.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </LayoutShell>
  );
}
