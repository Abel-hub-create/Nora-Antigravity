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
- Interface calme, pensée pour le mobile (thème clair par défaut, thème sombre disponible)
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

**Nora** is a multilingual (French/English/Spanish/Chinese) gamified learning app built as a responsive React SPA (mobile-first design).

### Tech Stack
- React 19 + Vite 7
- React Router DOM for routing
- Tailwind CSS with theme system (dark/light, CSS variables)
- Framer Motion for animations
- Lucide React for icons
- i18next + react-i18next for internationalization
- Express.js backend with JWT authentication

### Core Architecture

**State Management**: Uses React Context (`UserContext`) as the single source of truth for:
- User profile (level, XP, streak, eggs, creature collection)
- Daily stats tracking (time spent per activity type)
- Daily goals with XP reward system
- Data synced to backend via `syncUserData()` on every change
- **Important**: Uses `??` (nullish coalescing) instead of `||` to handle `0` values correctly

**Gamification System**:
- XP thresholds per activity type (flashcards: 10min/40XP, quiz: 20min/70XP, summary: 30min/100XP)
- Level-up grants eggs for creature collection
- Creatures have rarity tiers (rare → mythic → secret) with weighted random selection
- **Creature IDs are strings** (e.g., 'r1', 'm1', 'l1') not numbers - stored as JSON array in DB

**Time Tracking**: `useActiveTimer` hook tracks active time per activity, pausing when tab loses focus.

## Home Page (`/`)

The home page is the main dashboard showing daily progress and quick actions.

### Header
- Greeting: "Bonjour, [prenom]" - uses first word of user's name
- Tagline: *"Un prix pensé pour ceux qui étudient, pas pour les gros budgets."* (italic, in quotes)

### Quick Actions
Three action cards for fast navigation:

| Action | Subtitle | Destination |
|--------|----------|-------------|
| Voir mes syntheses | Toutes mes etudes | `/study` |
| Voir la collection | Mes creatures | `/collection` |
| Nouvel Import | Texte ou Vocal | `/import` |

### Components
- `DailyProgress` - Shows daily goals progress bar with individual goal cards
- `QuickActionCard` - Reusable action button with icon, title, subtitle

## Profile Management

Users can edit their profile (name and avatar) from Settings.

### How It Works
1. Go to Settings → Click "Modifier le Profil"
2. Modal opens with:
   - Avatar preview (current photo or initial letter)
   - Camera button to upload new photo from gallery
   - Name input field
3. Save updates both frontend state and backend database

### Technical Details
- Avatar stored as base64 in `users.avatar` column (MEDIUMTEXT)
- Max file size: 2MB
- Supported formats: all image types
- API: `PATCH /api/auth/profile` with `{ name, avatar }`
- Frontend: `useAuth().updateProfile({ name, avatar })`

### Database
```sql
-- Migration 011_add_avatar.sql
ALTER TABLE users ADD COLUMN avatar MEDIUMTEXT NULL AFTER name;
```

### Profile Page Stats

The Profile page (`/profile`) displays two stats cards:

| Stat | Source | Description |
|------|--------|-------------|
| Mastered/Total | `mastery_score === 100` count / total | Mastered count out of total syntheses |
| Synthèses X/40 | API `/syntheses` | Total count of user's syntheses out of 40 max |

## Internationalization (i18n)

The app is **fully multilingual** (French/English/Spanish/Chinese) using i18next. All UI text is translated.

### Structure

```
src/i18n/
├── index.js              # i18next configuration
└── locales/
    ├── fr.json           # French translations (~592 keys)
    ├── en.json           # English translations (~592 keys)
    ├── es.json           # Spanish translations (~592 keys)
    └── zh.json           # Chinese Mandarin translations (~592 keys)
```

### Usage

```javascript
import { useTranslation } from 'react-i18next';

const MyComponent = () => {
    const { t, i18n } = useTranslation();

    // Simple translation
    return <h1>{t('home.greeting', { name: 'User' })}</h1>;

    // Dynamic locale for dates
    const locale = i18n.language === 'fr' ? 'fr-FR' : 'en-US';
    return <span>{new Date().toLocaleDateString(locale)}</span>;
};
```

### Language Selection

- Located in Settings page (`/settings`) as the first section
- Also available during onboarding (step 1)
- Component: `/src/components/Settings/LanguageSelector.jsx`
- Stored in database (`users.language`)
- Detects browser language on first visit, defaults to French

**Optimistic Update**: Language change is applied instantly via `i18n.changeLanguage()` (no lag), then synced to backend in background. If API fails, reverts to previous language.

**Available Languages**:
| Code | Label | Flag |
|------|-------|------|
| fr | Français | 🇫🇷 |
| en | English | 🇬🇧 |
| es | Español | 🇪🇸 |
| zh | 中文 | 🇨🇳 |

### Translation Keys Structure

| Namespace | Usage |
|-----------|-------|
| `common.*` | Shared buttons, labels (save, cancel, delete, loading, today, yesterday, etc.) |
| `nav.*` | Navigation labels (home, study, collection, import, profile, tagline) |
| `home.*` | Home page content |
| `settings.*` | Settings page (account, profile, subscription, notifications, goals) |
| `auth.*` | Login, register, password reset, email verification, all form labels/placeholders/buttons |
| `study.*` | Study pages (search, list, empty states) |
| `studyDetail.*` | Summary detail page |
| `flashcards.*` | Flashcards mode (session, cards, completion) |
| `quiz.*` | Quiz mode (questions, results, messages by score) |
| `import.*` | Import page (voice, photo modes) |
| `voice.*` | Voice recorder (microphone errors, transcription status, instructions) |
| `photo.*` | Photo capture (camera errors, OCR status, instructions) |
| `dailyProgress.*` | Daily goals (titles, messages, progress counters, motivational messages) |
| `process.*` | AI generation steps and status |
| `profile.*` | Profile page (level, XP, folders) |
| `collection.*` | Creature collection (eggs, capsules, hatching animations) |
| `rarities.*` | Creature rarity names (rare, veryRare, epic, legendary, mythic, secret) |
| `creatures.*` | Creature names by ID (r1-r10, vr1-vr8, e1-e6, l1-l5, m1-m3, s1) |
| `folders.*` | Folder management (create, rename, add syntheses) |
| `activities.*` | Activity type labels (Summary, Quiz, Flashcards) |
| `notifications.*` | XP and goal completion notifications |
| `errors.*` | Error messages (generic, network, auth failures, etc.) |

### Translated Components

All pages and components use `t()` for text:
- **Pages**: Home, Study, StudyDetail, StudyFlashcards, StudyQuiz, Import, Process, Profile, Collection, FolderDetail, Settings
- **Auth Pages**: Login, Register, ForgotPassword, ResetPassword, VerifyEmail, VerifyEmailSent
- **Components**: MobileWrapper (navigation), CreateFolderModal, AddSynthesesModal, LanguageSelector, DailyProgress, VoiceRecorder, PhotoCapture, ProtectedRoute, EggAnimation, FolderCard, NotificationStack
- **Context**: UserContext (notifications, goal labels), AuthContext (error messages)

### Adding New Translations

1. Add key to both `fr.json` and `en.json`
2. Use `t('namespace.key')` or `t('namespace.key', { variable: value })` for interpolation
3. For plurals, use separate keys: `count` (singular) and `countPlural` (plural)
4. For dates, use `i18n.language` to get locale for `toLocaleDateString()`

