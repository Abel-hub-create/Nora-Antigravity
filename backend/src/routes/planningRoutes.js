import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const router = express.Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STATE_FILE = path.resolve(__dirname, '../../../planning-state.json');
const CLAUDE_MD = path.resolve(__dirname, '../../../CLAUDE.md');

router.get('/state', (req, res) => {
  try {
    const data = fs.existsSync(STATE_FILE)
      ? JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'))
      : {};
    res.json(data);
  } catch {
    res.json({});
  }
});

router.put('/state', (req, res) => {
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(req.body, null, 2));
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Advance a single subtask status + optional CLAUDE.md update
router.patch('/subtask', (req, res) => {
  try {
    const { epicId, subtaskId, updates, claudeMdEntry } = req.body;
    if (!epicId || !subtaskId || !updates) {
      return res.status(400).json({ error: 'epicId, subtaskId, updates requis' });
    }

    // Update planning state
    const state = fs.existsSync(STATE_FILE)
      ? JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'))
      : {};
    const key = `${epicId}_${subtaskId}`;
    state[key] = { ...(state[key] || {}), ...updates };
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));

    // Append to CLAUDE.md if entry provided
    if (claudeMdEntry && typeof claudeMdEntry === 'string' && claudeMdEntry.trim()) {
      const existing = fs.existsSync(CLAUDE_MD) ? fs.readFileSync(CLAUDE_MD, 'utf8') : '';
      const entry = `\n${claudeMdEntry.trim()}\n`;
      fs.writeFileSync(CLAUDE_MD, existing + entry);
      state[key].docsNotes = claudeMdEntry.trim();
      fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
    }

    res.json({ ok: true, state: state[key] });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
