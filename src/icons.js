/* Hand-drawn "mischievous/playful" SVG icon set — a small addition to
   the existing emoji-based art (see data.js). Each icon is a
   self-contained inline SVG string sized with width/height="1em" so it
   drops into the same font-size-driven layout the emoji pool already
   uses (see effects.js/app.js call sites). No <defs>/ids, so a string
   can be safely repeated many times in one innerHTML block (e.g. the
   animal-counting row) without id collisions. */
(function (root) {
  'use strict';
  root.PM = root.PM || {};

  const S = 'style="vertical-align:-0.125em"';

  const ICONS = {
    // ---- Monsters (story-mode battle) ----
    impMonster: `<svg ${S} width="1em" height="1em" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8 3 L10 8 L6 8 Z" fill="#7c3aed"/>
      <path d="M16 3 L18 8 L14 8 Z" fill="#7c3aed"/>
      <circle cx="12" cy="13" r="8" fill="#9757f0"/>
      <path d="M6 12 Q12 5 18 12" fill="none" stroke="#5b21b6" stroke-width="1" stroke-linecap="round"/>
      <path d="M8 12 q1.5 -1.5 3 0" fill="none" stroke="#2b1a4a" stroke-width="1.3" stroke-linecap="round"/>
      <circle cx="15" cy="12" r="1.6" fill="#2b1a4a"/>
      <circle cx="15.4" cy="11.5" r="0.5" fill="#fff"/>
      <path d="M8.5 16.5 Q12 20 15.5 16.5 Q12 18.3 8.5 16.5 Z" fill="#2b1a4a"/>
      <path d="M10 16.8 l0.8 1.4 l0.9 -1" fill="#fff"/>
      <path d="M9 21 q3 2 6 0 q-1.5 2.4 -3 2.4 q-1.5 0 -3 -2.4 Z" fill="#5b21b6"/>
    </svg>`,

    slimeMonster: `<svg ${S} width="1em" height="1em" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3 C18 3 20 9 19.5 14 C19 20 15.5 21.5 12 21.5 C8.5 21.5 5 20 4.5 14 C4 9 6 3 12 3 Z" fill="#4ade80"/>
      <ellipse cx="9" cy="9" rx="2" ry="1.3" fill="#bbf7d0" opacity="0.7"/>
      <path d="M7.5 12 q1.2 -1.4 2.6 0" fill="none" stroke="#14532d" stroke-width="1.3" stroke-linecap="round"/>
      <circle cx="15.5" cy="11.6" r="1.5" fill="#14532d"/>
      <circle cx="15.9" cy="11.1" r="0.45" fill="#fff"/>
      <path d="M9.5 15.5 Q12.5 18 15 15.2 Q14 17.6 11.8 17.6 Q10.2 17.6 9.5 15.5 Z" fill="#14532d"/>
      <path d="M11.5 17 q0.6 2.2 1.6 1 q0.2 -1.2 -0.3 -1.8 Z" fill="#fb7185"/>
    </svg>`,

    ghostMonster: `<svg ${S} width="1em" height="1em" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2.5 C17 2.5 19 6.5 19 11 L19 19 C19 19 17.7 17.3 16.5 19 C15.3 20.7 14 19 12.7 20.5 C11.5 21.8 10.5 20.7 9.3 19 C8.1 17.3 6.8 19 5.5 19 L5.5 11 C5.5 6.5 7 2.5 12 2.5 Z" fill="#ddd6fe"/>
      <circle cx="9.3" cy="11.5" r="1.5" fill="#3b0764"/>
      <circle cx="9.7" cy="11" r="0.45" fill="#fff"/>
      <path d="M13.3 10.3 q1.2 -1.3 2.6 0" fill="none" stroke="#3b0764" stroke-width="1.3" stroke-linecap="round"/>
      <ellipse cx="9.3" cy="14.5" rx="1.6" ry="1" fill="#f9a8d4" opacity=".8"/>
      <path d="M11.5 13.8 q1.3 2.6 3 0.6 q-1.6 3.4 -3 -0.6 Z" fill="#3b0764"/>
      <path d="M13.5 14.3 q0.5 2 1.4 0.9 q0.1 -1.1 -0.4 -1.6 Z" fill="#fb7185"/>
    </svg>`,

    // ---- Items ----
    wandItem: `<svg ${S} width="1em" height="1em" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="10.5" y="9" width="3" height="13" rx="1.4" transform="rotate(20 12 15)" fill="#a16207"/>
      <path d="M6 5 l1.4 3 l3 1.2 l-3 1.2 l-1.4 3 l-1.4 -3 l-3 -1.2 l3 -1.2 Z" fill="#fbbf24"/>
      <circle cx="15" cy="4.5" r="1" fill="#fbbf24"/>
      <circle cx="17.5" cy="7" r="0.7" fill="#fbbf24"/>
    </svg>`,

    potionItem: `<svg ${S} width="1em" height="1em" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="10.5" y="2" width="3" height="3" rx="0.6" fill="#a16207"/>
      <path d="M10.5 5 h3 l1.5 4 q1.8 2 1.8 6 a5 5 0 0 1 -10 0 q0 -4 1.8 -6 Z" fill="#f0abfc" opacity=".35" stroke="#a21caf" stroke-width="1"/>
      <path d="M8.3 14 a4 4 0 0 0 7.4 0 Z" fill="#e879f9"/>
      <circle cx="10.2" cy="11.5" r="1.4" fill="#3b0764"/>
      <circle cx="10.5" cy="11" r="0.4" fill="#fff"/>
      <path d="M13.2 11.2 q1 -1 2 0" fill="none" stroke="#3b0764" stroke-width="1.1" stroke-linecap="round"/>
      <circle cx="9" cy="8.5" r="0.6" fill="#f0abfc"/>
      <circle cx="14.5" cy="9" r="0.8" fill="#f0abfc"/>
    </svg>`,

    // ---- Counting animals ----
    monkeyAnimal: `<svg ${S} width="1em" height="1em" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="6" cy="10" r="3" fill="#92400e"/>
      <circle cx="18" cy="10" r="3" fill="#92400e"/>
      <circle cx="6" cy="10" r="1.6" fill="#fed7aa"/>
      <circle cx="18" cy="10" r="1.6" fill="#fed7aa"/>
      <circle cx="12" cy="12" r="8" fill="#b45309"/>
      <ellipse cx="12" cy="15" rx="5" ry="4.2" fill="#fed7aa"/>
      <path d="M8.5 12 q1.3 -1.4 2.7 0" fill="none" stroke="#3b1d0a" stroke-width="1.2" stroke-linecap="round"/>
      <circle cx="15.3" cy="12" r="1.4" fill="#3b1d0a"/>
      <circle cx="15.6" cy="11.6" r="0.4" fill="#fff"/>
      <ellipse cx="10.5" cy="16" rx="0.9" ry="0.7" fill="#78350f"/>
      <ellipse cx="13.5" cy="16" rx="0.9" ry="0.7" fill="#78350f"/>
      <path d="M10 18 q2 1.6 4 0" fill="none" stroke="#3b1d0a" stroke-width="1" stroke-linecap="round"/>
    </svg>`,

    penguinAnimal: `<svg ${S} width="1em" height="1em" viewBox="0 0 24 24" aria-hidden="true">
      <ellipse cx="12" cy="13" rx="7" ry="9" fill="#1f2937"/>
      <ellipse cx="12" cy="15" rx="4.2" ry="6" fill="#f9fafb"/>
      <path d="M10 10.5 q1.3 -1.3 2.6 0" fill="none" stroke="#f9fafb" stroke-width="1.2" stroke-linecap="round"/>
      <circle cx="14.6" cy="10.5" r="1.3" fill="#f9fafb"/>
      <circle cx="14.9" cy="10.1" r="0.4" fill="#1f2937"/>
      <path d="M10.8 12 l2.6 0.9 l-2.6 0.9 Z" fill="#f97316"/>
      <path d="M8 20 l2 -1.4 l0 1.8 Z" fill="#f97316"/>
      <path d="M16 20 l-2 -1.4 l0 1.8 Z" fill="#f97316"/>
    </svg>`,

    bunnyAnimal: `<svg ${S} width="1em" height="1em" viewBox="0 0 24 24" aria-hidden="true">
      <ellipse cx="8.5" cy="6" rx="1.8" ry="4.6" fill="#fbcfe8"/>
      <ellipse cx="15.5" cy="6" rx="1.8" ry="4.6" fill="#fbcfe8"/>
      <ellipse cx="8.5" cy="6.3" rx="0.9" ry="3.2" fill="#fda4af"/>
      <ellipse cx="15.5" cy="6.3" rx="0.9" ry="3.2" fill="#fda4af"/>
      <circle cx="12" cy="14" r="7.5" fill="#fff" stroke="#f3d4e4" stroke-width="0.6"/>
      <path d="M9 13 q1.2 -1.3 2.5 0" fill="none" stroke="#3b0764" stroke-width="1.2" stroke-linecap="round"/>
      <circle cx="14.8" cy="13" r="1.4" fill="#3b0764"/>
      <circle cx="15.1" cy="12.6" r="0.4" fill="#fff"/>
      <ellipse cx="12" cy="15.6" rx="0.8" ry="0.6" fill="#fb7185"/>
      <path d="M11 18 q1.5 2 3.2 0.6 q-0.7 -1.8 -3.2 -0.6 Z" fill="#fb7185"/>
    </svg>`,

    // ---- Reward stickers ----
    starSticker: `<svg ${S} width="1em" height="1em" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2 L14.8 8.6 L22 9.3 L16.6 14 L18.3 21 L12 17.2 L5.7 21 L7.4 14 L2 9.3 L9.2 8.6 Z" fill="#fbbf24"/>
      <path d="M9.3 12 q1 -1 2 0" fill="none" stroke="#78350f" stroke-width="1" stroke-linecap="round"/>
      <path d="M13.5 11.6 l1.8 0.5 l-1.4 1.3 Z" fill="#78350f"/>
      <path d="M10 14.4 q2 1.6 4 0.2" fill="none" stroke="#78350f" stroke-width="1" stroke-linecap="round"/>
    </svg>`,

    sunSticker: `<svg ${S} width="1em" height="1em" viewBox="0 0 24 24" aria-hidden="true">
      <g fill="#fb923c">
        <path d="M12 0 L13.3 4 L10.7 4 Z"/>
        <path d="M12 24 L13.3 20 L10.7 20 Z"/>
        <path d="M0 12 L4 10.7 L4 13.3 Z"/>
        <path d="M24 12 L20 10.7 L20 13.3 Z"/>
        <path d="M3 3 L6.5 4.7 L4.7 6.5 Z"/>
        <path d="M21 21 L17.5 19.3 L19.3 17.5 Z"/>
        <path d="M21 3 L17.5 4.7 L19.3 6.5 Z"/>
        <path d="M3 21 L6.5 19.3 L4.7 17.5 Z"/>
      </g>
      <circle cx="12" cy="12" r="6.2" fill="#fbbf24"/>
      <path d="M9.3 11.3 q1 -1 2 0" fill="none" stroke="#78350f" stroke-width="1" stroke-linecap="round"/>
      <path d="M12.7 11.3 q1 -1 2 0" fill="none" stroke="#78350f" stroke-width="1" stroke-linecap="round"/>
      <path d="M9.6 14 q2.4 2 4.8 0" fill="none" stroke="#78350f" stroke-width="1.1" stroke-linecap="round"/>
    </svg>`,

    sparkleSticker: `<svg ${S} width="1em" height="1em" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 1 C12.5 8 13 11.5 21 12 C13 12.5 12.5 16 12 23 C11.5 16 11 12.5 3 12 C11 11.5 11.5 8 12 1 Z" fill="#f472b6"/>
      <path d="M9.3 11.3 q0.8 -0.9 1.7 0" fill="none" stroke="#831843" stroke-width="0.9" stroke-linecap="round"/>
      <path d="M12.5 10.9 l1.5 0.4 l-1.1 1.1 Z" fill="#831843"/>
      <path d="M18.5 4 l0.7 1.6 l1.6 0.7 l-1.6 0.7 l-0.7 1.6 l-0.7 -1.6 l-1.6 -0.7 l1.6 -0.7 Z" fill="#fbcfe8"/>
      <path d="M5 17 l0.5 1.2 l1.2 0.5 l-1.2 0.5 l-0.5 1.2 l-0.5 -1.2 l-1.2 -0.5 l1.2 -0.5 Z" fill="#fbcfe8"/>
    </svg>`,

    // ---- Battle companion (shown near the mascot's HP bar) ----
    companionSprite: `<svg ${S} width="1em" height="1em" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9 5 Q4 6 5 11 Q3 12.5 5.5 13.5 Q4 16 8 15.5" fill="none" stroke="#facc15" stroke-width="1.2" opacity=".7"/>
      <path d="M15 5 Q20 6 19 11 Q21 12.5 18.5 13.5 Q20 16 16 15.5" fill="none" stroke="#facc15" stroke-width="1.2" opacity=".7"/>
      <path d="M12 5 C16.5 5 18 8.5 17.3 12.5 C16.7 16.5 14.5 19 12 19 C9.5 19 7.3 16.5 6.7 12.5 C6 8.5 7.5 5 12 5 Z" fill="#5eead4"/>
      <path d="M9.3 5.5 L8.5 3 L10.5 4.3 Z" fill="#5eead4"/>
      <path d="M14.7 5.5 L15.5 3 L13.5 4.3 Z" fill="#5eead4"/>
      <path d="M9 11.2 q1 -1 2 0" fill="none" stroke="#134e4a" stroke-width="1.1" stroke-linecap="round"/>
      <circle cx="14.2" cy="11.2" r="1.3" fill="#134e4a"/>
      <circle cx="14.5" cy="10.8" r="0.4" fill="#fff"/>
      <path d="M9.5 14.2 Q12 16.4 14.6 13.9 Q13.4 16 12 16 Q10.6 16 9.5 14.2 Z" fill="#134e4a"/>
      <circle cx="6.5" cy="17.5" r="0.6" fill="#facc15"/>
      <circle cx="17.5" cy="18" r="0.5" fill="#facc15"/>
    </svg>`,
  };

  root.PM.Icons = ICONS;
})(typeof window !== 'undefined' ? window : globalThis);