### Dynamic Labels in UserContext

Activity types have both static labels (fallback) and translation keys:

```javascript
export const ACTIVITY_TYPES = {
    summary: { label: 'Synthèse', labelKey: 'activities.summary', key: 'summaryTime' },
    quiz: { label: 'Quiz', labelKey: 'activities.quiz', key: 'quizTime' },
    flashcards: { label: 'Flashcards', labelKey: 'activities.flashcards', key: 'flashcardsTime' }
};

// Usage in component:
const label = t(ACTIVITY_TYPES[type].labelKey);
```

## Study Time & XP System

Comprehensive daily study time tracking with XP rewards. Data persists in backend database only (single source of truth), ensuring synchronization across all devices and browsers.

### XP Thresholds (Once per day)

| Activity | Time Required | XP Reward |
|----------|---------------|-----------|
| Flashcards | 10 minutes | 40 XP |
| Quiz | 20 minutes | 70 XP |
| Synthèse | 30 minutes | 100 XP |
| **Bonus** | All 3 thresholds | **+100 XP** |

### How It Works

1. **Time Tracking**: Timer starts when user enters a study page, stops when:
   - User navigates away
   - Tab loses focus (visibility change)
   - App goes to background

2. **XP Awards**: Once a threshold is reached:
   - XP is awarded immediately with notification
   - Cannot be re-earned same day
   - Tracked in `dailyStats.xpAwarded`

3. **Daily Reset**: At midnight (or when new day detected):
   - All time counters reset to 0
   - XP earning opportunities reset
   - Goals completion status resets (both frontend AND backend)
   - Total XP/levels/eggs NEVER reset
   - Previous day's total study time saved to history (for average calculation)
   - **Important**: Backend `getFullDailyProgress()` resets `completed: false` on goals when loading data for a new day

### State Structure (`UserContext.jsx`)

```javascript
dailyStats: {
  date: "Sun Dec 29 2024",
  quizTime: 0,           // seconds
  flashcardsTime: 0,     // seconds
  summaryTime: 0,        // seconds
  xpAwarded: {
    quiz: false,
    flashcards: false,
    summary: false,
    allBonus: false
  }
}
```

### Key Functions

| Function | Description |
|----------|-------------|
| `updateTime(activityType, seconds)` | Add time and check XP thresholds |
| `getStudyTimeMinutes(activityType)` | Get time in minutes for display |
| `getXpProgress(activityType)` | Get % progress to threshold |
| `getAverageDailyStudyTime()` | Get average study time per day in minutes (includes today + last 30 days) |

### Timer Integration

Pages using the timer:
- `StudyDetail.jsx` → `useActiveTimer('summary')`
- `StudyFlashcards.jsx` → `useActiveTimer('flashcards')`
- `StudyQuiz.jsx` → `useActiveTimer('quiz')`

### Backend Storage

Study stats and history are stored in the backend database as the single source of truth. This ensures synchronization across all browsers and devices.

**Database Tables**:
```sql
-- daily_progress: Daily stats synced from frontend
daily_progress (id, user_id, daily_goals JSON, progress_percentage, reward_claimed,
                quiz_time, flashcards_time, summary_time, xp_awarded JSON, progress_date)

-- study_history: Historical study time for average calculation
study_history (id, user_id, study_date, total_seconds, created_at)
```

**Data Flow**:
1. On app load: Fetch data from backend (DB is the only source of truth)
2. Every 2 seconds: Sync current stats to backend (debounced)
3. On day change: Save previous day's total to `study_history` table

**Migration**: `013_add_study_stats.sql`

**Important Technical Note**: MySQL2 automatically parses JSON columns into JavaScript objects. When reading JSON columns like `daily_goals` or `xp_awarded`, use `safeJsonParse()` helper in `dailyProgressRepository.js` to handle both string and already-parsed object cases. Never use `JSON.parse()` directly on MySQL JSON columns.

## Daily Goals & Progress System

Personalized daily objectives system with global progress tracking and XP rewards.

### Core Concepts

**Multiple Custom Goals**: Users can define multiple daily goals simultaneously, each targeting a specific activity type (summary, quiz, flashcards) with a custom time target (5-60 minutes).

**Global Progress Bar**: The daily progress percentage represents completion across ALL defined goals, not individual ones. Each goal has equal weight.

```
Progress = (Completed Goals / Total Goals) × 100%

Example: 2 goals defined, 1 completed = 50%
Example: 4 goals defined, 2 completed = 50%
```

### State Management (`UserContext.jsx`)

```javascript
// Daily Goals State
dailyGoals: [
  { id: 1, type: 'summary', targetMinutes: 30, completed: false },
  { id: 2, type: 'quiz', targetMinutes: 20, completed: false }
]

// Reward tracking (persists independently of goals)
dailyGoalsRewardClaimed: boolean  // 10 XP bonus, once per day

// Progress calculation
dailyProgressPercentage = (completedGoals.length / totalGoals.length) * 100
```

### Key Functions

| Function | Description |
|----------|-------------|
| `updateDailyGoals(goals)` | Replace all goals, resets progress to 0% |
| `addDailyGoal(type, minutes)` | Add new goal, resets progress to 0% |
| `removeDailyGoal(goalId)` | Remove goal, resets progress to 0% |
| `updateGoalTarget(goalId, minutes)` | Modify target time, resets progress to 0% |

### Business Rules

1. **Equal Weight**: Each goal contributes `100% / totalGoals` to the progress bar
2. **Immediate Update**: Progress bar updates instantly when a goal is completed
3. **Completion Reward**: 10 XP awarded when ALL goals are completed (100%)
4. **Once Per Day**: The 10 XP reward can only be claimed ONCE per day
5. **Modification Reset**: ANY modification to goals resets progress to 0%
6. **Reward Protection**: If reward was claimed, modifying goals does NOT allow re-claiming
7. **Warning Modal**: Users are warned before modifying goals with active progress
8. **Daily Reset**: At midnight, all goal completion statuses reset (new day)
9. **No Goals = No Reward**: If no goals are defined, progress stays at 0%
10. **Independent Bonus**: Daily goals bonus is separate from study time XP bonuses

### Components

| Component | File | Purpose |
|-----------|------|---------|
| `DailyProgress` | `/src/components/Home/DailyProgress.jsx` | Main progress bar with individual goal cards |
| `Settings` | `/src/pages/Settings.jsx` | Goal management (add, edit, remove) |
| `NotificationStack` | `/src/components/UI/NotificationStack.jsx` | Toast notifications for achievements |

### Notification Types

- `goal`: Individual goal completed ("Objectif Synthèse complété !")
- `reward`: All goals completed (+10 XP)
- `xp`: XP gained from study time thresholds (+40 XP, +70 XP, etc.)
- `warning`: User warnings (duplicate goal type, etc.)
- `success`: General success messages

### Key Components

- `MobileWrapper` - Responsive layout wrapper with:
  - **Mobile**: Bottom navigation bar (fixed)
  - **Desktop (md+)**: Left sidebar with logo "Nora" and navigation links
- `UserProvider` - Global state provider wrapping entire app
- `NotificationStack` - Toast notifications (top-right on desktop, top-center on mobile)

