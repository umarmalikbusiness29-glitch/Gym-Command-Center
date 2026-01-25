import { pgTable, text, serial, integer, boolean, timestamp, jsonb, decimal, date } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// === ENUMS ===
export const userRoles = ["admin", "trainer", "member"] as const;
export const planTypes = ["classic", "premium", "vip"] as const;
export const memberStatus = ["active", "frozen", "inactive"] as const;
export const paymentStatus = ["pending", "paid", "overdue"] as const;
export const paymentTypes = ["membership_fee", "product_purchase"] as const;
export const genderTypes = ["male", "female", "other"] as const;

// === TABLE DEFINITIONS ===

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role", { enum: userRoles }).notNull().default("member"),
  createdAt: timestamp("created_at").defaultNow(),
  isActive: boolean("is_active").default(true),
});

export const members = pgTable("members", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull().unique(),
  fullName: text("full_name").notNull(),
  email: text("email"),
  phone: text("phone"),
  gender: text("gender", { enum: genderTypes }).notNull(),
  planType: text("plan_type", { enum: planTypes }).notNull().default("classic"),
  monthlyFee: decimal("monthly_fee", { precision: 10, scale: 2 }).notNull(),
  joinDate: date("join_date").notNull(),
  nextDueDate: date("next_due_date").notNull(),
  gracePeriodDays: integer("grace_period_days").default(5),
  status: text("status", { enum: memberStatus }).notNull().default("active"),
  profileImage: text("profile_image"),
});

export const attendance = pgTable("attendance", {
  id: serial("id").primaryKey(),
  memberId: integer("member_id").references(() => members.id).notNull(),
  date: date("date").notNull(),
  checkInTime: timestamp("check_in_time").defaultNow(),
  checkOutTime: timestamp("check_out_time"),
});

export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  memberId: integer("member_id").references(() => members.id).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  type: text("type", { enum: paymentTypes }).notNull(),
  status: text("status", { enum: paymentStatus }).notNull().default("pending"),
  dueDate: date("due_date"),
  paidDate: timestamp("paid_date"),
  description: text("description"),
});

export const workouts = pgTable("workouts", {
  id: serial("id").primaryKey(),
  memberId: integer("member_id").references(() => members.id).notNull(),
  assignedBy: integer("assigned_by").references(() => users.id), // Trainer/Admin
  date: date("date").notNull(),
  content: jsonb("content").notNull(), // Structure: { exercises: [{ name, sets, reps }] }
  completed: boolean("completed").default(false),
  feedback: text("feedback"),
});

export const diets = pgTable("diets", {
  id: serial("id").primaryKey(),
  memberId: integer("member_id").references(() => members.id).notNull(),
  assignedBy: integer("assigned_by").references(() => users.id),
  date: date("date").notNull(),
  content: jsonb("content").notNull(), // Structure: { meals: [{ type, items, calories }] }
  completed: boolean("completed").default(false),
});

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  stock: integer("stock").notNull().default(0),
  image: text("image"),
  active: boolean("active").default(true),
});

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  memberId: integer("member_id").references(() => members.id).notNull(),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  status: text("status").notNull().default("pending"), // pending, completed
  createdAt: timestamp("created_at").defaultNow(),
  items: jsonb("items").notNull(), // [{ productId, quantity, price }]
});

export const discipline = pgTable("discipline", {
  id: serial("id").primaryKey(),
  memberId: integer("member_id").references(() => members.id).notNull(),
  type: text("type").notNull(), // warning, motivation
  message: text("message").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  viewed: boolean("viewed").default(false),
});

export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(), // JSON string or simple value
});

// === RELATIONS ===
export const membersRelations = relations(members, ({ one, many }) => ({
  user: one(users, {
    fields: [members.userId],
    references: [users.id],
  }),
  attendance: many(attendance),
  payments: many(payments),
  workouts: many(workouts),
  diets: many(diets),
  orders: many(orders),
}));

export const usersRelations = relations(users, ({ one }) => ({
  memberProfile: one(members, {
    fields: [users.id],
    references: [members.userId],
  }),
}));

// === INSERTS & TYPES ===
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertMemberSchema = createInsertSchema(members).omit({ id: true });
export const insertAttendanceSchema = createInsertSchema(attendance).omit({ id: true, checkInTime: true, checkOutTime: true });
export const insertPaymentSchema = createInsertSchema(payments).omit({ id: true, paidDate: true });
export const insertWorkoutSchema = createInsertSchema(workouts).omit({ id: true });
export const insertDietSchema = createInsertSchema(diets).omit({ id: true });
export const insertProductSchema = createInsertSchema(products).omit({ id: true });
export const insertOrderSchema = createInsertSchema(orders).omit({ id: true, createdAt: true });
export const insertDisciplineSchema = createInsertSchema(discipline).omit({ id: true, createdAt: true });

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Member = typeof members.$inferSelect;
export type InsertMember = z.infer<typeof insertMemberSchema>;
export type Payment = typeof payments.$inferSelect;
export type Product = typeof products.$inferSelect;
export type Attendance = typeof attendance.$inferSelect;
export type Workout = typeof workouts.$inferSelect;
export type Diet = typeof diets.$inferSelect;
export type Order = typeof orders.$inferSelect;

// === API DTOs ===
export type CreateMemberRequest = InsertUser & Omit<InsertMember, "userId">; // For creating user + member profile together
