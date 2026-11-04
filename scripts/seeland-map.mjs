// Erzeugt assets/seeland-map.webp: Punktekarte des Seelands (graue Punkte, zum Rand ausblendend, Bielersee ausgespart).
// Nach ahirt-bau-v3/scripts/generate-seeland-map.mjs. Der Ausschnitt F muss mit KARTE in index.html übereinstimmen.
// Aufruf: PLAYWRIGHT=/pfad/zu/playwright/index.mjs node scripts/seeland-map.mjs   (braucht Playwright-Chromium und cwebp)
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

// Seitenverhältnis wie das Bild (cos(47.085°) · 0.6 / 0.19 ≈ 2400 / 1120), damit die Karte nicht verzerrt
const F = { lonMin: 6.94, lonMax: 7.54, latMin: 46.99, latMax: 47.18, width: 2400, height: 1120 };
const project = ([lon, lat]) => [((lon - F.lonMin) / (F.lonMax - F.lonMin)) * F.width, ((F.latMax - lat) / (F.latMax - F.latMin)) * F.height];

// Ufer des Bielersees (lon, lat), im Uhrzeigersinn ab Biel
const lake = [
  [7.2445, 47.1335], [7.233, 47.129], [7.215, 47.1235], [7.1985, 47.115], [7.18, 47.105], [7.1575, 47.0935],
  [7.137, 47.082], [7.115, 47.071], [7.096, 47.061], [7.07, 47.052], [7.072, 47.044], [7.095, 47.044],
  [7.125, 47.051], [7.15, 47.047], [7.183, 47.056], [7.2, 47.07], [7.22, 47.098], [7.233, 47.113], [7.242, 47.127],
].map(project);
// Heidenweg und St. Petersinsel (Land im See)
const spit = [[7.103, 47.05], [7.15, 47.075], [7.166, 47.083], [7.16, 47.088], [7.144, 47.081], [7.099, 47.056]].map(project);

const inside = ([x, y], poly) => {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
};

const step = 16, dots = [];
for (let y = step / 2; y < F.height; y += step) {
  for (let x = step / 2; x < F.width; x += step) {
    if (inside([x, y], lake) && !inside([x, y], spit)) continue;
    const dx = (x - F.width * 0.52) / (F.width * 0.55), dy = (y - F.height * 0.5) / (F.height * 0.62);
    const o = Math.max(0, 1 - Math.hypot(dx, dy));
    if (o < 0.04) continue;
    dots.push(`<circle cx="${x}" cy="${y}" r="3" fill-opacity="${o.toFixed(2)}"/>`);
  }
}
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${F.width}" height="${F.height}" viewBox="0 0 ${F.width} ${F.height}"><g fill="#8a93a3">${dots.join('')}</g></svg>`;

const { chromium } = await import(process.env.PLAYWRIGHT || 'playwright');
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: F.width, height: F.height } });
await page.setContent(`<style>html,body{margin:0;background:transparent}</style>${svg}`);
await page.screenshot({ path: 'assets/seeland-map.png', omitBackground: true });
await browser.close();
execFileSync('cwebp', ['-quiet', '-q', '80', '-alpha_q', '80', 'assets/seeland-map.png', '-o', 'assets/seeland-map.webp']);
fs.rmSync('assets/seeland-map.png');
console.log(`${dots.length} Punkte, webp ${(fs.statSync('assets/seeland-map.webp').size / 1024).toFixed(0)} KB`);