### Routes
| Path | Page | Description |
|------|------|-------------|
| `/` | Home | Dashboard with daily progress and quick actions |
| `/import` | Import | Add content via text, voice, or photo |
| `/process` | Process | AI content generation with progress |
| `/study` | Study | Central hub for all syntheses (search, rename) |
| `/study/:id` | StudyDetail | View synthese with flashcards/quiz access |
| `/study/:id/flashcards` | StudyFlashcards | Flashcards for a specific synthese |
| `/study/:id/quiz` | StudyQuiz | Quiz for a specific synthese |
| `/collection` | Collection | Creature collection with egg hatching |
| `/profile` | Profile | User stats, achievements, and folders |
| `/folders/:id` | FolderDetail | View/manage folder contents |
| `/settings` | Settings | App preferences |

### Tailwind Theme

Custom colors defined in `tailwind.config.js` using CSS variables for theme support:
- `background` / `surface` - Theme-aware backgrounds
- `primary` / `primary-dark` - Sky blue accents
- `secondary` - Indigo accents
- `text-main` / `text-muted` - Theme-aware text colors

### Theme System (Dark/Light)

The app supports two themes: **light** (default) and **dark**. Users can switch themes in Settings.

**How It Works**:
1. Theme preference stored in database (`users.theme` column)
2. Applied via `data-theme` attribute on `<html>` element
3. CSS variables in `index.css` define colors for each theme (`:root` = light theme)
4. Theme initialized in `main.jsx` before render to avoid flash
5. `AuthContext.applyUserPreferences()` applies user's theme from DB after login
6. `MobileWrapper` also applies theme via `useEffect` when user changes

**Optimistic Update**: Theme change is applied instantly (no lag), then synced to backend in background. If API fails, reverts to previous theme.

**Fade Animation**: Smooth 0.3s CSS transition on background-color, color, and border-color when switching themes.

**Components**:
- `ThemeSelector` (`/src/components/Settings/ThemeSelector.jsx`) - Two buttons with Moon/Sun icons, uses local state for instant feedback

**CSS Variables** (defined in `/src/index.css`):

| Variable | Dark Theme | Light Theme |
|----------|------------|-------------|
| `--color-background` | `#0f172a` (Slate 900) | `#f8fafc` (Slate 50) |
| `--color-surface` | `#1e293b` (Slate 800) | `#e2e8f0` (Slate 200) |
| `--color-primary` | `#38bdf8` (Sky 400) | `#0284c7` (Sky 600) |
| `--color-primary-dark` | `#0ea5e9` (Sky 500) | `#0369a1` (Sky 700) |
| `--color-secondary` | `#818cf8` (Indigo 400) | `#6366f1` (Indigo 500) |
| `--color-text-main` | `#f8fafc` (Slate 50) | `#0f172a` (Slate 900) |
| `--color-text-muted` | `#94a3b8` (Slate 400) | `#64748b` (Slate 500) |

**Light Theme Overrides**: Classes like `bg-white/5`, `bg-black/30`, `border-white/5` are overridden in light theme to use appropriate dark colors instead.

**i18n Keys**: `settings.theme`, `settings.darkTheme`, `settings.lightTheme`

### Global CSS (`/src/index.css`)

```css
body {
  @apply bg-background text-text-main font-sans antialiased;
}

/* Theme transition - 0.3s fade on all color properties */
*, *::before, *::after {
  transition: background-color 0.3s ease, border-color 0.3s ease, color 0.3s ease;
}
```

**Theme Transition**: All elements have a 0.3s transition on color properties for smooth theme switching. Inputs and animated elements are excluded to avoid interference.

**Important**: Do NOT add `overflow-hidden` to body - it breaks page scrolling.

### Responsive Layout

The app uses a responsive layout via `MobileWrapper`:

| Breakpoint | Navigation | Content |
|------------|------------|---------|
| Mobile (< md) | Fixed bottom nav bar | Full width with bottom padding (pb-24) |
| Desktop (≥ md) | Fixed left sidebar (w-64) | Left margin (ml-64) with max-w-3xl centered |

**Sidebar** (desktop only):
- Logo "Nora" with tagline
- Navigation links with active state highlighting
- Fixed position, full height

**Bottom Nav** (mobile only):
- 5 icons with labels
- Fixed at bottom with blur backdrop

## Authentication System

Full-stack authentication with JWT tokens and secure cookie-based refresh tokens.

### Frontend (`/src/features/auth/`)

**Context & Hooks**:
- `AuthContext` - Global auth state (user, isAuthenticated, isLoading)
- `useAuth` hook - Access auth context with login, register, logout, forgotPassword, resetPassword, updateProfile

**Pages**:
| Path | Page | Description |
|------|------|-------------|
| `/login` | Login | Email/password login with "Se souvenir de moi" + resend verification button if email not verified |
| `/register` | Register | User registration + resend verification button if email already used |
| `/forgot-password` | ForgotPassword | Request password reset email |
| `/reset-password/:token` | ResetPassword | Set new password with reset token. Reads `?lang=` param for language. |
| `/verify-email-sent` | VerifyEmailSent | Shows after registration, prompts to check email (1h expiry) |
| `/verify-email/:token` | VerifyEmail | Verifies email from link. Reads `?lang=` param for language. Shows: success, already verified, expired, or error |

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
| POST | `/google` | Google OAuth login/register | Yes |
| POST | `/logout` | Invalidate refresh token | No |
| POST | `/refresh` | Get new access token | No |
| GET | `/me` | Get current user (requires auth) | No |
| POST | `/forgot-password` | Send password reset email | Yes |
| POST | `/reset-password` | Reset password with token | No |
| PATCH | `/profile` | Update user name and avatar (requires auth) | No |
| PATCH | `/onboarding` | Complete first-time onboarding (requires auth) | No |
| POST | `/sync` | Sync user progress data (requires auth) | No |

### Google OAuth

Login/register with Google account using OAuth 2.0.

**Frontend**:
- Uses `@react-oauth/google` library
- `GoogleOAuthProvider` wraps app in `main.jsx`
- `GoogleLogin` button on Login and Register pages
- `VITE_GOOGLE_CLIENT_ID` env variable required

**Backend**:
- `googleAuthService.js` - Verifies Google ID token
- `POST /api/auth/google` - Receives credential, creates/links user
- `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` env variables required

**Database**:
- `users.google_id` column (VARCHAR 255, nullable)
- `users.password` made nullable for Google-only accounts
- Migration: `023_add_google_auth.sql`

**Flow**:
1. User clicks "Continue with Google"
2. Google returns ID token
3. Backend verifies token with Google
4. If `google_id` exists → login
5. If email exists → link Google account
6. Otherwise → create new user

**Security**:
- JWT access tokens (short-lived, sent in Authorization header)
- Refresh tokens (30 days, httpOnly secure cookie)
- Rate limiting on sensitive endpoints (login, register, forgot-password)
- Password hashing with bcrypt
- Input validation with express-validator schemas

**Error Code Pattern**:
Backend returns error codes (not hardcoded messages) so the frontend can translate them via i18n:
- `errorHandler.js` includes `code` field in error responses: `{ error: message, code: errorCode }`
- Frontend checks `err.response?.data?.code` and uses `t('errors.xxx')` to display translated messages

