import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { api, errorSchemas } from "@shared/routes";
import { z } from "zod";
import { insertMemberSchema } from "@shared/schema";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Set up Passport-based authentication
  setupAuth(app);

  // === AUTHENTICATION & USER ROUTES ===
  // Note: /api/login and /api/logout are handled by setupAuth

  app.get(api.auth.me.path, (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send();
    }
    res.json(req.user);
  });

  // Middleware to ensure user is authenticated
  const requireAuth = (req: any, res: any, next: any) => {
    if (req.isAuthenticated()) return next();
    res.status(401).send();
  };

  const requireAdmin = (req: any, res: any, next: any) => {
    if (req.isAuthenticated() && req.user.role === 'admin') return next();
    res.status(403).send("Forbidden");
  };

  const requireStaff = (req: any, res: any, next: any) => {
    if (req.isAuthenticated() && ['admin', 'trainer'].includes(req.user.role)) return next();
    res.status(403).send("Forbidden");
  };

  // === MEMBERS ===
  app.get(api.members.list.path, requireStaff, async (req, res) => {
    const members = await storage.getMembers();
    res.json(members);
  });

  app.get(api.members.get.path, requireAuth, async (req, res) => {
    const id = Number(req.params.id);
    
    // Authorization check: Admin/Trainer can view anyone, Member can only view self
    if (req.user!.role === 'member') {
      const myProfile = await storage.getMemberByUserId(req.user!.id);
      if (myProfile?.id !== id) return res.status(403).send("Forbidden");
    }

    const member = await storage.getMember(id);
    if (!member) return res.status(404).json({ message: "Member not found" });
    res.json(member);
  });

  app.post(api.members.create.path, requireAdmin, async (req, res) => {
    try {
      const input = api.members.create.input.parse(req.body);
      
      // Hash the password before storing
      const hashedPassword = await (storage as any).hashPassword(input.password);
      
      // Extract user info and member info
      const userInfo = {
        username: input.username,
        password: hashedPassword,
        role: "member" as const,
        isActive: true
      };
      
      const memberInfo = {
        fullName: input.fullName,
        email: input.email,
        phone: input.phone,
        gender: input.gender,
        planType: input.planType,
        monthlyFee: input.monthlyFee,
        joinDate: input.joinDate,
        nextDueDate: input.nextDueDate,
        gracePeriodDays: input.gracePeriodDays,
        status: input.status,
        profileImage: input.profileImage
      };

      const newMember = await storage.createMember(userInfo, memberInfo);
      res.status(201).json(newMember); // Note: returns just member object, frontend might re-fetch list
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      // Check for duplicate username/email
      res.status(400).json({ message: "Failed to create member. Username might be taken." });
    }
  });

  app.patch(api.members.update.path, requireAdmin, async (req, res) => {
    const id = Number(req.params.id);
    
    // Server-side validation - never trust frontend
    const input = api.members.update.input.parse(req.body);
    
    // Get current member to find userId
    const member = await storage.getMember(id);
    if (!member) return res.status(404).json({ message: "Member not found" });
    
    // Extract credential updates (handled separately)
    const { username, newPassword, ...memberUpdates } = input;
    
    // Handle credential updates on the backend
    if (username || newPassword) {
      const userUpdates: any = {};
      
      // Validate and update username
      if (username) {
        // Check if username already taken by another user
        const existingUser = await storage.getUserByUsername(username);
        if (existingUser && existingUser.id !== member.userId) {
          return res.status(400).json({ message: "Username already taken" });
        }
        userUpdates.username = username;
      }
      
      // Hash new password on the backend - never trust frontend with passwords
      if (newPassword) {
        if (newPassword.length < 6) {
          return res.status(400).json({ message: "Password must be at least 6 characters" });
        }
        userUpdates.password = await (storage as any).hashPassword(newPassword);
      }
      
      // Update user credentials
      if (Object.keys(userUpdates).length > 0) {
        await storage.updateUser(member.userId, userUpdates);
      }
    }
    
    // Update member profile data
    const updated = await storage.updateMember(id, memberUpdates);
    res.json(updated);
  });

  app.post(api.members.freeze.path, requireAdmin, async (req, res) => {
    const id = Number(req.params.id);
    const member = await storage.getMember(id);
    if (!member) return res.status(404).send();
    
    const newStatus = member.status === 'frozen' ? 'active' : 'frozen';
    const updated = await storage.updateMember(id, { status: newStatus });
    res.json(updated);
  });

  // === ATTENDANCE ===
  app.post(api.attendance.checkIn.path, requireStaff, async (req, res) => {
    const { memberId } = req.body;
    // Validate membership status
    const member = await storage.getMember(memberId);
    if (!member || member.status !== 'active') {
       return res.status(400).json({ message: "Member inactive or not found" });
    }
    
    const entry = await storage.checkIn(memberId);
    res.json(entry);
  });

  app.post(api.attendance.checkOut.path, requireStaff, async (req, res) => {
    try {
      const entry = await storage.checkOut(req.body.memberId);
      res.json(entry);
    } catch (e) {
      res.status(400).json({ message: (e as Error).message });
    }
  });

  app.get(api.attendance.live.path, requireAuth, async (req, res) => {
    const live = await storage.getLiveAttendance();
    
    // Get capacity from settings
    const capacitySetting = await storage.getSetting('gym_capacity');
    const capacity = capacitySetting ? parseInt(capacitySetting.value) : 50;
    
    const count = live.length;
    const occupancyRate = Math.round((count / capacity) * 100);
    let crowdStatus = "Low";
    if (occupancyRate > 40) crowdStatus = "Moderate";
    if (occupancyRate > 80) crowdStatus = "High";
    if (occupancyRate >= 100) crowdStatus = "Full";

    // Only staff can see attendee details, members just see counts
    if (req.user!.role === 'member') {
      res.json({ count, capacity, occupancyRate, crowdStatus, attendees: [] });
    } else {
      // Enrich with member details for staff
      const attendees = [];
      for (const record of live) {
        const m = await storage.getMember(record.memberId);
        if (m) attendees.push(m);
      }
      res.json({ count, capacity, occupancyRate, crowdStatus, attendees });
    }
  });
  
  app.get(api.attendance.history.path, requireAuth, async (req, res) => {
     let memberId = req.query.memberId ? Number(req.query.memberId) : undefined;
     
     // Members can only see their own history
     if (req.user!.role === 'member') {
        const myProfile = await storage.getMemberByUserId(req.user!.id);
        memberId = myProfile!.id;
     }

     const history = await storage.getAttendanceHistory(memberId);
     res.json(history);
  });

  // === PAYMENTS ===
  app.get(api.payments.list.path, requireAuth, async (req, res) => {
    let memberId = req.query.memberId ? Number(req.query.memberId) : undefined;
    
    if (req.user!.role === 'member') {
       const myProfile = await storage.getMemberByUserId(req.user!.id);
       memberId = myProfile!.id;
    }
    
    const list = await storage.getPayments(memberId);
    res.json(list);
  });
  
  app.get(api.payments.stats.path, requireAdmin, async (req, res) => {
    const stats = await storage.getPaymentStats();
    res.json(stats);
  });

  app.post(api.payments.create.path, requireAdmin, async (req, res) => {
    const input = api.payments.create.input.parse(req.body);
    const payment = await storage.createPayment(input);
    res.status(201).json(payment);
  });

  // === PRODUCTS & ORDERS ===
  app.get(api.products.list.path, requireAuth, async (req, res) => {
    const list = await storage.getProducts();
    res.json(list);
  });

  app.post(api.products.create.path, requireAdmin, async (req, res) => {
    const input = api.products.create.input.parse(req.body);
    const product = await storage.createProduct(input);
    res.status(201).json(product);
  });

  app.post(api.products.purchase.path, requireAuth, async (req, res) => {
    const input = api.products.purchase.input.parse(req.body);
    
    // Members create pending order requests, admin/staff complete immediately
    const status = req.user!.role === 'member' ? 'pending' : 'completed';
    const order = await storage.createOrder(input, status);
    res.status(201).json(order);
  });

  // Orders management
  app.get(api.orders.list.path, requireAuth, async (req, res) => {
    const status = req.query.status as string | undefined;
    
    // Members only see their own orders
    if (req.user!.role === 'member') {
      const member = await storage.getMemberByUserId(req.user!.id);
      if (!member) return res.json([]);
      const allOrders = await storage.getOrders(status);
      const memberOrders = allOrders.filter(o => o.memberId === member.id);
      return res.json(memberOrders);
    }
    
    // Admin/staff see all orders
    const orders = await storage.getOrders(status);
    res.json(orders);
  });

  app.patch(api.orders.approve.path, requireAdmin, async (req, res) => {
    const id = Number(req.params.id);
    const order = await storage.approveOrder(id);
    res.json(order);
  });

  app.delete(api.orders.reject.path, requireAdmin, async (req, res) => {
    const id = Number(req.params.id);
    await storage.deleteOrder(id);
    res.json({ message: "Order rejected" });
  });

  // === WORKOUTS ===
  app.get(api.workouts.list.path, requireAuth, async (req, res) => {
     let memberId = req.query.memberId ? Number(req.query.memberId) : undefined;
     if (req.user!.role === 'member') {
        const myProfile = await storage.getMemberByUserId(req.user!.id);
        memberId = myProfile!.id;
     }
     const workouts = await storage.getWorkouts(memberId, req.query.date as string);
     res.json(workouts);
  });

  app.post(api.workouts.assign.path, requireStaff, async (req, res) => {
    const input = api.workouts.assign.input.parse(req.body);
    const workout = await storage.createWorkout({ ...input, assignedBy: req.user!.id });
    res.status(201).json(workout);
  });

  app.patch(api.workouts.complete.path, requireAuth, async (req, res) => {
    const id = Number(req.params.id);
    const feedback = req.body.feedback;
    const updated = await storage.completeWorkout(id, feedback);
    res.json(updated);
  });

  app.delete(api.workouts.delete.path, requireStaff, async (req, res) => {
    const id = Number(req.params.id);
    await storage.deleteWorkout(id);
    res.json({ message: "Deleted" });
  });

  // === DIETS ===
  app.get(api.diets.list.path, requireAuth, async (req, res) => {
    let memberId = req.query.memberId ? Number(req.query.memberId) : undefined;
    if (req.user!.role === 'member') {
      const myProfile = await storage.getMemberByUserId(req.user!.id);
      memberId = myProfile!.id;
    }
    const dietList = await storage.getDiets(memberId);
    res.json(dietList);
  });

  app.post(api.diets.assign.path, requireStaff, async (req, res) => {
    const input = api.diets.assign.input.parse(req.body);
    const diet = await storage.createDiet({ ...input, assignedBy: req.user!.id });
    res.status(201).json(diet);
  });

  // === SETTINGS ===
  app.get(api.settings.list.path, requireAdmin, async (req, res) => {
    const all = await storage.getSettings();
    res.json(all);
  });

  app.get(api.settings.get.path, requireAuth, async (req, res) => {
    const setting = await storage.getSetting(req.params.key);
    if (!setting) return res.status(404).json({ message: "Setting not found" });
    res.json(setting);
  });

  app.put(api.settings.update.path, requireAdmin, async (req, res) => {
    const { value } = req.body;
    const updated = await storage.setSetting(req.params.key, value);
    res.json(updated);
  });

  // === MEMBER SELF-SERVICE (Profile) ===
  app.get(api.profile.me.path, requireAuth, async (req, res) => {
    const member = await storage.getMemberByUserId(req.user!.id);
    if (!member) return res.status(404).json({ message: "Profile not found" });
    res.json(member);
  });

  app.post(api.profile.checkInSelf.path, requireAuth, async (req, res) => {
    try {
      const member = await storage.getMemberByUserId(req.user!.id);
      if (!member) return res.status(400).json({ message: "Profile not found" });
      if (member.status !== 'active') return res.status(400).json({ message: "Membership inactive" });
      
      // Check capacity
      const capacitySetting = await storage.getSetting('gym_capacity');
      const capacity = capacitySetting ? parseInt(capacitySetting.value) : 50;
      const live = await storage.getLiveAttendance();
      if (live.length >= capacity) {
        return res.status(400).json({ message: "Gym at full capacity" });
      }
      
      // Check if already checked in
      const status = await storage.isCheckedIn(member.id);
      if (status.isCheckedIn) {
        return res.status(400).json({ message: "Already checked in" });
      }
      
      const entry = await storage.checkIn(member.id);
      res.json(entry);
    } catch (e) {
      res.status(400).json({ message: (e as Error).message });
    }
  });

  app.post(api.profile.checkOutSelf.path, requireAuth, async (req, res) => {
    try {
      const member = await storage.getMemberByUserId(req.user!.id);
      if (!member) return res.status(400).json({ message: "Profile not found" });
      
      const entry = await storage.checkOut(member.id);
      res.json(entry);
    } catch (e) {
      res.status(400).json({ message: (e as Error).message });
    }
  });

  app.get(api.profile.isCheckedIn.path, requireAuth, async (req, res) => {
    const member = await storage.getMemberByUserId(req.user!.id);
    if (!member) return res.json({ isCheckedIn: false, attendance: null });
    const status = await storage.isCheckedIn(member.id);
    res.json(status);
  });

  app.get(api.profile.myAttendance.path, requireAuth, async (req, res) => {
    const member = await storage.getMemberByUserId(req.user!.id);
    if (!member) return res.json([]);
    const history = await storage.getAttendanceHistory(member.id);
    res.json(history);
  });

  app.get(api.profile.myWorkouts.path, requireAuth, async (req, res) => {
    const member = await storage.getMemberByUserId(req.user!.id);
    if (!member) return res.json([]);
    const list = await storage.getWorkouts(member.id);
    res.json(list);
  });

  app.get(api.profile.myPayments.path, requireAuth, async (req, res) => {
    const member = await storage.getMemberByUserId(req.user!.id);
    if (!member) return res.json([]);
    const list = await storage.getPayments(member.id);
    res.json(list);
  });

  // === AI DIET COACH ===
  app.post("/api/ai/diet-plan", requireAuth, async (req, res) => {
    try {
      const { prompt } = req.body;

      if (!prompt) {
        return res.status(400).json({ error: "Prompt is required" });
      }

      // Using a simple AI response generation
      // In production, integrate with OpenAI, Anthropic, or similar
      const dietPlan = generateDietPlan(prompt);

      res.json({ plan: dietPlan });
    } catch (error: any) {
      console.error("Diet plan generation error:", error);
      res.status(500).json({ error: "Failed to generate diet plan" });
    }
  });

  // Seed Database on startup
  await seedDatabase();

  return httpServer;
}

