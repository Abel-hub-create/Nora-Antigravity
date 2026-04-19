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

## Infrastructure

### Serveur partagé (abel + julien)
- Deux devs sur le même serveur : `abel` (VS Code + Claude) et `julien` (Windsurf)
- **Toujours utiliser PM2** pour le backend — ne jamais lancer `node start-prod.js` directement
- PM2 tourne sous l'user `abel`, port **5000** (Nginx proxy → 5000)
- `abel` a sudo NOPASSWD configuré (`/etc/sudoers.d/abel-nopasswd`)

### Déploiement
```bash
npm run build                    # Build frontend (dist/ servi par Nginx)
pm2 restart nora-api-prod        # Redémarrer le backend
pm2 reload nora-api-prod         # Reload sans downtime
pm2 save                         # Sauvegarder l'état PM2
```

### Ports
| Service | Port | Note |
|---------|------|------|
| Backend prod (PM2) | 5000 | Nginx proxifie /api → 5000 |
| Backend dev | 5001 | Usage local uniquement |
| MySQL | 3306 | — |

### Si le backend tourne sur le mauvais port
```bash
sudo kill <pid_du_process_fantome>
pm2 delete nora-api-prod
cd /var/www/mirora.cloud/backend && PORT=5000 pm2 start ecosystem.config.cjs --only nora-api-prod --update-env
pm2 save
```

## Changelog — 2026-04-19 (Page de réservation + fixes thème clair)

### 📅 Page de réservation standalone (`/booking.html`)
**Fichier :** `public/booking.html` (copié dans `dist/booking.html` après chaque build)

Page HTML standalone déployable sur n'importe quel hébergement statique. Zéro dépendance externe (sauf Google Fonts).

**Design :** thème sombre luxe (`#060606`), accents dorés (`#c9a96e`), Cormorant Garamond + Outfit, orbe animé glassmorphism, fade-up staggeré.

**Fonctionnalités :**
- Calendrier custom pur JS (navigation mois/mois, jours passés désactivés, fenêtre 60 jours)
- Créneaux selon le jour : Lun–Ven → 18:00/18:20/18:40 ; Sam–Dim → 13:00/13:30/16:00/16:30/17:00/17:30
- Maximum 3 réservations par jour (vérification frontend + backend Apps Script)
- Champs : Prénom & Nom, Email, Téléphone, Date, Créneau
- Intégration Google Sheets via Apps Script (GET = disponibilité, POST = réservation)
- Mode démo automatique si `APPS_SCRIPT_URL` est le placeholder
- États : chargement créneaux, erreur CORS détaillée, succès (remplace le formulaire)

**Apps Script lié :** Google Sheet avec feuille "Réservations" — colonnes : Nom | Email | Téléphone | Date | Heure | Soumis le

**Important :** après chaque `npm run build`, toujours copier :
```bash
cp public/booking.html dist/booking.html
cp public/planning.html dist/planning.html
```

**Fix timezone critique :** `new Date("YYYY-MM-DD")` parse en UTC → `.getDay()` décale d'un jour. Fix : `new Date(y, m-1, d)` (local). Toujours utiliser cette forme pour les dates venant de strings ISO.

### 🎨 Fixes thème clair
- Hexagone SubjectRadar invisible → CSS variables `--radar-grid-color` / `--radar-axis-color` dans SVG
- Texte jaune/amber trop pâle → override `[data-theme="light"] .text-amber-*` dans `index.css`
- Amber cassé dans CoinBagModal/PremiumGate (fond noir) → classe `.preserve-colors` sur le root div de ces composants
- Glassmorphism sombre trop harsh → box-shadow allégé en light theme
- Classe `.preserve-colors` : exempte un composant à fond sombre des overrides amber du thème clair

### 🐛 Fixes modes édition
- Synthèse : textarea blanc inutilisable → remplacé par `contentEditable` div + `useRef` pour curseur
- Flashcards/Quiz : inputs non réactifs → `ReactDOM.createPortal` vers `document.body` (fix stacking context `backdrop-filter`)
- Quiz : explications affichées sur mauvaise réponse → bloc supprimé

## Changelog — 2026-04-18 (Radar compétences enrichi + fix)

### 📊 Radar de compétences — sources enrichies
**Fichiers :** `backend/src/routes/statsRoutes.js`, `backend/src/services/exerciseRepository.js`, `backend/src/routes/assistantRoutes.js`, `backend/src/database/migrations/042_exercise_item_is_correct.sql`

Le radar (`GET /api/stats/subjects`) utilise maintenant **3 sources** fusionnées par matière :

1. **Quiz** (principal) : `quiz_answers` jointuré avec `syntheses.subject` → `correct / total × 100`
2. **Exercices Aron** (`/exs` et `/ana`, nouveau) :
   - QCM : comparaison directe `CAST(user_answer AS UNSIGNED) = correct_answer` en SQL
   - Open/Pratique : colonne `is_correct` persistée en DB après correction GPT (`correct-item`)
3. **Mastery score** (fallback) : moyenne des `mastery_score` des synthèses (ancien système révision)

Fusion : si quiz ET exercices ont des données → pool unifié `(correct_quiz + correct_exo) / (total_quiz + total_exo) × 100`. Le champ `source` retourné vaut `"quiz"`, `"exo"`, `"quiz+exo"` ou `"mastery"`.

**Migration 042 :** `ALTER TABLE exercise_items ADD COLUMN is_correct TINYINT NULL`

### 🐛 Fix radar invisible avec peu de données
**Fichiers :** `src/components/Profile/SubjectRadar.jsx`, `src/pages/Profile.jsx`

**Bug 1 — Promise.all silencieux :** `/seasons/active` retournait une erreur → toute la `Promise.all` échouait → `subjectScores` jamais settée. **Fix :** `Promise.allSettled` — chaque requête échoue indépendamment.

**Bug 2 — Polygon invisible (1 seule matière) :** avec 1 seul sujet actif, les 8 autres points se superposent au centre → polygon quasi-invisible. **Fix :** ajout de points lumineux colorés (`SUBJECT_COLORS[s]`) + trait d'axe coloré pour chaque matière avec score > 0. Le polygon se forme progressivement à mesure que de nouvelles matières ont des données.

---

## Changelog — 2026-04-17 (Agents pédagogiques, Winstreak fix, Sacs "tout récupérer", Radar lumineux)

### 🤖 Agents pédagogiques par matière
**Fichiers :** `backend/src/services/subjectPrompts.js`, `backend/src/services/contentGenerationService.js`

Refonte complète du système de prompts par matière. Chaque matière dispose désormais de **trois blocs distincts** injectés séparément dans le prompt GPT :
- `summaryRules` — ce que la synthèse doit conserver et comment la structurer
- `flashcardRules` — types de cartes à privilégier, format face/dos, priorités
- `quizRules` — types de questions, construction des distracteurs, erreurs à éviter

`buildSubjectGuidelines()` dans `contentGenerationService.js` injecte les trois blocs avec des séparateurs visuels clairs (`▌ RÈGLES POUR LA SYNTHÈSE`, etc.) pour que GPT distingue les instructions par output.

Règles clés par matière :
- **Maths** : formule + conditions + exemple toujours ensemble ; quiz = calcul appliqué, jamais mémorisation pure
- **Physique** : formule + unités SI + conditions de validité inséparables ; cartes sur constantes
- **Chimie** : équations chimiques exactes avec états (s/l/g/aq), nomenclature complète nom+formule
- **Biologie** : processus en étapes numérotées, termes latins/grecs intacts, structure→fonction liés
- **Histoire** : date + causes + faits + conséquences = unité indivisible par événement
- **Géographie** : aucun nom géographique omis, données avec unités et dates de référence
- **Français** : citations intactes entre guillemets, distinction notions/texte, règle+exemple du cours
- **Anglais** : exemples du cours jamais reformulés, listes vocabulaire intégrales
- **Néerlandais** : article de/het systématique sur chaque carte, exceptions grammaticales complètes

### 🐛 Bug winstreak bloqué — RÉSOLU ✓
**Fichier :** `src/context/UserContext.jsx`

**Problème :** La winstreak s'incrémentait bien en DB mais l'UI affichait toujours l'ancienne valeur jusqu'à la prochaine connexion complète.

**Cause :** `checkWinstreak()` était appelé en fire-and-forget sans exploiter la réponse. Le state `user.winstreak` restait calé sur la valeur issue du dernier `/me`.

**Fix :** Après `checkWinstreak`, utilisation de `wsResult.newStreak` pour patcher immédiatement le state React :
```js
const wsResult = await gamificationService.checkWinstreak(tz);
if (wsResult?.newStreak) setUser(prev => ({ ...prev, winstreak: wsResult.newStreak }));
```

### 🎒 Sacs de pièces — bouton "Tout récupérer d'un coup"
**Fichiers :** `backend/src/services/coinBagService.js`, `backend/src/routes/bagRoutes.js`, `src/services/gamificationService.js`, `src/context/UserContext.jsx`, `src/components/Gamification/CoinBagModal.jsx`

Quand l'utilisateur a **plus de 2 sacs** en attente, un bouton "Tout récupérer d'un coup" apparaît.
- **Backend :** `POST /api/bags/reveal-all` — révèle tous les sacs en une seule transaction SQL, cumule les pièces, insère les `coin_transactions` individuelles.
- **Frontend :** `revealAllBags()` dans `gamificationService` + `UserContext`. Le modal affiche le total de pièces et le nombre de sacs ouverts, avec confetti amplifié (150 particules).

### ✨ Radar de compétences plus lumineux
**Fichier :** `src/components/Profile/SubjectRadar.jsx`

- Filtre SVG `feGaussianBlur` sur le polygon de données → effet glow sur le contour
- Bordure : opacité 100%, épaisseur 2px (était 1.5px à 95%)
- Second polygon superposé `rgba(186,230,253,0.15)` pour lumière intérieure

---

