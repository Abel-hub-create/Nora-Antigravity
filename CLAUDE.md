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

**Nora** is a bilingual (French/English) gamified learning app built as a responsive React SPA (mobile-first design).

### Tech Stack
- React 19 + Vite 7
- React Router DOM for routing
- Tailwind CSS with custom dark theme (slate-based)
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
| Moyenne par jour | `getAverageDailyStudyTime()` | Average study time in minutes (today + last 30 days history) |
| Synthèses | API `/syntheses` | Total count of user's syntheses |

## Internationalization (i18n)

The app is **fully bilingual** (French/English) using i18next. All UI text is translated.

### Structure

```
src/i18n/
├── index.js              # i18next configuration
└── locales/
    ├── fr.json           # French translations (~400 keys)
    └── en.json           # English translations (~400 keys)
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
- Component: `/src/components/Settings/LanguageSelector.jsx`
- Stored in localStorage under `nora_language`
- Detects browser language on first visit, defaults to French

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
   - Goals completion status resets
   - Total XP/levels/eggs NEVER reset
   - Previous day's total study time saved to history (for average calculation)

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

Custom colors defined in `tailwind.config.js`:
- `background` / `surface` - Dark slate backgrounds
- `primary` / `primary-dark` - Sky blue accents
- `secondary` - Indigo accents
- `text-main` / `text-muted` - Light text variants

### Global CSS (`/src/index.css`)

```css
body {
  @apply bg-background text-text-main font-sans antialiased;
}
```

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
| `/reset-password/:token` | ResetPassword | Set new password with reset token |
| `/verify-email-sent` | VerifyEmailSent | Shows after registration, prompts to check email (1h expiry) |
| `/verify-email/:token` | VerifyEmail | Verifies email from link. Shows: "Compte active" (success), "Compte deja actif" (already verified), "Lien expire" (token expired), or error |

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
| PATCH | `/profile` | Update user name and avatar (requires auth) | No |
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
getFlashcards(syntheseId)
getQuizQuestions(syntheseId)
updateQuizProgress(syntheseId, questionId, isCorrect)
```

### Date Display

Syntheses display their full creation date (not relative time like "Il y a 3 jours"):
- **French**: "9 janvier 2026"
- **English**: "January 9, 2026"

Shown in both `/study` (list) and `/study/:id` (detail) pages.

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
```

## Import System

Multi-modal content import system supporting text, voice, and photo input. All AI features are powered by OpenAI APIs with the API key secured server-side.

### Input Methods

| Method | Component | Technology |
|--------|-----------|------------|
| Text | `Import.jsx` | Direct text input/paste |
| Voice | `VoiceRecorder.jsx` | OpenAI Whisper API (via backend) |
| Photo | `PhotoCapture.jsx` | OpenAI GPT-4 Vision API (via backend) |

### Flow

```
Import Page (text/voice/photo)
       ↓
   Specific Instructions Prompt (optional)
       ↓
   /process (AI generation)
       ↓
   POST /api/syntheses
       ↓
   /study/:id
```

### Specific Instructions Feature

After capturing content via voice or photo, users can optionally specify elements to include in the summary, flashcards, and quiz.

**Flow**:
1. User captures content (voice/photo)
2. Intermediate screen appears: "Do you want to mention specific elements?"
3. If "No" → Continue directly to generation
4. If "Yes" → Text field appears to write instructions
5. Instructions are passed to AI generation

**Rules**:
- Only elements that **exist in the original content** will be included
- AI will NOT invent or add information not present in the course
- Instructions are prioritized but must be faithful to source material

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
- Multi-photo capture from camera
- Gallery import button (select multiple images from device)
- Sends images to backend for GPT-4 Vision OCR
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

**Summary Generation Rules**:
- Vraie synthese structuree (pas ultra-court, pas reformulation longue)
- Plus courte que l'original mais assez developpee pour reviser
- Conserve: notions importantes, definitions cles, regles, mecanismes, liens logiques
- Supprime: exemples secondaires, anecdotes, repetitions
- Format obligatoire: titres clairs (## Titre), bullet points, paragraphes courts, une idee par ligne
- Chaque idee importante expliquee en 1-2 phrases max
- Objectif: relire et comprendre sans retourner au texte original

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
extractTextFromImage(base64)     // GPT-4 Vision OCR
extractTextFromImages(base64[])  // Multi-image OCR
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
sendPasswordResetEmail(email, token)     // Send reset link
sendVerificationEmail(email, token, name) // Send verification link
```

### Auth Flow Integration

- `register()` → sends verification email automatically
- `forgotPassword()` → sends reset email
- `resendVerificationEmail()` → resend verification if needed
- Errors are logged but don't block user creation

## Guided Revision Program (Feuille Blanche)

A structured revision system based on the active recall / blank sheet technique, linked to each synthese.

### Overview

The revision program follows 6 strict phases that cannot be skipped:

| Phase | Duration | Description |
|-------|----------|-------------|
| 1. Study | 10 min | Review synthese, flashcards, quiz (3 tabs) |
| 2. Pause | 5 min | Forced break with countdown timer |
| 3. Recall | No limit | Write or dictate from memory |
| 4. Compare | - | AI semantic comparison (green=understood, red=missing) |
| 5. Loop | Max 5x | Re-read missing concepts, repeat recall |
| 6. Complete | - | Success message, session recorded |

### Key Features

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

**Exit Confirmation**:
- `beforeunload` event warns when closing browser/tab during active session
- `RevisionContext` tracks active revision state globally
- `MobileWrapper` intercepts navigation clicks and shows `window.confirm()` dialog
- Message: "Une session de révision est en cours. Si tu quittes, ta progression sera perdue."
- Only active during revision phases (not on complete or expired)

**Semantic Comparison (AI)**:
- Accepts reformulations and synonyms
- Stricter on definitions
- User's "important elements" (from import specificInstructions) MUST be present
- Detailed feedback: each concept annotated with userText ↔ originalText mapping

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

**`/src/components/Revision/`**:
- `RevisionStudyPhase.jsx` - Phase 1: 10min timer with tabs (Synthèse, Flashcards, Quiz)
- `RevisionPausePhase.jsx` - Phase 2: 5min forced break
- `RevisionRecallPhase.jsx` - Phase 3: Textarea + voice recorder
- `RevisionComparePhase.jsx` - Phase 4: AI comparison display (green/red)
- `RevisionLoopPhase.jsx` - Phase 5: Show missing concepts, retry
- `RevisionCompletePhase.jsx` - Phase 6: Success with confetti

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
