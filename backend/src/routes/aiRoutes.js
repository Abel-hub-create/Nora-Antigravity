/**
 * Routes AI - Transcription vocale (Whisper) et OCR (Vision)
 */

import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { transcribeAudio, extractTextFromImage, extractTextFromImages } from '../services/openaiService.js';
import { generateEducationalContent } from '../services/contentGenerationService.js';
import { verifyContentSubject } from '../services/contentVerificationService.js';
import { authenticate } from '../middlewares/auth.js';
import { aiVerificationLimiter } from '../middlewares/rateLimiter.js';
import { getUserPlanLimits } from '../services/planRepository.js';

const router = express.Router();

// Configuration de multer pour les uploads audio
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, '../../uploads');

// Créer le dossier uploads s'il n'existe pas
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `audio-${uniqueSuffix}${path.extname(file.originalname) || '.webm'}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 25 * 1024 * 1024 // 25MB max (limite Whisper)
  },
  fileFilter: (req, file, cb) => {
    // Accept any audio type or common audio extensions
    const isAudio = file.mimetype.startsWith('audio/') ||
                    file.originalname.match(/\.(webm|mp3|wav|ogg|m4a|mp4|mpeg|opus)$/i);
    if (isAudio) {
      cb(null, true);
    } else {
      console.log('[Upload] Rejected file:', file.mimetype, file.originalname);
      cb(new Error('Type de fichier audio non supporté'), false);
    }
  }
});

/**
 * POST /api/ai/transcribe
 * Transcription audio avec Whisper
 */
router.post('/transcribe', authenticate, (req, res, next) => {
  upload.single('audio')(req, res, (err) => {
    if (err) {
      console.error('[Transcribe] Upload error:', err.message);
      return res.status(400).json({ error: err.message || 'Erreur upload audio' });
    }
    next();
  });
}, async (req, res) => {
  console.log('[Transcribe] File received:', req.file ? req.file.originalname : 'none');

  if (!req.file) {
    return res.status(400).json({ error: 'Aucun fichier audio fourni' });
  }

  const filePath = req.file.path;
  console.log('[Transcribe] Processing file:', filePath);

  try {
    const transcript = await transcribeAudio(filePath);
    console.log('[Transcribe] Success, length:', transcript?.length);
    console.log('[Transcribe] Content:', transcript?.substring(0, 100));

    // Nettoyer le fichier après traitement
    fs.unlink(filePath, (err) => {
      if (err) console.error('Erreur suppression fichier temp:', err);
    });

    // Vérifier si la transcription est suffisante (minimum 30 caractères)
    if (!transcript || transcript.trim().length < 30) {
      return res.status(400).json({
        error: 'NO_TEXT_DETECTED_VOICE',
        errorCode: 'NO_TEXT_DETECTED_VOICE'
      });
    }

    res.json({ transcript: transcript.trim() });
  } catch (error) {
    // Nettoyer le fichier en cas d'erreur aussi
    fs.unlink(filePath, () => {});

    console.error('[Transcribe] Error:', error.message);
    res.status(500).json({ error: error.message || 'Erreur lors de la transcription' });
  }
});

/**
 * POST /api/ai/ocr
 * OCR avec GPT-4 Vision
 * Body: { image: "base64..." } ou { images: ["base64...", "base64..."] }
 */
router.post('/ocr', authenticate, express.json({ limit: '120mb' }), async (req, res) => {
  const { image, images } = req.body;

  if (!image && (!images || !Array.isArray(images) || images.length === 0)) {
    return res.status(400).json({ error: 'Aucune image fournie' });
  }

  try {
    let extractedText;

    console.log('[OCR] Traitement de', images ? images.length : 1, 'image(s)');

    if (images && Array.isArray(images)) {
      // Multiple images
      extractedText = await extractTextFromImages(images);
    } else {
      // Single image
      extractedText = await extractTextFromImage(image);
    }

    console.log('[OCR] Texte extrait, longueur:', extractedText?.length || 0);

    // Vérifier si le texte est suffisant (minimum 30 caractères)
    if (!extractedText || extractedText.trim().length < 30) {
      return res.status(400).json({
        error: 'NO_TEXT_DETECTED_PHOTO',
        errorCode: 'NO_TEXT_DETECTED_PHOTO'
      });
    }

    res.json({ text: extractedText.trim() });
  } catch (error) {
    console.error('Erreur OCR:', error);
    res.status(500).json({ error: error.message || 'Erreur lors de l\'extraction du texte' });
  }
});

/**
 * POST /api/ai/generate-content
 * Generation complete de contenu pedagogique (titre + synthese + flashcards + quiz)
 * Body: { content: "texte du cours...", specificInstructions?: "instructions specifiques...", subject?: "mathematics" }
 */
router.post('/generate-content', authenticate, express.json({ limit: '10mb' }), async (req, res) => {
  try {
    const { content, specificInstructions, subject, difficulty } = req.body;
    const lang = (req.headers['accept-language'] || 'fr').split(',')[0].split('-')[0];

    // Check max_prompt_chars from user's plan + determine quizCount
    let quizCount = 4;
    if (content && req.user?.id) {
      const { plan, limits } = await getUserPlanLimits(req.user.id);
      const maxChars = limits.max_prompt_chars;
      if (maxChars && content.length > maxChars) {
        return res.status(403).json({
          error: `Contenu trop long (${content.length} caractères). Votre plan autorise ${maxChars} caractères maximum.`,
          code: 'PROMPT_TOO_LONG',
          limit: maxChars,
          current: content.length
        });
      }
      // 20 questions pour les plans payants
      if (plan === 'premium' || plan === 'school') quizCount = 20;
    }

    // Valider la difficulté (seulement pour les plans premium/school, ignoré sinon)
    const validDifficulties = ['easy', 'medium', 'hard'];
    const resolvedDifficulty = validDifficulties.includes(difficulty) ? difficulty : null;

    const result = await generateEducationalContent(content, specificInstructions, subject, lang, req.user?.id, resolvedDifficulty, quizCount);
    res.json(result);
  } catch (error) {
    console.error('Erreur generation contenu:', error);
    if (error.message === 'rate_limit_exceeded') {
      return res.status(429).json({ error: 'Serveur occupé', code: 'RATE_LIMIT_EXCEEDED' });
    }
    const statusCode = error.message.includes('trop court') ||
                       error.message.includes('trop long') ||
                       error.message.includes('invalide') ? 400 : 500;
    res.status(statusCode).json({ error: error.message || 'Erreur lors de la generation du contenu' });
  }
});

/**
 * POST /api/ai/verify-subject
 * Verification que le contenu correspond a la matiere selectionnee
 * Body: { content: "texte du cours...", subject: "mathematics" }
 * Returns: { correspondance: boolean, matiere_detectee: string, confiance: string, message: string }
 */
router.post('/verify-subject', authenticate, aiVerificationLimiter, express.json({ limit: '10mb' }), async (req, res) => {
  try {
    const { content, subject } = req.body;

    if (!content || content.length < 30) {
      return res.status(400).json({ error: 'Contenu trop court pour être analysé (minimum 30 caractères)' });
    }

    if (!subject) {
      return res.status(400).json({ error: 'Matière non spécifiée' });
    }

    const result = await verifyContentSubject(content, subject);
    res.json(result);
  } catch (error) {
    console.error('Erreur verification matiere:', error);
    const statusCode = error.message.includes('invalide') ||
                       error.message.includes('trop court') ? 400 : 500;
    res.status(statusCode).json({ error: error.message || 'Erreur lors de la vérification' });
  }
});

export default router;
