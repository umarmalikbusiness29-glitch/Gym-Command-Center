import { db } from "./db";
import { 
  users, members, attendance, payments, workouts, diets, products, orders, discipline, settings,
  type User, type InsertUser, type InsertMember, type Payment, type Product, type InsertProduct,
  type Workout, type InsertWorkout, type Attendance, type InsertPayment, type Order, type Diet, type InsertDiet
} from "@shared/schema";
import { eq, and, desc, sql, gte, lt } from "drizzle-orm";

import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  sessionStore: session.Store;
  // Users & Auth
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Members
  getMember(id: number): Promise<(typeof members.$inferSelect & { user: User }) | undefined>;
  getMemberByUserId(userId: number): Promise<(typeof members.$inferSelect & { user: User }) | undefined>;
  getMembers(): Promise<(typeof members.$inferSelect & { user: User })[]>;
  createMember(user: InsertUser, member: Omit<InsertMember, "userId">): Promise<typeof members.$inferSelect>;
  updateMember(id: number, member: Partial<typeof members.$inferSelect>): Promise<typeof members.$inferSelect>;

  // Attendance
  checkIn(memberId: number): Promise<Attendance>;
  checkOut(memberId: number): Promise<Attendance>;
  getAttendanceHistory(memberId?: number): Promise<Attendance[]>;
  getLiveAttendance(): Promise<Attendance[]>;

  // Payments
  getPayments(memberId?: number): Promise<Payment[]>;
  createPayment(payment: InsertPayment): Promise<Payment>;
  getPaymentStats(): Promise<{ totalRevenue: number, pendingDues: number, overdueCount: number }>;

  // Products & Orders
  getProducts(): Promise<Product[]>;
  createProduct(product: InsertProduct): Promise<Product>;
  createOrder(order: any): Promise<Order>; // Simplified type for brevity in storage interface

  // Workouts
  getWorkouts(memberId?: number, date?: string): Promise<Workout[]>;
  createWorkout(workout: InsertWorkout): Promise<Workout>;
  completeWorkout(id: number, feedback?: string): Promise<Workout>;
  deleteWorkout(id: number): Promise<void>;

  // Diets
  getDiets(memberId?: number): Promise<Diet[]>;
  createDiet(diet: InsertDiet): Promise<Diet>;

  // Settings
  getSettings(): Promise<{ key: string; value: string }[]>;
  getSetting(key: string): Promise<{ key: string; value: string } | undefined>;
  setSetting(key: string, value: string): Promise<{ key: string; value: string }>;

  // Check status
  isCheckedIn(memberId: number): Promise<{ isCheckedIn: boolean; attendance: Attendance | null }>;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true,
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getMember(id: number) {
    const result = await db.select().from(members)
      .innerJoin(users, eq(members.userId, users.id))
      .where(eq(members.id, id));
    if (result.length === 0) return undefined;
    return { ...result[0].members, user: result[0].users };
  }

  async getMemberByUserId(userId: number) {
    const result = await db.select().from(members)
      .innerJoin(users, eq(members.userId, users.id))
      .where(eq(members.userId, userId));
    if (result.length === 0) return undefined;
    return { ...result[0].members, user: result[0].users };
  }

  async getMembers() {
    const rows = await db.select().from(members)
      .innerJoin(users, eq(members.userId, users.id));
    return rows.map(r => ({ ...r.members, user: r.users }));
  }

  async createMember(user: InsertUser, memberData: Omit<InsertMember, "userId">) {
    // Transactional creation of user + member profile
    return await db.transaction(async (tx) => {
      const [newUser] = await tx.insert(users).values(user).returning();
      const [newMember] = await tx.insert(members).values({
        ...memberData,
        userId: newUser.id,
      }).returning();
      return newMember;
    });
  }

  async updateMember(id: number, updates: Partial<typeof members.$inferSelect>) {
    const [updated] = await db.update(members)
      .set(updates)
      .where(eq(members.id, id))
      .returning();
    return updated;
  }

  async checkIn(memberId: number): Promise<Attendance> {
    // Auto-checkout any open sessions for this member first? Or just forbid? 
    // Simplified: Check if already checked in today without checkout
    const today = new Date().toISOString().split('T')[0];
    const [entry] = await db.insert(attendance).values({
      memberId,
      date: today,
      checkInTime: new Date(),
    }).returning();
    return entry;
  }

  async checkOut(memberId: number): Promise<Attendance> {
    const today = new Date().toISOString().split('T')[0];
    // Find latest open check-in
    const [lastEntry] = await db.select().from(attendance)
      .where(and(
        eq(attendance.memberId, memberId),
        eq(attendance.date, today)
        // isnull(checkOutTime) - handled by application logic query often, 
        // but here we just grab the last one for simplicity in this MVP
      ))
      .orderBy(desc(attendance.checkInTime))
      .limit(1);
    
    if (lastEntry) {
      const [updated] = await db.update(attendance)
        .set({ checkOutTime: new Date() })
        .where(eq(attendance.id, lastEntry.id))
        .returning();
      return updated;
    }
    throw new Error("No active check-in found");
  }

  async getAttendanceHistory(memberId?: number): Promise<Attendance[]> {
    if (memberId) {
      return await db.select().from(attendance).where(eq(attendance.memberId, memberId)).orderBy(desc(attendance.date));
    }
    return await db.select().from(attendance).orderBy(desc(attendance.date));
  }

  async getLiveAttendance(): Promise<Attendance[]> {
    const today = new Date().toISOString().split('T')[0];
    // Get all check-ins today where checkOutTime is null
    // Note: In a real app we'd filter strictly for checkOutTime IS NULL
    // Drizzle: isNull(attendance.checkOutTime)
    // For now we'll fetch today's and filter in memory if complex or use sql
    return await db.select().from(attendance)
      .where(and(
        eq(attendance.date, today),
        sql`${attendance.checkOutTime} IS NULL`
      ));
  }

  async getPayments(memberId?: number): Promise<Payment[]> {
    if (memberId) {
      return await db.select().from(payments).where(eq(payments.memberId, memberId)).orderBy(desc(payments.id));
    }
    return await db.select().from(payments).orderBy(desc(payments.id));
  }

  async createPayment(payment: InsertPayment): Promise<Payment> {
    const [newPayment] = await db.insert(payments).values(payment).returning();
    return newPayment;
  }

  async getPaymentStats() {
    // Simplified aggregates
    const all = await db.select().from(payments);
    const revenue = all
      .filter(p => p.status === 'paid')
      .reduce((sum, p) => sum + Number(p.amount), 0);
    const pending = all
      .filter(p => p.status === 'pending')
      .reduce((sum, p) => sum + Number(p.amount), 0);
    const overdue = all.filter(p => p.status === 'overdue').length;
    return { totalRevenue: revenue, pendingDues: pending, overdueCount: overdue };
  }

  async getProducts(): Promise<Product[]> {
    return await db.select().from(products).where(eq(products.active, true));
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const [newProduct] = await db.insert(products).values(product).returning();
    return newProduct;
  }

  async createOrder(orderData: any): Promise<Order> {
    return await db.transaction(async (tx) => {
      // Create order
      const [order] = await tx.insert(orders).values({
        memberId: orderData.memberId,
        totalAmount: "0", // calc later
        items: orderData.items,
        status: "completed"
      }).returning();
      
      // Update stock (simplified, loop)
      let total = 0;
      for (const item of orderData.items) {
        const [prod] = await tx.select().from(products).where(eq(products.id, item.productId));
        if (prod) {
           total += Number(prod.price) * item.quantity;
           await tx.update(products)
             .set({ stock: prod.stock - item.quantity })
             .where(eq(products.id, item.productId));
        }
      }
      
      // Update total
      const [finalOrder] = await tx.update(orders)
        .set({ totalAmount: total.toString() })
        .where(eq(orders.id, order.id))
        .returning();
        
      // Create payment record
      await tx.insert(payments).values({
        memberId: orderData.memberId,
        amount: total.toString(),
        type: "product_purchase",
        status: "paid",
        description: `Order #${order.id}`,
        paidDate: new Date(),
      });

      return finalOrder;
    });
  }

  async getWorkouts(memberId?: number, date?: string): Promise<Workout[]> {
    let query = db.select().from(workouts);
    const filters = [];
    if (memberId) filters.push(eq(workouts.memberId, memberId));
    if (date) filters.push(eq(workouts.date, date));
    
    if (filters.length > 0) {
      // @ts-ignore - drizzle array issue with 1 element
      return await query.where(and(...filters));
    }
    return await query;
  }

  async createWorkout(workout: InsertWorkout): Promise<Workout> {
    const [newWorkout] = await db.insert(workouts).values(workout).returning();
    return newWorkout;
  }

  async completeWorkout(id: number, feedback?: string): Promise<Workout> {
    const [updated] = await db.update(workouts)
      .set({ completed: true, feedback })
      .where(eq(workouts.id, id))
      .returning();
    return updated;
  }

  async deleteWorkout(id: number): Promise<void> {
    await db.delete(workouts).where(eq(workouts.id, id));
  }

  async getDiets(memberId?: number): Promise<Diet[]> {
    if (memberId) {
      return await db.select().from(diets).where(eq(diets.memberId, memberId)).orderBy(desc(diets.date));
    }
    return await db.select().from(diets).orderBy(desc(diets.date));
  }

  async createDiet(diet: InsertDiet): Promise<Diet> {
    const [newDiet] = await db.insert(diets).values(diet).returning();
    return newDiet;
  }

  async getSettings(): Promise<{ key: string; value: string }[]> {
    return await db.select({ key: settings.key, value: settings.value }).from(settings);
  }

  async getSetting(key: string): Promise<{ key: string; value: string } | undefined> {
    const [setting] = await db.select({ key: settings.key, value: settings.value })
      .from(settings).where(eq(settings.key, key));
    return setting;
  }

  async setSetting(key: string, value: string): Promise<{ key: string; value: string }> {
    const existing = await this.getSetting(key);
    if (existing) {
      await db.update(settings).set({ value }).where(eq(settings.key, key));
    } else {
      await db.insert(settings).values({ key, value });
    }
    return { key, value };
  }

  async isCheckedIn(memberId: number): Promise<{ isCheckedIn: boolean; attendance: Attendance | null }> {
    const today = new Date().toISOString().split('T')[0];
    const [entry] = await db.select().from(attendance)
      .where(and(
        eq(attendance.memberId, memberId),
        eq(attendance.date, today),
        sql`${attendance.checkOutTime} IS NULL`
      ))
      .orderBy(desc(attendance.checkInTime))
      .limit(1);
    return { isCheckedIn: !!entry, attendance: entry || null };
  }
}

export const storage = new DatabaseStorage();
