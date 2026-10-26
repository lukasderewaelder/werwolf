// Gemeinsame Hilfen für die Browser-Tests. Nutzt das installierte Edge/Chrome (PW_CHANNEL), weil
// Playwrights eigene Browser hier nicht heruntergeladen werden können.
import { after, before } from 'node:test';
import { chromium } from 'playwright';
import { startServer } from '../../tools/serve.mjs';

export const IPAD = { width: 1180, height: 820 };
export const IPAD_PORTRAIT = { width: 820, height: 1180 };
export const PHONE = { width: 390, height: 844 };

export function useApp() {
  const state = { base: '', browser: null, server: null };
  before(async () => {
    const started = await startServer(0);
    state.server = started.server;
    state.base = `http://localhost:${started.port}/`;
    state.browser = await chromium.launch({ channel: process.env.PW_CHANNEL ?? 'msedge' });
  });
  after(async () => { await state.browser?.close(); state.server?.close(); });

  async function openApp({ viewport = IPAD, url, context: existing, seed } = {}) {
    const context = existing ?? (await state.browser.newContext({ viewport, acceptDownloads: true }));
    const page = await context.newPage();
    const problems = [], foreign = [];
    page.on('console', (m) => m.type() === 'error' && problems.push(m.text()));
    page.on('pageerror', (e) => problems.push(String(e)));
    page.on('request', (r) => { const u = r.url(); if (!u.startsWith(state.base) && !u.startsWith('data:') && !u.startsWith('blob:')) foreign.push(u); });
    if (seed) await page.addInitScript((s) => { if (!localStorage.getItem('werwolf-spielleiter-v1')) localStorage.setItem('werwolf-spielleiter-v1', JSON.stringify(s)); }, seed);
    await page.goto(url ?? state.base);
    await page.waitForSelector('#app .view');
    return { context, page, problems, foreign };
  }
  return { get base() { return state.base; }, openApp, newContext: (opts = {}) => state.browser.newContext({ viewport: IPAD, acceptDownloads: true, ...opts }) };
}

/** Spiel direkt im Browser anlegen (ohne den Assistenten), danach zur Spielansicht wechseln. */
export async function startGame(page, { names, counts, mode = 'digital', rules = {}, roles, eventCards = [], beadleIds = [] }) {
  await page.evaluate(async ({ names, counts, mode, rules, roles, eventCards, beadleIds }) => {
    const { createGame } = await import('/src/engine/game.js');
    const w = window.__werwolf;
    const players = names.map((n, i) => ({ id: `p${i + 1}`, name: n }));
    const g = createGame({ players, counts, mode, rules, eventCards, beadleIds });
    if (roles) { g.roles = Object.fromEntries(players.map((p, i) => [p.id, roles[i]])); g.middle = []; }
    g.dealIdx = players.length;
    w.S.game = g; w.ui.view = 'game'; w.render();
  }, { names, counts, mode, rules, roles, eventCards, beadleIds });
}
