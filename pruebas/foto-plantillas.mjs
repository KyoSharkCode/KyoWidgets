// Foto de las plantillas: dibuja todas las animaciones, anuncios y fondos fotograma a fotograma,
// sintetiza sus sonidos y guarda una huella (SHA-256) de cada resultado.
//   node pruebas/foto-plantillas.mjs --guardar   → guarda la foto del «antes» en pruebas/foto-guardada.json
//   node pruebas/foto-plantillas.mjs             → compara con la foto guardada y avisa de cualquier diferencia
// Si una plantilla lanza un error, falla siempre (haya foto guardada o no).
// Requiere Playwright: npm install (ver package.json). La foto depende del ordenador (fuentes, tarjeta gráfica),
// así que el «antes» y el «después» se hacen siempre en la misma máquina.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FOTO = path.join(RAIZ, 'pruebas', 'foto-guardada.json');
const guardar = process.argv.includes('--guardar');
const TIPOS = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.woff2': 'font/woff2', '.png': 'image/png', '.svg': 'image/svg+xml' };

// servidor local mínimo para que el navegador cargue los módulos del repo
const servidor = http.createServer((req, res) => {
  const ruta = path.join(RAIZ, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!ruta.startsWith(RAIZ) || !fs.existsSync(ruta) || fs.statSync(ruta).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': TIPOS[path.extname(ruta)] || 'application/octet-stream' });
  fs.createReadStream(ruta).pipe(res);
});
await new Promise(r => servidor.listen(0, '127.0.0.1', r));
const origen = 'http://127.0.0.1:' + servidor.address().port;

const navegador = await chromium.launch();
const pagina = await navegador.newPage();
// sin internet: así las imágenes del repo de assets nunca cambian el resultado según tarden o no en llegar
await pagina.route('**/*', r => r.request().url().startsWith(origen) ? r.continue() : r.abort());
const erroresPagina = [];
pagina.on('pageerror', e => erroresPagina.push(e.message));
await pagina.goto(origen + '/pruebas/foto.html');

const { huellas, errores } = await pagina.evaluate(async () => {
  const M = await import('/animaciones/plantillas.js');
  const fuentes = ['400 20px "Cherry Bomb One"', '600 20px "Fredoka"', '700 20px "Fredoka"', '500 20px "Chakra Petch"', '600 20px "Chakra Petch"', '700 20px "Chakra Petch"', '400 20px "M PLUS Rounded 1c"', '500 20px "M PLUS Rounded 1c"', '700 20px "M PLUS Rounded 1c"'];
  await Promise.all(fuentes.map(f => document.fonts.load(f)));
  const huellas = {}, errores = [];
  const hex = b => [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
  const sha = async datos => hex(await crypto.subtle.digest('SHA-256', datos));
  const lienzo = async (W, H, dibujar) => { const c = document.createElement('canvas'); c.width = W; c.height = H; const ctx = c.getContext('2d'); await dibujar(ctx); return sha(ctx.getImageData(0, 0, W, H).data); };
  // el sonido no sale idéntico bit a bit entre ejecuciones (ruido de redondeo del motor de audio, ~1e-7),
  // así que se guarda su envolvente (volumen de cada décima de segundo, por canal) y se compara con margen
  const audio = async buf => { if (!buf) return 'sin sonido'; const bloque = Math.round(buf.sampleRate / 10), env = [];
    for (let i = 0; i < buf.numberOfChannels; i++) { const d = buf.getChannelData(i); for (let j = 0; j < d.length; j += bloque) { let q = 0; const n = Math.min(bloque, d.length - j); for (let k = 0; k < n; k++) q += d[j + k] * d[j + k]; env.push(Math.round(Math.sqrt(q / n) * 1e6) / 1e6); } }
    return { muestras: buf.length, canales: buf.numberOfChannels, env }; };
  const anotar = async (clave, fn) => { try { huellas[clave] = await fn(); } catch (e) { errores.push(clave + ' → ' + (e && e.stack || e)); } };
  const opciones = (pl, extra) => { const o = {}; pl.campos.forEach(c => { if ('def' in c) o[c.k] = c.def; }); return Object.assign(o, extra); };

  // lo que el módulo entrega hacia fuera (si cambia, alguna página del Estudio se puede romper)
  huellas['exportaciones'] = Object.keys(M).sort().join(',');
  huellas['UT'] = Object.keys(M.UT).sort().join(',') + ' | iconos: ' + Object.keys(M.UT.ICONOS).sort().join(',') + ' | temas: ' + Object.keys(M.UT.TEMAS).sort().join(',');
  huellas['FORMATOS'] = JSON.stringify(M.FORMATOS);

  const temas = Object.keys(M.UT.TEMAS);
  for (const [grupo, lista] of [['plantilla', M.PLANTILLAS], ['anuncio', M.ANUNCIOS]]) {
    for (const pl of lista) {
      const base = `${grupo}/${pl.id}`;
      huellas[base + '/campos'] = JSON.stringify(pl.campos.map(c => [c.k, c.tipo, c.def, c.label]));
      const o0 = opciones(pl);
      await anotar(base + '/preparar', async () => { if (pl.preparar) await pl.preparar(o0); return 'ok'; });
      const L = pl.duracion(o0), fmts = pl.formatos || ['horizontal', 'vertical'];
      const tiempos = [0, .3, .7, 1.2, 2, 2.6, 3.3, 4, L * .6, L - .8, L - .3, L - .01].filter(t => t >= 0 && t < L);
      const acabados = pl.campos.some(c => c.k === 'acabado') ? ['limpio', 'dibujado'] : [undefined];
      for (const fmt of fmts) {
        const F = M.FORMATOS[fmt];
        for (const acabado of acabados) {
          const o = opciones(pl, acabado ? { acabado } : {});
          for (const t of tiempos) await anotar(`${base}/${fmt}/${acabado || '-'}/t${t.toFixed(2)}`, () => lienzo(F.w, F.h, ctx => pl.dibujar(ctx, t, o, fmt, F.w, F.h)));
        }
      }
      // cada estilo de color, en un fotograma con todo a la vista
      const F = M.FORMATOS[fmts[0]];
      for (const tema of temas) await anotar(`${base}/tema-${tema}`, () => lienzo(F.w, F.h, ctx => pl.dibujar(ctx, L * .6, opciones(pl, { tema }), fmts[0], F.w, F.h)));
      if (pl.sonido) await anotar(base + '/sonido', async () => audio(await pl.sonido(o0)));
    }
  }
  // fondos de la pestaña Imágenes
  for (const f of M.FONDOS.lista) for (const [fmt, F] of Object.entries(M.FONDOS.formatos)) {
    const o = {}; (f.opciones || []).forEach(c => o[c.k] = c.def);
    await anotar(`fondo/${f.id}/${fmt}`, () => lienzo(F.w, F.h, ctx => f.dibujar(ctx, o, F.w, F.h, 1.5)));
  }
  // hoja de build (exportar imágenes de la pestaña ZZZ) con las opciones por defecto de las plantillas ZZZ
  const de = id => { const pl = M.PLANTILLAS.find(p => p.id === id); return pl ? opciones(pl) : undefined; };
  const datos = { discos: de('guia-discos'), amplis: de('amplificadores-zzz'), hab: de('habilidades-zzz'), equipo: de('equipo-zzz') };
  await anotar('hoja-build/resumen', () => lienzo(1920, 1080, ctx => M.hojaBuild(ctx, { x: 630, y: 36, w: 1254, h: 954 }, datos, [['discos', 'atributos'], ['amplis', 'habilidades', 'equipo']], { uMax: 1.2, gapPanel: 18 })));
  await anotar('hoja-build/carrusel', () => lienzo(1080, 1350, ctx => M.hojaBuild(ctx, { x: 56, y: 196, w: 968, h: 1032 }, datos, [['discos', 'atributos']], { uMax: 1.6 })));
  // música propia (pestaña Mis músicas)
  for (const estilo of ['alegre', 'chill', 'burbuja', 'halloween', 'navidad'])
    await anotar('musica/' + estilo, async () => audio(await M.renderSonido(12, (ac, out) => M.musicaFondo(ac, out, 12, estilo, 1.2))));
  huellas['normIcono'] = ['Daño Crítico', 'daño critico', 'ATAQUE %'].map(M.normIcono).join('|');
  return { huellas, errores };
});
await navegador.close();
servidor.close();

const total = Object.keys(huellas).length;
errores.push(...erroresPagina.map(e => 'página → ' + e));
if (errores.length) { console.log(`❌ ${errores.length} error(es) al dibujar:\n` + errores.map(e => '  · ' + e).join('\n')); process.exitCode = 1; }
if (guardar) {
  fs.writeFileSync(FOTO, JSON.stringify(huellas));
  console.log(`📸 Foto guardada: ${total} huellas en pruebas/foto-guardada.json`);
} else if (!fs.existsSync(FOTO)) {
  console.log(`ℹ️  No hay foto guardada. Dibujadas ${total} huellas${errores.length ? '' : ' sin errores'}. Usa --guardar para guardar el «antes».`);
} else {
  const antes = JSON.parse(fs.readFileSync(FOTO, 'utf8')), claves = new Set([...Object.keys(antes), ...Object.keys(huellas)]);
  const igual = (a, b) => typeof a === 'object' && a && typeof b === 'object' && b
    ? a.muestras === b.muestras && a.canales === b.canales && a.env.length === b.env.length && a.env.every((v, i) => Math.abs(v - b.env[i]) < 1e-4)
    : a === b;
  const distintas = [...claves].filter(k => !igual(antes[k], huellas[k]));
  if (distintas.length) {
    console.log(`❌ ${distintas.length} de ${claves.size} huellas han cambiado:\n` + distintas.slice(0, 60).map(k => `  · ${k}${!(k in antes) ? ' (nueva)' : !(k in huellas) ? ' (ya no existe)' : ''}`).join('\n') + (distintas.length > 60 ? '\n  …' : ''));
    process.exitCode = 1;
  } else console.log(`✅ Todo idéntico: ${total} huellas iguales a la foto guardada.`);
}