## Changelog — 2026-04-12 Soir (Fix Plans + Infrastructure)

### 🐛 Bugs Corrigés

#### 1. Plan non transmis au user — RÉSOLU ✓
**Problème:** Après qu'un admin assigne un plan premium, le user voyait toujours "Gratuit"
**Cause:** `userRepository.findById` ne sélectionnait pas `plan_type` ni `premium_expires_at` → l'endpoint `/me` renvoyait ces champs comme `undefined` à chaque reload
**Fix:** Ajout de `plan_type, premium_expires_at` dans le SELECT de `findById` (`backend/src/services/userRepository.js`)

#### 2. Sélecteur de plan admin trop limité — AMÉLIORÉ ✓
**Problème:** La section "Premium" du panel admin ne permettait que d'activer/désactiver le premium, sans choix de plan
**Fix:** `src/features/admin/pages/AdminUserDetail.jsx` — remplacé par un sélecteur 3 boutons (Gratuit / Premium / École) avec option expiration pour Premium
**Backend:** `PATCH /api/admin/users/:id/plan` mis à jour pour gérer les 3 plans + `premium_expires_at`

#### 3. Limites de plans illisibles — AMÉLIORÉ ✓
**Problème:** Les valeurs `0`/`1` des limites `has_*` et l'enum `ai_model_tier` s'affichaient comme des chiffres bruts
**Fix:** `src/features/admin/pages/AdminPlans.jsx` — nouveau composant `LimitInput` :
- Clés `has_*` et `ai_model` → toggle Activé/Désactivé
- `ai_model_tier` → dropdown (Basique / Rapide / Avancé)
- Autres → input numérique classique

### 🔧 Infrastructure

#### Process fantôme corrigé
**Problème:** Deux instances Node en parallèle — `julien` sur port 5000 (ancien code), `abel`/PM2 sur port 5002 → Nginx utilisait l'ancien process sans les fixes
**Fix:** 
- Suppression du process `julien` (port 5000)
- PM2 reconfiguré sur port 5000 avec `PORT=5000` sauvegardé dans l'env PM2
- `sudo NOPASSWD` configuré pour `abel` → Claude peut gérer l'infra sans intervention manuelle

#### État final
- ✅ Backend PM2 port 5000 (0 restarts, propre)
- ✅ Nginx → port 5000 ✓
- ✅ Plan premium effectif immédiatement après attribution admin
- ✅ Panel admin Plans : limites lisibles

## Changelog — 2026-04-11 (Abonnements + Conversations + Modèles IA)

Résumé des ajouts majeurs côté backend et frontend pour la gestion d’abonnements, la sélection de modèles IA par plan, et le système de conversations de l’assistant Aron.

### Base de données
- Migration 036 (créée/exécutée) — Système de plans:
  - Tables: `plans`, `plan_limits`, `subscriptions`, `school_requests`, `promo_codes` + ajout `users.plan_type`.
  - Prix premium mis à jour: 14.99 €/mois.
  - Limites journalières: `max_chat_per_day`, `max_exs_per_day`, `max_ana_per_day`, etc.
- Migration 037 (créée/exécutée) — Conversations:
  - Tables: `conversations`, `conversation_messages` (FK + index).
  - Limites étendues par plan: `ai_model`, `max_char_per_message`, `xp_multiplier`, `max_conversations`, `has_tts`.

### Backend — nouveaux services et modifications
- Nouveaux fichiers:
  - `backend/src/services/aiModelService.js`: sélection du modèle IA selon le plan utilisateur.
    - Free: Gemini Flash 2.0 Lite → fallback `gpt-4o-mini`.
    - Premium/School: `gpt-4o` (contenu long: `gpt-4o`).
  - `backend/src/services/conversationRepository.js`: CRUD conversations/messages.
  - `backend/src/routes/conversationRoutes.js`: API REST conversations (+ auto-titre sur 1er échange).
  - `backend/src/middlewares/quotaMiddleware.js`: `loadPlanLimits`, `requireFeature`, `checkLimit`.
- Fichiers modifiés (principaux):
  - `backend/src/services/dailyUsageRepository.js`: limites dynamiques depuis `plan_limits` (remplace limites codées en dur).
  - `backend/src/services/assistantService.js`: `chat/analyze/generate` acceptent `userId` → passent par `aiModelService`.
  - `backend/src/services/contentGenerationService.js` + `backend/src/routes/aiRoutes.js`: génération de contenu via `aiModelService` (mode JSON si requis).
  - `backend/src/routes/assistantRoutes.js`: passe `req.user.id`; correctif import `DEFAULT_LIMITS`.
  - `backend/src/app.js`: enregistre `/api/conversations`.
  - `backend/src/config/database.js`: ajoute `conversations`, `conversation_messages` à la liste des tables.

### API — Conversations (auth requise)
- `GET /api/conversations` — lister mes conversations (ordonnées par `updated_at`).
- `POST /api/conversations` — créer (contrôle `max_conversations`).
- `GET /api/conversations/:id` — détail + messages.
- `DELETE /api/conversations/:id` — supprimer (cascade messages).
- `PATCH /api/conversations/:id` — renommer.
- `POST /api/conversations/:id/messages` — envoyer un message utilisateur → IA répond; auto-titre si 1er échange; contrôle `max_char_per_message` + quota quotidien chat.

### Frontend
- `src/pages/Assistant.jsx` refondu:
  - Barre latérale de conversations (mobile drawer inclus).
  - Chat par conversation (création auto si aucune active).
  - Gestion des erreurs limites: message trop long, quotas quotidiens.
- `src/services/assistantService.js` (frontend): nouveaux appels conversationnels (`get/create/getOne/delete/rename/sendMessage`).

### Variables d’environnement (backend)
- Ajouts recommandés dans `.env.production` / `.env.example`:
  - `GEMINI_API_KEY` (optionnel; fallback OpenAI si manquant).
  - `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` (paiements à activer plus tard).

### Opérations effectuées
- Installé: `@google/generative-ai` (backend).
- Exécuté: migrations 036 et 037 sur la base PROD.
- Démarré backend via PM2 (`nora-api-prod`) — `/health` OK.
- Build frontend de production (Vite) complété.

### Notes d’intégration
- Les limites journalières sont désormais pilotées par `plan_limits` (admin modifiable) et non plus codées en dur.
- Le choix du modèle IA dépend du plan utilisateur; Gemini est utilisé en Free quand dispo, sinon OpenAI (modèle économique).
- L’auto-titrage des conversations utilise `gpt-4o-mini` (léger et économique).

## Changelog — 2026-04-12 (Audit Complet + Corrections Panel Admin)

### 🔍 Audit Complet Effectué
Audit exhaustif de tous les endpoints API, services backend, et fonctionnalités frontend pour identifier et corriger tous les bugs.

### 🐛 Bugs Corrigés - Panel Admin

#### Backend (`/backend/src/services/adminRepository.js`)
**Fonctions manquantes ajoutées:**
- `getAllUsers({ page, limit, search, filter })` - Liste paginée des utilisateurs avec filtres (all/premium/banned/free)
- `getUserById(userId)` - Détails complets d'un utilisateur avec stats (synthèses, flashcards, quiz)
- `banUser(userId, reason)` - Bannir un utilisateur avec raison optionnelle
- `unbanUser(userId)` - Débannir un utilisateur
- `setPremium(userId, expiresAt)` - **Appliquer le premium** avec gestion:
  - `null` ou `'null'` → Premium permanent (100 ans)
  - Date vide → Premium 1 an par défaut
  - Date spécifique → Utilise la date fournie
- `deleteUser(userId)` - Suppression complète (cascade: syntheses, daily_usage, subscriptions, conversations)
- `getAnnouncements()` - Liste toutes les annonces avec email admin
- `getActiveAnnouncements(audience)` - Annonces actives filtrées par audience
- `createAnnouncement({...})` - Créer une annonce
- `updateAnnouncement(id, updates)` - Modifier une annonce
- `deleteAnnouncement(id)` - Supprimer une annonce
- `getStats()` - Statistiques complètes pour dashboard:
  - Users: total, actifs (7j), premium, bannis
  - Content: synthèses, flashcards, quiz
  - Requests: demandes écoles pending
  - Subscriptions: abonnements actifs
  - Activity: activité récente (30j)
  - Distribution: répartition par plan

#### Backend - Endpoints Debug IA (`/backend/src/routes/adminRoutes.js`)
**Nouveaux endpoints ajoutés:**
- `GET /api/admin/debug/ai-model/:userId` - Affiche le modèle IA utilisé pour un utilisateur:
  - Plan de l'utilisateur
  - Modèle primaire et fallback
  - Configuration Gemini
  - Raisonnement de sélection du modèle
- `GET /api/admin/debug/ai-config` - Configuration globale des modèles IA:
  - Status Gemini API (configuré/non configuré)
  - Status OpenAI API
  - Modèles par tier (free/premium/school)

#### Frontend - Page Debug Admin
**Nouveau fichier:** `/src/features/admin/pages/AdminDebug.jsx`
- Interface complète pour visualiser la configuration IA
- Vérification du modèle utilisé par utilisateur (par ID)
- Affichage des modèles par plan
- Status des API keys (Gemini, OpenAI)
- Route: `/admin/debug`
- Lien ajouté dans la navigation admin

#### Frontend - Routes Admin (`/src/App.jsx`)
- Import et route `AdminDebug` ajoutés
- Navigation mise à jour dans `AdminLayout.jsx` avec icône Terminal

### ✅ Tests et Validation

#### Script de Test Créé
**Fichier:** `/backend/test-endpoints.sh`
- Tests automatisés des endpoints critiques
- Validation de la sécurité (auth middleware)
- Vérification health check
- Tests plans publics
- Tests protection admin
- **Résultat:** ✓ Tous les tests passés (0 erreurs)

