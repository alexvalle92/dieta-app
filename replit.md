# NutriPlan - Automated Meal Planning Platform

## Overview

NutriPlan is a mobile-first web application designed to provide automated, personalized meal plans for weight loss clients. The platform serves two distinct user types: patients seeking affordable nutrition guidance and nutritionists managing their practice. Built with Next.js and Supabase, the system offers a scalable, low-ticket solution for nutrition services.

The application addresses the problem of patient non-adherence to high-cost meal plans by providing an automated, accessible alternative priced between R$29-69 per plan.

## Recent Changes

**Dashboard Improvements (Completed - Nov 2025):**
- Replaced all mock data with real database statistics in both dashboards
- Created API GET /api/client/dashboard-stats: fetches patient's plans (active/total), last update, and available recipes
- Created API GET /api/admin/dashboard-stats: aggregates total patients, active plans, recipes, new patients this month, and growth percentage
- Client dashboard shows real plan counts, recent plans list with status badges, and quick access navigation
- Admin dashboard displays accurate metrics with month-over-month growth calculation
- Added loading states for better UX while fetching data
- Improved layout with quick action buttons and navigation shortcuts
- Both dashboards now use authenticated API calls for secure data access

**F5: Recipe Management CRUD (Completed - Nov 2025):**
- Implemented complete CRUD operations for recipes (admin and client)
- Created admin APIs: GET /api/admin/recipes (list with search), POST (create), GET/PUT/DELETE /api/admin/recipes/[id]
- Created client APIs: GET /api/client/recipes (list with search), GET /api/client/recipes/[id] (view details)
- Admin recipe management: listing, creation, editing, and deletion with real-time search
- Recipe structure: title, description, ingredients (array), preparation (text), category, prep_time, servings, calories
- Dynamic form management for ingredients and preparation steps (add/remove)
- Client recipe browsing with search functionality
- Client recipe detail view with print functionality
- DeleteRecipeButton component for safe recipe deletion with confirmation
- Full form validations (required fields: title, ingredients, preparation)
- Toast notifications for all operations
- Loading states and error handling throughout
- All mock data replaced with real database integration

**Cliente: Visualização de Planos Alimentares (Completed - Nov 2025):**
- Implementada página de detalhes do plano (/cliente/planos/[id])
- Criada API GET /api/client/meal-plans/[id] para buscar plano específico do paciente
- Página carrega dados reais do banco com validação de propriedade (patient_id)
- Exibe todas as refeições cadastradas com alimentos, horários e calorias
- Mostra observações importantes do plano
- Botão "Baixar PDF" funcional usando window.print()
- Estilos otimizados para impressão (remove navegação e botões ao imprimir)
- Estado de loading e tratamento de erro quando plano não existe

**Cliente: Listagem de Planos Alimentares (Completed - Nov 2025):**
- Implementada tela de listagem de planos para clientes (/cliente/planos)
- Criada API GET /api/client/meal-plans para buscar planos do paciente logado
- Página mostra dados reais do banco de dados
- Exibe status (Ativo, Concluído, Cancelado) com badges coloridos
- Mostra calorias diárias, datas de início/fim formatadas
- Estado vazio quando não há planos cadastrados
- Integração completa com autenticação do paciente

**F4: Meal Plans CRUD (Completed - Nov 2025):**
- Fixed Next.js 15+ params Promise issue in dynamic routes
- Updated API routes to unwrap params with `await params`
- Updated client components to use React.use() for params
- Implemented complete CRUD operations for meal plans (admin-only)
- Created APIs: GET /api/admin/meal-plans (list with search), POST (create), GET/PUT/DELETE /api/admin/meal-plans/[id]
- Search functionality filters plans by title or patient name (server-side filtering for security)
- Built listing page with real-time search, status badges, and formatted dates
- Created meal plan creation form with dynamic meal management (add/remove meals)
- Implemented edit form with plan data prefilling and status management
- Added delete functionality with confirmation dialog
- Plan data stored in JSONB with flexible structure (calories, meals array, observations)
- Each meal includes: name, time, calories, and foods
- Full form validations (required fields, date ranges, meal names)
- Date inputs for start_date and end_date with proper validation
- Status management: active, completed, cancelled
- Integration with patients table for plan assignment
- Toast notifications for all CRUD operations

**Password Change Feature (Completed - Nov 2025):**
- Added password change functionality to user menu for both patients and administrators
- Created reusable ChangePasswordDialog component with validation
- Implemented /api/admin/change-password API for administrators
- Patient password change uses existing /api/auth/reset-password API
- Menu now includes "Alterar Senha" option for all authenticated users
- Validates current password before allowing change
- Enforces minimum password length of 6 characters
- Shows/hides password visibility toggle for better UX

**Toast Notifications Fix (Completed - Nov 2025):**
- Fixed toast notifications to appear on destination pages instead of login pages
- Added `<Toaster />` component to both dashboards (cliente and admin)
- Added `<Toaster />` component to admin/pacientes page
- Login success messages now display after redirect using query parameters
- Messages are automatically cleared from URL after display
- Converted dashboards to client components for toast support

**Bug Fix: Login Functionality (Completed - Nov 2025):**
- Fixed login issue where CPFs were stored with formatting but searched without
- Updated seed to store CPFs and phone numbers without formatting (numbers only)
- Login now works correctly for both client and admin portals
- Error messages display properly when credentials are incorrect
- Test credentials: CPF `12345678901` / password `senha123` for clients
- Test credentials: Email `nutritamilivalle@gmail.com` / password `admin123` for admin

**F3: Patient CRUD & Dashboards (Completed - Nov 2025):**
- Implemented complete CRUD operations for patients (admin-only)
- Created user menu component with avatar/initials for both portals
- Added patient listing page with real-time search (sanitized against SQL injection)
- Built PatientForm component for create/edit with CPF and phone formatting
- Implemented delete confirmation dialog with cascade warning
- Created /cliente/meus-dados page showing personal data from database
- Updated dashboards to show personalized user names from session
- All admin APIs verify userType === 'admin' for security
- Search functionality uses server-side filtering with proper sanitization

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

### Environment Variables Management

**AWS Systems Manager Parameter Store**
- Centralized secrets management for production
- Secure storage of API keys and credentials
- Automatic retrieval via AWS SDK (`@aws-sdk/client-ssm`)
- Development uses local `.env.local` file
- See `AWS_SETUP.md` for detailed configuration guide

**Configuration Strategy:**
- **Local Development**: Variables loaded from `.env.local`
- **Production (Replit)**: Automatically fetched from AWS Parameter Store when `NODE_ENV=production`
- **Required AWS Secrets in Replit**: `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`
- **Parameter Prefix**: `/nutriplan/` (configurable via `AWS_PARAMETER_PREFIX`)

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