# NutriPlan - Automated Meal Planning Platform

## Overview

NutriPlan is a mobile-first web application providing automated, personalized meal plans for weight loss clients. It serves patients seeking affordable nutrition guidance and nutritionists managing their practice. Built with Next.js and Supabase, the platform offers a scalable, low-ticket solution for nutrition services, addressing patient non-adherence to high-cost plans with an accessible alternative priced between R$29-69 per plan.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework:** Next.js 15+ with React Server Components (RSC), App Router, and TypeScript (v5.9.3). Employs a mobile-first responsive design.

**UI Component Library:** shadcn/ui with Radix UI primitives, utilizing Tailwind CSS for styling with a customized theme (golden #9c7d17 and green #557432) and OKLCH color variables. Supports light/dark themes via next-themes.

**State Management:** React hooks and server actions for client-side interactions and server-side data fetching/mutations. Form handling uses react-hook-form and zod validation.

### Backend Architecture

**Runtime:** Next.js API Routes (serverless functions) providing RESTful API endpoints for server-side business logic. Password hashing uses bcryptjs.

**Authentication Strategy:** Custom implementation for patients (CPF-based) and administrators (email-based) with JWT-signed sessions and bcrypt hashing. Middleware protects client and admin routes.

**Data Layer:** Drizzle ORM with PostgreSQL (pg driver) for type-safe database interactions. Connected via SUPABASE_DB_URL environment variable.

### Database Design

**Provider:** Supabase (PostgreSQL).

**Core Tables:**
- **patients**: Client accounts with unique CPF, encrypted passwords, and JSON for quiz responses.
- **admins**: Nutritionist accounts with professional credentials.
- **meal_plans**: Personalized nutrition plans linked to patients, with status tracking and flexible JSON storage for plan data.
- **recipes**: Reusable recipe content including ingredients, preparation, and nutritional metadata.
- **password_reset_tokens**: Time-limited tokens for password recovery (1-hour expiration), linked to patients with used flag tracking.

**Design Patterns:** Uses JSON columns for flexible data, status enums, timestamp tracking, and UUID primary keys.

### Application Structure

**Route Organization:** Separated into public (`/`), patient (`/cliente/*`), administrator (`/admin/*`), and setup (`/setup`) portals. API endpoints are under `/api`.

**Navigation Components:** Role-based navigation (`ClientNav`, `AdminNav`) with active state indicators.

### Security Considerations

**Password Management:** Bcrypt hashing with salting (10 rounds) and no plain-text storage. Service role key is separate from client keys.

**Data Access:** Utilizes Supabase Row Level Security (RLS) and environment variable separation for keys. Admin service role for privileged operations.

**Initialization Flow:** Setup wizard prevents duplicate admin creation and generates seed data.

### Meal Plan Expiration Notifications

**Component:** `components/plan-expiration-alert.tsx` - Reusable component for expiration alerts.

**Notification Logic (based on end_date):**
- **D-5 (5 days before):** Info alert with value, mentioning upcoming form availability (detail page only)
- **D-2 (2 days before):** Warning with form link, quick update available (detail page only)
- **D-0 (expires today):** Urgent alert to fill form (both listing and detail pages)
- **D>0 (expired):** Expired alert with payment/renewal link (listing page only)

**Display Locations:**
- Listing page (`/cliente/planos`): D-0, D>0 alerts + expiration badges
- Detail page (`/cliente/planos/[id]`): D-5, D-2, D-0 alerts

## External Dependencies

### Database & Backend Services

**Supabase** (pcqteeblywfqlrbnqrjd.supabase.co): PostgreSQL database, real-time subscriptions, Row Level Security, and authentication.

### Environment Variables Management

**AWS Systems Manager Parameter Store**: Centralized secrets management for production environments. Development uses local `.env.local`. Configured for automatic retrieval in production with required AWS credentials (`AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`) and a parameter prefix (`/nutriplan/`).

### Payment Integration (Planned)

**Asaas**: Brazilian payment gateway, prepared for integration but not yet implemented.

### UI & Styling

**Radix UI**: Accessible component primitives for UI elements, dialogs, and notifications.

**Tailwind CSS**: Utility-first styling with custom design tokens, OKLCH color space, and tw-animate-css.

**Lucide React**: Consistent iconography library.

### Development Tools

**Vercel Analytics**: Integrated for production monitoring and performance insights.

**TypeScript**: Strict mode enabled with path aliases.

### Font & Typography

**Inter** (Google Fonts): Primary application font.