// Helper function to generate AI diet plan (can be replaced with actual AI API)
function generateDietPlan(prompt: string): string {
  // This is a template-based response generator
  // In production, you would call OpenAI API or similar service
  const lines = prompt.split('\n');
  
  let response = "🥗 PERSONALIZED NUTRITION PLAN\n";
  response += "=" .repeat(50) + "\n\n";

  // Parse the prompt to extract info
  const getName = () => {
    const match = prompt.match(/Name:\s*(.+?)\n/);
    return match ? match[1].trim() : "Member";
  };

  const getGoal = () => {
    const match = prompt.match(/Fitness Goal:\s*(.+?)\n/);
    return match ? match[1].trim() : "General Fitness";
  };

  const getRestrictions = () => {
    const match = prompt.match(/Dietary Restrictions:\s*(.+?)\n/);
    return match ? match[1].trim() : "None";
  };

  const name = getName();
  const goal = getGoal();
  const restrictions = getRestrictions();

  response += `👤 Client: ${name}\n`;
  response += `🎯 Goal: ${goal}\n`;
  response += `🚫 Restrictions: ${restrictions}\n\n`;

  response += "📊 DAILY NUTRITION GUIDELINES\n";
  response += "-" .repeat(50) + "\n";
  response += "Calories: 2,000-2,500 kcal/day\n";
  response += "Protein: 150-180g/day (30%)\n";
  response += "Carbohydrates: 250-300g/day (45%)\n";
  response += "Fats: 65-85g/day (25%)\n\n";

  response += "🍽️ SAMPLE DAILY MEAL PLAN\n";
  response += "-" .repeat(50) + "\n";
  response += "BREAKFAST (7:00 AM)\n";
  response += "• Oatmeal with berries and almonds\n";
  response += "• 1 medium banana\n";
  response += "• Protein powder smoothie\n\n";

  response += "MID-MORNING SNACK (10:00 AM)\n";
  response += "• Greek yogurt with granola\n";
  response += "• Apple with almond butter\n\n";

  response += "LUNCH (1:00 PM)\n";
  response += "• Grilled chicken breast (150g)\n";
  response += "• Brown rice or sweet potato\n";
  response += "• Mixed vegetables (broccoli, carrots)\n";
  response += "• Olive oil dressing\n\n";

  response += "PRE-WORKOUT SNACK (4:00 PM)\n";
  response += "• Rice cakes with honey\n";
  response += "• Banana\n\n";

  response += "DINNER (7:00 PM)\n";
  response += "• Grilled salmon or lean beef (150g)\n";
  response += "• Quinoa or pasta\n";
  response += "• Steamed vegetables\n";
  response += "• Avocado slices\n\n";

  response += "EVENING SNACK (Optional)\n";
  response += "• Casein protein shake or cottage cheese\n";
  response += "• Berries\n\n";

  response += "💧 HYDRATION\n";
  response += "-" .repeat(50) + "\n";
  response += "Drink 3-4 liters of water daily\n";
  response += "• 500ml upon waking\n";
  response += "• 500ml with each meal\n";
  response += "• 500-750ml during workout\n";
  response += "• 500ml before bed\n\n";

  response += "✅ FOODS TO INCLUDE\n";
  response += "-" .repeat(50) + "\n";
  response += "Proteins: Chicken, turkey, fish, eggs, Greek yogurt, cottage cheese\n";
  response += "Carbs: Oats, brown rice, sweet potato, quinoa, whole wheat bread\n";
  response += "Vegetables: Broccoli, spinach, carrots, bell peppers, Brussels sprouts\n";
  response += "Fruits: Bananas, berries, apples, oranges\n";
  response += "Healthy Fats: Avocado, almonds, olive oil, fatty fish\n\n";

  response += "❌ FOODS TO AVOID\n";
  response += "-" .repeat(50) + "\n";
  response += "• Processed foods and fast food\n";
  response += "• Sugary drinks and energy drinks\n";
  response += "• Excessive alcohol\n";
  response += "• Fried foods\n";
  response += "• Refined carbohydrates\n";
  response += "• Trans fats and saturated fats\n\n";

  response += "⏰ MEAL TIMING\n";
  response += "-" .repeat(50) + "\n";
  response += "• Eat every 3-4 hours\n";
  response += "• Breakfast within 1 hour of waking\n";
  response += "• Pre-workout meal 1.5-2 hours before\n";
  response += "• Post-workout meal within 30-60 minutes\n";
  response += "• Final meal 2-3 hours before bed\n\n";

  response += "💡 SUCCESS TIPS\n";
  response += "-" .repeat(50) + "\n";
  response += "1. Meal prep on Sundays for the week\n";
  response += "2. Use a food scale to track portions\n";
  response += "3. Track macros using MyFitnessPal\n";
  response += "4. Stay consistent for 4-6 weeks\n";
  response += "5. Adjust based on progress\n";
  response += "6. Don't go too extreme on deficits/surpluses\n";
  response += "7. Quality sleep is important for recovery\n";
  response += "8. Review and adjust every 2 weeks\n\n";

  response += "📈 EXPECTED RESULTS\n";
  response += "-" .repeat(50) + "\n";
  response += "Week 1-2: Adjustment phase, energy levels improve\n";
  response += "Week 3-4: Noticeable body composition changes\n";
  response += "Week 5-8: Significant results in strength and appearance\n\n";

  response += "⚠️ IMPORTANT NOTES\n";
  response += "-" .repeat(50) + "\n";
  response += "• Consult with a nutritionist for personalized advice\n";
  response += "• Monitor how your body responds\n";
  response += "• Adjust portions based on activity level\n";
  response += "• This plan is a general guideline\n";
  response += "• Individual needs may vary\n\n";

  response += "Generated: " + new Date().toLocaleString() + "\n";

  return response;
}

