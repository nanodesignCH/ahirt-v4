// Ergänzt data/orte.json um Orte aus data/projekte.json, die dort noch fehlen (Koordinaten von geo.admin.ch).
// Aufruf: node .github/scripts/geocode.mjs   (Node 18+, keine Abhängigkeiten)
import fs from 'node:fs';

const PROJEKTE = 'data/projekte.json', ORTE = 'data/orte.json';
const read = (f, fallback) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return fallback; } };

const projekte = read(PROJEKTE, []);
const orte = read(ORTE, {});
const fehlend = [...new Set((Array.isArray(projekte) ? projekte : []).map(p => String(p?.o ?? '').trim()).filter(Boolean))]
  .filter(o => !orte[o]);

// Die Suche ist unscharf ("Xyzqwop" liefert Seuzach): Treffer nur, wenn sein Name den Ort enthält
const norm = s => s.replace(/<[^>]+>/g, '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const nichtGefunden = [];
for (const ort of fehlend) {
  const url = 'https://api3.geo.admin.ch/rest/services/ech/SearchServer?type=locations&origins=gg25,gazetteer&sr=4326&searchText=' + encodeURIComponent(ort);
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    // Mit sr=4326 liefert attrs.lon den Längengrad (~7) und attrs.lat den Breitengrad (~47)
    const a = (await res.json()).results?.[0]?.attrs;
    if (!a || !norm(String(a.label)).includes(norm(ort))) throw new Error(a ? 'nächster Treffer wäre ' + norm(String(a.label)) : 'kein Treffer');
    const lon = Number(a.lon), lat = Number(a.lat);
    if (!(lon > 5.9 && lon < 10.5 && lat > 45.8 && lat < 47.9)) throw new Error('kein Treffer in der Schweiz');
    orte[ort] = [+lon.toFixed(4), +lat.toFixed(4)];
    console.log(`gefunden: ${ort} -> ${orte[ort].join(', ')} (${a.label.replace(/<[^>]+>/g, '')})`);
  } catch (e) {
    nichtGefunden.push(ort);
    console.log(`::warning::Ort nicht gefunden: ${ort} (${e.message})`);
  }
}

if (fehlend.length > nichtGefunden.length) fs.writeFileSync(ORTE, JSON.stringify(orte, null, 2) + '\n');
console.log(`${fehlend.length} neue Orte, ${fehlend.length - nichtGefunden.length} geocodiert, ${nichtGefunden.length} nicht gefunden${nichtGefunden.length ? ': ' + nichtGefunden.join(', ') : ''}`);
