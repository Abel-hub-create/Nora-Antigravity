/**
 * Routes AI - Transcription vocale (Whisper) et OCR (Vision)
 */

import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { transcribeAudio, extractTextFromImage, extractTextFromImages } from '../services/openaiService.js';
import { authenticate } from '../middlewares/auth.js';

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
    const allowedTypes = ['audio/webm', 'audio/mp3', 'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/m4a', 'audio/mp4'];
    if (allowedTypes.includes(file.mimetype) || file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Type de fichier audio non supporté'), false);
    }
  }
});

/**
 * POST /api/ai/transcribe
 * Transcription audio avec Whisper
 */
router.post('/transcribe', authenticate, upload.single('audio'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Aucun fichier audio fourni' });
  }

  const filePath = req.file.path;

  try {
    const transcript = await transcribeAudio(filePath);

    // Nettoyer le fichier après traitement
    fs.unlink(filePath, (err) => {
      if (err) console.error('Erreur suppression fichier temp:', err);
    });

    res.json({ transcript });
  } catch (error) {
    // Nettoyer le fichier en cas d'erreur aussi
    fs.unlink(filePath, () => {});

    console.error('Erreur transcription:', error);
    res.status(500).json({ error: error.message || 'Erreur lors de la transcription' });
  }
});

/**
 * POST /api/ai/ocr
 * OCR avec GPT-4 Vision
 * Body: { image: "base64..." } ou { images: ["base64...", "base64..."] }
 */
router.post('/ocr', authenticate, express.json({ limit: '50mb' }), async (req, res) => {
  const { image, images } = req.body;

  if (!image && (!images || !Array.isArray(images) || images.length === 0)) {
    return res.status(400).json({ error: 'Aucune image fournie' });
  }

  try {
    let extractedText;

    if (images && Array.isArray(images)) {
      // Multiple images
      extractedText = await extractTextFromImages(images);
    } else {
      // Single image
      extractedText = await extractTextFromImage(image);
    }

    if (!extractedText || extractedText === 'Aucun texte détecté') {
      return res.status(400).json({
        error: 'Aucun texte n\'a pu être extrait. Essayez avec une image plus nette.'
      });
    }

    res.json({ text: extractedText });
  } catch (error) {
    console.error('Erreur OCR:', error);
    res.status(500).json({ error: error.message || 'Erreur lors de l\'extraction du texte' });
  }
});

export default router;