| Error Code | Context | Frontend Translation Key |
|------------|---------|--------------------------|
| `EMAIL_ALREADY_VERIFIED` | Register with existing verified email | `auth.emailAlreadyUsedVerified` |
| `EMAIL_NOT_VERIFIED` | Register with existing unverified email / Login without verification | `auth.emailAlreadyUsed` / `auth.emailNotVerified` |
| `INVALID_CREDENTIALS` | Wrong email/password on login | `auth.invalidCredentials` |
| `SYNTHESES_LIMIT_REACHED` | Creating synthese when at 40 limit | `errors.synthesesLimitReached` |
| `NO_TEXT_DETECTED_PHOTO` | OCR found no text in photos | `errors.noTextDetectedPhoto` |
| `NO_TEXT_DETECTED_VOICE` | Whisper found no text in audio | `errors.noTextDetectedVoice` |

**Limits**:

| Resource | Max | Enforcement | User Info |
|----------|-----|-------------|-----------|
| Photos per import | 6 | Frontend (`MAX_PHOTOS` in PhotoCapture.jsx) | Info text + buttons disabled at limit |
| Syntheses per user | 40 | Backend (`POST /api/syntheses` checks count) | Study tab shows "max 40", Profile shows "X/40" |

**File Structure**:
```
backend/
├── src/
│   ├── app.js                  # Express app setup
│   ├── routes/authRoutes.js    # Auth endpoint handlers
│   ├── routes/syntheseRoutes.js # Synthese CRUD endpoints
│   ├── routes/aiRoutes.js      # AI endpoints (Whisper, Vision, Content Gen)
│   ├── services/authService.js # Auth business logic
│   ├── services/userRepository.js # User data access
│   ├── services/syntheseRepository.js # Synthese data access
│   ├── services/openaiService.js # OpenAI Whisper & Vision
│   ├── services/contentGenerationService.js # ChatGPT content generation
│   ├── middlewares/auth.js     # JWT verification middleware
│   ├── middlewares/rateLimiter.js # Rate limiting config
│   ├── validators/authValidators.js # Auth validation schemas
│   └── validators/syntheseValidators.js # Synthese validation schemas
├── uploads/                    # Temporary audio files (auto-cleaned)
```

## Onboarding System

First-time user onboarding flow displayed only on first login after account creation.

### Flow

The onboarding is a 5-step modal that appears after first login:

| Step | Content | Required |
|------|---------|----------|
| 1 | "Personnalise ton expérience" - Language & Theme selection | No (defaults applied) |
| 2 | "Comment tu t'appelles ?" - Name input | Yes (min 2 chars) |
| 3 | "Ajoute une photo de profil" - Avatar upload | No (skip available) |
| 4 | "Choisis ta matière" - Info about subject selection | Info only |
| 5 | "Comment veux-tu importer ?" - Info about photo import | Button click → Import |

### Technical Implementation

**Database**:
- `users.onboarding_completed` column (BOOLEAN DEFAULT FALSE)
- Migration: `020_add_onboarding_completed.sql`
- Existing users set to `TRUE` (already onboarded)

**Backend**:
- `PATCH /api/auth/onboarding` - Complete onboarding (updates name, avatar, sets onboarding_completed = true)
- `userRepository.completeOnboarding(userId, { name, avatar })`

**Frontend**:
- Component: `/src/components/Onboarding/OnboardingModal.jsx`
- Rendered in `MobileWrapper` when `user && !user.onboarding_completed`
- Uses Framer Motion for smooth step transitions
- `authService.completeOnboarding({ name, avatar })` API call
- `useAuth().completeOnboarding()` context method

**i18n Keys**: `onboarding.step1.*`, `onboarding.step2.*`, `onboarding.step3.*`, `onboarding.step4.*`, `onboarding.step5.*`

### Behavior

- Only shown ONCE per account (never reappears after completion)
- Modal has `z-index: 100` to overlay everything
- Step indicators (dots) show progress
- After completion, redirects to `/import`
- Name is stored in `users.name`, avatar in `users.avatar`

## Syntheses System

Central system for managing user content. A synthese groups: original content, summary, flashcards, and quiz (indissociable).

### Database Schema

```sql
-- syntheses: Main content table
syntheses (id, user_id, title, original_content, summary_content, source_type, is_archived, created_at)

-- flashcards: Linked to synthese (simple navigation, no feedback tracking)
flashcards (id, synthese_id, front, back, difficulty)

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
deleteMultipleSyntheses(ids)  // Delete multiple at once
getFlashcards(syntheseId)
getQuizQuestions(syntheseId)
updateQuizProgress(syntheseId, questionId, isCorrect)
```

### Bulk Delete Feature

The Study page (`/study`) supports selecting and deleting multiple syntheses at once.

**UI Components**:
- **Selection circles**: Each synthese has a circle icon on the left for selection
- **Selection counter**: Shows "X sélectionnée(s)" with "Désélectionner" button
- **Delete selected button**: Red button "Supprimer (X)" appears when items selected
- **Delete all button**: Trash icon in header to delete all syntheses

**Confirmation Modal**:
- Shows before any deletion (selected or all)
- Message: "Cette action est irréversible"
- Buttons: "Annuler" and "Supprimer" with loading state

**State Management**:
```javascript
const [selectedIds, setSelectedIds] = useState(new Set());
const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
const [deleteMode, setDeleteMode] = useState(null); // 'all' or 'selected'
```

**i18n Keys**: `study.deleteAll`, `study.deleteSelected`, `study.selectedCount`, `study.clearSelection`, `study.confirmDeleteTitle`, `study.confirmDeleteAll`, `study.confirmDeleteSelected`

### Date Display

Syntheses display their full creation date (not relative time like "Il y a 3 jours"):
- **French**: "9 janvier 2026"
- **English**: "January 9, 2026"

Shown in both `/study` (list) and `/study/:id` (detail) pages.

### Mastery Badge

When a synthese reaches 100% mastery score (via revision), a green badge is displayed:
- **Location**: Only in the study list (`/study`), NOT in study detail page
- **Style**: Green badge with Award icon and "Maîtrisée" / "Mastered" text
- **Condition**: `synthese.mastery_score === 100`

## Environment Variables

Copy `.env.example` files and configure:

**Frontend** (`.env`):
- `VITE_API_URL` - Backend API URL

**Backend** (`backend/.env`):
- `PORT`, `NODE_ENV`, `FRONTEND_URL`
- `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`
- `OPENAI_API_KEY` - OpenAI API key (for Whisper, Vision, GPT)

## Deployment

**Production URL**: https://mirora.cloud

**Stack**:
- Frontend: Vite build → `/dist` served by Nginx
- Backend: Express.js managed by PM2
- Database: MySQL
- SSL: Cloudflare

**Commands**:
```bash
# Deploy frontend
npm run build

# Backend (PM2) - uses ecosystem.config.cjs
pm2 start ecosystem.config.cjs   # First start (from backend/)
pm2 restart nora-api             # Restart
pm2 logs nora-api                # View logs
pm2 save                         # Save for reboot

# Nginx
sudo systemctl reload nginx
```

**PM2 Config** (`backend/ecosystem.config.cjs`):
- Watch mode enabled with `ignore_watch: ['uploads', 'node_modules', 'logs']`
- Important: uploads folder must be ignored to prevent restart during audio transcription

**Nginx config**: `/etc/nginx/sites-available/mirora.cloud`
- Serves `/dist` for frontend
- Proxies `/api` → `localhost:5000`

## Database Migrations

