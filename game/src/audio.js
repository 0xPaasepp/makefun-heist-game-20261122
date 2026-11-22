// Synthesized sounds, made with WebAudio and nothing else: no audio files,
// no network, and every call is guarded so a browser with no audio still plays.

let audioCtx = null;
let alarmNodes = null;

function context() {
  if (audioCtx) return audioCtx;
  try {
    const Ctor = window.AudioContext ?? window.webkitAudioContext;
    if (!Ctor) return null;
    audioCtx = new Ctor();
  } catch {
    return null;
  }
  return audioCtx;
}

/** Unlock audio on the first user gesture; browsers block it before then. */
export function unlockAudio() {
  const ctx = context();
  if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
}

function blip(frequency, duration, type, gainValue, slideTo) {
  const ctx = context();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, now);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, now + duration);
    gain.gain.setValueAtTime(gainValue, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration);
  } catch {
    // Sound is garnish; a failure never breaks the game.
  }
}

export const sounds = {
  /** A soft chime when loot is taken. */
  loot() {
    blip(880, 0.16, 'sine', 0.12);
    setTimeout(() => blip(1318, 0.22, 'sine', 0.1), 70);
  },
  /** A low zap when the EMP fires. */
  emp() {
    blip(1200, 0.3, 'sawtooth', 0.08, 120);
  },
  /** A wooden clatter when the noise-maker lands. */
  noise() {
    blip(220, 0.1, 'square', 0.07, 90);
    setTimeout(() => blip(180, 0.12, 'square', 0.06, 70), 90);
  },
  /** A metallic click while the lockpick works. */
  pick() {
    blip(1500, 0.05, 'square', 0.05);
  },
  /** The vault door swinging open. */
  vault() {
    blip(180, 0.5, 'sine', 0.12, 60);
    setTimeout(() => blip(523, 0.3, 'sine', 0.1), 200);
  },
  /** A short sting when a guard spots you. */
  spotted() {
    blip(440, 0.18, 'sawtooth', 0.09, 660);
  },
  /** A harsh buzz when the heist ends in handcuffs. */
  caught() {
    blip(220, 0.5, 'sawtooth', 0.12, 110);
  },
  /** A rising arpeggio for the getaway. */
  win() {
    [523, 659, 784, 1046].forEach((freq, i) => {
      setTimeout(() => blip(freq, 0.3, 'sine', 0.11), i * 110);
    });
  },
  /** A floor-change chime. */
  floor() {
    blip(392, 0.2, 'sine', 0.1);
    setTimeout(() => blip(587, 0.25, 'sine', 0.1), 120);
  },
};

/** A two-tone alarm loop while the alarm is high; silent below 55%. */
export function setAlarmSound(level) {
  const ctx = context();
  if (!ctx) return;
  try {
    if (level >= 55 && !alarmNodes) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(620, ctx.currentTime);
      gain.gain.setValueAtTime(0.025, ctx.currentTime);
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.frequency.setValueAtTime(1.6, ctx.currentTime);
      lfoGain.gain.setValueAtTime(180, ctx.currentTime);
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      lfo.start();
      alarmNodes = { osc, lfo, gain };
    } else if (level < 55 && alarmNodes) {
      const { osc, lfo, gain } = alarmNodes;
      gain.gain.setTargetAtTime(0, ctx.currentTime, 0.05);
      setTimeout(() => {
        try {
          osc.stop();
          lfo.stop();
        } catch {
          // Already stopped.
        }
      }, 300);
      alarmNodes = null;
    }
  } catch {
    // Sound is garnish; a failure never breaks the game.
  }
}
