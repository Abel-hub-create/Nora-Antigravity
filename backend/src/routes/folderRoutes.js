import express from 'express';
import { authenticate } from '../middlewares/auth.js';
import { validate } from '../middlewares/validation.js';
import * as validators from '../validators/folderValidators.js';
import * as folderRepo from '../services/folderRepository.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get all folders for current user
router.get('/', async (req, res, next) => {
  try {
    const folders = await folderRepo.findAllByUser(req.user.id);
    res.json({ folders });
  } catch (error) {
    next(error);
  }
});

// Create new folder
router.post('/', validate(validators.createFolderSchema), async (req, res, next) => {
  try {
    const { name, color } = req.body;
    const folder = await folderRepo.create({
      userId: req.user.id,
      name,
      color
    });
    res.status(201).json({ folder });
  } catch (error) {
    next(error);
  }
});

// Get single folder
router.get('/:id', async (req, res, next) => {
  try {
    const folder = await folderRepo.findById(parseInt(req.params.id), req.user.id);
    if (!folder) {
      return res.status(404).json({ error: 'Dossier non trouvé' });
    }
    res.json({ folder });
  } catch (error) {
    next(error);
  }
});

// Update folder
router.patch('/:id', validate(validators.updateFolderSchema), async (req, res, next) => {
  try {
    const { name, color } = req.body;
    const updated = await folderRepo.update(
      parseInt(req.params.id),
      req.user.id,
      { name, color }
    );
    if (!updated) {
      return res.status(404).json({ error: 'Dossier non trouvé' });
    }
    res.json({ message: 'Dossier mis à jour' });
  } catch (error) {
    next(error);
  }
});

// Delete folder
router.delete('/:id', async (req, res, next) => {
  try {
    const deleted = await folderRepo.remove(parseInt(req.params.id), req.user.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Dossier non trouvé' });
    }
    res.json({ message: 'Dossier supprimé' });
  } catch (error) {
    next(error);
  }
});

// Get syntheses in folder
router.get('/:id/syntheses', async (req, res, next) => {
  try {
    const syntheses = await folderRepo.getSynthesesInFolder(
      parseInt(req.params.id),
      req.user.id
    );
    if (syntheses === null) {
      return res.status(404).json({ error: 'Dossier non trouvé' });
    }
    res.json({ syntheses });
  } catch (error) {
    next(error);
  }
});

// Add syntheses to folder
router.post('/:id/syntheses', validate(validators.addSynthesesSchema), async (req, res, next) => {
  try {
    const folder = await folderRepo.findById(parseInt(req.params.id), req.user.id);
    if (!folder) {
      return res.status(404).json({ error: 'Dossier non trouvé' });
    }

    const { syntheseIds } = req.body;
    await folderRepo.addSynthesesToFolder(parseInt(req.params.id), syntheseIds);
    res.json({ message: 'Synthèses ajoutées', count: syntheseIds.length });
  } catch (error) {
    next(error);
  }
});

// Remove synthese from folder
router.delete('/:id/syntheses/:syntheseId', async (req, res, next) => {
  try {
    const removed = await folderRepo.removeSyntheseFromFolder(
      parseInt(req.params.id),
      parseInt(req.params.syntheseId)
    );
    if (!removed) {
      return res.status(404).json({ error: 'Synthèse non trouvée dans ce dossier' });
    }
    res.json({ message: 'Synthèse retirée du dossier' });
  } catch (error) {
    next(error);
  }
});

// Get syntheses available to add (not already in folder)
router.get('/:id/available-syntheses', async (req, res, next) => {
  try {
    const folder = await folderRepo.findById(parseInt(req.params.id), req.user.id);
    if (!folder) {
      return res.status(404).json({ error: 'Dossier non trouvé' });
    }

    const syntheses = await folderRepo.getSynthesesNotInFolder(
      parseInt(req.params.id),
      req.user.id
    );
    res.json({ syntheses });
  } catch (error) {
    next(error);
  }
});

export default router;