Run migrations in order from `backend/src/database/migrations/`:

```bash
mysql -u $DB_USER -p$DB_PASSWORD $DB_NAME < backend/src/database/migrations/001_create_users.sql
mysql -u $DB_USER -p$DB_PASSWORD $DB_NAME < backend/src/database/migrations/002_create_password_resets.sql
mysql -u $DB_USER -p$DB_PASSWORD $DB_NAME < backend/src/database/migrations/003_create_refresh_tokens.sql
mysql -u $DB_USER -p$DB_PASSWORD $DB_NAME < backend/src/database/migrations/004_create_syntheses.sql
mysql -u $DB_USER -p$DB_PASSWORD $DB_NAME < backend/src/database/migrations/005_create_flashcards.sql
mysql -u $DB_USER -p$DB_PASSWORD $DB_NAME < backend/src/database/migrations/006_create_quiz_questions.sql
mysql -u $DB_USER -p$DB_PASSWORD $DB_NAME < backend/src/database/migrations/007_create_folders.sql
mysql -u $DB_USER -p$DB_PASSWORD $DB_NAME < backend/src/database/migrations/008_create_folder_syntheses.sql
# ... (009-019 for notifications, daily progress, avatar, email verification, study stats, revision, preferences)
mysql -u $DB_USER -p$DB_PASSWORD $DB_NAME < backend/src/database/migrations/020_add_onboarding_completed.sql
```

## Import System

Multi-modal content import system supporting text, voice, and photo input. All AI features are powered by OpenAI APIs with the API key secured server-side.

### Subject Selection (Required)

Before importing content, users MUST select a subject (matière). This enables:
- Discipline-specific AI prompts for better quality
- Subject-based filtering and organization
- Improved synthesis and revision quality

**Available Subjects** (9 matières):
| ID | French | English | Icon |
|----|--------|---------|------|
| mathematics | Mathématiques | Mathematics | 📐 |
| french | Français | French | 📚 |
| physics | Physique | Physics | ⚡ |
| chemistry | Chimie | Chemistry | 🧪 |
| biology | Biologie | Biology | 🧬 |
| history | Histoire | History | 🏛️ |
| geography | Géographie | Geography | 🌍 |
| english | Anglais | English | 🇬🇧 |
| dutch | Néerlandais | Dutch | 🇳🇱 |

**Database**: `syntheses.subject` column (VARCHAR 50, nullable for legacy data)
**Migration**: `022_add_subject.sql`

### Input Methods

| Method | Component | Technology |
|--------|-----------|------------|
| Text | `Import.jsx` | Direct text input/paste |
| Voice | `VoiceRecorder.jsx` | OpenAI Whisper API (via backend) |
| Photo | `PhotoCapture.jsx` | OpenAI GPT-4 Vision API (via backend) |

### Flow

```
Import Page (Subject Selection)
       ↓
   Choose Voice/Photo mode
       ↓
   Capture content
       ↓
   Specific Instructions Prompt (optional)
       ↓
   /process (AI generation with subject)
       ↓
   POST /api/syntheses (includes subject)
       ↓
   /study/:id (displays subject badge)
```

### Specific Instructions Feature

After capturing content via voice or photo, users can optionally customize their synthesis.

**Flow**:
1. User captures content (voice/photo)
2. Intermediate screen appears: "Veux-tu personnaliser ta synthèse ?"
3. If "No" → Warning modal about definitions (can be dismissed permanently via checkbox)
4. If "Yes" → Two separate input fields appear:
   - **Definitions to include**: Terms the user wants defined in the synthesis
   - **Test objectives**: Important points to cover (NOT definitions)
5. Instructions are passed to AI generation

**Two-Field System**:
| Field | Purpose | Effect on Synthesis |
|-------|---------|---------------------|
| Définitions à inclure | List terms needing definitions | Creates "DEFINITIONS ET CONCEPTS IMPORTANTS" section with ONLY these terms |
| Objectifs de l'interrogation | Important topics to cover | These topics are explained in detail but do NOT create definitions |

**Critical Rules**:
- **Definitions section appears ONLY if** user lists terms in the definitions field
- If definitions field is empty → NO definitions section, regardless of what's in objectives
- Terms in objectives field are NEVER treated as definitions
- AI will NOT invent content - only uses what's in the original course

**Warning Modal** (when clicking "No"):
- Shows warning that definitions won't appear unless specified
- Checkbox "Ne plus afficher ce message" saves preference to localStorage
- Key: `nora_hide_definitions_warning`

**i18n Keys**: `import.specificPrompt.*`

### Components

**`/src/pages/Import.jsx`**
- Mode switcher (Text/Vocal/Photo)
- Text: Textarea with "Simplifier" button
- Voice: Triggers VoiceRecorder
- Photo: Opens PhotoCapture modal

**`/src/components/Import/VoiceRecorder.jsx`**
- Records audio via MediaRecorder API
- Sends audio to backend for Whisper transcription
- Displays recording time and processing status
- Microphone permission handling
- Visual feedback with animations
- **Error handling**: Backend returns error codes (`NO_TEXT_DETECTED_VOICE`), frontend translates via i18n

**`/src/components/Import/PhotoCapture.jsx`**
- Camera access via getUserMedia
- Multi-photo capture from camera (**max 6 photos** - buttons disabled at limit, info text shown)
- Gallery import button (select multiple images from device, limited to remaining slots)
- Sends images to backend for GPT-4 Vision OCR (parallel processing via `Promise.all()`)
- Progress indicator during processing
- Combined text extraction from multiple photos
- **Layout**: Full-screen modal (`z-[60]` to overlay mobile nav), camera zone takes available space (`flex-1`), compact controls band at bottom
- **Error handling**: Backend returns error codes (`NO_TEXT_DETECTED_PHOTO`), frontend translates via i18n

**`/src/pages/Process.jsx`**
- Single backend call generates all content (title, summary, flashcards, quiz)
- Animated step progression for visual feedback
- Error handling with retry
- Auto-redirect on success

### AI API Endpoints (`/api/ai/`)

| Method | Route | Description | Auth Required |
|--------|-------|-------------|---------------|
| POST | `/transcribe` | Audio transcription via Whisper | Yes |
| POST | `/ocr` | Text extraction via GPT-4 Vision | Yes |
| POST | `/generate-content` | Generate complete educational content | Yes |

**POST /api/ai/transcribe**
- Accepts: `multipart/form-data` with `audio` file (webm, mp3, wav, etc.)
- Returns: `{ transcript: "..." }`
- Max file size: 25MB

**POST /api/ai/ocr**
- Accepts: `{ image: "base64..." }` or `{ images: ["base64...", ...] }`
- Returns: `{ text: "..." }`
- Supports multiple images, text is combined

**POST /api/ai/generate-content**
- Accepts: `{ content: "course text..." }`
- Returns: `{ title, summary, flashcards[], quizQuestions[] }`
- Single API call generates all educational content
- Model: gpt-4o-mini

### Content Generation Service (`/backend/src/services/contentGenerationService.js`)

Centralized educational content generation with the Nora personality.

**Automatic Language Detection**:
- Content language is detected by counting French vs English common words
- Generated content (title, summary, flashcards, quiz) is in the SAME language as the source
- English course → English output (regardless of app UI language)
- French course → French output (regardless of app UI language)
- Detection function: `detectLanguage(content)` returns `'english'` or `'french'`
- Explicit language instruction added to prompt based on detection

