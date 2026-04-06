let audioCtx = null;

const getCtx = () => {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
};

// Minecraft UI click — double pop rapide comme le vrai son
export const playClick = () => {
    try {
        const ctx = getCtx();
        const now = ctx.currentTime;

        // Premier pop
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = 'square';
        osc1.frequency.setValueAtTime(820, now);
        osc1.frequency.exponentialRampToValueAtTime(180, now + 0.035);
        gain1.gain.setValueAtTime(0.028, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.035);
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start(now);
        osc1.stop(now + 0.035);

        // Deuxième pop léger (écho immédiat)
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'square';
        osc2.frequency.setValueAtTime(500, now + 0.025);
        osc2.frequency.exponentialRampToValueAtTime(120, now + 0.055);
        gain2.gain.setValueAtTime(0.012, now + 0.025);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.055);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(now + 0.025);
        osc2.stop(now + 0.055);
    } catch (_) {}
};

// Hover swoosh — très léger, uniquement sur éléments qui s'agrandissent
let lastHover = 0;
export const playHover = () => {
    const now = Date.now();
    if (now - lastHover < 100) return; // throttle
    lastHover = now;

    try {
        const ctx = getCtx();
        const t = ctx.currentTime;

        // Bruit filtré qui monte rapidement
        const bufLen = Math.floor(ctx.sampleRate * 0.07);
        const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;

        const src = ctx.createBufferSource();
        src.buffer = buf;

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1200, t);
        filter.frequency.exponentialRampToValueAtTime(3500, t + 0.04);
        filter.Q.value = 2;

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.001, t);
        gain.gain.linearRampToValueAtTime(0.022, t + 0.025);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);

        src.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        src.start(t);
    } catch (_) {}
};
