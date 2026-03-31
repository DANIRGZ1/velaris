// Singleton AudioContext to prevent memory leaks in a long-running desktop app.
// Browsers/Tauri limit the number of AudioContexts (~6 in Chrome).
let _ctx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContextClass) return null;

  if (!_ctx || _ctx.state === "closed") {
    _ctx = new AudioContextClass();
  }
  if (_ctx.state === "suspended") {
    _ctx.resume();
  }
  return _ctx;
}

export const playAlertSound = (type: "match_found" | "your_turn" | "celebration" | "celebration_epic", volumePercent: number) => {
  if (volumePercent <= 0) return;

  const ctx = getAudioContext();
  if (!ctx) return;

  // Master Gain to control overall volume
  const masterGain = ctx.createGain();
  // Map 0-100 to 0.0-0.3 to keep it soft and elegant overall
  masterGain.gain.value = (volumePercent / 100) * 0.3;
  masterGain.connect(ctx.destination);

  // Function to synthesize a single soft, glassy tone
  const playTone = (freq: number, startTime: number, duration: number) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    // Sine wave produces the softest, purest tone without harsh harmonics
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, startTime);

    // Elegant volume envelope: instant attack, exponential fade out (like striking a marimba or glass)
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(1, startTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc.connect(gain);
    gain.connect(masterGain);

    osc.start(startTime);
    osc.stop(startTime + duration);

    // Cleanup: disconnect nodes after they're done to free resources
    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
    };
  };

  const now = ctx.currentTime;

  if (type === "match_found") {
    // Two ascending tones (C5 to E5), optimistic but very polite
    playTone(523.25, now, 1.5);       // C5
    playTone(659.25, now + 0.15, 2.0); // E5
  } else if (type === "your_turn") {
    // Single clear tone (A4), informative but gentle
    playTone(440.00, now, 1.8);        // A4
  } else if (type === "celebration") {
    // Warm ascending triad — C5 → E5 → G5
    playTone(523.25, now, 2.0);
    playTone(659.25, now + 0.12, 2.2);
    playTone(783.99, now + 0.28, 2.5);
  } else if (type === "celebration_epic") {
    // Majestic ascending chord — C5 → E5 → G5 → C6
    playTone(523.25, now, 2.5);
    playTone(659.25, now + 0.15, 2.8);
    playTone(783.99, now + 0.35, 3.0);
    playTone(1046.50, now + 0.60, 3.5);
  }

  // Disconnect master gain after all tones are done
  setTimeout(() => {
    masterGain.disconnect();
  }, 3000);
};