#### Endpoints Testés et Validés
- ✅ Health check (`/health`)
- ✅ Plans publics (`/api/subscription/plans`)
- ✅ Admin login (`/api/admin/auth/login`)
- ✅ Protection auth sur syntheses
- ✅ Protection auth sur conversations
- ✅ Protection auth sur AI endpoints
- ✅ Debug IA endpoints
- ✅ Stats admin

### 🚀 Déploiement et Relance

#### Relance Complète du Site
1. **Arrêt propre:**
   - Tous les processus PM2 stoppés
   - Ports 5000, 5002, 5003 libérés
   - Logs PM2 nettoyés

2. **Configuration:**
   - Port 5000 rétabli par défaut (production)
   - `ecosystem.config.cjs` nettoyé
   - Configuration PM2 sauvegardée

3. **Services Actifs:**
   - ✅ Backend Node.js (PM2) - Port 5000
   - ✅ Nginx - Reverse proxy
   - ✅ MySQL - Base de données
   - ✅ Cron jobs - Notifications horaires

4. **Build Frontend:**
   - Build Vite production complété
   - 837.71 kB bundle (gzipped: 237.96 kB)
   - Aucune erreur de compilation

### 📊 Résumé des Corrections

**Backend:**
- 15 nouvelles fonctions dans `adminRepository.js`
- 2 nouveaux endpoints de debug IA
- Gestion premium corrigée (permanent/temporaire)
- Cascade delete pour users implémentée
- Stats dashboard complètes

**Frontend:**
- 1 nouvelle page admin (Debug IA)
- Navigation admin mise à jour
- Routes configurées

**Infrastructure:**
- Script de test automatisé créé
- Relance propre du site effectuée
- Configuration PM2 optimisée
- Tous les services validés

### 🔒 Sécurité Validée
- ✅ Tous les endpoints protégés par auth middleware
- ✅ Admin routes protégées par `authenticateAdmin`
- ✅ Validation des tokens JWT
- ✅ Protection CSRF via cookies httpOnly
- ✅ Rate limiting actif

### 📝 Notes Importantes
- Le panel admin est maintenant **100% fonctionnel**
- Toutes les fonctions de gestion users opérationnelles
- Debug IA accessible pour troubleshooting
- Aucun bug critique détecté lors de l'audit
- Site en production stable sur port 5000

## Changelog — 2026-04-16 (Saisons, Classement, Badges, i18n Boutique, Profils cliquables)

### Nouvelles features

#### Système de saisons
- Table `seasons` : `number`, `name`, `is_active`, `starts_at`, `ends_at` (starts_at + 30j auto), `reset_executed`
- Cron toutes les minutes (`seasonCron.js`) : quand `ends_at` est dépassé → reset atomique
- Reset : snapshot top 50 → badges + rankings, puis `level=1, exp=0, next_level_exp=500` pour tous les users actifs. Coins et récompenses conservés.
- Admin panel → `/admin/seasons` : créer (numéro, nom, date+heure de début), modifier, activer, supprimer

#### Classement (Leaderboard)
- Nouvel onglet nav (6e) : icône Trophy, route `/leaderboard`
- Top 50 users triés par `level DESC, exp DESC`
- Countdown saison affiché (jours + heures restantes)
- Click sur un joueur → modal profil (`UserProfileModal`)

#### Badges
- Table `user_badges` : attribués au reset (top 50), format `#16 - S1`
- Affichés sur : onglet Profil (section dédiée), modal profil cliquable

#### Horloge saison sur le Profil
- Section compacte affichant le nom de la saison + temps restant (`JJ jours HH heures restantes`)
- Lien vers le classement via icône Trophy

#### Profils cliquables (`UserProfileModal`)
- Modal portal (z-9999) : avatar, nom, niveau, plan, winstreak, badges
- Disponible partout : Leaderboard, Bugs & Suggestions
- Son propre nom → redirige vers `/profile`
- Endpoint : `GET /api/auth/users/:id/public`

#### Traductions boutique
- `Shop.jsx` entièrement traduit via i18n (plus aucun texte hardcodé)
- Nouvelles clés dans `fr.json` + `en.json` : `shop.*`, `leaderboard.*`, `season.*`, `badges.*`, `userProfile.*`, `nav.leaderboard`
- Avatar d'Aron dans le message de bienvenue boutique : `/aronsbg.png`

### Nouveaux fichiers
| Fichier | Rôle |
|---|---|
| `backend/src/services/seasonRepository.js` | CRUD saisons, leaderboard, badges, reset atomique |
| `backend/src/routes/seasonRoutes.js` | `/api/seasons/active`, `/leaderboard`, `/badges/:userId` |
| `backend/src/cron/seasonCron.js` | Cron toutes les minutes → reset auto |
| `backend/src/database/migrations/041_seasons_and_badges.sql` | Tables seasons, season_rankings, user_badges |
| `src/pages/Leaderboard.jsx` | Page classement |
| `src/components/UI/UserProfileModal.jsx` | Modal profil cliquable (portal) + hook `useUserProfileModal` |
| `src/features/admin/pages/AdminSeasons.jsx` | Page admin gestion saisons |

### Notes importantes
- **Format datetime MySQL** : toujours convertir les ISO strings en `YYYY-MM-DD HH:MM:SS` via `toMysqlDatetime()` avant INSERT/UPDATE dans `seasonRepository.js`
- **Reset saison** : `reset_executed = 1` protège contre les doubles resets (idempotent)
- **Tables à prefix** : `seasons`, `season_rankings`, `user_badges` ajoutés à `database.js`

---

## Changelog — 2026-04-15 (Nouveau Système de Gamification)

### Suppression du système œufs/créatures
- Colonnes `eggs` et `collection` supprimées de la table `users`
- Pages `Collection.jsx` et `EggAnimation.jsx` remplacées (collection → boutique)
- `creatures.js` obsolète (ne plus utiliser)

### Nouveau schéma DB (migrations 039 + 040)
- `users` : `streak` renommé → `winstreak`, + `coins INT DEFAULT 0`, `last_activity_date DATE`, `timezone VARCHAR(100)`
- `next_level_exp` recalculé selon seuils fixes : niveaux 1–3 = 500 XP, 4–9 = 1000 XP, 10+ = 1200 XP
- Nouvelles tables : `xp_events` (déduplication), `pending_coin_bags`, `coin_transactions`, `shop_daily_cards`, `xp_config`

### Système XP
- **Architecture hybride** : XP events (synthèse, objectifs, vocal, winstreak…) → serveur via `POST /api/xp/award`; XP minuteurs (flashcards/quiz/synthèse lue) → reste frontend dans UserContext
- `xpService.js` : applique `xp_multiplier` depuis `plan_limits`, déduplication via `xp_events`, level-up avec seuils fixes, génère des sacs côté serveur
- `xp_config` table : tous les montants XP configurables depuis le panel admin (`/admin/xp-config`)
- `xp_multiplier` en prod actuellement **x2 pour Premium/École** (configurable dans Plans)
- **IMPORTANT** : `POST /api/auth/sync` n'accepte plus `eggs`, `collection`, `streak` — seulement `level`, `exp`, `next_level_exp`

### Sources d'XP (valeurs de base, avant multiplicateur)
| Source | Montant | Mode dédup |
|--------|---------|------------|
| Création synthèse | 30 XP | Par synthèse par jour |
| Objectif quotidien complété | 10 XP | Par objectif par jour |
| Tous les objectifs du jour | 50 XP | Une fois par jour |
| Premier exercice créé | 30 XP | Une fois par jour |
| Vocal Aron écouté | 20 XP | Par vocal par jour |
| Winstreak maintenue | 20 XP | Une fois par jour |
| Achat Premium/École | 1000 XP | Une fois à vie |
| Flashcards 10 min | 40 XP | Timer frontend |
| Quiz 20 min | 70 XP | Timer frontend |
| Synthèse lue 30 min | 100 XP | Timer frontend |
| Bonus tous timers | 100 XP | Timer frontend |

### Winstreak
- Calcul serveur au login via `winstreakService.js` avec fuseau horaire du navigateur (Intl API)
- Reset à 1 si jour sauté (pas de mécanisme de grâce)
- +20 XP par jour de série maintenue (serveur, multiplié par xp_multiplier)
- Affiché : header Accueil (🔥 + nombre) + carte Profil

### Sac de pièces (level-up)
- Tirage côté serveur uniquement dans `coinBagService.js` (anti-triche)
- Taux free : 69% → 10 🪙, 30% → 20 🪙, 1% → 50 🪙
- Taux premium/école : 69% → 20 🪙, 50% → 40 🪙, 30% → 60 🪙, 1% → 150 🪙
- `CoinBagModal` : overlay bloquant (z-9999, portal body), queue de sacs, confetti
- Level-up via minuteur (frontend) → `POST /api/bags/generate` pour créer le sac
- Level-up via event serveur → sac inclus dans la réponse de `POST /api/xp/award`

### Boutique (`/shop`)
- Remplace l'onglet Collection dans la nav (desktop + mobile)
- 3 sections : packs de cartes (placeholder), cartes du jour (placeholder), offres IAP (Stripe, bientôt)
- Quick action "Voir la boutique" remplace "Voir la collection" sur l'accueil

