// KyoWidgets · fortnite-stats
// Devuelve tus estadísticas de Fortnite (Battle Royale) para el overlay.
// Datos de fortnite-api.com (API no oficial, clave gratuita).
//
// Uso: .../functions/v1/fortnite-stats?nombre=TuNombreEpic&cuenta=epic&ventana=season
//   cuenta:  epic | psn | xbl
//   ventana: season (temporada actual) | lifetime (histórico)
//
// Secreto necesario: FORTNITE_API_KEY
// Tus estadísticas deben ser públicas en Fortnite (Ajustes > Cuenta y privacidad).

// --- CORS (permite que los overlays llamen a esta función) ---
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

function json(body: unknown, status = 200, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json; charset=utf-8", ...extra },
  });
}
// -------------------------------------------------------------

const cache = new Map<string, { at: number; body: unknown }>();

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const url = new URL(req.url);
  const nombre = (url.searchParams.get("nombre") ?? Deno.env.get("FORTNITE_NAME") ?? "").trim();
  const cuenta = ["epic", "psn", "xbl"].includes(url.searchParams.get("cuenta") ?? "") ? url.searchParams.get("cuenta")! : "epic";
  const ventana = url.searchParams.get("ventana") === "lifetime" ? "lifetime" : "season";
  if (!nombre) return json({ ok: false, error: "falta_nombre" });

  const key = `${nombre}|${cuenta}|${ventana}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < 60_000) return json(hit.body);

  const api = new URL("https://fortnite-api.com/v2/stats/br/v2");
  api.search = new URLSearchParams({ name: nombre, accountType: cuenta, timeWindow: ventana }).toString();
  const res = await fetch(api, { headers: { Authorization: Deno.env.get("FORTNITE_API_KEY") ?? "" } });

  let body: Record<string, unknown>;
  if (res.status === 403) body = { ok: false, error: "privado" };
  else if (res.status === 404) body = { ok: false, error: "no_encontrado" };
  else if (res.status === 401) body = { ok: false, error: "clave_invalida" };
  else if (!res.ok) body = { ok: false, error: "api_" + res.status };
  else {
    const d = (await res.json()).data ?? {};
    const o = d.stats?.all?.overall ?? {};
    const modo = (m: string) => {
      const s = d.stats?.all?.[m];
      return s ? { wins: s.wins ?? 0, kills: s.kills ?? 0, matches: s.matches ?? 0 } : null;
    };
    body = {
      ok: true,
      nombre: d.account?.name ?? nombre,
      ventana,
      nivel: d.battlePass?.level ?? null,
      progresoNivel: d.battlePass?.progress ?? null,
      total: {
        wins: o.wins ?? 0,
        kills: o.kills ?? 0,
        kd: o.kd ?? 0,
        matches: o.matches ?? 0,
        winRate: o.winRate ?? 0,
        top10: o.top10 ?? null,
        minutos: o.minutesPlayed ?? null,
      },
      solo: modo("solo"),
      duo: modo("duo"),
      squad: modo("squad"),
      at: Date.now(),
    };
  }
  cache.set(key, { at: Date.now(), body });
  return json(body);
});
