import { z } from 'zod';
import { 
  insertUserSchema, 
  insertMemberSchema, 
  insertPaymentSchema, 
  insertProductSchema,
  insertWorkoutSchema,
  insertDietSchema,
  users, members, payments, products, attendance, workouts, diets, orders, discipline
} from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
  unauthorized: z.object({
    message: z.string(),
  }),
};

// Simplified schemas for API usage
const memberWithProfileSchema = z.custom<typeof members.$inferSelect & { user: typeof users.$inferSelect }>();

export const api = {
  auth: {
    login: {
      method: 'POST' as const,
      path: '/api/login',
      input: z.object({
        username: z.string(),
        password: z.string(),
      }),
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        401: errorSchemas.unauthorized,
      },
    },
    logout: {
      method: 'POST' as const,
      path: '/api/logout',
      responses: {
        200: z.object({ message: z.string() }),
      },
    },
    me: {
      method: 'GET' as const,
      path: '/api/user',
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        401: errorSchemas.unauthorized,
      },
    },
  },
  members: {
    list: {
      method: 'GET' as const,
      path: '/api/members',
      responses: {
        200: z.array(memberWithProfileSchema),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/members/:id',
      responses: {
        200: memberWithProfileSchema,
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/members',
      input: z.intersection(
        insertUserSchema,
        insertMemberSchema.omit({ userId: true })
      ),
      responses: {
        201: memberWithProfileSchema,
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/members/:id',
      input: insertMemberSchema.partial().extend({
        username: z.string().min(3).max(50).optional(),
        newPassword: z.string().min(6).optional(),
      }),
      responses: {
        200: memberWithProfileSchema,
        404: errorSchemas.notFound,
      },
    },
    freeze: {
      method: 'POST' as const,
      path: '/api/members/:id/freeze',
      responses: {
        200: memberWithProfileSchema,
      },
    },
  },
  attendance: {
    checkIn: {
      method: 'POST' as const,
      path: '/api/attendance/check-in',
      input: z.object({ memberId: z.number() }),
      responses: {
        200: z.custom<typeof attendance.$inferSelect>(),
        400: z.object({ message: z.string() }), // Capacity reached or already checked in
      },
    },
    checkOut: {
      method: 'POST' as const,
      path: '/api/attendance/check-out',
      input: z.object({ memberId: z.number() }),
      responses: {
        200: z.custom<typeof attendance.$inferSelect>(),
      },
    },
    history: {
      method: 'GET' as const,
      path: '/api/attendance/history',
      input: z.object({ memberId: z.coerce.number().optional() }).optional(),
      responses: {
        200: z.array(z.custom<typeof attendance.$inferSelect>()),
      },
    },
    live: {
      method: 'GET' as const,
      path: '/api/attendance/live',
      responses: {
        200: z.object({
          count: z.number(),
          capacity: z.number(),
          occupancyRate: z.number(),
          crowdStatus: z.string(), // Low, Moderate, High, Full
          attendees: z.array(z.custom<typeof members.$inferSelect>()),
        }),
      },
    },
  },
  payments: {
    list: {
      method: 'GET' as const,
      path: '/api/payments',
      input: z.object({ memberId: z.coerce.number().optional(), status: z.string().optional() }).optional(),
      responses: {
        200: z.array(z.custom<typeof payments.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/payments',
      input: insertPaymentSchema,
      responses: {
        201: z.custom<typeof payments.$inferSelect>(),
      },
    },
    stats: {
      method: 'GET' as const,
      path: '/api/payments/stats',
      responses: {
        200: z.object({
          totalRevenue: z.number(),
          pendingDues: z.number(),
          overdueCount: z.number(),
        }),
      },
    },
  },
  products: {
    list: {
      method: 'GET' as const,
      path: '/api/products',
      responses: {
        200: z.array(z.custom<typeof products.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/products',
      input: insertProductSchema,
      responses: {
        201: z.custom<typeof products.$inferSelect>(),
      },
    },
    purchase: {
      method: 'POST' as const,
      path: '/api/orders',
      input: z.object({
        memberId: z.number(),
        items: z.array(z.object({
          productId: z.number(),
          quantity: z.number(),
        })),
      }),
      responses: {
        201: z.custom<typeof orders.$inferSelect>(),
      },
    },
  },
  orders: {
    list: {
      method: 'GET' as const,
      path: '/api/orders',
      responses: {
        200: z.array(z.custom<typeof orders.$inferSelect>()),
      },
    },
    approve: {
      method: 'PATCH' as const,
      path: '/api/orders/:id/approve',
      responses: {
        200: z.custom<typeof orders.$inferSelect>(),
      },
    },
    reject: {
      method: 'DELETE' as const,
      path: '/api/orders/:id',
      responses: {
        200: z.object({ message: z.string() }),
      },
    },
  },
  workouts: {
    list: {
      method: 'GET' as const,
      path: '/api/workouts',
      input: z.object({ memberId: z.coerce.number().optional(), date: z.string().optional() }).optional(),
      responses: {
        200: z.array(z.custom<typeof workouts.$inferSelect>()),
      },
    },
    assign: {
      method: 'POST' as const,
      path: '/api/workouts',
      input: insertWorkoutSchema,
      responses: {
        201: z.custom<typeof workouts.$inferSelect>(),
      },
    },
    complete: {
      method: 'PATCH' as const,
      path: '/api/workouts/:id/complete',
      input: z.object({ feedback: z.string().optional() }),
      responses: {
        200: z.custom<typeof workouts.$inferSelect>(),
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/workouts/:id',
      responses: {
        200: z.object({ message: z.string() }),
      },
    },
  },
  settings: {
    list: {
      method: 'GET' as const,
      path: '/api/settings',
      responses: {
        200: z.array(z.object({ key: z.string(), value: z.string() })),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/settings/:key',
      responses: {
        200: z.object({ key: z.string(), value: z.string() }),
        404: errorSchemas.notFound,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/settings/:key',
      input: z.object({ value: z.string() }),
      responses: {
        200: z.object({ key: z.string(), value: z.string() }),
      },
    },
  },
  profile: {
    me: {
      method: 'GET' as const,
      path: '/api/profile/me',
      responses: {
        200: memberWithProfileSchema,
        404: errorSchemas.notFound,
      },
    },
    checkInSelf: {
      method: 'POST' as const,
      path: '/api/profile/check-in',
      responses: {
        200: z.custom<typeof attendance.$inferSelect>(),
        400: z.object({ message: z.string() }),
      },
    },
    checkOutSelf: {
      method: 'POST' as const,
      path: '/api/profile/check-out',
      responses: {
        200: z.custom<typeof attendance.$inferSelect>(),
        400: z.object({ message: z.string() }),
      },
    },
    myAttendance: {
      method: 'GET' as const,
      path: '/api/profile/attendance',
      responses: {
        200: z.array(z.custom<typeof attendance.$inferSelect>()),
      },
    },
    myWorkouts: {
      method: 'GET' as const,
      path: '/api/profile/workouts',
      responses: {
        200: z.array(z.custom<typeof workouts.$inferSelect>()),
      },
    },
    myPayments: {
      method: 'GET' as const,
      path: '/api/profile/payments',
      responses: {
        200: z.array(z.custom<typeof payments.$inferSelect>()),
      },
    },
    isCheckedIn: {
      method: 'GET' as const,
      path: '/api/profile/check-status',
      responses: {
        200: z.object({ isCheckedIn: z.boolean(), attendance: z.custom<typeof attendance.$inferSelect>().nullable() }),
      },
    },
  },
  diets: {
    list: {
      method: 'GET' as const,
      path: '/api/diets',
      input: z.object({ memberId: z.coerce.number().optional() }).optional(),
      responses: {
        200: z.array(z.custom<typeof diets.$inferSelect>()),
      },
    },
    assign: {
      method: 'POST' as const,
      path: '/api/diets',
      input: insertDietSchema,
      responses: {
        201: z.custom<typeof diets.$inferSelect>(),
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