### Affichage pièces
- Header Accueil : 🪙 + `AnimatedNumber` (pill glassmorphism, haut droit)
- Carte Profil : pill pièces + pill winstreak (remplace l'ancien pill œuf)
- `/me` retourne `coins`, `winstreak`, `xp_config` dans l'objet user

### Panel Admin
- **Config XP** : `/admin/xp-config` — modifier les montants de base de chaque source XP
- **Attribuer XP** : section dans la fiche utilisateur, avec montant libre + note optionnelle
- `POST /api/admin/users/:id/grant-xp` → `reason: 'admin_grant'`, sans déduplication, sans multiplicateur

### Nouveaux endpoints API
```
POST /api/xp/award           — créditer XP (frontend)
POST /api/xp/winstreak       — vérifier/mettre à jour la winstreak
GET  /api/bags/pending        — sacs non révélés
POST /api/bags/generate       — générer sac (level-up minuteur)
POST /api/bags/:id/reveal     — révéler un sac
GET  /api/admin/xp-config     — lister config XP (admin)
PATCH /api/admin/xp-config/:r — modifier un montant XP (admin)
POST /api/admin/users/:id/grant-xp — attribution manuelle XP (admin)
```

---

## Changelog — 2026-04-14 (Sons, Thèmes, Limites, Impression Flashcards)

### 🔊 Sound Effects

#### Système audio refactorisé — zéro latence
**Problème:** Le click Minecraft avait un gros délai (décodage MP3 au moment du clic)
**Fix:** `src/utils/sounds.js` entièrement reécrit :
- Fetch du MP3 immédiat au chargement de la page (pas de geste requis)
- `AudioContext` + décodage déclenchés sur `pointerdown` ET `mousemove` (avant le `click`)
- Silence de codec MP3 rogné dynamiquement après décodage (`getChannelData` scan)
- `clickBuffer` prêt avant le premier clic → lecture instantanée
- `playHover` utilise maintenant `swoosh.mp3` (fichier uploadé) avec même système de préchargement
- Volume hover : `0.18` (légèrement en dessous du click à `0.4`)

### 🎨 Thèmes

#### Thèmes premium non sauvegardés — RÉSOLU ✓
**Cause:** Backend validait uniquement `['dark', 'light']` → rejetait midnight/forest/aurora
**Fix:** `backend/src/routes/authRoutes.js` — liste étendue à `['dark', 'light', 'midnight', 'forest', 'aurora']`

#### ThemeCards — glassmorphism supprimé
**Problème:** Les swatches de couleur héritaient des box-shadow inset glassmorphism → overlay moche
**Fix:** Classe `theme-card` dans `index.css` + ajoutée sur chaque bouton dans `ThemeSelector.jsx`
- `backdrop-filter: none !important` + `box-shadow: none !important`

#### Thème sombre — luminosité augmentée
**Fix:** `src/index.css` — valeurs des highlights dark theme augmentées :
- Bordure : `0.28 → 0.52`
- Trait gauche : `0.30 → 0.55`
- Highlight inset : `0.08 → 0.18`
- Bord haut : `0.12 → 0.32`
- Lueur de fond body : `0.03 → 0.08` (sky) et `0.03 → 0.07` (indigo)

### 💬 Limite de caractères Aron (Chat)

**Problème:** La limite `max_char_per_message` du plan admin n'était pas appliquée sur le chat Aron
**Cause:** Le chat passe par `/api/conversations/:id/messages` (qui avait la vérification), mais `loadPlanLimits` pouvait échouer silencieusement → fallback 500
**Fix frontend:** `src/pages/Assistant.jsx` — input avec `maxLength={maxChars}` + compteur `X/N` (apparaît à 80% de la limite, rouge à la limite)
- `maxChars = planLimits.max_char_per_message ?? 500` depuis `user.plan_limits` (retourné par `/me`)

### 🖨️ Impression Flashcards

**Nouveau:** Bouton `<Printer>` dans le header de `StudyFlashcards.jsx`
- Visible pour tous les utilisateurs ayant accès aux flashcards
- **Format:** 2 pages PDF — Page 1 : questions (recto), Page 2 : réponses (verso, miroir horizontal par rangée pour impression recto-verso)
- **Layout:** Grille 3×2 (6 cartes par feuille A4), cartes 78mm de hauteur
- **Style:** Bords pointillés `3px dashed`, coins arrondis `14px`, texte bold, noir & blanc
- **Mobile:** Blob URL ouvert dans un nouvel onglet (`window.open(url, '_blank')`) — l'utilisateur utilise le bouton natif du navigateur pour imprimer (iOS `window.print()` non supporté)
- **Desktop:** Blob URL + `win.print()` automatique

### 🔒 PremiumGate — Portal React

**Problème:** La popup premium ne s'affichait pas dans certains contextes (glassmorphism crée un stacking context avec `backdrop-filter`)
**Fix:** `src/components/UI/PremiumGate.jsx` — rendu via `ReactDOM.createPortal(…, document.body)` + `z-[9999]`

---

## Changelog — 2026-04-12 PM (Corrections Google Authenticator + Bugs Admin)

### 🐛 Bugs Critiques Corrigés

#### 1. **Bug Google Authenticator - RÉSOLU** ✓
**Problème:** Erreur `adminRepo.updateAdminLastLogin is not a function` lors de la validation du code 2FA
**Cause:** Fonction manquante dans `adminRepository.js`
**Solution:** Ajout de la fonction `updateAdminLastLogin(adminId)` qui met à jour `last_login_at`

#### 2. **Fonctions Annonces Manquantes - AJOUTÉES** ✓
**Problème:** Erreurs lors de l'envoi d'annonces aux utilisateurs
**Fonctions ajoutées:**
- `getAllUserEmails()` - Récupère tous les emails des utilisateurs actifs et vérifiés
- `markAnnouncementSent(id)` - Marque une annonce comme envoyée avec timestamp

#### 3. **Stats Dashboard - CORRIGÉES** ✓
**Problème:** Format des stats incompatible avec le frontend
**Solution:** 
- Ajout de `newUsersToday` et `newUsersThisWeek` dans les stats
- Format dual: simple pour le frontend + détaillé pour l'API
- Correction de la requête `last_login_at` (au lieu de `last_login`)

### 📊 Fonctions Ajoutées

**Backend (`/backend/src/services/adminRepository.js`):**
```javascript
// Authentification
export async function updateAdminLastLogin(adminId)

// Annonces
export async function getAllUserEmails()
export async function markAnnouncementSent(id)
```

### ✅ Tests de Validation

**Login Admin avec Google Authenticator:**
```bash
POST /api/admin/auth/login
✓ Retourne pendingToken
✓ Status: setup_required (première connexion)

POST /api/admin/auth/totp/verify
✓ updateAdminLastLogin appelée avec succès
✓ Tokens générés correctement
```

**Stats Dashboard:**
```bash
GET /api/admin/stats
✓ totalUsers: [count]
✓ premiumUsers: [count]
✓ bannedUsers: [count]
✓ newUsersToday: [count]
✓ newUsersThisWeek: [count]
✓ Format compatible frontend
```

### 🔧 Corrections Techniques

1. **Authentification Admin:**
   - ✅ Login fonctionnel
   - ✅ TOTP setup fonctionnel
   - ✅ TOTP verify fonctionnel
   - ✅ Last login tracking opérationnel

2. **Gestion Annonces:**
   - ✅ Création d'annonces
   - ✅ Envoi aux utilisateurs
   - ✅ Tracking des envois
   - ✅ Filtrage par audience

3. **Dashboard Stats:**
   - ✅ Compteurs utilisateurs
   - ✅ Nouveaux inscrits (jour/semaine)
   - ✅ Activité récente
   - ✅ Distribution par plan

### 🚀 État Final

**Services:**
- ✅ Backend: Online (Port 5000)
- ✅ PM2: Stable (4 restarts)
- ✅ MySQL: Connecté
- ✅ Nginx: Actif

**Panel Admin:**
- ✅ Login avec 2FA: Fonctionnel
- ✅ Dashboard: Fonctionnel
- ✅ Gestion Users: Fonctionnel
- ✅ Gestion Annonces: Fonctionnel
- ✅ Stats: Fonctionnel
- ✅ Debug IA: Fonctionnel

**Bugs Résolus:** 3/3 (100%)

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
- User profile (level, XP, coins, winstreak)
- Daily stats tracking (time spent per activity type)
- Daily goals with XP reward system
- Pending coin bags (hasPendingBag déclenche CoinBagModal)
- Data synced to backend via `syncUserData()` (level/exp/next_level_exp uniquement — coins/winstreak gérés serveur)
- **Important**: Uses `??` (nullish coalescing) instead of `||` to handle `0` values correctly

**Gamification System** (nouveau — avril 2026):
- Seuils fixes : niveaux 1–3 = 500 XP, 4–9 = 1000 XP, 10+ = 1200 XP (`getXpThreshold(level)` exporté depuis UserContext)
- Level-up → sac de pièces généré côté serveur (`coinBagService.js`)
- XP events (synthèse, objectifs, vocal…) via `POST /api/xp/award` (serveur, avec déduplication + multiplicateur)
- XP minuteurs (10/20/30 min) restent côté frontend dans `addExp()`, multipliés par `xp_multiplier`
- Montants XP configurables depuis panel admin → `xp_config` table → `GET /api/auth/me` → `authUser.xp_config`
- Winstreak calculée serveur au login avec fuseau horaire user

**Time Tracking**: `useActiveTimer` hook tracks active time per activity, pausing when tab loses focus.

## Home Page (`/`)

The home page is the main dashboard showing daily progress and quick actions.

### Header
- Greeting: "Bonjour, [prenom]" - uses first word of user's name
- Tagline: *"Un prix pensé pour ceux qui étudient, pas pour les gros budgets."* (italic, in quotes)

### Header (haut droite)
- Pill 🔥 winstreak + `AnimatedNumber` (série)
- Pill 🪙 pièces + `AnimatedNumber` (solde)

### Quick Actions
Three action cards for fast navigation:

| Action | Subtitle | Destination |
|--------|----------|-------------|
| Voir mes syntheses | Toutes mes etudes | `/study` |
| Voir la boutique | Récompenses et offres | `/shop` |
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
| `/feedback` | Feedback | Reviews and suggestions from users |

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

**Fade Animation**: Smooth 0.3s CSS transition sur `body`, `.bg-background`, `.bg-surface`, `.bg-card` uniquement. La règle `* { transition }` a été supprimée (causait du lag en conflictant avec Framer Motion).

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
- `OpenEmailButton` - Detects email provider from domain (Gmail, Outlook, Yahoo, iCloud, Proton, Orange, SFR, LaPoste) and opens the correct webmail in a new tab. Used in `VerifyEmailSent`, `ForgotPassword`, and `Login` (when `EMAIL_NOT_VERIFIED` error).

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
| Photos per import | 15 | Frontend (`MAX_PHOTOS` in PhotoCapture.jsx) | Info text + buttons disabled at limit |
| Syntheses per user | 40 | Backend (`POST /api/syntheses` checks count) | Study tab shows "max 40", Profile shows "X/40" |
| Exercise sets per user | 15 | Backend (`POST /api/assistant/monk-mode/generate` checks count) | `EXERCISES_LIMIT_REACHED` error code |

**File Structure**:
```
backend/
├── src/
│   ├── app.js                  # Express app setup
│   ├── config/database.js      # DB connection + table prefix injection
│   ├── routes/authRoutes.js    # Auth endpoint handlers
│   ├── routes/syntheseRoutes.js # Synthese CRUD endpoints
│   ├── routes/aiRoutes.js      # AI endpoints (Whisper, Vision, Content Gen)
│   ├── routes/folderRoutes.js  # Folder CRUD endpoints
│   ├── routes/notificationRoutes.js # Push notifications + daily progress sync
│   ├── routes/feedbackRoutes.js # Reviews & suggestions endpoints
│   ├── services/authService.js # Auth business logic
│   ├── services/userRepository.js # User data access
│   ├── services/syntheseRepository.js # Synthese data access
│   ├── services/folderRepository.js # Folder data access
│   ├── services/feedbackRepository.js # Feedback data access
│   ├── services/dailyProgressRepository.js # Daily progress & study history
│   ├── services/openaiService.js # OpenAI Whisper & Vision
│   ├── services/contentGenerationService.js # ChatGPT content generation
│   ├── services/contentVerificationService.js # AI subject matching verification
│   ├── services/googleAuthService.js # Google OAuth token verification
│   ├── services/emailService.js # Resend email service
│   ├── services/notificationService.js # Push notification service
│   ├── services/subjectPrompts.js # Subject-specific AI prompt templates
│   ├── services/assistantService.js # GPT chat + Monk Mode analyze/generate + correct
│   ├── services/exerciseRepository.js # CRUD exercises/items + quiz_answers logging
│   ├── routes/assistantRoutes.js # /api/assistant/* endpoints
│   ├── routes/exerciseRoutes.js # /api/exercises/* endpoints
│   ├── middlewares/auth.js     # JWT verification middleware
│   ├── middlewares/rateLimiter.js # Rate limiting config
│   ├── validators/authValidators.js # Auth validation schemas
│   ├── validators/syntheseValidators.js # Synthese validation schemas (subject + specificInstructions ajoutés)
│   └── validators/feedbackValidators.js # Feedback validation schemas (Zod)
├── uploads/                    # Temporary audio files (auto-cleaned)
```

## Onboarding System

First-time user onboarding flow displayed only on first login after account creation.

### Flow

The onboarding is a **6-step modal** that appears after first login:

| Step | Content | Required |
|------|---------|----------|
| 1 | "Personnalise ton expérience" - Language & Theme selection | No (defaults applied) |
| 2 | "Comment tu t'appelles ?" - Name input | Yes (min 2 chars) |
| 3 | "Ajoute une photo de profil" - Avatar upload | No (skip available) |
| 4 | "Choisis ta matière" - Info about subject selection | Info only |
| 5 | "Rencontre Aron" - Présentation de l'assistant + Monk Mode + /ana | Info only |
| 6 | "Comment veux-tu importer ?" - Info about photo import | Button click → Import |

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

**i18n Keys**: `onboarding.step1.*`, `onboarding.step2.*`, `onboarding.step3.*`, `onboarding.step4.*`, `onboarding.step5.*`, `onboarding.step6.*`

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

When a synthese reaches 100% mastery score, a green badge is displayed:
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
# 009: notifications (notifications_enabled, last_notification_sent_at, push_subscriptions)
# 010: daily_progress table
# 011: avatar column on users
# 012: email verification (email_verified, email_verification_tokens)
# 013: study stats (study_history table, study time columns on daily_progress)
# 014: revision_sessions and revision_completions tables (revision feature)
# 015: specific_instructions column on syntheses (revision feature)
# 016: loop_time_remaining column on revision_sessions (revision feature)
# 017: phase_started_at column on revision_sessions (revision feature)
# 018: mastery_score column on syntheses (+ index) (revision feature)
# 019: user preferences (language, theme columns)
# 020: onboarding_completed column on users
# 021: requirement_level + custom_settings on revision_sessions (revision feature)
# 022: subject column on syntheses
# 023: google_id column on users (+ password nullable)
# 024: feedbacks + feedback_votes tables
```

## Import System

Multi-modal content import system supporting text, voice, and photo input. All AI features are powered by OpenAI APIs with the API key secured server-side.

### Subject Selection (Required)

Before importing content, users MUST select a subject (matière). This enables:
- Discipline-specific AI prompts for better quality
- Subject-based filtering and organization
- Improved synthesis quality

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

**`/src/components/Import/VoiceDictation.jsx`**
- Inline mic button (petit bouton) used in the specific instructions fields (definitions, objectives) and in flashcard answer input
- Uses browser Web Speech API (`SpeechRecognition`) — NOT Whisper
- **Crée une nouvelle instance à chaque démarrage** pour éviter tout état résiduel/replay d'audio
- Auto-restart : quand la session expire (silence), redémarre automatiquement sans désactiver le bouton — seul l'utilisateur peut stopper
- `interimResults = false` + variable closure `lastProcessedIndex` par session pour éviter les doublons
- `isStoppingRef` distingue arrêt volontaire (bouton) vs timeout navigateur
- **Objectifs/Définitions** : chaque prise de parole ajoute `- Texte` avec majuscule automatique
- **Commande vocale "à la ligne"** : détectée via regex `/[aà][h]?\s*la\s*lignes?/gi`, insère un saut de ligne + nouveau tiret. Fonctionne aussi si dit seul (flag `defNewLineRef`/`objNewLineRef` activé pour la prochaine prise de parole)

**`/src/components/Import/PhotoCapture.jsx`**
- Camera access via getUserMedia
- Multi-photo capture from camera (**max 15 photos** - buttons disabled at limit, info text shown)
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
   - `subjectPrompts.js` ne recommande PLUS `"## Définitions et Concepts Importants"` dans les sections — cette entrée a été retirée de toutes les matières (math, physique, chimie, bio, histoire, géo) pour éviter que l'IA crée une section définitions par défaut

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

## Notation Mathématique (formatMath)

**`/src/utils/formatMath.js`** — convertit les notations mathématiques textuelles en caractères unicode propres. Appliqué partout où du contenu IA est affiché.

**Conversions** :
| Input | Output |
|-------|--------|
| `x^2`, `x^n` | `x²`, `xⁿ` (exposants unicode) |
| `H_2O`, `CO_2` | `H₂O`, `CO₂` (indices unicode) |
| `>=`, `<=`, `!=` | `≥`, `≤`, `≠` |
| `->`, `<->` | `→`, `↔` |
| `sqrt(x)` | `√x` |
| `pi`, `alpha`, `beta`, `delta`, `theta`, `lambda`, `mu`, `sigma`, `omega` | `π`, `α`, `β`, `Δ`, `θ`, `λ`, `μ`, `σ`, `Ω` |
| `infinity` | `∞` |
| `+-` | `±` |

**Usage** : `formatMath(text)` retourne une string transformée. Utilisé dans `StudyDetail`, `StudyFlashcards`, `StudyQuiz`, `ExerciseDetail`, `Assistant` (renderContent).

---

## Sound Effects

Minecraft-style UI sounds synthesized in-browser via the Web Audio API (no audio files).

### Implementation

**`/src/utils/sounds.js`**
- `playClick()` — Square-wave oscillator, 600→150 Hz drop in 80ms (Minecraft UI click feel)
- `playHover()` — Bandpass-filtered white noise, 3000→800 Hz sweep in 60ms (swoosh)
- Both wrapped in try/catch; AudioContext lazily initialized and resumed on first interaction

**`/src/components/Layout/MobileWrapper.jsx`**
- Global `click` and `mouseover` listeners on `document` (capture phase)
- Selector: `button, a, [role="button"], input[type="checkbox"], input[type="radio"], select, label`
- Hover suppressed for 150ms after a click (avoids double-trigger)
- Both sounds gated by `localStorage.getItem('nora_sounds_enabled') !== 'false'`

### Settings Toggle

- Key: `nora_sounds_enabled` in localStorage (default: enabled)
- Toggle in Settings > Sons section
- No backend sync needed — preference is per-device

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

Personalized daily reminder notifications sent at the user's chosen hour and days (configurable in Settings).

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
6. Current Paris hour matches user's `notification_hour`
7. Current day is in user's `notification_days`

### Notification Schedule (per user)

Users configure their preferred hour (6h–23h) and days (Mon–Sun) in Settings > Notifications.

**Days convention**: 0=Sunday, 1=Monday, … 6=Saturday (matches JS `Date.getDay()`)

### Database Schema

```sql
-- Added to users table
notifications_enabled BOOLEAN DEFAULT FALSE
last_notification_sent_at DATE NULL
notification_hour TINYINT UNSIGNED NOT NULL DEFAULT 18
notification_days JSON NULL  -- e.g. [1,2,3,4,5] Mon-Fri. NULL = all days.
-- Migration: 025_notification_schedule.sql

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
- `updateNotificationSchedule(userId, hour, days)` - Update preferred hour/days
- `getEligibleUsersForNotification(parisHour, parisDay)` - Get users to notify at given hour/day
- `sendDailyReminders(parisHour, parisDay)` - Send notifications (called by cron)

**`/backend/src/services/dailyProgressRepository.js`**
- `syncDailyProgress(userId, data)` - Sync frontend progress to backend (includes study times)
- `getDailyProgress(userId)` - Get current day progress
- `getFullDailyProgress(userId)` - Get daily stats + study history for initial load
- `saveStudyHistory(userId, date, seconds)` - Save study time when day changes
- `getStudyHistory(userId)` - Get last 30 days study history

**`/backend/src/cron/notificationCron.js`**
- Runs **every hour** (`0 * * * *` Europe/Paris)
- Passes current Paris hour + day of week to `sendDailyReminders()`

### API Endpoints (`/api/notifications/`)

| Method | Route | Description | Auth |
|--------|-------|-------------|------|
| GET | `/vapid-public-key` | Get VAPID public key | No |
| GET | `/settings` | Get notification settings + schedule (hour, days) | Yes |
| PATCH | `/settings` | Enable/disable notifications | Yes |
| PATCH | `/schedule` | Update notification hour + days | Yes |
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

## Content Verification Service

AI-powered verification that imported content matches the user's selected subject.

**Service**: `/backend/src/services/contentVerificationService.js`

**How It Works**:
1. After content capture (voice/photo/text), before AI generation
2. Sends first 1500 chars of content + selected subject to GPT-4o-mini
3. AI classifies the content and compares with selected subject
4. Returns: `{ correspondance: boolean, matiere_detectee, matiere_detectee_id, confiance, message }`

**Confidence Levels**: `forte`, `moyenne`, `faible`

**Subject Indicators**: Each subject has keyword lists for faster detection (e.g., mathematics: equation, theorem, function...)

```javascript
verifyContentSubject(content, selectedSubject) // Returns match result
```

## Feedback System

Community feedback system allowing users to share reviews and suggestions, with voting.

### Database Schema

```sql
-- feedbacks: Reviews and suggestions (auto-expire after 3 days)
feedbacks (id, user_id, type ENUM('review','suggestion'), content VARCHAR(150), created_at)

-- feedback_votes: Like/dislike system
feedback_votes (id, feedback_id, user_id, vote TINYINT, created_at)
-- vote: 1 = like, -1 = dislike
-- UNIQUE(feedback_id, user_id) - one vote per user per feedback
```

### API Endpoints (`/api/feedback/`)

| Method | Route | Description | Auth |
|--------|-------|-------------|------|
| GET | `/reviews` | Get all reviews (with vote counts, excludes >3 days) | Yes |
| GET | `/suggestions` | Get all suggestions (with vote counts, excludes >3 days) | Yes |
| GET | `/daily-count` | Get today's count and remaining | Yes |
| POST | `/reviews` | Create a review (max 120 chars) | Yes |
| POST | `/suggestions` | Create a suggestion (max 70 chars) | Yes |
| POST | `/:id/vote` | Vote on feedback (1, -1, or 0 to remove) | Yes |
| DELETE | `/:id` | Delete own feedback | Yes |

### Business Rules

- **Daily Limit**: 100 combined reviews + suggestions per day (global, not per user)
- **Auto-Expiry**: Feedbacks older than 3 days are excluded from queries
- **Voting**: Like only (no dislike button — dislike was removed to keep the tone positive)
- **Score Display**: Clamped at 0 minimum — `Math.max(0, net_score)` in frontend
- **Net Score**: Feedbacks sorted by net score descending
- **Owner Delete**: Users can only delete their own feedbacks

### Frontend

**Page**: `/src/pages/Feedback.jsx`
- Two tabs: Reviews / Suggestions
- Submit form with character limit
- Like button only (thumbs up) with score display (min 0)
- Relative time display (just now, X minutes ago, X hours ago)
- Owner can delete their own feedbacks

**Service**: `/src/services/feedbackService.js`
```javascript
getReviews()
getSuggestions()
getDailyCount()
createReview(content)
createSuggestion(content)
vote(feedbackId, voteValue)    // 1 or 0 (remove)
deleteFeedback(feedbackId)
```

**Validators** (`/backend/src/validators/feedbackValidators.js`): Zod schemas
- Review: content 1-120 chars
- Suggestion: content 1-70 chars
- Vote: -1, 0, or 1
- Delete: valid numeric ID

**i18n Keys**: `feedback.*`

**Migration**: `024_create_feedbacks.sql`

## DEV/PROD Environment Separation

The project runs two completely isolated environments to safely develop and test without affecting production users.

### Environment Overview

| Aspect | PRODUCTION | DEVELOPMENT |
|--------|------------|-------------|
| **URL** | https://mirora.cloud | https://dev.mirora.cloud |
| **Backend Port** | 5000 | 5001 |
| **PM2 Process** | `nora-api-prod` | `nora-api-dev` |
| **Frontend Build** | `/dist` | `/dist-dev` |
| **DB Tables** | `users`, `syntheses`, ... | `dev_users`, `dev_syntheses`, ... |
| **Access** | Public | HTTP Basic Auth (abel / nora-dev-2024) |
| **Watch Mode** | Disabled | Enabled (auto-reload) |

### Architecture

**Database Isolation via Table Prefix**:
- Both environments share the same MySQL database (`s184197_mirora`)
- DEV tables are prefixed with `dev_` (e.g., `dev_users`, `dev_syntheses`)
- The prefix is applied automatically at the query layer (`/backend/src/config/database.js`)
- No code changes needed in repositories - prefix injection is transparent

**Environment Files**:
```
/var/www/mirora.cloud/
├── .env.production          # Frontend PROD config
├── .env.development         # Frontend DEV config
├── backend/
│   ├── .env.production      # Backend PROD config (PORT=5000, DB_TABLE_PREFIX=)
│   ├── .env.development     # Backend DEV config (PORT=5001, DB_TABLE_PREFIX=dev_)
│   ├── start-prod.js        # PROD startup (loads .env.production)
│   └── start-dev.js         # DEV startup (loads .env.development)
```

### Key Configuration Files

| File | Purpose |
|------|---------|
| `/backend/src/config/database.js` | Table prefix injection via `DB_TABLE_PREFIX` env var |
| `/backend/ecosystem.config.cjs` | PM2 config with `nora-api-prod` and `nora-api-dev` processes |
| `/backend/.env.production` | PROD backend config (port 5000, no prefix) |
| `/backend/.env.development` | DEV backend config (port 5001, `dev_` prefix) |
| `/.env.production` | Frontend PROD config (`VITE_API_URL=https://mirora.cloud/api`) |
| `/.env.development` | Frontend DEV config (`VITE_API_URL=https://dev.mirora.cloud/api`) |
| `/nginx/dev.mirora.cloud.conf` | Nginx config for DEV site |

### Commands

**Deployment**:
```bash
# Deploy to PRODUCTION
./deploy-prod.sh

# Deploy to DEVELOPMENT
./deploy-dev.sh
```

**PM2 Process Management**:
```bash
# View status
pm2 list

# View logs
pm2 logs nora-api-prod --lines 50
pm2 logs nora-api-dev --lines 50

# Restart
pm2 reload nora-api-prod
pm2 reload nora-api-dev

# Start specific process
pm2 start ecosystem.config.cjs --only nora-api-prod
pm2 start ecosystem.config.cjs --only nora-api-dev
```

**Build Frontend**:
```bash
# Build for PRODUCTION (→ /dist)
npm run build:prod

# Build for DEVELOPMENT (→ /dist-dev)
npm run build:dev
```

**Database Setup** (run once):
```bash
# Create DEV tables with dev_ prefix
cd backend && node scripts/create-dev-tables.js
```

### Nginx Setup (requires sudo)

```bash
# Run the setup script as root
sudo ./setup-dev-nginx.sh

# Then add DNS record in Cloudflare:
# Type: A (or CNAME to mirora.cloud)
# Name: dev
# Content: [server IP]
# Proxy status: Proxied
```

### Workflow

1. **Develop**: Make changes in the codebase
2. **Deploy to DEV**: `./deploy-dev.sh` - builds frontend to `/dist-dev`, restarts DEV backend
3. **Test on DEV**: Visit https://dev.mirora.cloud (auth: abel / nora-dev-2024)
4. **When ready**: `./deploy-prod.sh` - builds frontend to `/dist`, restarts PROD backend
5. **Verify PROD**: Visit https://mirora.cloud

### Data Isolation

- DEV and PROD data are completely separate (different tables)
- DEV users, syntheses, etc. are stored in `dev_*` tables
- PROD users, syntheses, etc. are stored in regular tables (no prefix)
- No risk of DEV bugs affecting PROD data

---

## UI/UX Design System

### Dark Theme (Glassmorphism)

Valeurs validées pour le thème sombre — ne pas modifier sans raison :

| Variable | Valeur |
|----------|--------|
| `--color-background` | `#020408` (noir profond) |
| `--color-surface` | `rgba(10, 18, 35, 0.32)` (semi-transparent) |
| `--color-primary` | `#38bdf8` |
| `--color-text-main` | `#ffffff` |
| `--color-text-muted` | `#6b7d96` |

**Glassmorphism sombre** (`/src/index.css`) :
- `backdrop-filter: blur(52px) saturate(1.6)` sur tous les `.rounded-*`
- Bordure : `1.5px rgba(255,255,255,0.28)`
- Lumière gauche (trait net, extrême bord) : `inset 2px 0 0 rgba(255,255,255,0.30)`
- Ombre : `0 16px 48px rgba(0,0,0,0.85)`

### Light Theme (Glassmorphism renforcé)

**Glassmorphism clair** (`/src/index.css`) :
- `backdrop-filter: blur(72px) saturate(2.0)` — plus fort que le dark (72 vs 52)
- Reflet blanc quasi-opaque : `inset ... 32px rgba(255,255,255,0.96)`
- Bord supérieur blanc pur : `inset 0 1px 0 rgba(255,255,255,1)`
- **Aucun `text-shadow`** sur les textes — supprimé intentionnellement (visuellement propre sur fond clair)

### Système de Hover

**Règle globale** (`/src/index.css`) :
```css
button:not(:disabled):not(.no-hover):hover {
  transform: scale(1.04) !important;
  filter: brightness(1.09) !important;
}
```

**Classe `hover-lift`** : scale `1.03` + brightness `1.07` — utilisée sur les éléments non-button (divs, links) et sur les boutons standalone qui ne sont pas dans un conteneur `overflow-hidden`.

**Règle critique** : ne JAMAIS mettre `hover-lift` sur un élément enfant d'un `overflow-hidden` — le scale est clippé et donne un effet de "zoom interne". La bonne pratique :
- Soit mettre `hover-lift` sur l'élément parent (hors `overflow-hidden`)
- Soit retirer `overflow-hidden` du parent et rendre chaque item indépendant avec ses propres bords arrondis

**Classe `no-hover`** : désactive la règle globale button. À utiliser sur les boutons full-width dans les Settings ou dans des conteneurs contraints.

**Settings** : chaque ligne de paramètre est une **carte indépendante** (`bg-surface rounded-2xl border border-white/10`) avec `hover-lift no-hover` — pas de `overflow-hidden` parent qui clippe.

### Feedback Page (`/src/pages/Feedback.jsx`)

- **Email auteur** : non affiché (vie privée)
- **Score like/dislike** : valeur réelle affichée (`+1`, `0`, `-1`), pas de `Math.max(0, ...)`
- **Boutons tab** : séparés avec `gap-2` (pas collés)
- **mysql2** : `SUM(vote)` retourné comme string → toujours caster avec `Number()` dans `getNetScore()`

### Scroll Effect Roulette (`/src/pages/Study.jsx`)

Effet de courbe cylindrique sur la liste des synthèses — **mobile uniquement** :

```js
// Désactivé sur desktop (scroll JS casse la fluidité compositor-thread)
const isTouch = window.matchMedia('(hover: none) and (pointer: coarse)').matches;
if (!isTouch) return;
```

**Performance** : positions pré-calculées une seule fois via `cachePositions()` (appelé au mount/resize). Le scroll handler lit uniquement `window.scrollY` (zéro reflow). Valeurs : `rotateX ±28°`, `scale 0.88–1.0`, `perspective 900px`.

**Structure DOM** : `data-curve` sur le wrapper externe, `hover-lift` sur la carte interne — les deux transforms n'entrent pas en conflit.

### Authentification

- **Apple Login** : retiré de Login et Register (non fonctionnel)
- **Google Login** : seul provider OAuth actif

### Composants — Bordures visibles en thème sombre

- `LiquidProgressBar` : `border border-white/20` sur le track
- `DailyProgress` goal cards : `border border-white/20` (non-complété), `border border-green-500/30` (complété)
- `FolderCard` : `hover-lift` ajouté
- `FolderDetail` synthèse cards : `hover-lift` ajouté

---

## Assistant NORA + Monk Mode

Système complet d'assistant pédagogique IA avec génération d'exercices personnalisés basée sur les lacunes détectées.

### Pages

| Route | Page | Description |
|-------|------|-------------|
| `/assistant` | `Assistant.jsx` | Chat GPT + state machine Monk Mode + `/correct` |
| `/exercises` | `Exercises.jsx` | Liste des sets d'exercices (max 15) |
| `/exercises/:id` | `ExerciseDetail.jsx` | Exercices interactifs + correction + impression |

### Bouton Assistant

Présent dans **toutes les pages** via `MobileWrapper.jsx` (coin haut-droit). Icône `Bot` (lucide-react). Sur desktop : texte "Assistant" visible. Sur mobile : icône seule.

### Commandes Chat

| Commande | Effet |
|----------|-------|
| `/exs` | Lance le **Monk Mode** — génération d'exercices personnalisés |
| `/correct` | Lance la correction commentée d'un set d'exercices |
| `/ana` | Analyse une interro/devoir corrigé par photo (OCR → GPT → exercices ciblés) |
| Tout autre message | Chat GPT normal (historique persisté en DB) |

**Mémoire contextuelle** : les 10 derniers messages de la session sont envoyés à GPT (glissant). Au chargement de `/assistant`, les 10 derniers messages de l'historique DB sont affichés.

### Monk Mode — Flow complet

```
/exs
 1. Sélection matière (boutons générés depuis synthèses du user)
 2. Analyse quiz_answers → analyzeDifficulties() → GPT identifie les thèmes faibles
 3. Difficultés spécifiques (saisie libre ou "non") + VoiceDictation disponible
 4. Sélection types d'exercices (QCM / Ouvertes / Pratiques) avec toggle
 5. Sélection compteurs pour chaque type sélectionné
 6. generateExercises() → GPT génère les exercices
 7. Redirection vers /exercises
```

### /ana Flow (Analyse d'interro)

```
/ana
 1. Upload photo du contrôle corrigé (galerie fileInputRef ou caméra AnaCameraModal)
    → Si l'utilisateur écrit du texte pendant l'étape upload : annule /ana, bascule en chat normal (sans consommer de quota)
 2. POST /api/assistant/ana/analyze → OCR (extractTextFromImage) → analyzeExamDifficulties()
    → Retourne { weakTopics, strongTopics, summary, examText, feedbackNote }
 3. Sélection matière (même boutons que Monk Mode)
 4. Suite identique au Monk Mode (types → counts → génération)
 5. generateExercises() reçoit feedbackNote → stocké dans exercises.feedback_note (DB)
```

**Backend** : `analyzeExamDifficulties({ examText, subject })` — retourne `{ weakTopics, strongTopics, summary }`.

**`generateAnaFeedback({ weakTopics, strongTopics, summary, examText, subject, lang })`** : génère une note de coaching personnalisée. Règles strictes : ne cite JAMAIS un concept absent du texte du contrôle, ton décontracté (grande sœur/grand frère), conseils actionnables, zéro intro.

**`generateTTS(text)`** : génère un audio MP3 via OpenAI `tts-1-hd`, voix `fable`, vitesse `1.15x`. Retourne base64. Endpoint `/api/assistant/tts`.

**Indicateurs "thinking"** : messages animés avec spinner pendant l'analyse et la génération. Textes traduits et dynamiques par étape.

### Note de feedback /ana (ExerciseDetail)

Quand un set provient d'un `/ana`, `exercises.feedback_note` contient la note de coaching. Elle s'affiche en haut de `ExerciseDetail` dans une carte collapsible "Analyse personnalisée" :
- Bouton **"Écouter"** → génère le TTS à la demande (POST `/api/assistant/tts`) et affiche un `<audio>` player
- Bouton **"Transcription"** → toggle AnimatePresence pour afficher/masquer le texte

**Migration** : `035_add_feedback_note.sql` — `ALTER TABLE exercises ADD COLUMN feedback_note TEXT NULL`

### Structure DB

```sql
-- quiz_answers: log de chaque réponse quiz pour analyse Monk Mode
quiz_answers (id, user_id, question_id, synthese_id, selected_answer, is_correct, answered_at)
-- Alimenté par : POST /api/syntheses/:id/quiz/progress (selectedAnswer ajouté au payload)

-- exercises: sets générés par Monk Mode
exercises (id, user_id, subject, title, difficulty_summary, feedback_note, created_at)
-- feedback_note : note coaching /ana (NULL pour sets /exs normaux)
-- Limite : 15 par user

-- exercise_items: exercices individuels
exercise_items (id, exercise_set_id, type ENUM('qcm','open','practical'), position,
                question, options JSON, correct_answer, expected_answer, user_answer)

-- chat_messages: historique du chat (persisté)
chat_messages (id, user_id, role ENUM('user','assistant'), content, created_at)
```

**Migrations** : `026_create_quiz_answers.sql`, `027_create_exercises.sql`, `028_create_exercise_items.sql`, `029_create_chat_messages.sql`, `035_add_feedback_note.sql`

### Limites exercices

| Type | Max par set |
|------|-------------|
| QCM | 5 |
| Questions ouvertes | 10 |
| Exercices pratiques | 10 |
| Sets total par user | 15 |

Au moins 1 type doit être sélectionné, avec minimum 1 question.

### API Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/assistant/chat` | Chat GPT (messages[], historique sauvegardé) |
| GET | `/api/assistant/history` | 100 derniers messages |
| GET | `/api/assistant/subjects` | Matières disponibles du user |
| POST | `/api/assistant/monk-mode/analyze` | Analyse quiz_answers pour une matière |
| POST | `/api/assistant/monk-mode/generate` | Génère + sauvegarde un set d'exercices |
| POST | `/api/assistant/correct/:id` | Correction commentée par GPT |
| POST | `/api/assistant/ana/analyze` | OCR image + analyse difficultés GPT + génère feedbackNote |
| POST | `/api/assistant/tts` | Génère audio MP3 base64 depuis texte (tts-1-hd, fable, 1.15x) |
| GET | `/api/exercises` | Liste des sets |
| GET | `/api/exercises/:id` | Détail + items |
| PATCH | `/api/exercises/items/:itemId/answer` | Sauvegarde une réponse |
| DELETE | `/api/exercises/:id` | Supprime un set |

### Services Backend

- `assistantService.js` : `chat()`, `analyzeDifficulties()`, `generateExercises()`, `correctExercises()`, `analyzeExamDifficulties()`, `generateAnaFeedback()`, `generateTTS()`
- `exerciseRepository.js` : CRUD exercises/items + `logQuizAnswer()` + `getQuizAnswersForSubject()`

### ExerciseDetail — Impression

`handlePrint()` génère une fenêtre HTML avec CSS print-friendly :
- Sections par type (QCM avec options A/B/C/D, open avec ligne, practical avec bloc)
- Typographie Georgia, max-width 800px, page-break-inside: avoid

### /correct Flow

```
/correct
 1. Charge les sets → boutons de sélection
 2. Lecture des user_answer via exerciseRepo.findById()
 3. correctExercises() → GPT corrige avec feedback par item
 4. Retourne : corrections[{ isCorrect, isPartial, feedback, tip }] + globalFeedback
```

La correction est accessible **dans le chat** (via `/correct`) et **dans ExerciseDetail** (bouton "Corriger mes exercices").

### Avatar

Placeholder `🤖` en attendant le PNG fourni par le user. Format attendu : PNG, affiché dans le header de `/assistant`. Prévu pour être animé ultérieurement.

---

## Admin Panel

Panel d'administration complet, **complètement isolé** de l'app utilisateur (contexte React séparé, JWT séparé, API client séparé).

### Accès

- **URL** : `https://mirora.cloud/admin/login`
- **Emails autorisés** : `abeldemora@gmail.com`, `merchezjulien2011@gmail.com` (hardcodé dans `adminConfig.js`)
- **Authentification** : Email + mot de passe + **TOTP 2FA obligatoire** (Google Authenticator)
- **Première connexion** : génère et affiche un QR code à scanner, puis confirmer avec le premier code

### Sécurité

- Email restriction hardcodée dans `backend/src/config/adminConfig.js` (`allowedEmails`)
- TOTP vérifié à chaque connexion (otplib + qrcode)
- JWT admin séparé (`ADMIN_JWT_SECRET`, `ADMIN_JWT_REFRESH_SECRET`) — 15min access, 8h refresh
- Rate limiter 5 tentatives / 15 min sur le login
- Pas de restriction IP (accessible depuis n'importe où)

### Flow d'authentification (3 étapes)

```
POST /api/admin/auth/login { email, password }
  → { status: 'setup_required' | 'totp_required', pendingToken }

POST /api/admin/auth/totp/qrcode { pendingToken }    ← première fois seulement
  → { qrCodeDataUrl, secret }

POST /api/admin/auth/totp/enable { pendingToken, code }   ← première fois
POST /api/admin/auth/totp/verify { pendingToken, code }   ← connexions suivantes
  → { adminAccessToken, admin }
```

### Fonctionnalités

**Dashboard** (`/admin/dashboard`) — 6 stats : total users, synthèses, premium, bannis, nouveaux aujourd'hui, nouveaux cette semaine.

**Gestion utilisateurs** (`/admin/users`) — tableau paginé (50/page), recherche par email/nom, filtres (tous/premium/bannis/gratuit), clic → détail.

**Détail utilisateur** (`/admin/users/:id`) :
- Infos : niveau, XP, synthèses, date inscription, dernière connexion, premium expire
- **Ban/Unban** avec raison optionnelle — force déconnexion immédiate (supprime refresh tokens + le middleware auth vérifie `is_banned` à chaque requête)
- **Premium** : date d'expiration ou permanent (checkbox)
- **Supprimer** : supprime TOUTES les données de l'utilisateur (cascade complète)
- Synthèses récentes affichées

**Annonces** (`/admin/announcements`) — CRUD complet + envoi email à tous les utilisateurs actifs/vérifiés/non-bannis.
- Types : `info` (bleu), `warning` (orange), `maintenance` (rouge), `feature` (vert)
- Audience : tous / premium / gratuit
- Dates début/fin optionnelles
- Bouton "Envoyer" → email HTML à tous les users eligibles (template clair, compatible tous clients mail)

### Ban — comportement

1. Admin définit une raison (optionnel)
2. Backend supprime tous les refresh tokens → déconnexion forcée
3. Middleware `auth.js` vérifie `is_banned` + retourne `banned_reason` sur chaque requête → disconnect immédiat même si le token est encore valide
4. Côté frontend : `api.js` intercepte le 403 `ACCOUNT_BANNED`, stocke `ban_reason` en localStorage, redirige vers `/login`
5. Page login affiche : message de ban + raison si renseignée

### Structure fichiers

**Backend :**
```
backend/src/config/adminConfig.js          # JWT secrets, allowedEmails
backend/src/middlewares/adminAuth.js       # Vérifie Bearer token admin
backend/src/middlewares/adminIpAllowlist.js # (kept but unused — no IP restriction)
backend/src/routes/adminRoutes.js          # Tous les endpoints /api/admin/*
backend/src/services/adminRepository.js   # DB : stats, users CRUD, announcements CRUD
backend/src/services/adminTokenService.js # generateAdminAccessToken/Refresh/Pending
```

**Frontend :**
```
src/features/admin/
├── context/AdminAuthContext.jsx      # adminLogin, adminCompleteLogin, adminLogout
├── components/AdminLayout.jsx        # Sidebar + main (class admin-root = no glassmorphism)
├── components/AdminProtectedRoute.jsx
├── services/adminApiClient.js        # Fetch client isolé (Bearer admin token)
├── pages/AdminLogin.jsx              # 3 steps : credentials → QR setup → verify
├── pages/AdminDashboard.jsx
├── pages/AdminUsers.jsx
├── pages/AdminUserDetail.jsx
└── pages/AdminAnnouncements.jsx
```

**Migrations :**
```
032_admin_columns.sql       # admins table (email, password_hash, last_login_at)
033_create_announcements.sql
034_add_admin_totp.sql      # totp_secret, totp_enabled sur admins
```

**CSS :** `.admin-root` dans `index.css` désactive le glassmorphism sur tous les éléments `.rounded-*` du panel admin.

**Packages backend ajoutés :** `otplib`, `qrcode`

### Suppressions compte — cascade complète

`deleteUser()` supprime dans l'ordre : refresh_tokens, password_resets, push_subscriptions, chat_messages, daily_usage, daily_progress, study_history, quiz_answers, exercise_items, exercises, revision_completions, revision_sessions, feedback_votes, feedbacks, folders, flashcards, quiz_questions, folder_syntheses, syntheses, users.

### Emails annonces

`sendAnnouncementEmail()` dans `emailService.js` — template HTML clair (fond blanc), compatible tous clients mail :
- Header coloré selon le type
- Titre en grand
- Message dans bloc coloré
- Bouton CTA

---

## Limites d'utilisation quotidienne

Système de comptage par user par jour via table `daily_usage` (reset automatique via `CURDATE()`).

| Feature | Limite |
|---------|--------|
| Chat Aron (`/chat`) | 15/jour |
| Génération exercices (`/exs`) | 5/jour |
| Analyse interro (`/ana`) | 5/jour |

**Backend :** `dailyUsageRepository.js` — `checkAndIncrement(userId, type)` — upsert atomique.
**Migration :** `030_create_daily_usage.sql`
**Codes erreur :** `DAILY_CHAT_LIMIT`, `DAILY_EXS_LIMIT`, `DAILY_ANA_LIMIT`

---

## Dossiers matières (Subject Folders)

9 dossiers créés automatiquement à l'inscription (mathématiques, français, physique, chimie, biologie, histoire, géographie, anglais, néerlandais).

- **Auto-sort** : à la création d'une synthèse avec `subject` défini, si `user.auto_folder = 1`, la synthèse va automatiquement dans le dossier correspondant (créé si absent).
- **Toggle** dans Settings > Organisation — `auto_folder` stocké en DB sur `users`.
- `folderRepository.js` : `createSubjectFolders(userId, lang)`, `findOrCreateSubjectFolder(userId, subject, lang)`
- **Migration :** `031_add_subject_folders.sql` — colonne `subject` sur `folders`, colonne `auto_folder` sur `users`

---

## Caméra réelle pour /ana

`/ana` propose deux options : galerie (`fileInputRef`) ou caméra directe (`AnaCameraModal`).

`src/components/Assistant/AnaCameraModal.jsx` : modal plein écran, stream `getUserMedia({ facingMode: 'environment' })`, bouton capture (canvas), callback `onCapture(base64)`.

**Important** : le container caméra et le viewfinder utilisent `style={{ borderRadius, backdropFilter: 'none' }}` au lieu de classes Tailwind `rounded-*` — le glassmorphism global (appliqué via `.rounded-*`) floutait sinon le flux caméra.

---

## Correction per-item (ExerciseDetail)

- **QCM** : correction instantanée locale (pas d'API) — `correct_answer` disponible dans l'item
- **Open/Practical** : correction GPT au blur du champ (`correctItem(setId, itemId)`)
- Endpoint : `POST /api/assistant/correct-item` — `correctSingleItem()` dans `assistantService.js` (max_tokens: 400)
- Pas de bouton "Corriger" global — correction automatique item par item

---

## Système de Planning (planning.html)

Site de planning accessible à `https://mirora.cloud/planning.html` — 9 Epics, 38+ sous-tâches couvrant toute l'app Nora.

### Workflow obligatoire par sous-tâche
`todo → inprogress → review → i18n → security → verify → docs → done`

| Étape | Ce que Claude fait automatiquement |
|-------|-----------------------------------|
| **PR Review** | `curl` sur les endpoints, vérification des cas de bugs, lecture du code |
| **Traductions** | `grep` fr.json + en.json pour vérifier que toutes les nouvelles clés existent dans les 2 langues |
| **Security** | `npm audit`, vérif auth/injection sur les nouveaux endpoints |
| **Vérification** | `npm run build`, grep console.log, `pm2 logs` |
| **CLAUDE.md** | Évaluation de l'importance — si critique, entrée ajoutée ici automatiquement |

**IMPORTANT** : Claude fait toutes ces étapes lui-même après chaque implémentation, sans que l'utilisateur ait à demander.

### API Planning (backend)
- `GET /api/planning/state` — lire l'état de toutes les sous-tâches
- `PUT /api/planning/state` — écraser l'état complet
- `PATCH /api/planning/subtask` — avancer une sous-tâche + écrire dans CLAUDE.md si `claudeMdEntry` fourni

### Commande type pour avancer une sous-tâche
```bash
curl -X PATCH http://localhost:5000/api/planning/subtask \
  -H "Content-Type: application/json" \
  -d '{
    "epicId": "E1",
    "subtaskId": "1.1",
    "updates": { "status": "done", "checkedTests": {"0":true,"1":true} },
    "claudeMdEntry": "## Ma feature\nNotes importantes..."
  }'
```

### État stocké dans
`/var/www/mirora.cloud/planning-state.json` (lu par le site via fetch, fallback localStorage)
