/* Visual reward effects: toast messages, confetti, and sticker pops.
   Scales particle counts down when the OS-level "reduce motion"
   preference is on, instead of ignoring it. */
(function (root) {
  'use strict';
  root.PM = root.PM || {};
  const Data = root.PM.Data;

  const REDUCED_MOTION = !!(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches);

  function scaleCount(count) {
    return REDUCED_MOTION ? Math.min(count, 3) : count;
  }

  let toastTimer = null;
  function showToast(msg) {
    let toast = document.getElementById('toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'toast';
      toast.setAttribute('role', 'status');
      Object.assign(toast.style, {
        position: 'fixed', top: '14px', left: '50%', transform: 'translateX(-50%) translateY(-40px)',
        background: '#fff', color: '#8c5cff', fontWeight: '800', fontFamily: "'Baloo 2', sans-serif",
        padding: '.6rem 1.2rem', borderRadius: '999px', boxShadow: '0 6px 16px rgba(0,0,0,.18)',
        zIndex: 200, opacity: '0', transition: 'transform .25s ease, opacity .25s ease', pointerEvents: 'none',
        maxWidth: '86vw', textAlign: 'center', fontSize: '.9rem',
      });
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    requestAnimationFrame(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateX(-50%) translateY(0)';
    });
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(-50%) translateY(-40px)';
    }, 1700);
  }

  function spawnConfetti(count) {
    const layer = document.getElementById('confetti-layer');
    const n = scaleCount(count);
    for (let i = 0; i < n; i++) {
      const piece = document.createElement('div');
      piece.className = 'confetti-piece';
      piece.textContent = Data.CONFETTI_EMOJI[Math.floor(Math.random() * Data.CONFETTI_EMOJI.length)];
      const duration = 1.4 + Math.random() * 1.2;
      piece.style.left = Math.random() * 100 + 'vw';
      piece.style.animationDuration = duration + 's';
      piece.style.fontSize = (1 + Math.random() * 1.2) + 'rem';
      layer.appendChild(piece);
      setTimeout(() => piece.remove(), duration * 1000 + 100);
    }
  }

  function spawnSticker(x, y, emoji) {
    const layer = document.getElementById('sticker-layer');
    const el = document.createElement('div');
    el.className = 'sticker-pop';
    el.textContent = emoji || Data.STICKER_POOL[Math.floor(Math.random() * Data.STICKER_POOL.length)];
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    el.style.fontSize = (1.6 + Math.random() * 1.3) + 'rem';
    layer.appendChild(el);
    setTimeout(() => el.remove(), 950);
  }

  function stickerAtElement(el) {
    const rect = el.getBoundingClientRect();
    spawnSticker(rect.left + rect.width / 2, rect.top + rect.height * 0.25);
  }

  function spawnStickerBurst(count) {
    const card = document.querySelector('.problem-card');
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const n = scaleCount(count);
    for (let i = 0; i < n; i++) {
      const x = rect.left + rect.width / 2 + (Math.random() - 0.5) * rect.width * 0.9;
      const y = rect.top + rect.height / 2 + (Math.random() - 0.5) * rect.height * 0.9;
      setTimeout(() => spawnSticker(x, y), i * 90);
    }
  }

  root.PM.Effects = {
    showToast,
    spawnConfetti,
    spawnSticker,
    stickerAtElement,
    spawnStickerBurst,
  };
})(typeof window !== 'undefined' ? window : globalThis);
