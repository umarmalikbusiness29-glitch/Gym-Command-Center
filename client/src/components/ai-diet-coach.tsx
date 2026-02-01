import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, Apple, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AIDietCoachProps {
  memberId?: number;
  memberName?: string;
  memberGender?: string;
}

export function AIDietCoach({ memberId, memberName = "Member", memberGender = "male" }: AIDietCoachProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [dietPlan, setDietPlan] = useState<string>("");
  const [age, setAge] = useState("");
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [fitnessGoal, setFitnessGoal] = useState("muscle-gain");
  const [dietary, setDietary] = useState("no-restriction");
  const { toast } = useToast();

  const generateDietPlan = async () => {
    if (!age || !weight || !height) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please fill in age, weight, and height",
      });
      return;
    }

    setIsLoading(true);
    try {
      const prompt = `Create a personalized diet plan for:
- Name: ${memberName}
- Gender: ${memberGender}
- Age: ${age} years
- Weight: ${weight} kg
- Height: ${height} cm
- Fitness Goal: ${fitnessGoal}
- Dietary Restrictions: ${dietary}

Please provide:
1. Daily calorie recommendation
2. Macro breakdown (protein, carbs, fats)
3. Sample meal plan (breakfast, lunch, dinner, snacks)
4. Foods to include and avoid
5. Hydration recommendation
6. Timing of meals
7. Tips for success

Format it clearly and make it actionable.`;

      // Call OpenAI API or similar service
      const response = await fetch("/api/ai/diet-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate diet plan");
      }

      const data = await response.json();
      setDietPlan(data.plan);
      toast({
        title: "Success",
        description: "Diet plan generated successfully!",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to generate diet plan",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Card className="border-border/50 bg-gradient-to-br from-green-500/5 to-emerald-500/5 hover:border-green-500/30 transition-colors cursor-pointer">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-2">
                  <Apple className="h-5 w-5 text-green-500" />
                  AI Diet Coach
                </CardTitle>
                <CardDescription>Get personalized nutrition guidance</CardDescription>
              </div>
              <Sparkles className="h-8 w-8 text-green-500/40" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Click to generate a personalized diet plan based on your fitness goals and preferences.
            </p>
          </CardContent>
        </Card>
      </DialogTrigger>
      <DialogContent className="max-w-3xl bg-card border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Apple className="h-5 w-5 text-green-500" />
            AI Diet Coach for {memberName}
          </DialogTitle>
        </DialogHeader>

        {!dietPlan ? (
          <div className="space-y-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="age">Age (years)</Label>
                <Input
                  id="age"
                  type="number"
                  placeholder="e.g., 25"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  className="bg-background/50 border-input/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="weight">Weight (kg)</Label>
                <Input
                  id="weight"
                  type="number"
                  placeholder="e.g., 75"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  className="bg-background/50 border-input/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="height">Height (cm)</Label>
                <Input
                  id="height"
                  type="number"
                  placeholder="e.g., 180"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  className="bg-background/50 border-input/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="goal">Fitness Goal</Label>
                <select
                  id="goal"
                  value={fitnessGoal}
                  onChange={(e) => setFitnessGoal(e.target.value)}
                  className="w-full px-3 py-2 rounded-md bg-background/50 border border-input/50 text-sm"
                >
                  <option value="muscle-gain">Muscle Gain</option>
                  <option value="weight-loss">Weight Loss</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="strength">Strength Building</option>
                  <option value="endurance">Endurance</option>
                </select>
              </div>
              <div className="col-span-2 space-y-2">
                <Label htmlFor="dietary">Dietary Restrictions</Label>
                <select
                  id="dietary"
                  value={dietary}
                  onChange={(e) => setDietary(e.target.value)}
                  className="w-full px-3 py-2 rounded-md bg-background/50 border border-input/50 text-sm"
                >
                  <option value="no-restriction">No Restriction</option>
                  <option value="vegetarian">Vegetarian</option>
                  <option value="vegan">Vegan</option>
                  <option value="keto">Keto</option>
                  <option value="low-carb">Low Carb</option>
                  <option value="gluten-free">Gluten Free</option>
                  <option value="dairy-free">Dairy Free</option>
                </select>
              </div>
            </div>

            <Button
              onClick={generateDietPlan}
              disabled={isLoading || !age || !weight || !height}
              className="w-full bg-green-600 hover:bg-green-700 shadow-lg shadow-green-500/25"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating Diet Plan...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate Personalized Diet Plan
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="bg-muted/50 rounded-lg p-4 whitespace-pre-wrap text-sm leading-relaxed max-h-[400px] overflow-y-auto">
              {dietPlan}
            </div>
            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setDietPlan("");
                  setAge("");
                  setWeight("");
                  setHeight("");
                }}
                className="flex-1"
              >
                Generate New Plan
              </Button>
              <Button
                onClick={() => {
                  // Copy to clipboard or download functionality
                  navigator.clipboard.writeText(dietPlan);
                  toast({
                    title: "Copied",
                    description: "Diet plan copied to clipboard",
                  });
                }}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                Copy Plan
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
