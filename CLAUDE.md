# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Vision Produit

**NORA** est une app mobile sombre, calme et fluide. Son but n'est pas "d'apprendre plus", mais d'avancer sans s'en rendre compte. Pas d'école. Pas de pression.

### Concept
L'utilisateur peut prendre en photo ou expliquer à l'oral ce qu'il veut comprendre, et l'app transforme ce contenu en :
- **Résumé clair**
- **Flashcards**
- **Quiz simples**

### Progression
- Barre quotidienne montrant l'avancement du jour
- Chaque action fait gagner de l'EXP
- L'EXP débloque des récompenses visuelles via un système de collection (gacha) purement cosmétique
- Contenus organisés en dossiers

### Philosophie
- Interface sombre, calme, pensée pour le mobile
- Pas de compétition, pas de notes scolaires
- Sensation de progression continue
- Motiver sans créer de dépendance

> *L'objectif de NORA est simple : aider l'utilisateur à avancer un peu chaque jour, sans avoir l'impression d'étudier.*

---

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
| `/study` | Study | Central hub for all syntheses (search, rename) |
| `/study/:id` | StudyDetail | View synthese with flashcards/quiz access |
| `/study/:id/flashcards` | StudyFlashcards | Flashcards for a specific synthese |
| `/study/:id/quiz` | StudyQuiz | Quiz for a specific synthese |
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
│   ├── routes/syntheseRoutes.js # Synthese CRUD endpoints
│   ├── services/authService.js # Auth business logic
│   ├── services/userRepository.js # User data access
│   ├── services/syntheseRepository.js # Synthese data access
│   ├── middlewares/auth.js     # JWT verification middleware
│   ├── middlewares/rateLimiter.js # Rate limiting config
│   ├── validators/authValidators.js # Auth validation schemas
│   └── validators/syntheseValidators.js # Synthese validation schemas
```

## Syntheses System

Central system for managing user content. A synthese groups: original content, summary, flashcards, and quiz (indissociable).

### Database Schema

```sql
-- syntheses: Main content table
syntheses (id, user_id, title, original_content, summary_content, source_type, is_archived, created_at)

-- flashcards: Linked to synthese, supports spaced repetition
flashcards (id, synthese_id, front, back, difficulty, times_reviewed, times_correct, next_review_at)

-- quiz_questions: Linked to synthese
quiz_questions (id, synthese_id, question, options JSON, correct_answer, explanation, times_answered, times_correct)
```

### API Endpoints (`/api/syntheses/`)

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/` | List all syntheses (search, pagination) |
| GET | `/:id` | Get synthese with flashcards and quiz |
| POST | `/` | Create synthese with flashcards and quiz |
| PATCH | `/:id/title` | Rename synthese |
| PATCH | `/:id/archive` | Soft delete synthese |
| DELETE | `/:id` | Permanently delete synthese |
| GET | `/:id/flashcards` | Get flashcards for synthese |
| POST | `/flashcards/:id/progress` | Update flashcard progress |
| GET | `/:id/quiz` | Get quiz questions for synthese |
| POST | `/:id/quiz/progress` | Update quiz progress |

### Frontend Service (`/src/services/syntheseService.js`)

```javascript
getAllSyntheses({ search, limit, offset })
getSynthese(id)
createSynthese(data)
updateTitle(id, title)
archiveSynthese(id)
deleteSynthese(id)
getFlashcards(syntheseId)
updateFlashcardProgress(flashcardId, isCorrect)
getQuizQuestions(syntheseId)
updateQuizProgress(syntheseId, questionId, isCorrect)
```

## Environment Variables

Copy `.env.example` files and configure:

**Frontend** (`.env`):
- `VITE_API_URL` - Backend API URL

**Backend** (`backend/.env`):
- `PORT`, `NODE_ENV`, `FRONTEND_URL`
- `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`
