/* CHARIS service icons: flat, two-tone, brand palette, 64×64 grid.
   Every part wrapped in g.p assembles on first view (style --i sets its order).
   Each icon also has one hover motion, named by class: bob, grow, spin, sweep, stamp, flow, wave, rise, draw, pulse, tilt.
   Usage: svcIcon("financing") returns an <svg>. */
(function () {
  "use strict";
  const T = "#0E5A55", T8 = "#32736E", T6 = "#6E9C99", O = "#E8833A", O2 = "#C9692A", W = "#FFFFFF";
  const p = (i, s) => '<g class="p" style="--i:' + i + '">' + s + '</g>';   /* entrance wrapper, kept apart from hover motion */

  const gearTeeth = (cx, cy, r) => Array.from({ length: 8 }, (_, k) =>
    '<rect x="' + (cx - 2.2) + '" y="' + (cy - r - 4) + '" width="4.4" height="6" rx="1.2" fill="' + O + '" transform="rotate(' + k * 45 + " " + cx + " " + cy + ')"/>').join("");

  const ICONS = {
    /* a performance gauge with a needle */
    policy:
      p(1, '<path d="M8 44 A24 24 0 0 1 56 44" fill="none" stroke="' + T6 + '" stroke-width="8" stroke-linecap="round"/>') +
      p(2, '<path d="M8 44 A24 24 0 0 1 32 20" fill="none" stroke="' + T + '" stroke-width="8" stroke-linecap="round"/>') +
      p(3, '<path d="M44 23.2 A24 24 0 0 1 56 44" fill="none" stroke="' + O + '" stroke-width="8" stroke-linecap="round"/>') +
      p(4, '<g class="tilt"><path d="M31 46 L44 27 L35 48 Z" fill="' + T + '"/></g><circle cx="33" cy="46" r="5" fill="' + T + '"/><circle cx="33" cy="46" r="2" fill="' + W + '"/>') +
      p(5, '<rect x="14" y="52" width="36" height="4" rx="2" fill="' + T6 + '" opacity=".6"/>'),
    /* an epidemic curve under watch */
    epidemiology:
      p(1, '<rect x="6" y="52" width="52" height="3.5" rx="1.75" fill="' + T6 + '"/>') +
      p(2, '<path d="M6 52 C16 52 18 20 28 20 S40 50 58 50 V52 Z" fill="' + T6 + '" opacity=".55"/>') +
      p(3, '<path class="draw" d="M6 52 C16 52 18 20 28 20 S40 50 58 50" fill="none" stroke="' + T + '" stroke-width="3.5" stroke-linecap="round" pathLength="1"/>') +
      p(4, '<g class="pulse"><circle cx="28" cy="20" r="6" fill="' + O + '"/><circle cx="28" cy="20" r="2.4" fill="' + W + '"/></g>') +
      p(5, '<g fill="' + T8 + '"><circle cx="44" cy="12" r="3"/><circle cx="51" cy="18" r="2.4"/><circle cx="13" cy="34" r="2.4"/></g>'),
    /* a shield holding a pulse line */
    resilience:
      p(1, '<path d="M32 5 L55 13 V31 C55 45 45 55 32 60 C19 55 9 45 9 31 V13 Z" fill="' + T + '"/>') +
      p(2, '<path d="M32 5 L55 13 V31 C55 45 45 55 32 60 Z" fill="' + T8 + '"/>') +
      p(3, '<path class="draw" d="M15 33 H24 L28 24 L34 42 L38 33 H49" fill="none" stroke="' + O + '" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" pathLength="1"/>'),
    /* a device feeding a supply box */
    digital:
      p(1, '<rect x="6" y="9" width="34" height="26" rx="4" fill="' + T + '"/>') +
      p(2, '<rect x="10" y="13" width="26" height="18" rx="2" fill="' + T6 + '"/><rect x="18" y="35" width="10" height="5" fill="' + T8 + '"/><rect x="12" y="40" width="22" height="3.5" rx="1.75" fill="' + T8 + '"/>') +
      p(3, '<path class="flow" d="M36 46 C44 46 44 38 50 38" fill="none" stroke="' + T6 + '" stroke-width="3" stroke-linecap="round" stroke-dasharray="1 5"/>') +
      p(4, '<g class="bob"><path d="M42 40 L52 35 L62 40 V54 L52 59 L42 54 Z" fill="' + O + '"/><path d="M42 40 L52 45 L62 40 M52 45 V59" fill="none" stroke="' + O2 + '" stroke-width="2.4" stroke-linejoin="round"/></g>') +
      p(5, '<path d="M14 26 L19 21 L24 24 L31 17" fill="none" stroke="' + W + '" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>'),
    /* a community under one heart */
    public_health:
      p(1, '<g fill="' + T6 + '"><circle cx="13" cy="33" r="5.5"/><path d="M3 55 A10 10 0 0 1 23 55 Z"/></g>') +
      p(2, '<g fill="' + T6 + '"><circle cx="51" cy="33" r="5.5"/><path d="M41 55 A10 10 0 0 1 61 55 Z"/></g>') +
      p(3, '<g fill="' + T + '"><circle cx="32" cy="30" r="7"/><path d="M19 57 A13 13 0 0 1 45 57 Z"/></g>') +
      p(4, '<g class="pulse"><path d="M32 19 C26 14 22 11 22 7 A4.6 4.6 0 0 1 32 5.5 A4.6 4.6 0 0 1 42 7 C42 11 38 14 32 19 Z" fill="' + O + '"/></g>'),
    /* a system map: linked boxes with a moving flow */
    hpsr:
      p(1, '<rect x="23" y="5" width="18" height="13" rx="3" fill="' + T + '"/>') +
      p(2, '<path class="flow" d="M32 18 V28 M12 28 H52 M12 28 V36 M52 28 V36 M32 28 V36" fill="none" stroke="' + T6 + '" stroke-width="3" stroke-linecap="round" stroke-dasharray="1 4.5"/>') +
      p(3, '<rect x="4" y="36" width="16" height="13" rx="3" fill="' + T8 + '"/><rect x="44" y="36" width="16" height="13" rx="3" fill="' + T8 + '"/>') +
      p(4, '<g class="bob"><rect x="24" y="36" width="16" height="13" rx="3" fill="' + O + '"/></g>') +
      p(5, '<rect x="9" y="53" width="46" height="4" rx="2" fill="' + T6 + '" opacity=".6"/>'),
    /* an idea bulb with a working gear */
    innovation:
      p(1, '<path d="M26 4 A17 17 0 0 0 16 35 V43 H36 V35 A17 17 0 0 0 26 4 Z" fill="' + T8 + '"/>') +
      p(2, '<rect x="17" y="46" width="18" height="4.5" rx="2.25" fill="' + T + '"/><rect x="19.5" y="53" width="13" height="4.5" rx="2.25" fill="' + T + '"/>') +
      p(3, '<path d="M21 26 L26 31 L31 23" fill="none" stroke="' + W + '" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>') +
      p(4, '<g class="spin">' + gearTeeth(48, 40, 9) + '<circle cx="48" cy="40" r="9" fill="' + O + '"/><circle cx="48" cy="40" r="3.6" fill="' + W + '"/></g>'),
    /* a guideline book with a ribbon */
    standards:
      p(1, '<path d="M10 8 H44 A4 4 0 0 1 48 12 V56 H14 A4 4 0 0 1 10 52 Z" fill="' + T + '"/>') +
      p(2, '<path d="M10 50 A4 4 0 0 1 14 46 H48 V56 H14 A4 4 0 0 1 10 52 Z" fill="' + T6 + '"/>') +
      p(3, '<g fill="none" stroke="' + W + '" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17 19 L20 22 L25 16"/><path d="M17 31 L20 34 L25 28"/><path d="M29 19 H40 M29 31 H38"/></g>') +
      p(4, '<g class="stamp"><path d="M46 4 H58 V24 L52 19.5 L46 24 Z" fill="' + O + '"/></g>'),
    /* a briefcase with a rising chart */
    management:
      p(1, '<rect x="5" y="20" width="40" height="32" rx="5" fill="' + T + '"/>') +
      p(2, '<path d="M17 20 V15 A3 3 0 0 1 20 12 H30 A3 3 0 0 1 33 15 V20" fill="none" stroke="' + T8 + '" stroke-width="4"/><rect x="5" y="31" width="40" height="4" fill="' + T8 + '"/><rect x="21" y="29" width="8" height="8" rx="2" fill="' + O + '"/>') +
      p(3, '<rect class="grow" x="46" y="40" width="6" height="14" rx="2" fill="' + T6 + '"/>') +
      p(4, '<rect class="grow g2" x="54" y="30" width="6" height="24" rx="2" fill="' + O + '"/>'),
    /* two pieces that fit together */
    integration:
      p(1, '<path d="M6 14 H24 A6 6 0 1 1 36 14 H38 V30 A6 6 0 1 0 38 42 V52 H6 Z" fill="' + T + '"/>') +
      p(2, '<g class="slide"><path d="M42 26 A6 6 0 1 1 42 38 V52 H58 V14 H42 Z" fill="' + O + '"/></g>') +
      p(3, '<rect x="13" y="25" width="16" height="3.5" rx="1.75" fill="' + W + '" opacity=".7"/><rect x="13" y="33" width="11" height="3.5" rx="1.75" fill="' + W + '" opacity=".7"/>'),
    /* partners joined around a shared programme */
    programs:
      p(1, '<path class="flow" d="M14 46 L32 14 L50 46 Z" fill="none" stroke="' + T6 + '" stroke-width="3" stroke-linejoin="round" stroke-dasharray="1 5"/>') +
      p(2, '<circle cx="32" cy="14" r="8" fill="' + T + '"/><circle cx="14" cy="46" r="8" fill="' + T8 + '"/><circle cx="50" cy="46" r="8" fill="' + T8 + '"/>') +
      p(3, '<g class="pulse"><circle cx="32" cy="36" r="6" fill="' + O + '"/></g>') +
      p(4, '<g fill="' + W + '"><circle cx="32" cy="14" r="2.6"/><circle cx="14" cy="46" r="2.6"/><circle cx="50" cy="46" r="2.6"/></g>'),
    /* coins stacking up, with a rising trend */
    financing:
      p(1, '<rect x="8" y="41" width="28" height="10" rx="5" fill="' + T + '"/>') +
      p(2, '<rect x="9" y="32" width="28" height="10" rx="5" fill="' + T8 + '"/>') +
      p(3, '<g class="bob"><rect x="9" y="23" width="28" height="10" rx="5" fill="' + T6 + '"/><rect x="16" y="27" width="14" height="2.4" rx="1.2" fill="' + W + '" opacity=".7"/></g>') +
      p(4, '<g class="draw"><path d="M38 42 L45 33 L50 37 L57 24" fill="none" stroke="' + O + '" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" pathLength="1"/><path d="M50.5 23.5 H57.5 V30.5" fill="none" stroke="' + O + '" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></g>'),

    /* bar chart with a trend line */
    analytics:
      p(1, '<rect x="8" y="52" width="48" height="3.5" rx="1.75" fill="' + T6 + '"/>') +
      p(2, '<rect class="grow" x="12" y="34" width="10" height="18" rx="2.5" fill="' + T6 + '"/>') +
      p(3, '<rect class="grow g2" x="27" y="25" width="10" height="27" rx="2.5" fill="' + T8 + '"/>') +
      p(4, '<rect class="grow g3" x="42" y="15" width="10" height="37" rx="2.5" fill="' + T + '"/>') +
      p(5, '<g><path d="M17 27 L32 18 L47 9" fill="none" stroke="' + O + '" stroke-width="3" stroke-linecap="round"/><circle cx="17" cy="27" r="3.4" fill="' + O + '"/><circle cx="32" cy="18" r="3.4" fill="' + O + '"/><circle cx="47" cy="9" r="3.4" fill="' + O + '"/></g>'),

    /* clinic with a working gear */
    facility_tools:
      p(1, '<path d="M7 26 L22 15 L37 26 V54 H7 Z" fill="' + T8 + '"/>') +
      p(2, '<g><rect x="19" y="25" width="6" height="15" rx="1.5" fill="' + W + '"/><rect x="14.5" y="29.5" width="15" height="6" rx="1.5" fill="' + W + '"/></g>') +
      p(3, '<rect x="17" y="45" width="10" height="9" rx="1.5" fill="' + T + '"/>') +
      p(4, '<g class="spin">' + gearTeeth(46, 41, 10) + '<circle cx="46" cy="41" r="10" fill="' + O + '"/><circle cx="46" cy="41" r="4" fill="' + W + '"/></g>'),

    /* clipboard under a magnifying glass */
    evaluation:
      p(1, '<rect x="9" y="11" width="31" height="44" rx="4.5" fill="' + T6 + '"/>') +
      p(2, '<rect x="17" y="7" width="15" height="9" rx="3" fill="' + T + '"/>') +
      p(3, '<g fill="' + W + '"><rect x="15" y="24" width="19" height="3.2" rx="1.6"/><rect x="15" y="31" width="14" height="3.2" rx="1.6"/><rect x="15" y="38" width="17" height="3.2" rx="1.6"/></g>') +
      p(4, '<g class="sweep"><circle cx="43" cy="40" r="10" fill="' + W + '" stroke="' + O + '" stroke-width="5"/><path d="M50.5 47.5 L57 54" stroke="' + T + '" stroke-width="6" stroke-linecap="round"/><path d="M38 37 A6 6 0 0 1 43 34" fill="none" stroke="' + O + '" stroke-width="2" stroke-linecap="round" opacity=".55"/></g>'),

    /* proposal with an approval seal */
    grants:
      p(1, '<path d="M12 8 H36 L46 18 V54 A4 4 0 0 1 42 58 H12 A4 4 0 0 1 8 54 V12 A4 4 0 0 1 12 8 Z" fill="' + T8 + '"/>') +
      p(2, '<path d="M36 8 V15 A3 3 0 0 0 39 18 H46 Z" fill="' + T6 + '"/>') +
      p(3, '<g fill="' + W + '"><rect x="14" y="20" width="17" height="3.2" rx="1.6"/><rect x="14" y="27" width="24" height="3.2" rx="1.6"/><rect x="14" y="34" width="13" height="3.2" rx="1.6"/></g>') +
      p(4, '<g class="stamp"><path d="M38 50 L35 61 L41 58 L44 62 L46 51 Z" fill="' + O2 + '"/><path d="M50 50 L53 61 L47 58 L44 62 L42 51 Z" fill="' + O2 + '"/><circle cx="44" cy="45" r="10" fill="' + O + '"/><path d="M39.5 45 L43 48.5 L49 42" fill="none" stroke="' + W + '" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></g>'),

    /* a road to the flag */
    planning:
      p(1, '<path class="flow" d="M10 52 C24 52 18 36 32 36 S40 22 48 22" fill="none" stroke="' + T6 + '" stroke-width="3.5" stroke-linecap="round" stroke-dasharray="1 6.5"/>') +
      p(2, '<circle cx="10" cy="52" r="5" fill="' + T + '"/>') +
      p(3, '<circle cx="32" cy="36" r="4.5" fill="' + T8 + '"/>') +
      p(4, '<rect x="46.5" y="7" width="3.5" height="24" rx="1.75" fill="' + T + '"/>') +
      p(5, '<path class="wave" d="M50 8 H59 L56 13 L59 18 H50 Z" fill="' + O + '"/>'),

    /* a team, one stepping forward */
    workforce:
      p(1, '<g fill="' + T6 + '"><circle cx="15" cy="25" r="6"/><path d="M4 47 A11 11 0 0 1 26 47 V50 H4 Z"/></g>') +
      p(2, '<g fill="' + T6 + '"><circle cx="49" cy="25" r="6"/><path d="M38 47 A11 11 0 0 1 60 47 V50 H38 Z"/></g>') +
      p(3, '<g class="rise"><circle cx="32" cy="20" r="8" fill="' + T + '"/><path d="M18 50 A14 14 0 0 1 46 50 V55 H18 Z" fill="' + O + '"/></g>'),

    /* a shield with a check */
    quality:
      p(1, '<path d="M32 6 L52 13 V30 C52 43 43 52 32 57 C21 52 12 43 12 30 V13 Z" fill="' + T8 + '"/>') +
      p(2, '<path d="M32 6 V57 C21 52 12 43 12 30 V13 Z" fill="' + T + '"/>') +
      p(3, '<path class="draw" d="M22 31 L29 38 L43 23" fill="none" stroke="' + W + '" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" pathLength="1"/>') +
      p(4, '<circle class="pulse" cx="51" cy="11" r="5" fill="' + O + '"/>'),

    /* megaphone with sound */
    promotion:
      p(1, '<path d="M11 25 H19 L40 13 V49 L19 37 H11 A5 5 0 0 1 6 32 V30 A5 5 0 0 1 11 25 Z" fill="' + T + '"/>') +
      p(2, '<rect x="14" y="37" width="8" height="15" rx="2.5" fill="' + T8 + '"/>') +
      p(3, '<rect x="38" y="11" width="6" height="40" rx="3" fill="' + T6 + '"/>') +
      p(4, '<path class="wave1" d="M49 24 Q54 31 49 38" fill="none" stroke="' + O + '" stroke-width="3.5" stroke-linecap="round"/>') +
      p(5, '<path class="wave2" d="M54 17 Q63 31 54 45" fill="none" stroke="' + O + '" stroke-width="3.5" stroke-linecap="round"/>'),

    /* layered media cards with play */
    media:
      p(1, '<g class="slide"><rect x="19" y="21" width="38" height="29" rx="4.5" fill="' + T6 + '"/><rect x="45" y="42" width="8" height="3" rx="1.5" fill="' + W + '" opacity=".8"/></g>') +
      p(2, '<rect x="7" y="12" width="38" height="29" rx="4.5" fill="' + T + '"/>') +
      p(3, '<rect x="12" y="34" width="20" height="3" rx="1.5" fill="' + T6 + '"/>') +
      p(4, '<g class="pulse"><circle cx="26" cy="24.5" r="7.5" fill="' + O + '"/><path d="M23.6 20.6 V28.4 L30.2 24.5 Z" fill="' + W + '"/></g>'),

    /* graduation cap above an open book */
    training:
      p(1, '<path d="M6 42 Q19 36 32 42 V56 Q19 50 6 56 Z" fill="' + T8 + '"/>') +
      p(2, '<path d="M58 42 Q45 36 32 42 V56 Q45 50 58 56 Z" fill="' + T6 + '"/>') +
      p(3, '<g class="tilt"><path d="M18 22 V30 Q32 37 46 30 V22 L32 27.5 Z" fill="' + T8 + '"/><path d="M32 8 L58 18.5 L32 29 L6 18.5 Z" fill="' + T + '"/><path d="M52 21 V31" stroke="' + O + '" stroke-width="2.5" stroke-linecap="round"/><circle cx="52" cy="33" r="3" fill="' + O + '"/></g>')
  };


  /* ---------- pillar icons: the logo shape as the base, a white line glyph on top ---------- */
  const SQ = c => '<rect class="pb" x="2" y="2" width="52" height="52" rx="14" fill="' + c + '"/>';
  const PILLAR = {
    a: SQ(T) +
      '<path class="pl-ln" d="M14 42 H42" stroke="' + W + '" stroke-opacity=".35" stroke-width="2.5" stroke-linecap="round" pathLength="1"/>' +
      '<path class="pl-ln pl-trend" d="M15 36 L23 27 L30 31 L40 19" fill="none" stroke="' + W + '" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" pathLength="1"/>' +
      '<circle class="pl-dot" style="--i:1" cx="15" cy="36" r="3" fill="' + W + '"/><circle class="pl-dot" style="--i:2" cx="23" cy="27" r="3" fill="' + W + '"/><circle class="pl-dot" style="--i:3" cx="30" cy="31" r="3" fill="' + W + '"/>' +
      '<circle class="pl-dot pl-acc" style="--i:4" cx="40" cy="19" r="4.2" fill="' + O + '" stroke="' + W + '" stroke-width="2"/>',
    r: SQ(T6) +
      '<g class="pl-lens"><circle class="pl-ln" cx="25" cy="25" r="9.5" fill="none" stroke="' + W + '" stroke-width="3" pathLength="1"/>' +
      '<path class="pl-ln" d="M32 32 L40 40" stroke="' + W + '" stroke-width="4" stroke-linecap="round" pathLength="1"/>' +
      '<path class="pl-ln" d="M20 23 A5.5 5.5 0 0 1 24 19.5" fill="none" stroke="' + W + '" stroke-opacity=".6" stroke-width="2" stroke-linecap="round" pathLength="1"/>' +
      '<circle class="pl-dot pl-acc" style="--i:3" cx="25" cy="25" r="2.6" fill="' + O + '"/></g>',
    s: '<circle class="pb" cx="28" cy="28" r="26" fill="' + T8 + '"/>' +
      '<path class="pl-ln pl-link" d="M28 17 L17.5 35 H38.5 Z" fill="none" stroke="' + W + '" stroke-opacity=".75" stroke-width="2.5" stroke-linejoin="round" pathLength="1"/>' +
      '<circle class="pl-dot pl-node pl-acc" style="--i:1" cx="28" cy="17" r="4.6" fill="' + O + '" stroke="' + W + '" stroke-width="2"/>' +
      '<circle class="pl-dot pl-node" style="--i:2" cx="17.5" cy="35" r="4.6" fill="' + W + '"/>' +
      '<circle class="pl-dot pl-node" style="--i:3" cx="38.5" cy="35" r="4.6" fill="' + W + '"/>',
    c: '<path class="pb" d="M28 2 A26 26 0 0 0 2 28 A26 26 0 0 0 28 54 H44 A10 10 0 0 0 54 44 V28 A26 26 0 0 0 28 2 Z" fill="' + O + '"/>' +
      '<path class="pl-ln" d="M18 17 H38 A4 4 0 0 1 42 21 V31 A4 4 0 0 1 38 35 H27 L20 41 V35 H18 A4 4 0 0 1 14 31 V21 A4 4 0 0 1 18 17 Z" fill="none" stroke="' + W + '" stroke-width="3" stroke-linejoin="round" pathLength="1"/>' +
      '<circle class="pl-dot pl-type" style="--i:1" cx="21.5" cy="26" r="2.4" fill="' + W + '"/><circle class="pl-dot pl-type" style="--i:2" cx="28" cy="26" r="2.4" fill="' + W + '"/><circle class="pl-dot pl-type pl-acc2" style="--i:3" cx="34.5" cy="26" r="2.4" fill="' + T + '"/>'
  };
  ICONS.resources = ICONS.resources || ICONS.workforce;
  window.pillarIcon = function (p) {
    return PILLAR[p] ? '<svg class="pic pic-' + p + '" viewBox="0 0 56 56" aria-hidden="true" focusable="false">' + PILLAR[p] + "</svg>" : "";
  };

  window.svcIcon = function (key, cls) {
    const body = ICONS[key];
    if (!body) return "";
    return '<svg class="ic ic-' + key + (cls ? " " + cls : "") + '" viewBox="0 0 64 64" aria-hidden="true" focusable="false">' + body + "</svg>";
  };
})();
