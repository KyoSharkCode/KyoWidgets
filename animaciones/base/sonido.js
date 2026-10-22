// Kyo Estudio · Sonido y música sintetizados en el navegador (100 % propios)
import { azar, clamp } from './utilidades.js';

export function ruido(ac, seg, sem = 7) {
  const r = azar(sem), n = Math.max(1, Math.round(ac.sampleRate * seg)), b = ac.createBuffer(1, n, ac.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = r() * 2 - 1;
  return b;
}
// "Fuuush" de ola: ruido con filtro que barre de grave a agudo y se mueve de un lado a otro
export function whoosh(ac, dest, t0, largo, vol, panDe, panA, sem) {
  const src = ac.createBufferSource(); src.buffer = ruido(ac, largo + .1, sem);
  const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 1.1;
  bp.frequency.setValueAtTime(320, t0); bp.frequency.exponentialRampToValueAtTime(2300, t0 + largo * .55); bp.frequency.exponentialRampToValueAtTime(700, t0 + largo);
  const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 5200;
  const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + largo * .5); g.gain.exponentialRampToValueAtTime(0.0001, t0 + largo);
  const pan = ac.createStereoPanner(); pan.pan.setValueAtTime(panDe, t0); pan.pan.linearRampToValueAtTime(panA, t0 + largo);
  src.connect(bp).connect(lp).connect(g).connect(pan).connect(dest); src.start(t0); src.stop(t0 + largo + .05);
}
// "Blup" de burbuja: tono corto que sube rápido y se apaga
export function blup(ac, dest, t0, f0, vol, p) {
  const os = ac.createOscillator(); os.type = 'sine';
  os.frequency.setValueAtTime(f0, t0); os.frequency.exponentialRampToValueAtTime(f0 * 2.6, t0 + .07);
  const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + .008); g.gain.exponentialRampToValueAtTime(0.0001, t0 + .11);
  const pan = ac.createStereoPanner(); pan.pan.value = p;
  os.connect(g).connect(pan).connect(dest); os.start(t0); os.stop(t0 + .13);
}
export function renderSonido(L, fn) {
  const AC = window.OfflineAudioContext || window.webkitOfflineAudioContext; if (!AC) return Promise.resolve(null);
  const ac = new AC(2, Math.ceil(48000 * L), 48000);
  const comp = ac.createDynamicsCompressor(); comp.threshold.value = -10; comp.ratio.value = 4; comp.connect(ac.destination);
  fn(ac, comp);
  return ac.startRendering();
}
// Música + efectos de ola para intro y outro. olas = [[inicio, duración, panDe, panA], …]
export function sonidoConOlas(o, L, olas, estiloDef) {
  const musica = musicaElegida(o, estiloDef), efectos = o.efectos !== 'no', v = clamp(Number(o.vol) || 70, 5, 100) / 100;
  if (musica === 'ninguna' && !efectos) return Promise.resolve(null);
  return renderSonido(L, (ac, out) => {
    if (musica !== 'ninguna') musicaFondo(ac, out, L, musica, 1.5 * v);
    if (efectos) olas.forEach(([t0, d, pa, pb], i) => { if (t0 < L) whoosh(ac, out, t0, Math.min(d, L - t0), .9 * v, pa, pb, 3 + i); });
  });
}
export const MUSICA_CAMPOS = (def) => [
  { k: 'musica', label: 'Música de fondo', tipo: 'chips', def: 'auto', opciones: [['auto', '🎨 Según el estilo'], ['burbuja', '🫧 Burbuja'], ['chill', '🌙 Chill'], ['alegre', '🎶 Pop'], ['halloween', '🎃 Halloween'], ['navidad', '🎄 Navidad'], ['ninguna', '🔇 Sin música']] },
  { k: 'efectos', label: 'Sonido de las olas', tipo: 'chips', def: 'si', opciones: [['si', '🌊 Sí'], ['no', 'No']] },
  { k: 'vol', label: 'Volumen (%)', tipo: 'numero', def: 70, min: 5, max: 100, paso: 5 }
];
// Música de fondo (100 % sintetizada en el navegador)
const midi = m => 440 * Math.pow(2, (m - 69) / 12);
const ESTILOS_MUSICA = {
  alegre: { bpm: 112, acordes: [[60, 64, 67], [59, 62, 67], [60, 64, 69], [60, 65, 69]], bajos: [36, 43, 45, 41], onda: 'triangle' },
  chill: { bpm: 84, acordes: [[53, 57, 60, 64], [52, 55, 59, 62], [50, 53, 57, 60], [48, 52, 55, 59]], bajos: [41, 40, 38, 36], onda: 'sine' },
  // burbuja: pop saltarín y dulce (Fmaj7 · Dm7 · Gm7 · C7)
  burbuja: { bpm: 124, acordes: [[53, 57, 60, 64], [50, 53, 57, 60], [55, 58, 62, 65], [52, 55, 58, 60]], bajos: [41, 38, 43, 36], onda: 'triangle' },
  // halloween: misterioso y juguetón (Am · F · Dm · E, menor armónica)
  halloween: { bpm: 108, acordes: [[57, 60, 64], [57, 60, 65], [57, 62, 65], [56, 59, 64]], bajos: [45, 41, 38, 40], onda: 'square' },
  // navidad: campanitas y cascabeles (C · Am · F · G)
  navidad: { bpm: 120, acordes: [[60, 64, 67], [57, 60, 64], [57, 60, 65], [59, 62, 67]], bajos: [48, 45, 41, 43], onda: 'triangle' }
};
// "Según el estilo": Halloween → música de Halloween, Navidad → navideña, Normal → la de la plantilla
export function musicaElegida(o, porDefecto) { const m = o.musica || 'auto'; if (m !== 'auto') return m; return o.tema === 'octubre' ? 'halloween' : o.tema === 'navidad' ? 'navidad' : porDefecto; }
export function musicaFondo(ac, destino, L, estilo, vol) {
  const E = ESTILOS_MUSICA[estilo] || ESTILOS_MUSICA.alegre, b = 60 / E.bpm, compas = 4 * b, chill = estilo === 'chill', bur = estilo === 'burbuja', hal = estilo === 'halloween', nav = estilo === 'navidad';
  if (hal || nav) vol *= 1.45;
  const r = azar(chill ? 77 : 55), nb = ruido(ac, 1, 9);
  const master = ac.createGain(); master.gain.setValueAtTime(0.0001, 0); master.gain.exponentialRampToValueAtTime(vol, .5);
  master.gain.setValueAtTime(vol, Math.max(.6, L - 1.4)); master.gain.linearRampToValueAtTime(0.0001, L);
  master.connect(destino);
  // eco suave para la melodía
  const eco = ac.createDelay(1); eco.delayTime.value = b * .75; const fb = ac.createGain(); fb.gain.value = chill ? .38 : .25; const ecoLp = ac.createBiquadFilter(); ecoLp.type = 'lowpass'; ecoLp.frequency.value = 2400;
  eco.connect(ecoLp).connect(fb).connect(eco); ecoLp.connect(master);
  const nota = (t, f, dur, { tipo = 'sine', nivel = .1, ataque = .01, corte = 3000, det = 0, a = null } = {}) => {
    if (t >= L) return;
    const os = ac.createOscillator(); os.type = tipo; os.frequency.value = f; os.detune.value = det;
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = corte;
    const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(nivel, t + ataque); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    os.connect(lp).connect(g).connect(master); if (a) g.connect(a); os.start(t); os.stop(t + dur + .05);
  };
  const golpe = (t, { hp = 0, bp = 0, nivel = .2, dur = .1 }) => {
    if (t >= L) return;
    const s = ac.createBufferSource(); s.buffer = nb; let n = s;
    if (hp) { const f = ac.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp; n.connect(f); n = f; }
    if (bp) { const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = bp; f.Q.value = .8; n.connect(f); n = f; }
    const g = ac.createGain(); g.gain.setValueAtTime(nivel, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    n.connect(g).connect(master); s.start(t, r() * .5); s.stop(t + dur + .02);
  };
  const bombo = (t, nivel) => {
    if (t >= L) return;
    const os = ac.createOscillator(); os.frequency.setValueAtTime(150, t); os.frequency.exponentialRampToValueAtTime(42, t + .12);
    const g = ac.createGain(); g.gain.setValueAtTime(nivel, t); g.gain.exponentialRampToValueAtTime(0.0001, t + .28);
    os.connect(g).connect(master); os.start(t); os.stop(t + .3);
  };
  const arp = [0, 1, 2, 1, 0, 2, 1, 2];
  if (hal) {
    for (let c = 0, t0 = 0; t0 < L; c++, t0 += compas) {
      const ac_ = E.acordes[c % 4], bajo = E.bajos[c % 4], tonos = [...ac_, ...ac_.map(m => m + 12)];
      // órgano suave
      ac_.forEach((m, i) => { nota(t0, midi(m), compas + .05, { tipo: 'square', nivel: .011, ataque: .08, corte: 900, det: i % 2 ? 5 : -5 }); nota(t0, midi(m - 12), compas, { tipo: 'sine', nivel: .02, ataque: .1, corte: 800 }); });
      // bajo pizzicato
      [0, 1, 2, 2.5, 3].forEach((p, i) => nota(t0 + p * b, midi(bajo + (i === 3 ? 12 : 0)), b * .28, { tipo: 'triangle', nivel: .16, ataque: .004, corte: 700 }));
      // clavecín travieso con notas cromáticas
      [[0, 3], [.5, 2], [1, 1], [1.5, 2], [2, 3], [2.5, 'c'], [3, 4], [3.5, 2]].forEach(([p, i]) => { const m = i === 'c' ? tonos[3] + 1 : tonos[i];
        nota(t0 + p * b, midi(m + 12), b * .3, { tipo: 'square', nivel: .02, ataque: .003, corte: 3600, a: eco }); nota(t0 + p * b, midi(m + 24), b * .2, { tipo: 'triangle', nivel: .01, ataque: .003, corte: 6000 }); });
      // theremín fantasmal cada dos compases
      if (c % 2 === 0 && t0 < L) { const os = ac.createOscillator(), lfo = ac.createOscillator(), lg = ac.createGain(), g = ac.createGain(), d = compas * 1.6;
        os.type = 'sine'; os.frequency.setValueAtTime(midi(tonos[4] + 12), t0); os.frequency.exponentialRampToValueAtTime(midi(tonos[2] + 12), t0 + d * .8);
        lfo.frequency.value = 5.5; lg.gain.value = 9; lfo.connect(lg).connect(os.frequency);
        g.gain.setValueAtTime(.0001, t0); g.gain.exponentialRampToValueAtTime(.03, t0 + .4); g.gain.exponentialRampToValueAtTime(.0001, t0 + d);
        os.connect(g).connect(master); g.connect(eco); os.start(t0); lfo.start(t0); os.stop(t0 + d + .05); lfo.stop(t0 + d + .05); }
      bombo(t0, .5); bombo(t0 + 2 * b, .45);
      [1, 3].forEach(p => golpe(t0 + p * b, { bp: 1800, nivel: .13, dur: .1 }));
      for (let k = 0; k < 8; k++) golpe(t0 + k * b / 2 + (k % 2 ? b * .12 : 0), { hp: 7500, nivel: k % 2 ? .03 : .018, dur: .03 });
    }
    return;
  }
  if (nav) {
    const campana = (t, f, nivel) => { nota(t, f, b * 1.1, { tipo: 'sine', nivel, ataque: .003, corte: 9000, a: eco }); nota(t, f * 2.76, b * .5, { tipo: 'sine', nivel: nivel * .35, ataque: .002, corte: 12000 }); };
    for (let c = 0, t0 = 0; t0 < L; c++, t0 += compas) {
      const ac_ = E.acordes[c % 4], bajo = E.bajos[c % 4], tonos = [...ac_, ...ac_.map(m => m + 12), ...ac_.map(m => m + 24)];
      ac_.forEach((m, i) => nota(t0, midi(m), compas + .05, { tipo: 'triangle', nivel: .022, ataque: .1, corte: 1500, det: i % 2 ? 6 : -6 }));
      [0, 1, 2, 3].forEach(p => nota(t0 + p * b, midi(bajo + (p % 2 ? 7 : 0)), b * .45, { tipo: 'triangle', nivel: .15, ataque: .006, corte: 800 }));
      // glockenspiel
      (c % 2 ? [[0, 5], [.5, 4], [1, 3], [2, 4], [3, 5], [3.5, 6]] : [[0, 3], [.5, 4], [1, 5], [2, 4], [2.5, 3], [3, 2]]).forEach(([p, i]) => campana(t0 + p * b, midi(tonos[i] + 12), .05));
      // cascabeles
      for (let k = 0; k < 8; k++) { golpe(t0 + k * b / 2, { hp: 7000, nivel: k % 2 ? .06 : .035, dur: .07 });
        if (k % 2) [5200, 6400, 7300].forEach((f, j) => nota(t0 + k * b / 2 + j * .006, f + r() * 300, .09, { tipo: 'sine', nivel: .006, ataque: .002, corte: 12000 })); }
      bombo(t0, .45); bombo(t0 + 2 * b, .4);
      [1, 3].forEach(p => golpe(t0 + p * b, { hp: 1500, bp: 2400, nivel: .12, dur: .1 }));
    }
    return;
  }
  if (bur) {
    // gancho melódico propio: [pulso, índice de nota del acorde (+12), duración en pulsos]
    const gancho = [[[0, 5, .45], [.5, 6, .45], [1, 7, .9], [2, 6, .45], [2.5, 5, .45], [3, 4, .9]], [[0, 6, .45], [.5, 5, .45], [1, 4, .45], [1.5, 5, .45], [2, 6, 1.4], [3.5, 7, .4]]];
    for (let c = 0, t0 = 0; t0 < L; c++, t0 += compas) {
      const ac_ = E.acordes[c % 4], bajo = E.bajos[c % 4], tonos = [...ac_, ...ac_.map(m => m + 12)];
      ac_.forEach((m, i) => nota(t0, midi(m), compas + .05, { tipo: 'triangle', nivel: .022, ataque: .06, corte: 1600, det: i % 2 ? 7 : -7 }));
      for (let k = 0; k < 8; k++) nota(t0 + k * b / 2, midi(bajo + (k % 2 ? 24 : 12)), b * .38, { tipo: 'triangle', nivel: .14, ataque: .005, corte: 900 });
      gancho[c % 2].forEach(([p, i, d]) => { const f = midi(tonos[i % tonos.length] + 12);
        nota(t0 + p * b, f, b * d, { tipo: 'square', nivel: .028, ataque: .006, corte: 3200, a: eco });
        nota(t0 + p * b, f * 2, b * d * .8, { tipo: 'sine', nivel: .018, ataque: .004, corte: 7000 }); });
      for (let k = 0; k < 4; k++) ac_.slice(1).forEach(m => nota(t0 + (k + .5) * b, midi(m + 12), b * .22, { tipo: 'triangle', nivel: .014, ataque: .004, corte: 2600 }));
      // burbujitas
      [3.5, 1.75].forEach((p, i) => { if (i === 0 || c % 2) blup(ac, master, t0 + p * b, 320 + r() * 300, .12, (r() * 2 - 1) * .6); });
      // batería suave de cuatro tiempos
      for (let k = 0; k < 4; k++) bombo(t0 + k * b, .5);
      [1, 3].forEach(p => golpe(t0 + p * b, { hp: 1400, bp: 2600, nivel: .16, dur: .11 }));
      for (let k = 0; k < 16; k++) golpe(t0 + k * b / 4, { hp: 8000, nivel: k % 4 === 2 ? .04 : .018, dur: .025 });
    }
    return;
  }
  for (let c = 0, t0 = 0; t0 < L; c++, t0 += compas) {
    const ac_ = E.acordes[c % 4], bajo = E.bajos[c % 4];
    // colchón de acordes
    ac_.forEach((m, i) => { nota(t0, midi(m), compas + .1, { tipo: E.onda, nivel: chill ? .045 : .03, ataque: chill ? .35 : .08, corte: chill ? 1100 : 1800, det: i % 2 ? 6 : -6 }); });
    // bajo
    if (chill) nota(t0, midi(bajo), compas * .95, { tipo: 'sine', nivel: .16, ataque: .05, corte: 500 });
    else [0, 1.5, 2, 3.5].forEach(p => nota(t0 + p * b, midi(bajo + 12), b * .45, { tipo: 'triangle', nivel: .15, ataque: .01, corte: 700 }));
    // melodía / arpegio
    if (chill) {
      for (let k = 0; k < 4; k++) if (r() > .25) nota(t0 + k * b + (k % 2 ? b * .12 : 0), midi(ac_[Math.floor(r() * ac_.length)] + 12), b * 1.4, { tipo: 'sine', nivel: .06, ataque: .01, corte: 3500, a: eco });
    } else {
      for (let k = 0; k < 8; k++) nota(t0 + k * b / 2, midi(ac_[arp[k] % ac_.length] + 12 + (k === 7 && c % 2 ? 12 : 0)), b * .4, { tipo: 'square', nivel: .022, ataque: .005, corte: 2600, a: eco });
      if (c % 2 === 0) nota(t0, midi(ac_[2] + 24), b * 2, { tipo: 'sine', nivel: .04, ataque: .005, corte: 6000, a: eco });
      // acordes cortos a contratiempo
      for (let k = 0; k < 4; k++) ac_.forEach(m => nota(t0 + (k + .5) * b, midi(m + 12), b * .28, { tipo: 'triangle', nivel: .018, ataque: .005, corte: 2200 }));
    }
    // batería (desde el segundo compás)
    if (c >= 1 || chill) {
      if (chill) { bombo(t0, .5); bombo(t0 + 2.5 * b, .38); golpe(t0 + 2 * b, { bp: 1800, nivel: .12, dur: .09 });
        for (let k = 0; k < 8; k++) golpe(t0 + k * b / 2 + (k % 2 ? b * .1 : 0), { hp: 7500, nivel: k % 2 ? .035 : .02, dur: .03 }); }
      else { bombo(t0, .7); bombo(t0 + 2 * b, .7); bombo(t0 + 2.75 * b, .4);
        [1, 3].forEach(p => golpe(t0 + p * b, { hp: 1200, bp: 2200, nivel: .22, dur: .13 }));
        for (let k = 0; k < 8; k++) golpe(t0 + k * b / 2, { hp: 7000, nivel: k % 2 ? .05 : .03, dur: .035 }); }
    }
  }
}