**Nora Prompt Characteristics**:
- Calm, structured, pedagogical tone
- Simple and accessible language (no jargon)
- Neutral and supportive (no emojis)
- Faithful to original course content
- Coherent output: summary, flashcards, and quiz are linked

**Summary Generation Rules** (REGLES STRICTES):

1. **LONGUEUR**:
   - Synthese PLUS COURTE que le cours original mais COMPLETE
   - Condensee MAIS complete (pas vide)

2. **LANGAGE**:
   - Langage SIMPLE et ACCESSIBLE dans toute la synthese
   - EXCEPTION: Definitions RIGOUREUSES et PRECISES (vocabulaire technique exact)
   - Exemples: "subsequemment" → "ensuite", "paradigme" → "facon de voir", "intrinseque" → "naturel"

3. **SECTIONS PAR CONCEPT** (OBLIGATOIRE):
   - Identifier chaque CONCEPT principal du cours
   - Un CONCEPT = un sujet/theme principal (ex: "L'electrisation")
   - UNE SECTION dediee pour CHAQUE concept
   - Inclure sous-concepts uniquement s'ils existent
   - AUCUNE DEFINITION dans les sections de concepts
   - Structure: CONCEPT → sous-concepts (si existants) → explications

4. **SECTIONS DYNAMIQUES**:
   - N'inclure une section QUE si contenu pertinent existe
   - Pas de section "Definitions" si pas de definitions
   - Pas de section "Tableaux" si pas de tableaux
   - JAMAIS de sections vides

5. **TABLEAUX** (CRITIQUE):
   - Si tableaux dans le cours → section "TABLEAUX ET DONNEES STRUCTUREES"
   - Reproduire FIDELEMENT en format markdown

6. **STRUCTURE GENERALE**:
   - Section 1: DEFINITIONS ET CONCEPTS IMPORTANTS (si definitions presentes)
   - Sections 2 a N: UNE SECTION PAR CONCEPT (obligatoire)
   - Sections complementaires si pertinentes (Methodes, Exemples, Tableaux)

7. **REGLE ABSOLUE SUR LES DEFINITIONS**:
   - Section definitions créée UNIQUEMENT si l'utilisateur a listé des termes dans le champ "Définitions à inclure"
   - Seuls les termes listés par l'utilisateur sont définis
   - Si champ définitions vide → AUCUNE section définitions
   - Les termes dans "Objectifs de l'interrogation" ne génèrent PAS de définitions

8. **FIDELITE ABSOLUE AU CONTENU** (CRITIQUE):
   - JAMAIS inventer de notion, exemple ou information
   - UNIQUEMENT reformuler ce qui est dans le cours
   - Ignorer les connaissances personnelles de l'IA
   - Avant d'inclure quoi que ce soit : vérifier que c'est EXPLICITEMENT dans le cours
   - Si pas sûr → ne pas inclure

- MAX_TOKENS: 10000

**Summary Pagination** (Frontend):
- Si synthese > 2500 caracteres, divisee en pages
- Boutons fleches gauche/droite pour naviguer
- Points indicateurs cliquables en bas
- Numero de page affiche en haut (ex: 1/3)
- Coupe intelligente aux fins de paragraphes ou phrases

**Output Structure**:
```javascript
{
  title: "Short title (max 50 chars)",
  summary: "Structured summary with ## titles, bullet points, one idea per line",
  flashcards: [
    { front: "Question", back: "Answer", difficulty: "easy|medium|hard" }
    // 6 flashcards: 2 easy, 3 medium, 1 hard
  ],
  quizQuestions: [
    {
      question: "MCQ question",
      options: ["A", "B", "C", "D"],
      correctAnswer: 0, // index 0-3
      explanation: "Why this answer"
    }
    // 4 questions
  ]
}
```

**Benefits**:
- Single API call instead of 4 (75% cost reduction)
- Coherent content (generated together)
- API key secured server-side only

### Backend AI Services

**`/backend/src/services/openaiService.js`** - Whisper & Vision

```javascript
transcribeAudio(filePath)        // Whisper transcription
extractTextFromImage(base64)     // GPT-4 Vision OCR (single image)
extractTextFromImages(base64[])  // Multi-image OCR (parallel via Promise.all())
```

**`/backend/src/services/contentGenerationService.js`** - Content Generation

```javascript
generateEducationalContent(content)  // Generate title + summary + flashcards + quiz
```

### Frontend OpenAI Service (`/src/services/openaiService.js`)

Calls backend for content generation (no mock mode - always uses real API).

```javascript
// Main function (calls backend /api/ai/generate-content)
generateComplete(content)        // Returns { title, summary, flashcards, quizQuestions }
```

**Environment Variables** (frontend `.env`):
- `VITE_API_URL=https://mirora.cloud/api` - Backend API URL

### Security

- **API Key Protection**: OpenAI API key stored only in `backend/.env`, never exposed to frontend
- **Authentication Required**: All AI endpoints require valid JWT token
- **File Validation**: Audio uploads validated for type and size
- **Content Validation**: Min 50 chars, max 100,000 chars for content generation

## Folders System

Organizational system for grouping syntheses into folders. Accessible from Profile page.

### Database Schema

```sql
-- folders: User-created folders with custom colors
folders (id, user_id, name, color, created_at, updated_at)

-- folder_syntheses: Many-to-many relationship
folder_syntheses (folder_id, synthese_id, added_at)
```

### API Endpoints (`/api/folders/`)

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/` | List all folders for current user |
| POST | `/` | Create new folder (name, color) |
| GET | `/:id` | Get single folder |
| PATCH | `/:id` | Update folder name/color |
| DELETE | `/:id` | Delete folder (syntheses kept) |
| GET | `/:id/syntheses` | Get syntheses in folder |
| POST | `/:id/syntheses` | Add syntheses to folder |
| DELETE | `/:id/syntheses/:syntheseId` | Remove synthese from folder |
| GET | `/:id/available-syntheses` | Get syntheses not in folder |

### Frontend Components

**`/src/components/Folders/`**
- `FolderCard.jsx` - Folder item with color, name, syntheses count
- `CreateFolderModal.jsx` - Modal to create folder with color picker
- `AddSynthesesModal.jsx` - Modal to select and add syntheses

**`/src/pages/FolderDetail.jsx`**
- View folder contents
- Add/remove syntheses
- Rename/delete folder

**`/src/services/folderService.js`**
```javascript
getAllFolders()
getFolder(id)
createFolder({ name, color })
updateFolder(id, { name, color })
deleteFolder(id)
getSynthesesInFolder(folderId)
addSynthesesToFolder(folderId, syntheseIds)
removeSyntheseFromFolder(folderId, syntheseId)
getAvailableSyntheses(folderId)
```

### Routes

| Path | Page | Description |
|------|------|-------------|
| `/profile` | Profile | Shows folder list with create button |
| `/folders/:id` | FolderDetail | View/manage folder contents |

### Preset Colors

8 preset colors available: Indigo (#6366f1), Rose (#f43f5e), Emerald (#10b981), Amber (#f59e0b), Violet (#8b5cf6), Cyan (#06b6d4), Pink (#ec4899), Lime (#84cc16)

## Push Notifications System

Daily reminder notifications sent at 18:00 (Europe/Paris) to remind users of incomplete daily goals.

### Philosophy

- **Non-intrusive**: Maximum 1 notification per day
- **Respectful**: Neutral tone, no guilt or pressure
- **Optional**: User must explicitly enable notifications
- **Smart**: Only sent when objectives are incomplete

### Notification Conditions

A notification is sent ONLY if ALL conditions are true:
1. User has enabled notifications (toggle in Settings)
2. User has at least one daily goal defined
3. Daily progress < 100%
4. Daily reward not yet claimed
5. Notification not already sent today

### Database Schema

```sql
-- Added to users table
notifications_enabled BOOLEAN DEFAULT FALSE
last_notification_sent_at DATE NULL

