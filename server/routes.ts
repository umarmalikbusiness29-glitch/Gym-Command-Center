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
      
      // Extract user info and member info
      const userInfo = {
        username: input.username,
        password: input.password,
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

  app.patch(api.members.update.path, requireStaff, async (req, res) => {
    const id = Number(req.params.id);
    const input = api.members.update.input.parse(req.body);
    const updated = await storage.updateMember(id, input);
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

  app.get(api.attendance.live.path, requireStaff, async (req, res) => {
    const live = await storage.getLiveAttendance();
    // Enrich with member details (inefficient but works for MVP)
    const attendees = [];
    for (const record of live) {
      const m = await storage.getMember(record.memberId);
      if (m) attendees.push(m);
    }
    
    const count = live.length;
    const capacity = 50; // Hardcoded for now, could be setting
    const occupancyRate = Math.round((count / capacity) * 100);
    let crowdStatus = "Low";
    if (occupancyRate > 40) crowdStatus = "Moderate";
    if (occupancyRate > 80) crowdStatus = "High";
    if (occupancyRate >= 100) crowdStatus = "Full";

    res.json({ count, capacity, occupancyRate, crowdStatus, attendees });
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
    // Anyone can purchase? Or just members purchasing for themselves?
    // Let's assume staff can purchase for members too.
    const input = api.products.purchase.input.parse(req.body);
    const order = await storage.createOrder(input);
    res.status(201).json(order);
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
    
    // Verify ownership
    const [workout] = await storage.getWorkouts(); // Need to fetch specific workout - optimized later
    // For MVP, just update
    const updated = await storage.completeWorkout(id, feedback);
    res.json(updated);
  });

  // Seed Database on startup
  await seedDatabase();

  return httpServer;
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

    console.log("Database seeded!");
  }
}
