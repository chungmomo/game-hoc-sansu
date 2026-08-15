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

  /* Pitch glide from freqStart to freqEnd — gives a "boing"/"swoosh"
     cartoon character that a flat tone can't. */
  function playSweep(freqStart, freqEnd, start, duration, type, gainVal) {
    if (!enabled) return;
    const ctx = getAudioCtx();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type || 'sine';
      const g = gainVal || 0.08;
      const t0 = ctx.currentTime + start;
      osc.frequency.setValueAtTime(freqStart, t0);
      osc.frequency.exponentialRampToValueAtTime(freqEnd, t0 + duration);
      gain.gain.value = g;
      osc.connect(gain).connect(ctx.destination);
      osc.start(t0);
      gain.gain.setValueAtTime(g, t0);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
      osc.stop(t0 + duration + 0.02);
    } catch (e) { /* audio glitch — non-critical, ignore */ }
  }

  /* Victory fanfare (full problem solved): an ascending run into a
     bright chord, capped with an upward sparkle flourish. */
  function playCorrectSound() {
    playTone(523.25, 0, 0.12);
    playTone(659.25, 0.11, 0.12);
    playTone(783.99, 0.22, 0.12);
    playTone(1046.5, 0.34, 0.38);
    playTone(1318.5, 0.34, 0.38, 'sine', 0.05);
    playSweep(1568.0, 2217.5, 0.42, 0.16, 'sine', 0.04);
  }

  /* A gentle cartoon "womp womp" slide rather than a harsh buzzer —
     signals "not quite" without sounding like an alarm. */
  function playWrongSound() {
    playSweep(329.63, 220.00, 0, 0.22, 'triangle', 0.06);
    playSweep(293.66, 196.00, 0.2, 0.28, 'triangle', 0.05);
  }

  /* Light two-note "ding-dong" for a single correct column, with a
     bell-like octave overtone for extra sparkle, kept brief and
     distinct from the full victory fanfare. */
  function playStepDing() {
    playTone(659, 0, 0.1);
    playTone(880, 0.08, 0.14);
    playTone(1760, 0.08, 0.1, 'sine', 0.025);
  }

  /* Finale for finishing a full 10-problem set well: the same rising
     scale as before, a full major chord, then confetti-like twinkles. */
  function playCelebrateSound() {
    const scale = [523.25, 587.33, 659.25, 783.99, 880.00];
    scale.forEach((f, i) => playTone(f, i * 0.11, 0.18));
    const chordStart = scale.length * 0.11 + 0.05;
    playTone(1046.5, chordStart, 0.42);
    playTone(1318.5, chordStart, 0.42, 'sine', 0.05);
    playTone(1568.0, chordStart, 0.42, 'sine', 0.04);
    const sparkleStart = chordStart + 0.22;
    const sparkleNotes = [1568.0, 2093.0, 1760.0, 2349.3, 2093.0];
    sparkleNotes.forEach((f, i) => playTone(f, sparkleStart + i * 0.07, 0.09, 'triangle', 0.035));
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
    playTone(note * 2, 0, 0.07, 'sine', 0.02); /* octave overtone → bell-like "pop" */
  }

  /* A downward swoosh instead of a flat blip, like wiping a slate clean. */
  function playKeyClear() {
    playSweep(523.25, 261.63, 0, 0.14, 'triangle', 0.05);
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
