/* WebAudio sound effects — no external audio files required.
   Playback can be muted via setEnabled(false); the caller is
   responsible for persisting that preference (see data.js `soundOn`). */
(function (root) {
  'use strict';
  root.PM = root.PM || {};

  let audioCtx = null;
  let enabled = true;

  function getAudioCtx() {
    if (!audioCtx) {
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (AC) audioCtx = new AC();
      } catch (e) { /* WebAudio unsupported in this browser — sounds are silently skipped */ }
    }
    return audioCtx;
  }

  function playTone(freq, start, duration, type, gainVal) {
    if (!enabled) return;
    const ctx = getAudioCtx();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type || 'sine';
      osc.frequency.value = freq;
      const g = gainVal || 0.08;
      gain.gain.value = g;
      osc.connect(gain).connect(ctx.destination);
      const t0 = ctx.currentTime + start;
      osc.start(t0);
      gain.gain.setValueAtTime(g, t0);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
      osc.stop(t0 + duration + 0.02);
    } catch (e) { /* audio glitch — non-critical, ignore */ }
  }

  function playCorrectSound() {
    playTone(523, 0, 0.12);
    playTone(659, 0.1, 0.12);
    playTone(784, 0.2, 0.2);
  }

  function playWrongSound() {
    playTone(220, 0, 0.18, 'sawtooth', 0.05);
  }

  function playStepDing() {
    playTone(659, 0, 0.14);
  }

  function playCelebrateSound() {
    [523, 587, 659, 784, 880].forEach((f, i) => playTone(f, i * 0.12, 0.18));
  }

  function setEnabled(value) { enabled = !!value; }
  function isEnabled() { return enabled; }

  root.PM.Audio = {
    playCorrectSound,
    playWrongSound,
    playStepDing,
    playCelebrateSound,
    setEnabled,
    isEnabled,
  };
})(typeof window !== 'undefined' ? window : globalThis);
