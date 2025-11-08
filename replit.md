# NutriPlan - Automated Meal Planning Platform

## Overview

NutriPlan is a mobile-first web application designed to provide automated, personalized meal plans for weight loss clients. The platform serves two distinct user types: patients seeking affordable nutrition guidance and nutritionists managing their practice. Built with Next.js and Supabase, the system offers a scalable, low-ticket solution for nutrition services.

The application addresses the problem of patient non-adherence to high-cost meal plans by providing an automated, accessible alternative priced between R$29-69 per plan.

## Recent Changes

**F2: Login Functionality (Completed - Nov 2025):**
- Implemented secure authentication with JWT-signed sessions using jose library
- Created login pages for patients (CPF-based) and administrators (email-based)
- Built password reset functionality for self-service and admin-managed resets
- Added middleware to protect client and admin routes automatically
- Implemented patient creation API for future integration
- All authentication uses bcrypt password hashing with 10 rounds
- JWT_SECRET validation ensures minimum 32-character keys for security
- Sessions use HTTP-only cookies with SameSite protection

**F1: Database Setup (Completed - Nov 2025):**
- Extended Supabase schema with admins, meal_plans, and recipes tables
- Added password field to patients table for authentication
- Created server-side Supabase admin client for secure operations
- Built admin onboarding form at `/setup` route
- Implemented seed function to create 5 fictional patients for testing
- All setup API routes use service role for privileged operations (security best practice)

**Migration to Replit:**
- Successfully migrated from Vercel to Replit environment
- Fixed Next.js 16 compatibility issues (removed deprecated eslint config)
- Updated TypeScript to version 5.9.3
- Configured workflows to run on port 5000 with host 0.0.0.0
- Set up deployment configuration for production publishing

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework:** Next.js 15+ with React Server Components (RSC)
- Mobile-first responsive design approach
- App Router for file-based routing
- TypeScript for type safety (v5.9.3)
- Server and client component separation for optimal performance

**UI Component Library:** shadcn/ui with Radix UI primitives
- Consistent design system using class-variance-authority
- Customized theme with brand colors (golden #9c7d17 and green #557432)
- Tailwind CSS for styling with custom OKLCH color variables
- Support for light/dark themes via next-themes

**State Management:** React hooks and server actions
- Form handling with react-hook-form and zod validation
- Client-side state for navigation and UI interactions
- Server-side data fetching and mutations

### Backend Architecture

**Runtime:** Next.js API Routes (serverless functions)
- RESTful API endpoints under `/api` directory
- Server-side business logic with Node.js
- Password hashing using bcryptjs for security

**Authentication Strategy:**
- Custom authentication implementation (no Auth0/NextAuth)
- Separate authentication flows for patients and administrators
- Password-based login with bcrypt hashing
- CPF (Brazilian tax ID) as unique identifier for patients

**Data Layer:**
- Supabase client for general database operations
- Supabase admin client (service role) for privileged operations
- Type-safe database interactions with TypeScript

### Database Design

**Provider:** Supabase (PostgreSQL)

**Core Tables:**
1. **patients** - Client accounts with quiz responses and authentication
   - Unique CPF identifier (mandatory)
   - Encrypted passwords
   - Optional Asaas payment integration
   - JSON field for quiz responses

2. **admins** - Nutritionist accounts
   - Professional credentials (CRN registration)
   - Full contact information
   - Administrative access controls

3. **meal_plans** - Personalized nutrition plans
   - Patient relationship (foreign key)
   - Status tracking (active/completed/cancelled)
   - Flexible JSON storage for plan data
   - Date range management

4. **recipes** - Reusable recipe content
   - Ingredient arrays
   - Preparation instructions
   - Nutritional metadata (prep time, servings, calories)

**Design Patterns:**
- JSON columns for flexible, schema-less data (quiz_responses, plan_data)
- Status enums for workflow management
- Timestamp tracking (created_at, updated_at)
- UUID primary keys for security

### Application Structure

**Route Organization:**
- `/` - Public landing page
- `/cliente/*` - Patient portal (login, dashboard, plans, recipes)
- `/admin/*` - Nutritionist portal (login, dashboard, patient/plan/recipe management)
- `/setup` - First-time system initialization
- `/api/setup/*` - Database setup endpoints

**Navigation Components:**
- `ClientNav` - Patient portal navigation
- `AdminNav` - Administrator portal navigation
- Role-based menu items with active state indicators

### Security Considerations

**Password Management:**
- Bcrypt hashing with salting (10 rounds)
- No plain-text password storage
- Service role key separated from client keys

**Data Access:**
- Supabase Row Level Security (RLS) ready
- Admin service role for privileged operations
- Environment variable separation for keys

**Initialization Flow:**
- Setup wizard checks for existing administrators
- Prevents duplicate admin creation
- Seed data generation for testing (5 mock patients)

## External Dependencies

### Database & Backend Services

**Supabase** (pcqteeblywfqlrbnqrjd.supabase.co)
- PostgreSQL database hosting
- Real-time subscriptions capability
- Row Level Security (RLS) for data protection
- Service role and anonymous key authentication

### Payment Integration (Planned)

**Asaas** - Brazilian payment gateway
- Customer ID storage in patient records
- Integration prepared but not yet implemented
- Low-ticket payment processing

### UI & Styling

**Radix UI** (@radix-ui/react-*)
- Accessible component primitives
- Dialog, dropdown, select, and form components
- Toast notifications
- Navigation menus

**Tailwind CSS**
- Utility-first styling
- Custom design tokens
- OKLCH color space for better color handling
- tw-animate-css for animations

**Lucide React** - Icon library
- Consistent iconography throughout the application
- Tree-shakeable imports

### Development Tools

**Vercel Analytics** - Usage tracking
- Integrated for production monitoring
- Performance insights

**TypeScript** - Type safety
- Strict mode enabled
- Path aliases for clean imports (@/*)

### Font & Typography

**Inter** (Google Fonts)
- Primary application font
- Latin subset
- Antialiased rendering