-- Push subscriptions table
push_subscriptions (id, user_id, endpoint, p256dh, auth, created_at)

-- Daily progress sync table
daily_progress (id, user_id, daily_goals JSON, progress_percentage, reward_claimed, progress_date)
```

### Backend Services

**`/backend/src/services/notificationService.js`**
- `saveSubscription(userId, subscription)` - Save push subscription
- `removeSubscription(userId)` - Remove subscription
- `setNotificationsEnabled(userId, enabled)` - Toggle notifications
- `sendNotification(userId, title, body)` - Send push notification
- `getEligibleUsersForNotification()` - Get users who should receive notification
- `sendDailyReminders()` - Send notifications to all eligible users (called by cron)

**`/backend/src/services/dailyProgressRepository.js`**
- `syncDailyProgress(userId, data)` - Sync frontend progress to backend (includes study times)
- `getDailyProgress(userId)` - Get current day progress
- `getFullDailyProgress(userId)` - Get daily stats + study history for initial load
- `saveStudyHistory(userId, date, seconds)` - Save study time when day changes
- `getStudyHistory(userId)` - Get last 30 days study history

**`/backend/src/cron/notificationCron.js`**
- Runs at 18:00 Europe/Paris every day
- Calls `sendDailyReminders()` to notify eligible users

### API Endpoints (`/api/notifications/`)

| Method | Route | Description | Auth |
|--------|-------|-------------|------|
| GET | `/vapid-public-key` | Get VAPID public key | No |
| GET | `/settings` | Get notification settings | Yes |
| PATCH | `/settings` | Enable/disable notifications | Yes |
| POST | `/subscribe` | Subscribe to push | Yes |
| POST | `/unsubscribe` | Unsubscribe from push | Yes |
| POST | `/sync-progress` | Sync daily progress + study times | Yes |
| GET | `/daily-progress` | Get full daily progress for initial load | Yes |
| POST | `/study-history` | Save study history when day changes | Yes |

### Frontend Integration

**`/src/services/notificationService.js`**
- `isPushSupported()` - Check browser support
- `subscribeToPush()` - Request permission and subscribe
- `unsubscribeFromPush()` - Unsubscribe
- `syncDailyProgress(goals, progress, claimed)` - Sync to backend

**`/public/sw.js`** - Service Worker for receiving push notifications

**Settings Page** - Toggle to enable/disable notifications

### Notification Messages

Random neutral messages (French):
- "Il te reste un objectif aujourd'hui"
- "Tu es proche de completer ta journee"
- "Encore un petit pas pour aujourd'hui"
- "Un objectif t'attend encore"
- "Ta progression du jour n'est pas finie"

### Environment Variables (Backend)

```env
VAPID_PUBLIC_KEY=<public_key>
VAPID_PRIVATE_KEY=<private_key>
VAPID_SUBJECT=mailto:contact@mirora.cloud
```

## Email System

Transactional email system for password reset and email verification.

### Current Status: CONFIGURED

Email sending is fully configured and working via Resend.

### Service

Uses **Resend** (`/backend/src/services/emailService.js`) for sending emails.

### Email Types

| Email | Trigger | Expiry |
|-------|---------|--------|
| Password Reset | User clicks "Mot de passe oublie" | 1 hour |
| Email Verification | User registers new account | 1 hour |

### Configuration Options

**Option 1: Resend with custom domain (recommended)**
- Verify `mirora.cloud` in Resend dashboard
- Add DNS records (SPF, DKIM) provided by Resend
- Use `FROM_EMAIL=Nora <noreply@mirora.cloud>`

**Option 2: SMTP (Outlook, Gmail, etc.)**
- Replace Resend with Nodemailer
- Configure SMTP credentials in `.env`
- Requires app password for accounts with 2FA

### Environment Variables (Backend)

```env
# Resend configuration
RESEND_API_KEY=<resend_api_key>
FROM_EMAIL=Nora <noreply@mirora.cloud>
```

### Email Templates

Both emails use dark-themed HTML templates matching the app design:
- Background: `#0f172a` (slate-900)
- Card: `#1e293b` (slate-800)
- Button: `#38bdf8` (sky-400)
- Logo: `/nora-logo.png`

### Backend Functions

```javascript
// emailService.js
sendPasswordResetEmail(email, token, language)     // Send reset link with ?lang= param
sendVerificationEmail(email, token, name, language) // Send verification link with ?lang= param
```

**Language in Email Links**: Email links include `?lang=${language}` query param so the unauthenticated verification/reset pages display in the user's selected language. The frontend pages (`VerifyEmail.jsx`, `ResetPassword.jsx`) read this param via `useSearchParams()` and call `i18n.changeLanguage()`.

### Auth Flow Integration

- `register()` → sends verification email automatically
- `forgotPassword()` → sends reset email
- `resendVerificationEmail()` → resend verification if needed
- Errors are logged but don't block user creation

## Guided Revision Program (Feuille Blanche)

A structured revision system based on the active recall / blank sheet technique, linked to each synthese.

### Overview

The revision program follows 5 phases with **8 total attempts**:

| Phase | Duration | Description |
|-------|----------|-------------|
| 1. Study | 10 min | Review synthese, flashcards, quiz (3 tabs) |
| 2. Pause | 2 min | Forced break with countdown timer |
| 3. Recall | No limit | Write or dictate from memory |
| 4. Loop | 1 min, Max 8x | Re-read missing concepts (highlighted in red), auto-continues when timer ends |
| 5. Loop Pause | 2 min | Break between loop and next recall attempt |
| 6. Complete | - | Shows percentage, progress bar, and message based on score |

**Flow**: Study → Pause → Recall → Loop → Loop Pause → Recall → Loop → ... → Complete

### Evaluation Rules - Conceptual Understanding

The AI evaluates **conceptual understanding**, not form. Vocabulary, style, syntax don't matter - only whether the user understood and expressed the MEANING of each notion.

**Fundamental Principles**:

| Principle | Description |
|-----------|-------------|
| **Per-Attempt** | Each attempt evaluated independently, no memory between attempts |
| **Two States** | ✅ RETAINED (green) or ❌ NOT RETAINED (red) - no intermediate state |
| **Deterministic** | Same response = same verdict, always. No variability. |

**Rule 1 - Error vs Imprecision**:
- **BLOCKING ERROR** (= INVALID): Contradiction, false/absurd info, inverted relation
- **IMPRECISION** (= NOT RETAINED): Vague without contradiction, missing details but correct direction

Examples:
- Reference: "Cellular respiration releases energy"
- ❌ INVALID: "releases poop" (false information)
- ❌ NOT RETAINED: "releases something" (too vague)
- ✅ RETAINED: "it produces energy" (meaning preserved)

