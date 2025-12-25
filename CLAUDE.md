# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Frontend Development
npm run dev        # Start Vite dev server with HMR
npm run build      # Production build to dist/
npm run lint       # Run ESLint
npm run preview    # Preview built app locally

# Backend (from /backend directory)
cd backend
npm run dev        # Start Express server with nodemon
npm start          # Start Express server (production)
```

## Architecture

**Nora** is a French-language gamified learning app built as a mobile-first React SPA with a phone frame wrapper.

### Tech Stack
- React 19 + Vite 7
- React Router DOM for routing
- Tailwind CSS with custom dark theme (slate-based)
- Framer Motion for animations
- Lucide React for icons
- Express.js backend with JWT authentication

### Core Architecture

**State Management**: Uses React Context (`UserContext`) as the single source of truth for:
- User profile (level, XP, streak, eggs, creature collection)
- Daily stats tracking (time spent per activity type)
- Daily goals with XP reward system

**Gamification System**:
- XP thresholds per activity type (flashcards: 10min/40XP, quiz: 20min/70XP, summary: 30min/100XP)
- Level-up grants eggs for creature collection
- Creatures have rarity tiers (rare → mythic → secret) with weighted random selection

**Time Tracking**: `useActiveTimer` hook tracks active time per activity, pausing when tab loses focus.

### Key Components

- `MobileWrapper` - Phone frame UI with status bar and bottom navigation
- `UserProvider` - Global state provider wrapping entire app

### Routes
| Path | Page | Description |
|------|------|-------------|
| `/` | Home | Dashboard with daily progress and quick actions |
| `/import` | Import | Add content via text or voice |
| `/summary` | Summary | Course summaries |
| `/flashcards` | Flashcards | Spaced repetition review |
| `/quiz` | Quiz | Knowledge testing |
| `/collection` | Collection | Creature collection with egg hatching |
| `/profile` | Profile | User stats and achievements |
| `/settings` | Settings | App preferences |

### Tailwind Theme

Custom colors defined in `tailwind.config.js`:
- `background` / `surface` - Dark slate backgrounds
- `primary` / `primary-dark` - Sky blue accents
- `secondary` - Indigo accents
- `text-main` / `text-muted` - Light text variants

## Authentication System

Full-stack authentication with JWT tokens and secure cookie-based refresh tokens.

### Frontend (`/src/features/auth/`)

**Context & Hooks**:
- `AuthContext` - Global auth state (user, isAuthenticated, isLoading)
- `useAuth` hook - Access auth context with login, register, logout, forgotPassword, resetPassword

**Pages**:
| Path | Page | Description |
|------|------|-------------|
| `/login` | Login | Email/password login with "Se souvenir de moi" |
| `/register` | Register | User registration with pseudo, email, password |
| `/forgot-password` | ForgotPassword | Request password reset email |
| `/reset-password/:token` | ResetPassword | Set new password with reset token |

**Components**:
- `ProtectedRoute` - HOC wrapping routes that require authentication
- `AuthInput` - Styled input component for auth forms

**Services**:
- `authService.js` - API calls to backend auth endpoints with Axios interceptors for token refresh

### Backend (`/backend/`)

**Endpoints** (`/api/auth/`):
| Method | Route | Description | Rate Limited |
|--------|-------|-------------|--------------|
| POST | `/register` | Create new user account | Yes |
| POST | `/login` | Authenticate user, return tokens | Yes |
| POST | `/logout` | Invalidate refresh token | No |
| POST | `/refresh` | Get new access token | No |
| GET | `/me` | Get current user (requires auth) | No |
| POST | `/forgot-password` | Send password reset email | Yes |
| POST | `/reset-password` | Reset password with token | No |
| POST | `/sync` | Sync user progress data (requires auth) | No |

**Security**:
- JWT access tokens (short-lived, sent in Authorization header)
- Refresh tokens (30 days, httpOnly secure cookie)
- Rate limiting on sensitive endpoints (login, register, forgot-password)
- Password hashing with bcrypt
- Input validation with express-validator schemas

**File Structure**:
```
backend/
├── src/
│   ├── app.js                  # Express app setup
│   ├── routes/authRoutes.js    # Auth endpoint handlers
│   ├── services/authService.js # Auth business logic
│   ├── services/userRepository.js # User data access
│   ├── middlewares/auth.js     # JWT verification middleware
│   ├── middlewares/rateLimiter.js # Rate limiting config
│   └── validators/authValidators.js # Request validation schemas
```
