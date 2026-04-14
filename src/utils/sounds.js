let audioCtx = null;
let clickBuffer = null;
let hoverBuffer = null;
let rawClickAb = null;
let rawHoverAb = null;

// Fetch des deux fichiers immédiatement
if (typeof window !== 'undefined') {
    fetch('/sounds/minecraftclic.mp3')
        .then(r => r.arrayBuffer())
        .then(ab => { rawClickAb = ab; if (audioCtx) _decodeClick(); })
        .catch(() => {});

    fetch('/sounds/swoosh.mp3')
        .then(r => r.arrayBuffer())
        .then(ab => { rawHoverAb = ab; if (audioCtx) _decodeHover(); })
        .catch(() => {});
}

const _trimAndStore = (ab, setter) => {
    audioCtx.decodeAudioData(ab, buf => {
        const ch = buf.getChannelData(0);
        let start = 0;
        while (start < ch.length && Math.abs(ch[start]) < 0.005) start++;
        start = Math.max(0, start - Math.floor(buf.sampleRate * 0.002));
        const trimmed = audioCtx.createBuffer(buf.numberOfChannels, buf.length - start, buf.sampleRate);
        for (let c = 0; c < buf.numberOfChannels; c++) {
            trimmed.getChannelData(c).set(buf.getChannelData(c).subarray(start));
        }
        setter(trimmed);
    }, () => {});
};

const _decodeClick = () => {
    if (!audioCtx || !rawClickAb || clickBuffer) return;
    const ab = rawClickAb; rawClickAb = null;
    _trimAndStore(ab, buf => { clickBuffer = buf; });
};

const _decodeHover = () => {
    if (!audioCtx || !rawHoverAb || hoverBuffer) return;
    const ab = rawHoverAb; rawHoverAb = null;
    _trimAndStore(ab, buf => { hoverBuffer = buf; });
};

// Débloque sur pointerdown ET mousemove — hover decode avant tout clic
if (typeof document !== 'undefined') {
    const unlock = () => {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            if (rawClickAb) _decodeClick();
            if (rawHoverAb) _decodeHover();
        }
        if (audioCtx.state === 'suspended') audioCtx.resume();
        document.removeEventListener('pointerdown', unlock, true);
        document.removeEventListener('mousemove', unlock, true);
    };
    document.addEventListener('pointerdown', unlock, true);
    document.addEventListener('mousemove', unlock, { once: true, capture: true });
}

export const playClick = () => {
    try {
        if (!audioCtx || !clickBuffer) return;
        const src = audioCtx.createBufferSource();
        src.buffer = clickBuffer;
        const gain = audioCtx.createGain();
        gain.gain.value = 0.4;
        src.connect(gain);
        gain.connect(audioCtx.destination);
        src.start(audioCtx.currentTime);
    } catch (_) {}
};

let lastHover = 0;
export const playHover = () => {
    const now = Date.now();
    if (now - lastHover < 100) return;
    lastHover = now;
    try {
        if (!audioCtx || !hoverBuffer) return;
        const src = audioCtx.createBufferSource();
        src.buffer = hoverBuffer;
        const gain = audioCtx.createGain();
        gain.gain.value = 0.18;
        src.connect(gain);
        gain.connect(audioCtx.destination);
        src.start(audioCtx.currentTime);
    } catch (_) {}
};
