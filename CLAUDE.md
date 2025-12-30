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

## Study Time & XP System

Comprehensive daily study time tracking with XP rewards. Data persists in localStorage and resets at midnight.

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

### Timer Integration

Pages using the timer:
- `StudyDetail.jsx` → `useActiveTimer('summary')`
- `StudyFlashcards.jsx` → `useActiveTimer('flashcards')`
- `StudyQuiz.jsx` → `useActiveTimer('quiz')`

### localStorage Keys

- `nora_dailyStats` - Daily time counters and XP flags
- `nora_dailyGoals` - User's daily goal configuration
- `nora_dailyGoalsRewardClaimed` - Whether 10XP goals bonus was claimed

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

- `MobileWrapper` - Phone frame UI with status bar and bottom navigation
- `UserProvider` - Global state provider wrapping entire app

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
   /process (AI generation)
       ↓
   POST /api/syntheses
       ↓
   /study/:id
```

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

**`/src/components/Import/PhotoCapture.jsx`**
- Camera access via getUserMedia
- Multi-photo capture
- Sends images to backend for GPT-4 Vision OCR
- Progress indicator during processing
- Combined text extraction from multiple photos

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

**Nora Prompt Characteristics**:
- Calm, structured, pedagogical tone
- Simple and accessible language (no jargon)
- Neutral and supportive (no emojis)
- Faithful to original course content
- Coherent output: summary, flashcards, and quiz are linked

**Output Structure**:
```javascript
{
  title: "Short title (max 50 chars)",
  summary: "200-400 words structured summary",
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
- `syncDailyProgress(userId, data)` - Sync frontend progress to backend
- `getDailyProgress(userId)` - Get current day progress

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
| POST | `/sync-progress` | Sync daily progress | Yes |

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