// Helper to seed data
export async function seedDatabase() {
  const existingUsers = await storage.getUserByUsername("admin");
  if (!existingUsers) {
    console.log("Seeding database...");
    
    // Create Admin
    const hashedPassword = await (storage as any).hashPassword("admin123");
    
    // Create user and member profile for admin
    await storage.createMember(
      {
        username: "admin",
        password: hashedPassword,
        role: "admin",
        isActive: true
      },
      {
        fullName: "System Admin",
        gender: "other",
        monthlyFee: "0",
        joinDate: new Date().toISOString(),
        nextDueDate: new Date().toISOString(),
        status: "active",
        planType: "vip"
      }
    );

    // Create a Trainer
    const trainerPass = await (storage as any).hashPassword("trainer123");
    await storage.createMember(
      {
        username: "trainer",
        password: trainerPass,
        role: "trainer",
        isActive: true
      },
      {
        fullName: "John Trainer",
        gender: "male",
        monthlyFee: "0",
        joinDate: new Date().toISOString(),
        nextDueDate: new Date().toISOString(),
        status: "active",
        planType: "classic"
      }
    );

    // Create some products
    await storage.createProduct({
      name: "Whey Protein",
      category: "Supplements",
      price: "49.99",
      stock: 100,
      active: true,
      image: "https://images.unsplash.com/photo-1593095948071-474c5cc2989d?auto=format&fit=crop&q=80&w=1000"
    });

    await storage.createProduct({
      name: "Gym T-Shirt",
      category: "Apparel",
      price: "24.99",
      stock: 50,
      active: true,
      image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&q=80&w=1000"
    });

    await storage.createProduct({
      name: "Pre-Workout Energy",
      category: "Supplements",
      price: "34.99",
      stock: 75,
      active: true,
      image: null
    });

    // Create default settings
    await storage.setSetting('gym_capacity', '50');
    await storage.setSetting('gym_name', 'FitZone Gym');
    await storage.setSetting('monthly_fee_classic', '29.99');
    await storage.setSetting('monthly_fee_premium', '49.99');
    await storage.setSetting('monthly_fee_vip', '79.99');
    await storage.setSetting('grace_period_days', '5');
    await storage.setSetting('enable_store', 'true');
    await storage.setSetting('enable_workouts', 'true');
    await storage.setSetting('enable_diets', 'true');

    // Create a sample member
    const memberPass = await (storage as any).hashPassword("member123");
    await storage.createMember(
      {
        username: "john",
        password: memberPass,
        role: "member",
        isActive: true
      },
      {
        fullName: "John Member",
        email: "john@example.com",
        phone: "555-1234",
        gender: "male",
        monthlyFee: "29.99",
        joinDate: new Date().toISOString(),
        nextDueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        status: "active",
        planType: "classic"
      }
    );

    console.log("Database seeded!");
  }
}
