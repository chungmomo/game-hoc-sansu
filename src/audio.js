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

  /* Victory fanfare (full problem solved): a short ascending run into
     a bright two-note chord, instead of three flat notes. */
  function playCorrectSound() {
    playTone(523.25, 0, 0.12);
    playTone(659.25, 0.11, 0.12);
    playTone(783.99, 0.22, 0.12);
    playTone(1046.5, 0.34, 0.38);
    playTone(1318.5, 0.34, 0.38, 'sine', 0.05);
  }

  function playWrongSound() {
    playTone(220, 0, 0.18, 'sawtooth', 0.05);
  }

  /* Light two-note "ding-dong" for a single correct column, kept
     brief and distinct from the full victory fanfare. */
  function playStepDing() {
    playTone(659, 0, 0.1);
    playTone(880, 0.08, 0.12);
  }

  /* Finale for finishing a full 10-problem set well: the same rising
     scale as before, finishing in a full major chord. */
  function playCelebrateSound() {
    const scale = [523.25, 587.33, 659.25, 783.99, 880.00];
    scale.forEach((f, i) => playTone(f, i * 0.11, 0.18));
    const chordStart = scale.length * 0.11 + 0.05;
    playTone(1046.5, chordStart, 0.42);
    playTone(1318.5, chordStart, 0.42, 'sine', 0.05);
    playTone(1568.0, chordStart, 0.42, 'sine', 0.04);
  }

  /* Digits 0-9 mapped onto a two-octave C major pentatonic scale, so
     mashing the keypad sounds like playing a toy xylophone instead of
     one repeated click — and since every note in a pentatonic scale
     sounds pleasant against every other, no key combination the child
     presses can sound "wrong". */
  const KEY_CLICK_NOTES = [
    261.63, 293.66, 329.63, 392.00, 440.00,   // C4 D4 E4 G4 A4
    523.25, 587.33, 659.25, 783.99, 880.00,   // C5 D5 E5 G5 A5
  ];
  function playKeyClick(digit) {
    const note = KEY_CLICK_NOTES[Number(digit) % KEY_CLICK_NOTES.length];
    playTone(note, 0, 0.13, 'sine', 0.06);
  }

  function playKeyClear() {
    playTone(392, 0, 0.09, 'triangle', 0.05);
  }

  function setEnabled(value) { enabled = !!value; }
  function isEnabled() { return enabled; }

  root.PM.Audio = {
    playCorrectSound,
    playWrongSound,
    playStepDing,
    playCelebrateSound,
    playKeyClick,
    playKeyClear,
    setEnabled,
    isEnabled,
  };
})(typeof window !== 'undefined' ? window : globalThis);
