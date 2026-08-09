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

  function spawnConfetti(count, emojiPool) {
    const pool = emojiPool || Data.CONFETTI_EMOJI;
    const layer = document.getElementById('confetti-layer');
    const n = scaleCount(count);
    for (let i = 0; i < n; i++) {
      const piece = document.createElement('div');
      piece.className = 'confetti-piece';
      piece.textContent = pool[Math.floor(Math.random() * pool.length)];
      const duration = 1.4 + Math.random() * 1.2;
      piece.style.left = Math.random() * 100 + 'vw';
      piece.style.animationDuration = duration + 's';
      piece.style.fontSize = (1 + Math.random() * 1.2) + 'rem';
      layer.appendChild(piece);
      setTimeout(() => piece.remove(), duration * 1000 + 100);
    }
  }

  function spawnSticker(x, y, emoji, emojiPool) {
    const pool = emojiPool || Data.STICKER_POOL;
    const layer = document.getElementById('sticker-layer');
    const el = document.createElement('div');
    el.className = 'sticker-pop';
    el.textContent = emoji || pool[Math.floor(Math.random() * pool.length)];
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    el.style.fontSize = (1.6 + Math.random() * 1.3) + 'rem';
    layer.appendChild(el);
    setTimeout(() => el.remove(), 950);
  }

  function stickerAtElement(el, emojiPool) {
    const rect = el.getBoundingClientRect();
    spawnSticker(rect.left + rect.width / 2, rect.top + rect.height * 0.25, null, emojiPool);
  }

  function spawnStickerBurst(count, emojiPool) {
    const card = document.querySelector('.problem-card');
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const n = scaleCount(count);
    for (let i = 0; i < n; i++) {
      const x = rect.left + rect.width / 2 + (Math.random() - 0.5) * rect.width * 0.9;
      const y = rect.top + rect.height / 2 + (Math.random() - 0.5) * rect.height * 0.9;
      setTimeout(() => spawnSticker(x, y, null, emojiPool), i * 90);
    }
  }

  const SVG_NS = 'http://www.w3.org/2000/svg';

  function getCarryFlightLayer() {
    let layer = document.getElementById('carry-flight-layer');
    if (!layer) {
      layer = document.createElementNS(SVG_NS, 'svg');
      layer.id = 'carry-flight-layer';
      Object.assign(layer.style, {
        position: 'fixed', inset: '0', width: '100%', height: '100%',
        zIndex: '70', pointerEvents: 'none', overflow: 'visible',
      });
      const defs = document.createElementNS(SVG_NS, 'defs');
      defs.innerHTML =
        '<marker id="carry-arrowhead" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">' +
        '<path d="M0,0 L8,4 L0,8 Z" fill="#ff5fa8"></path></marker>';
      layer.appendChild(defs);
      document.body.appendChild(layer);
    }
    return layer;
  }

  /**
   * Animates a carried digit visibly hopping from where it was written
   * (e.g. the "1" in "14") to the carry slot above the next column,
   * along a curved arrow — so a child can see *where the number came
   * from*, not just have it appear. `fromRect`/`toRect` are plain
   * DOMRect-like objects ({left, top, width, height}) so callers can
   * capture the origin before re-rendering the column table replaces
   * the destination element. Calls `onComplete` once the badge lands.
   *
   * Under prefers-reduced-motion this still moves the badge (a child
   * relies on it to understand where the carry came from) but does it
   * quickly and without the bounce/arc, rather than skipping it — for
   * this cue, invisible would teach the wrong thing.
   */
  function flyCarry(fromRect, toRect, digit, onComplete) {
    try {
      const duration = REDUCED_MOTION ? 300 : 900;
      const from = { x: fromRect.left + fromRect.width / 2, y: fromRect.top + fromRect.height / 2 };
      const to = { x: toRect.left + toRect.width / 2, y: toRect.top + toRect.height / 2 };
      // Scale the arc's height to the hop distance — a fixed 60px bulge
      // looks fine flying across several columns but makes a short
      // adjacent-column hop (e.g. into the synthetic hundreds column)
      // loop back on itself and look broken.
      const hopDistance = Math.hypot(to.x - from.x, to.y - from.y);
      const bulge = Math.min(60, Math.max(18, hopDistance * 0.35));
      const control = REDUCED_MOTION
        ? { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 }
        : { x: (from.x + to.x) / 2, y: Math.min(from.y, to.y) - bulge };

      const layer = getCarryFlightLayer();
      const path = document.createElementNS(SVG_NS, 'path');
      path.setAttribute('d', `M${from.x},${from.y} Q${control.x},${control.y} ${to.x},${to.y}`);
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke', '#ff5fa8');
      path.setAttribute('stroke-width', '4');
      path.setAttribute('stroke-linecap', 'round');
      path.setAttribute('marker-end', 'url(#carry-arrowhead)');
      layer.appendChild(path);

      const len = path.getTotalLength();
      path.style.strokeDasharray = String(len);
      path.style.strokeDashoffset = String(len);
      path.style.transition = `stroke-dashoffset ${duration}ms ease`;

      const badge = document.createElement('div');
      badge.className = 'carry-flight-badge';
      badge.textContent = digit;
      badge.style.transform = `translate(${from.x}px, ${from.y}px) translate(-50%, -50%)`;
      document.body.appendChild(badge);

      requestAnimationFrame(() => { path.style.strokeDashoffset = '0'; });

      const start = performance.now();
      function tick(now) {
        const t = Math.min(1, (now - start) / duration);
        const mt = 1 - t;
        const x = mt * mt * from.x + 2 * mt * t * control.x + t * t * to.x;
        const y = mt * mt * from.y + 2 * mt * t * control.y + t * t * to.y;
        const bump = REDUCED_MOTION ? 1 : 1 + 0.3 * Math.sin(Math.PI * t);
        badge.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%) scale(${bump})`;
        if (t < 1) {
          requestAnimationFrame(tick);
        } else {
          badge.remove();
          setTimeout(() => path.remove(), 200);
          if (onComplete) onComplete();
        }
      }
      requestAnimationFrame(tick);
    } catch (e) {
      if (typeof console !== 'undefined' && console.warn) {
        console.warn('flyCarry animation failed, showing the carry instantly instead:', e);
      }
      if (onComplete) onComplete();
    }
  }

  root.PM.Effects = {
    showToast,
    spawnConfetti,
    spawnSticker,
    stickerAtElement,
    spawnStickerBurst,
    flyCarry,
  };
})(typeof window !== 'undefined' ? window : globalThis);
