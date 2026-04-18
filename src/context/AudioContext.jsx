import React, { createContext, useContext, useRef, useState, useEffect, useCallback } from 'react';

const DEFAULT_TRACKS = [
  { id: 'outerwild', name: 'Outer Wild', src: '/sounds/outerwildnora.mp3', isDefault: true },
  { id: 'nobatida', name: 'No Batida', src: '/sounds/nobatidaonora.mp3', isDefault: true },
];

const DB_NAME = 'nora_audio';
const STORE_NAME = 'custom_tracks';

function openAudioDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = (e) => {
      e.target.result.createObjectStore(STORE_NAME, { keyPath: 'id' });
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = () => reject(req.error);
  });
}

const AudioCtx = createContext(null);

export function AudioProvider({ children }) {
  const audioRef = useRef(null);
  const blobUrlsRef = useRef({});
  const hasInteractedRef = useRef(false);

  const [musicEnabled, setMusicEnabled] = useState(
    localStorage.getItem('nora_music_enabled') !== 'false'
  );
  const [musicVolume, setMusicVolume] = useState(
    parseFloat(localStorage.getItem('nora_music_volume') ?? '0.4')
  );
  const [sfxVolume, setSfxVolume] = useState(
    parseFloat(localStorage.getItem('nora_sfx_volume') ?? '0.5')
  );
  const [currentTrackId, setCurrentTrackId] = useState(
    localStorage.getItem('nora_music_track') ?? 'outerwild'
  );
  const [customTracks, setCustomTracks] = useState([]);

  // Load custom tracks from IndexedDB on mount
  useEffect(() => {
    (async () => {
      try {
        const db = await openAudioDB();
        const req = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).getAll();
        const all = await new Promise((res, rej) => {
          req.onsuccess = () => res(req.result);
          req.onerror = () => rej(req.error);
        });
        const tracks = all.map(({ id, name, blob }) => {
          const url = URL.createObjectURL(blob);
          blobUrlsRef.current[id] = url;
          return { id, name, src: url, isDefault: false };
        });
        setCustomTracks(tracks);
      } catch {}
    })();

    return () => {
      Object.values(blobUrlsRef.current).forEach(URL.revokeObjectURL);
    };
  }, []);

  const allTracks = [...DEFAULT_TRACKS, ...customTracks];

  // Initialize audio element once
  useEffect(() => {
    const audio = new Audio();
    audio.loop = true;
    audioRef.current = audio;
    return () => {
      audio.pause();
      audio.src = '';
    };
  }, []);

  // Update track src when track or custom tracks change
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const track = allTracks.find(t => t.id === currentTrackId) ?? DEFAULT_TRACKS[0];
    audio.src = track.src;
    audio.load();
    if (musicEnabled && hasInteractedRef.current) {
      audio.play().catch(() => {});
    }
  }, [currentTrackId, customTracks]);

  // Sync music enabled state
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (musicEnabled && hasInteractedRef.current) {
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
    localStorage.setItem('nora_music_enabled', musicEnabled ? 'true' : 'false');
  }, [musicEnabled]);

  // Sync music volume
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = musicVolume;
    localStorage.setItem('nora_music_volume', String(musicVolume));
  }, [musicVolume]);

  // Sync SFX volume to global for sounds.js
  useEffect(() => {
    window.__nora_sfx_volume__ = sfxVolume;
    localStorage.setItem('nora_sfx_volume', String(sfxVolume));
  }, [sfxVolume]);

  // Start playing on first user interaction
  useEffect(() => {
    if (!musicEnabled) return;
    const start = () => {
      if (hasInteractedRef.current) return;
      hasInteractedRef.current = true;
      audioRef.current?.play().catch(() => {});
    };
    document.addEventListener('pointerdown', start, { once: true });
    return () => document.removeEventListener('pointerdown', start);
  }, [musicEnabled]);

  const toggleMusic = useCallback(() => setMusicEnabled(v => !v), []);

  const selectTrack = useCallback((id) => {
    setCurrentTrackId(id);
    localStorage.setItem('nora_music_track', id);
  }, []);

  const importTrack = useCallback(async (file) => {
    if (customTracks.length >= 5) return 'limit';
    const id = `custom_${Date.now()}`;
    const name = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
    const blob = new Blob([await file.arrayBuffer()], { type: file.type });
    try {
      const db = await openAudioDB();
      await new Promise((res, rej) => {
        const req = db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).add({ id, name, blob });
        req.onsuccess = res;
        req.onerror = rej;
      });
      const url = URL.createObjectURL(blob);
      blobUrlsRef.current[id] = url;
      setCustomTracks(prev => [...prev, { id, name, src: url, isDefault: false }]);
      return true;
    } catch {
      return false;
    }
  }, [customTracks.length]);

  const deleteCustomTrack = useCallback(async (trackId) => {
    try {
      const db = await openAudioDB();
      await new Promise((res, rej) => {
        const req = db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).delete(trackId);
        req.onsuccess = res;
        req.onerror = rej;
      });
      if (blobUrlsRef.current[trackId]) {
        URL.revokeObjectURL(blobUrlsRef.current[trackId]);
        delete blobUrlsRef.current[trackId];
      }
      setCustomTracks(prev => prev.filter(t => t.id !== trackId));
      if (currentTrackId === trackId) selectTrack('outerwild');
    } catch {}
  }, [currentTrackId, selectTrack]);

  // defaultTrackNames stored in localStorage to allow renaming default tracks
  const [defaultNames, setDefaultNames] = useState(() => {
    try { return JSON.parse(localStorage.getItem('nora_track_names') ?? '{}'); } catch { return {}; }
  });

  const renameTrack = useCallback(async (trackId, newName) => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    const isCustom = trackId.startsWith('custom_');
    if (isCustom) {
      try {
        const db = await openAudioDB();
        const store = db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME);
        const existing = await new Promise((res, rej) => {
          const r = store.get(trackId); r.onsuccess = () => res(r.result); r.onerror = rej;
        });
        if (existing) {
          await new Promise((res, rej) => {
            const r = db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).put({ ...existing, name: trimmed });
            r.onsuccess = res; r.onerror = rej;
          });
        }
        setCustomTracks(prev => prev.map(t => t.id === trackId ? { ...t, name: trimmed } : t));
      } catch {}
    } else {
      const next = { ...defaultNames, [trackId]: trimmed };
      setDefaultNames(next);
      localStorage.setItem('nora_track_names', JSON.stringify(next));
    }
  }, [defaultNames]);

  const allTracksWithNames = [...DEFAULT_TRACKS, ...customTracks].map(t => ({
    ...t,
    displayName: t.isDefault ? (defaultNames[t.id] ?? null) : t.name,
  }));

  return (
    <AudioCtx.Provider value={{
      musicEnabled, toggleMusic,
      musicVolume, setMusicVolume,
      sfxVolume, setSfxVolume,
      currentTrackId, selectTrack,
      allTracks: allTracksWithNames, customTracks,
      importTrack, deleteCustomTrack, renameTrack,
    }}>
      {children}
    </AudioCtx.Provider>
  );
}

export function useAudio() {
  return useContext(AudioCtx);
}
