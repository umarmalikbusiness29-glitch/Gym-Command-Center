# Gym Management System

## Overview

A full-stack gym management application built with React frontend and Express backend. The system provides role-based access for admins, trainers, and members to manage memberships, attendance tracking, workout assignments, payment processing, and a point-of-sale store. The application features a modern dark theme UI with Tailwind CSS and shadcn/ui components.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack React Query for server state, local React state for UI
- **Styling**: Tailwind CSS with custom dark theme, shadcn/ui component library (New York style)
- **Forms**: React Hook Form with Zod validation
- **Charts**: Recharts for dashboard analytics
- **Build Tool**: Vite with path aliases (@/ for client/src, @shared/ for shared)

### Backend Architecture
- **Framework**: Express 5 on Node.js
- **API Pattern**: RESTful endpoints under /api prefix
- **Authentication**: Passport.js with local strategy, session-based auth using express-session
- **Session Storage**: PostgreSQL via connect-pg-simple
- **Password Security**: scrypt hashing with timing-safe comparison

### Data Storage
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM with drizzle-zod for schema validation
- **Schema Location**: shared/schema.ts (shared between frontend and backend)
- **Migrations**: Drizzle Kit with `db:push` command

### Key Design Decisions

1. **Monorepo Structure**: Client, server, and shared code in single repository with path aliases for clean imports.

2. **Type-Safe API Contract**: Routes defined in shared/routes.ts with Zod schemas for request/response validation, used by both frontend and backend.

3. **Role-Based Access Control**: Three roles (admin, trainer, member) with middleware functions (requireAuth, requireAdmin, requireStaff) protecting routes.

4. **Storage Abstraction**: IStorage interface in server/storage.ts abstracts all database operations, making it easier to test or swap implementations.

5. **Build Process**: Custom esbuild script bundles server with allowlisted dependencies for faster cold starts; Vite handles client build.

### Database Schema (Key Tables)
- **users**: Authentication with role-based access (admin/trainer/member)
- **members**: Member profiles linked to users, with plan types (classic/premium/vip)
- **attendance**: Check-in/check-out tracking
- **payments**: Membership fees and purchases with status tracking
- **workouts**: Assigned workout plans with exercises as JSONB
- **products/orders**: Store inventory and purchase tracking
- **settings**: Key-value configuration store

## External Dependencies

### Database
- PostgreSQL database (required, connection via DATABASE_URL environment variable)
- connect-pg-simple for session persistence

### UI Libraries
- @radix-ui/* primitives for accessible components
- shadcn/ui component collection
- Lucide React for icons
- Recharts for data visualization
- Embla Carousel for carousels
- Vaul for drawer components

### Authentication & Security
- Passport.js with passport-local strategy
- express-session for session management
- Node.js crypto module for password hashing

### Build & Development
- Vite with React plugin and Replit-specific plugins (error overlay, cartographer, dev banner)
- esbuild for server bundling
- TypeScript with strict mode

### Environment Variables Required
- `DATABASE_URL`: PostgreSQL connection string
- `SESSION_SECRET`: Secret for session encryption (has fallback default)