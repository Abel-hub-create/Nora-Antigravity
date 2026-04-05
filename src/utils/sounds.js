let audioCtx = null;

const getCtx = () => {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
};

// Minecraft UI click — square wave pop with quick frequency drop
export const playClick = () => {
    try {
        const ctx = getCtx();
        const now = ctx.currentTime;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(150, now + 0.07);

        gain.gain.setValueAtTime(0.04, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.08);
    } catch (_) {}
};

// Hover swoosh — short filtered noise sweep
let lastHover = 0;
export const playHover = () => {
    const now = Date.now();
    if (now - lastHover < 80) return; // throttle
    lastHover = now;

    try {
        const ctx = getCtx();
        const t = ctx.currentTime;

        const bufLen = Math.floor(ctx.sampleRate * 0.06);
        const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;

        const src = ctx.createBufferSource();
        src.buffer = buf;

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(3000, t);
        filter.frequency.exponentialRampToValueAtTime(800, t + 0.06);
        filter.Q.value = 1.5;

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.12, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);

        src.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        src.start(t);
    } catch (_) {}
};