**Rule 2 - Essential Ideas**:
- Each notion has 1-3 essential ideas
- ALL essential ideas must be present and correct for RETAINED status
- Missing 1+ essential idea = NOT RETAINED

**Rule 3 - Meaning Priority**:
ACCEPT if meaning preserved:
- Synonyms and reformulations
- Casual/simplified language
- Different order of elements
- Missing technical terms if idea is there

REJECT if meaning altered:
- Contradiction or logical inversion
- Essential element missing
- False information introduced

Examples of equivalent expressions:
- "en cas de pénurie d'oxygène" = "quand y'a pas assez d'O2" = "sans oxygène" → SAME MEANING
- "24h/24" = "tout le temps" = "en permanence" → SAME MEANING

**Rule 4 - Blocking Errors**:
These errors invalidate the ENTIRE notion even if other parts are correct:
- Key term replaced by FALSE or ABSURD term
- INVERTED causal relationship
- Attribution to wrong entity

**Rule 5 - Mandatory Coverage**:
- Every important notion must appear in exactly ONE of the two arrays
- Notion not mentioned = NOT RETAINED
- Notion with just keywords without relation = NOT RETAINED

### Final Attempt (Attempt 8) - Specific Behavior

Instead of congratulations and summary re-read, shows:
- **Percentage**: Based on retained/total notions
- **Progress bar**: Filled proportionally to percentage
- **Message based on percentage**:
  - 0-10%: "Réessaye, tu peux t'améliorer."
  - 10-50%: "Réessaye, n'abandonne pas."
  - 50-70%: "Tu connais déjà pas mal de matière. Continue."
  - 70-99%: "Bravo, tu as acquis une très grosse partie de la matière."
  - 100%: "Bravo, tu maîtrises cette synthèse."

### Key Features

**Simplified Flow**:
- After Recall, AI analysis runs in background (loading screen shown)
- No separate "Compare" phase - goes directly to Loop (if missing concepts) or Complete
- Loop phase shows message: "Vert = acquis. Rouge = à revoir. Concentre-toi sur les parties en rouge."
- Loop auto-continues to next iteration when timer ends (no manual button)

**Full Text Coloring (No Neutral Text)**:
- In Loop phase, ALL text is colored - no neutral/uncolored text allowed
- GREEN = notions explicitly mentioned or correctly reformulated by user
- RED = EVERYTHING ELSE (not just identified missing concepts)
- Principle: anything not explicitly recognized as understood is considered not retained
- This provides instant visual feedback on what's acquired vs needs work

**Summary Pagination**:
- Study phase and Loop phase both support pagination for long summaries
- Same pagination system as StudyDetail (2500 chars per page)
- Navigation buttons (prev/next) and page indicators
- In Loop phase, highlighting (green/red) is correctly applied per page

**Exit Button (X)**:
- All phases (Study, Pause, Recall, Loop) have a close button (X) in the header
- Shows confirmation modal before stopping the session

**Session Persistence**:
- Session survives page refresh, app close, browser restart
- Based on timestamps stored in database
- Expires after 15 minutes of inactivity → "Vous êtes revenu trop tard"
- Syncs to backend every 5 seconds

**Real-Time Timers**:
- Timers use `phase_started_at` timestamp to calculate remaining time
- Time continues even when phone is locked or app is in background
- On return, timer shows actual remaining time (not where it paused)
- Uses `useRevisionTimer(totalDuration, phaseStartedAt, onComplete, isActive)` hook
- `phase_started_at` is updated on every phase transition

**Exit Confirmation**:
- `beforeunload` event warns when closing browser/tab during active session
- `RevisionContext` tracks active revision state globally
- `MobileWrapper` intercepts navigation clicks and shows `window.confirm()` dialog
- Message: "Une session de révision est en cours. Si tu quittes, ta progression sera perdue."
- Only active during revision phases (not on complete or expired)

**Semantic Comparison (AI)**:
- Runs in background after Recall phase (shows loading screen)
- Accepts reformulations (complete ideas with explicit relations)
- REJECTS keyword-only answers without relations
- User's "important elements" (from import specificInstructions) MUST be present
- Results used to highlight missing concepts in red in Loop phase

**No XP Reward**: Completing a revision does not give XP (per user request)

### Route

| Path | Page | Description |
|------|------|-------------|
| `/study/:id/revision` | StudyRevision | Guided revision program |

### Database Schema

```sql
-- revision_sessions: Active revision session state
revision_sessions (id, user_id, synthese_id, phase, phase_started_at, study_time_remaining,
                   pause_time_remaining, current_iteration, user_recall, missing_concepts JSON,
                   understood_concepts JSON, last_activity_at, started_at, completed_at)

-- revision_completions: History of completed revisions
revision_completions (id, user_id, synthese_id, iterations_count, completed_at)

-- syntheses: Added specific_instructions column for important elements
syntheses.specific_instructions TEXT -- User-defined important elements
```

### API Endpoints (`/api/revision/`)

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/:syntheseId/session` | Get active session or null (checks 15min expiration) |
| POST | `/:syntheseId/start` | Start new session |
| PATCH | `/:syntheseId/sync` | Sync state (timer, phase, iteration) |
| POST | `/:syntheseId/recall` | Submit user recall text |
| POST | `/:syntheseId/compare` | Run AI semantic comparison |
| POST | `/:syntheseId/next-iteration` | Move to next loop iteration |
| POST | `/:syntheseId/complete` | Mark session complete |
| DELETE | `/:syntheseId/stop` | Stop/cancel session |
| GET | `/:syntheseId/completions` | Get completion count |

### Frontend Components

**`/src/pages/StudyRevision.jsx`** - Main container managing phase transitions
- Handles `analyzing` phase (loading screen while AI comparison runs)
- All phase transitions update `phase_started_at` for timer accuracy

**`/src/components/Revision/`**:
- `RevisionStudyPhase.jsx` - Phase 1: Timer with tabs (Synthèse, Flashcards, Quiz), X button
- `RevisionPausePhase.jsx` - Phase 2: Forced 2-minute break with timer, X button
- `RevisionRecallPhase.jsx` - Phase 3: Textarea + voice recorder, no timer, X button
- `RevisionLoopPhase.jsx` - Phase 4: Show missing concepts in red only (no orange), auto-continues on timer end, X button
- `RevisionCompletePhase.jsx` - Phase 5: Shows percentage, progress bar, message based on score (no confetti)
- `RevisionComparePhase.jsx` - **REMOVED** (comparison now runs in background)

**`/src/hooks/useRevisionTimer.js`** - Real-time countdown timer based on phase_started_at timestamp

**`/src/context/RevisionContext.jsx`** - Global context for revision state (used by MobileWrapper to block navigation)

**`/src/services/revisionService.js`** - API calls to revision endpoints

### Backend Services

**`/backend/src/services/revisionRepository.js`** - Database operations for sessions

**`/backend/src/services/revisionCompareService.js`** - AI semantic comparison using GPT-4o-mini

### i18n Keys

All revision UI text is translated under `revision.*` namespace in both `fr.json` and `en.json`.

### Migrations

- `014_create_revision_sessions.sql` - Creates revision_sessions and revision_completions tables
- `015_add_specific_instructions.sql` - Adds specific_instructions column to syntheses
- `017_add_phase_started_at.sql` - Adds phase_started_at timestamp for real-time timer calculation
