import assert from 'node:assert/strict';
import { test } from 'node:test';
import { useApp, startGame, IPAD, IPAD_PORTRAIT, PHONE } from './helpers.mjs';

const app = useApp();
const NAMES = ['Anna', 'Ben', 'Carla', 'David', 'Eva', 'Felix', 'Greta', 'Hans'];
const ROLES8 = ['wolf', 'wolf', 'seer', 'witch', 'hunter', 'villager', 'villager', 'villager'];
const COUNTS8 = { wolf: 2, seer: 1, witch: 1, hunter: 1, villager: 3 };

const inside = async (page, sel, label) => {
  const bad = await page.evaluate((sel) => [...document.querySelectorAll(sel)].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && (r.right > innerWidth + 1 || r.left < -1); }).map((e) => e.className || e.tagName).slice(0, 5), sel);
  assert.deepEqual(bad, [], `${label}: Elemente ragen aus dem Fenster`);
};
const noOverflow = async (page, label) => {
  const o = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: innerWidth, bw: document.body.scrollWidth }));
  assert.ok(o.sw <= o.iw + 1 && o.bw <= o.iw + 1, `${label}: horizontaler Überlauf ${JSON.stringify(o)}`);
};
const tapName = (page, name) => page.locator(`.tok:visible[aria-label="${name}"]`).first().click();

test('Start: Startseite lädt ohne Fehler und ohne fremde Anfragen', async () => {
  const { page, problems, foreign } = await app.openApp();
  assert.ok(await page.locator('text=Neues Spiel').first().isVisible());
  assert.deepEqual(problems, []);
  assert.deepEqual(foreign, []);
  await page.context().close();
});

test('Assistent: Gruppe anlegen, Namen eintragen, ohne Karten starten, Rollen zeigen, Nacht 1', async () => {
  const { page, problems } = await app.openApp();
  await page.click('[data-action=new-game]');
  await page.fill('#add-inp', 'Anna, Ben, Carla, David, Eva, Felix, Greta, Hans');
  await page.press('#add-inp', 'Enter');
  assert.equal(await page.locator('.member').count(), 8);
  await page.click('[data-action=wiz-next]');
  await page.click('[data-action=set-mode][data-mode=digital]');
  await page.click('[data-action=wiz-next]');
  const total = await page.locator('.sumbar .s b').first().innerText();
  assert.equal(total, '8/8');
  await page.click('[data-action=wiz-next]');
  await page.click('[data-action=start-game]');
  for (let i = 0; i < 8; i++) { await page.click('[data-action=deal-show]'); await page.click('[data-action=deal-next]'); }
  await page.waitForSelector('.game');
  assert.match(await page.locator('.bar h1').innerText(), /Nacht 1/);
  assert.equal(await page.locator('.table .tok').count(), 8);
  assert.deepEqual(problems, []);
  // Spielstand bleibt nach dem Neuladen erhalten
  await page.reload();
  await page.click('[data-action=resume]');
  await page.waitForSelector('.game');
  assert.equal(await page.locator('.table .tok').count(), 8);
  await page.context().close();
});

test('Kartenmodus: Rollen zuordnen, Wolfsopfer, Morgen, Abstimmung, Jäger, Sieg', async () => {
  const { page, problems } = await app.openApp();
  await startGame(page, { names: NAMES, counts: COUNTS8, mode: 'cards' });
  const next = () => page.click('[data-action=step-next]');
  // Reihenfolge: Seherin, Wölfe, Hexe, dazu stille Rollen (Jäger)
  const stepLabels = await page.locator('.sdot').allInnerTexts();
  assert.ok(stepLabels.some((t) => /Seherin/.test(t)) && stepLabels.some((t) => /Jäger/.test(t)));
  let guard = 0;
  while (guard++ < 12) {
    const title = (await page.locator('.rolebox h2').innerText()).trim();
    if (title === 'Jäger') await tapName(page, 'Eva');
    if (title === 'Seherin') await tapName(page, 'Carla');
    if (title === 'Werwolf') { await tapName(page, 'Anna'); await tapName(page, 'Ben'); }
    if (title === 'Hexe') await tapName(page, 'David');
    const label = (await page.locator('[data-action=step-next]').innerText()).trim();
    await next();
    if (/Morgen/.test(label)) break;
  }
  await page.waitForSelector('text=Das Dorf erwacht');
  assert.equal(await page.locator('.death').count(), 0, 'ohne Opfer stirbt niemand');
  await page.click('[data-action=skip-captain]');
  await tapName(page, 'Anna');
  await page.click('[data-action=day-execute]');
  assert.match(await page.locator('.bar h1').innerText(), /Nacht 2/);
  assert.deepEqual(problems, []);
  await page.context().close();
});

test('Ohne Karten: Jäger stirbt, schießt auf den Wolf, Dorf gewinnt', async () => {
  const { page, problems } = await app.openApp();
  await startGame(page, { names: NAMES.slice(0, 5), counts: { wolf: 1, hunter: 1, villager: 3 }, roles: ['wolf', 'hunter', 'villager', 'villager', 'villager'] });
  assert.match(await page.locator('.rolebox h2').innerText(), /Werwolf/);
  await tapName(page, 'Ben');
  await page.click('[data-action=step-next]');
  await page.waitForSelector('text=Jäger Ben ist tot');
  await tapName(page, 'Anna');
  await page.waitForSelector('text=Spielende');
  assert.match(await page.locator('h1').nth(1).innerText(), /Das Dorf/);
  assert.deepEqual(problems, []);
  await page.context().close();
});

test('Layout: kein horizontaler Überlauf auf iPad quer, iPad hoch und Handy', async () => {
  for (const [label, viewport] of [['iPad quer', IPAD], ['iPad hoch', IPAD_PORTRAIT], ['Handy', PHONE]]) {
    const { page, problems } = await app.openApp({ viewport });
    await noOverflow(page, `${label} Start`);
    for (const v of ['groups', 'library', 'guide', 'settings']) {
      await page.evaluate((v) => { window.__werwolf.ui.view = v; window.__werwolf.render(); }, v);
      await noOverflow(page, `${label} ${v}`);
    }
    await page.evaluate(() => { const w = window.__werwolf; w.ui.view = 'setup'; w.S.setup.step = 2; w.render(); });
    await noOverflow(page, `${label} Rollenwahl`);
    await startGame(page, { names: Array.from({ length: 24 }, (_, i) => `Spieler ${i + 1}`), counts: { wolf: 5, seer: 1, villager: 18 }, roles: [...Array(5).fill('wolf'), 'seer', ...Array(18).fill('villager')] });
    await noOverflow(page, `${label} Spiel mit 24`);
    await inside(page, '.side *', `${label} Seitenfeld`);
    await page.evaluate(() => { const w = window.__werwolf; w.S.game.cfg.mode = 'cards'; w.S.game.roles = {}; w.render(); });
    await inside(page, '.side *', `${label} Seitenfeld Kartenmodus`);
    const box = await page.locator('.side').first().boundingBox();
    assert.ok(box && box.height > 150, `${label}: Seitenfeld zu klein`);
    assert.deepEqual(problems, [], label);
    await page.context().close();
  }
});

test('Offline: nach dem ersten Besuch läuft die App ohne Netz', async () => {
  const context = await app.newContext();
  const { page } = await app.openApp({ url: `${app.base}?sw=1`, context });
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.waitForFunction(() => navigator.serviceWorker.controller || true);
  await page.reload();
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null, null, { timeout: 15000 });
  await context.setOffline(true);
  await page.reload();
  await page.waitForSelector('#app .view');
  assert.ok(await page.locator('text=Neues Spiel').first().isVisible());
  await page.click('[data-action=go][data-view=library]');
  await page.waitForSelector('.ov');
  assert.ok((await page.locator('.ov .pimg').count()) >= 8);
  await context.close();
});

test('Eigene Rolle: anlegen, einplanen, in der Nacht aufgerufen', async () => {
  const { page, problems } = await app.openApp();
  await page.click('[data-action=new-game]');
  await page.fill('#add-inp', 'Anna, Ben, Carla, David, Eva, Felix'); await page.press('#add-inp', 'Enter');
  await page.click('[data-action=wiz-next]'); await page.click('[data-action=wiz-next]');
  await page.click('[data-action=lib-set-setup][data-set=eigene]');
  await page.click('[data-action=custom-new]');
  await page.fill('#custom-form input[name=name]', 'Nachtwächter');
  await page.selectOption('#custom-form select[name=wake]', 'every');
  await page.selectOption('#custom-form select[name=cact]', 'protect');
  await page.selectOption('#custom-form select[name=win]', 'survive');
  await page.click('#custom-form label.chip:has(input[value="🛡️"])');
  await page.fill('#custom-form input[name=say]', 'Der Nachtwächter erwacht.');
  await page.click('#custom-form button[type=submit]');
  await page.click('[data-action=role-inc]');
  assert.equal(await page.locator('.sumbar .s b').first().innerText(), '6/6');
  await page.click('[data-action=wiz-next]');
  await page.click('[data-action=start-game]');
  await page.waitForSelector('.game');
  assert.ok((await page.locator('.sdot').allInnerTexts()).some((t) => /Nachtwächter/.test(t)));
  const cr = await page.evaluate(() => window.__werwolf.S.customRoles[0]);
  assert.deepEqual([cr.cact, cr.win, cr.icon], ['protect', 'survive', '🛡️']);
  // überlebt das Neuladen (Rolle ist im Spielstand gespeichert)
  await page.reload();
  await page.click('[data-action=resume]');
  assert.ok((await page.locator('.sdot').allInnerTexts()).some((t) => /Nachtwächter/.test(t)));
  assert.deepEqual(problems, []);
  await page.context().close();
});

test('Verbitterter Greis: Gruppen lassen sich zuordnen', async () => {
  const { page, problems } = await app.openApp();
  await startGame(page, { names: NAMES.slice(0, 6), counts: { wolf: 1, greis: 1, villager: 4 }, mode: 'cards' });
  await page.click('[data-action=open-menu]');
  await page.click('[data-action=greis-open]');
  await page.click('[data-action=greis-alt]');
  const groups = await page.evaluate(() => window.__werwolf.S.game.groups);
  assert.deepEqual(Object.values(groups), ['A', 'B', 'A', 'B', 'A', 'B']);
  assert.deepEqual(problems, []);
  await page.context().close();
});

test('Audio: alle Musikstücke und Töne sind vorhanden und abspielbar', async () => {
  const { page, problems } = await app.openApp();
  const r = await page.evaluate(async () => {
    const { MUSIC, AUDIO } = await import('/src/audio-files.js');
    const out = { music: [], sfx: [] };
    for (const [mode, list] of Object.entries(MUSIC)) for (const t of list) {
      const el = new Audio(t.src); el.preload = 'metadata';
      await new Promise((res, rej) => { el.onloadedmetadata = res; el.onerror = () => rej(new Error('Fehler ' + t.src)); });
      out.music.push({ mode, src: t.src, sec: Math.round(el.duration), gain: t.gain });
    }
    const c = new AudioContext();
    for (const [name, url] of Object.entries(AUDIO)) {
      const buf = await c.decodeAudioData(await (await fetch(url)).arrayBuffer());
      const d = buf.getChannelData(0); let peak = 0;
      for (let i = 0; i < d.length; i += 53) peak = Math.max(peak, Math.abs(d[i]));
      out.sfx.push({ name, sec: +buf.duration.toFixed(1), peak: +peak.toFixed(2) });
    }
    return out;
  });
  const want = { 'nacht-1.mp3': 137, 'nacht-2.mp3': 324, 'tag-1.mp3': 159, 'tag-2.mp3': 130 };
  assert.deepEqual(r.music.map((m) => m.src.split('/').pop()).sort(), Object.keys(want));
  for (const m of r.music) assert.ok(Math.abs(m.sec - want[m.src.split('/').pop()]) <= 2, JSON.stringify(m));
  for (const m of r.music) assert.ok(m.sec > 50 && m.gain > 0.3 && m.gain <= 1, JSON.stringify(m));
  assert.deepEqual(r.sfx.map((s) => s.name).sort(), ['bell', 'death', 'gong', 'howl', 'rooster', 'win']);
  for (const s of r.sfx) assert.ok(s.sec > 0.8 && s.sec < 15 && s.peak > 0.3 && s.peak <= 1, JSON.stringify(s));
  assert.deepEqual(problems, []);
  await page.context().close();
});

test('Installieren: Chrome-Installationsfenster, Android-Anleitung, iPad-Anleitung', async () => {
  // Chrome bietet die Installation an
  let { page, problems } = await app.openApp();
  assert.equal(await page.locator('[data-action=install]').count(), 0, 'Desktop ohne Angebot: kein Knopf');
  await page.evaluate(() => {
    const e = new Event('beforeinstallprompt');
    e.prompt = () => { window.__prompted = true; return Promise.resolve(); };
    e.userChoice = Promise.resolve({ outcome: 'accepted' });
    window.dispatchEvent(e);
  });
  await page.click('[data-action=install]');
  assert.equal(await page.evaluate(() => window.__prompted), true);
  assert.equal(await page.locator('[data-action=install]').count(), 0, 'nach dem Angebot verschwindet der Knopf');
  assert.deepEqual(problems, []);
  await page.context().close();

  // Android-Handy ohne Installationsereignis: Knopf mit Anleitung für Chrome
  const android = await app.newContext({ viewport: PHONE, userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36', hasTouch: true });
  ({ page } = await app.openApp({ context: android }));
  await page.click('[data-action=install]');
  assert.match(await page.locator('.modal').innerText(), /App installieren/);
  assert.match(await page.locator('.modal').innerText(), /Chrome/);
  await android.close();

  // iPad (meldet sich als Mac, hat aber Touch): Safari-Anleitung
  const ipad = await app.newContext({ userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15', hasTouch: true });
  await ipad.addInitScript(() => Object.defineProperty(navigator, 'maxTouchPoints', { get: () => 5 }));  // echtes iPad-Safari meldet 5
  ({ page } = await app.openApp({ context: ipad }));
  await page.click('[data-action=install]');
  assert.match(await page.locator('.modal').innerText(), /Zum Home-Bildschirm/);
  await ipad.close();
});

test('Musik: Nacht spielt, am Tag wechselt sie zur Tagmusik, danach Stille', async () => {
  const { page, problems } = await app.openApp();
  await startGame(page, { names: NAMES.slice(0, 5), counts: { wolf: 1, seer: 1, villager: 3 }, roles: ['wolf', 'seer', 'villager', 'villager', 'villager'] });
  assert.equal((await page.evaluate(() => window.__werwolf.musicState())).playing, false, 'ohne Berührung bleibt es still');
  await page.locator('.tok').first().click();
  await page.waitForFunction(() => { const s = window.__werwolf.musicState(); return s.mode === 'night' && s.streams >= 1; }, null, { timeout: 20000 });
  const t1 = await page.evaluate(() => window.__werwolf.musicState());
  assert.equal(t1.context, 'running');
  assert.match(t1.track, /nacht-\d/);
  await page.waitForTimeout(1500);
  const t2 = await page.evaluate(() => window.__werwolf.musicState());
  assert.ok(Math.max(...t2.time) > Math.max(...t1.time), 'Wiedergabe schreitet voran ' + JSON.stringify([t1.time, t2.time]));
  await page.evaluate(() => { const g = window.__werwolf.S.game; g.phase = 'day'; g.clock = 'day'; g.dayMode = 'vote'; window.__werwolf.render(); });
  await page.waitForFunction(() => { const s = window.__werwolf.musicState(); return s.mode === 'day' && /tag-\d/.test(s.track ?? '') && s.streams >= 1; }, null, { timeout: 20000 });
  await page.evaluate(() => { const g = window.__werwolf.S.game; g.phase = 'ended'; g.winner = 'Das Dorf'; window.__werwolf.render(); });
  await page.waitForFunction(() => !window.__werwolf.musicState().playing);
  assert.deepEqual(problems, []);
  await page.context().close();
});

test('Offline: Audio wird aus dem Speicher stückweise (Range) geliefert und spielt', async () => {
  const context = await app.newContext();
  const { page } = await app.openApp({ url: `${app.base}?sw=1`, context });
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.reload();
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null, null, { timeout: 15000 });
  await page.waitForFunction(async () => { const keys = await caches.keys(); const c = await caches.open(keys[0]); return (await c.keys()).length > 50; }, null, { timeout: 60000 });
  await context.setOffline(true);
  const r = await page.evaluate(async () => {
    const res = await fetch('assets/audio/tag-1.mp3', { headers: { Range: 'bytes=100-199' } });
    const buf = await res.arrayBuffer();
    const el = new Audio('assets/audio/nacht-1.mp3'); el.muted = true;
    await el.play(); await new Promise((s) => setTimeout(s, 1200));
    return { status: res.status, range: res.headers.get('content-range'), len: buf.byteLength, t: el.currentTime, err: el.error?.code ?? null };
  });
  assert.equal(r.status, 206);
  assert.match(r.range, /^bytes 100-199\/\d+$/);
  assert.equal(r.len, 100);
  assert.ok(r.t > 0.5 && r.err === null, JSON.stringify(r));
  await context.close();
});

test('Diagnose: Entwicklungsmodus ohne Service Worker, Speichern funktioniert', async () => {
  const { page, problems } = await app.openApp();
  await page.click('[data-action=go][data-view=settings]');
  await page.click('[data-action=open-diagnose]');
  await page.waitForSelector('.diag.ok');
  const text = await page.locator('.diag').allInnerTexts();
  assert.ok(text.some((t) => /Entwicklungsmodus/.test(t)));
  assert.ok(text.some((t) => /Speichern/.test(t) && /gespeichert werden/.test(t)));
  assert.equal(await page.locator('.diag.bad').count(), 0);
  assert.deepEqual(problems, []);
  await page.context().close();
});

test('Diagnose: nach dem ersten Besuch ist die App bereit für Offline', async () => {
  const context = await app.newContext();
  const { page } = await app.openApp({ url: `${app.base}?sw=1`, context });
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.reload();
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null, null, { timeout: 15000 });
  await page.click('[data-action=go][data-view=settings]');
  await page.click('[data-action=open-diagnose]');
  await page.waitForSelector('text=Bereit:');
  const t = (await page.locator('.diag').allInnerTexts()).join(' | ');
  const m = t.match(/Bereit: (\d+) von (\d+) Dateien/);
  assert.ok(m && m[1] === m[2], t);
  assert.match(t, /Version\s+\w{10}/);
  await context.close();
});

test('Ton: Lautstärkeregler ändert den Wert ohne neu zu zeichnen, Musikknopf schaltet um', async () => {
  const { page, problems } = await app.openApp();
  await page.click('[data-action=go][data-view=settings]');
  await page.evaluate(() => { document.getElementById('vol-range').__mark = 1; });
  await page.evaluate(() => { const r = document.getElementById('vol-range'); r.value = '30'; r.dispatchEvent(new Event('input', { bubbles: true })); });
  assert.equal(await page.evaluate(() => document.getElementById('vol-range').__mark), 1, 'Regler bleibt dasselbe Element');
  assert.equal(await page.locator('#vol-out').innerText(), '30 %');
  assert.equal(await page.evaluate(() => window.__werwolf.S.settings.volume), 0.3);
  await startGame(page, { names: NAMES.slice(0, 5), counts: { wolf: 1, seer: 1, villager: 3 }, roles: ['wolf', 'seer', 'villager', 'villager', 'villager'] });
  assert.equal(await page.evaluate(() => window.__werwolf.S.settings.music), true);
  await page.click('[data-action=toggle-music]');
  assert.equal(await page.evaluate(() => window.__werwolf.S.settings.music), false);
  await page.click('[data-action=open-menu]');
  assert.ok(await page.locator('#vol-range').isVisible(), 'Regler im Spielmenü');
  const big = await page.evaluate(() => [...document.querySelectorAll('.modal svg')].filter((s) => s.getBoundingClientRect().width > 40).length);
  assert.equal(big, 0, 'Symbole im Menü haben Normalgröße');
  assert.deepEqual(problems, []);
  await page.context().close();
});

/** Knopf vollständig im Fenster und nicht von etwas anderem verdeckt (ohne Scrollen des Fensters). */
async function reachable(page, selector, label) {
  const r = await page.evaluate((sel) => {
    const el = [...document.querySelectorAll(sel)].find((e) => e.getBoundingClientRect().width > 0);
    if (!el) return { missing: true };
    const b = el.getBoundingClientRect();
    const hit = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
    return { top: Math.round(b.top), bottom: Math.round(b.bottom), left: Math.round(b.left), right: Math.round(b.right), ih: innerHeight, iw: innerWidth, covered: !(hit && (el === hit || el.contains(hit))) };
  }, selector);
  assert.ok(!r.missing, `${label}: ${selector} fehlt`);
  assert.ok(r.top >= 0 && r.bottom <= r.ih + 1 && r.left >= 0 && r.right <= r.iw + 1, `${label}: ${selector} ragt aus dem Fenster ${JSON.stringify(r)}`);
  assert.ok(!r.covered, `${label}: ${selector} ist verdeckt ${JSON.stringify(r)}`);
}

test('Android-Fenster: untere Knöpfe sind in jeder Ansicht ohne Scrollen erreichbar', async () => {
  const sizes = [['klein 360×640', { width: 360, height: 640 }], ['Pixel 393×727', { width: 393, height: 727 }], ['quer 727×393', { width: 727, height: 393 }], ['sehr niedrig 640×360', { width: 640, height: 360 }]];
  for (const [label, viewport] of sizes) {
    const ctx = await app.newContext({ viewport, hasTouch: true, isMobile: true, userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36' });
    const { page, problems } = await app.openApp({ context: ctx });
    await reachable(page, '[data-action=new-game]', `${label} Start`);
    // Assistent
    await page.click('[data-action=new-game]');
    await page.fill('#add-inp', 'Anna, Ben, Carla, David, Eva, Felix, Greta, Hans, Ida, Jan, Kim, Leo'); await page.press('#add-inp', 'Enter');
    for (const step of [0, 1, 2, 3]) {
      await reachable(page, '.foot .btn.primary', `${label} Assistent ${step + 1}`);
      if (step < 3) await page.click('[data-action=wiz-next]');
    }
    await page.click('[data-action=start-game]');
    // Nacht, Kartenmodus
    await reachable(page, '[data-action=step-next]', `${label} Nacht`);
    await reachable(page, '[data-action=step-prev]', `${label} Nacht zurück`);
    // Tag, Abstimmung
    await page.evaluate(() => { const w = window.__werwolf, g = w.S.game; g.phase = 'day'; g.clock = 'day'; g.day = 1; g.dayMode = 'vote'; g.draft.vote = 'p2'; g.lastDeaths = ['p3']; g.dead.p3 = { cause: 'wolves', at: 'Nacht 1' }; g.morning = ['Der Bär brummt laut!']; w.render(); });
    await reachable(page, '[data-action=day-execute]', `${label} Tag Hinrichten`);
    await reachable(page, '[data-action=day-tie]', `${label} Tag Gleichstand`);
    await reachable(page, '[data-action=day-none]', `${label} Tag Niemand`);
    // Hauptmannswahl
    await page.evaluate(() => { const w = window.__werwolf; w.S.game.dayMode = 'captain'; w.render(); });
    await reachable(page, '[data-action=skip-captain]', `${label} Hauptmann`);
    // Abfragen
    for (const it of [{ type: 'hunter', id: 'p2' }, { type: 'scapegoat', id: 'p2', picks: [], forDay: 2 }, { type: 'maid', id: 'p2', victim: 'p3' }]) {
      await page.evaluate((it) => { const w = window.__werwolf, g = w.S.game; g.phase = 'interrupt'; g.interrupts = [it]; w.render(); }, it);
      await reachable(page, '.side-foot .btn.primary', `${label} Abfrage ${it.type}`);
    }
    // Dialoge: Schließen klebt unten
    await page.evaluate(() => { const w = window.__werwolf; w.S.game.interrupts = []; w.S.game.phase = 'day'; w.ui.modal = { type: 'menu' }; w.render(); });
    await reachable(page, '.modal .mfoot .btn', `${label} Menü schließen`);
    await page.evaluate(() => { const w = window.__werwolf; w.ui.modal = { type: 'who' }; w.render(); });
    await reachable(page, '.modal .mfoot .btn', `${label} Wer ist wer schließen`);
    assert.deepEqual(problems, [], label);
    await ctx.close();
  }
});

test('Musik: am Ende eines Stücks folgt das nächste mit Überblendung', async () => {
  const { page, problems } = await app.openApp();
  await startGame(page, { names: NAMES.slice(0, 5), counts: { wolf: 1, seer: 1, villager: 3 }, roles: ['wolf', 'seer', 'villager', 'villager', 'villager'] });
  await page.locator('.tok').first().click();
  await page.waitForFunction(() => window.__werwolf.musicState().streams >= 1, null, { timeout: 20000 });
  const first = (await page.evaluate(() => window.__werwolf.musicState())).track;
  await page.waitForTimeout(800);
  await page.evaluate(() => window.__werwolf.debugSeekNearEnd(6));
  await page.waitForFunction((f) => { const s = window.__werwolf.musicState(); return s.track && s.track !== f; }, first, { timeout: 25000 });
  await page.waitForTimeout(1500);
  const st = await page.evaluate(() => window.__werwolf.musicState());
  assert.notEqual(st.track, first);
  assert.ok(st.streams >= 1 && st.streams <= 2, JSON.stringify(st));
  assert.deepEqual(problems, []);
  await page.context().close();
});

test('Töne: Wolfsheulen beim Erwachen der Werwölfe und aller besonderen Wölfe', async () => {
  const { page, problems } = await app.openApp();
  await startGame(page, { names: NAMES.slice(0, 7), counts: { wolf: 1, urwolf: 1, bigwolf: 1, seer: 1, villager: 3 }, roles: ['wolf', 'urwolf', 'bigwolf', 'seer', 'villager', 'villager', 'villager'] });
  const howls = () => page.evaluate(() => window.__werwolf.sfxLog.filter((n) => n === 'howl').length);
  const label = () => page.locator('.rolebox h2').innerText();
  assert.equal(await label(), 'Seherin');
  const before = await howls();
  await page.click('[data-action=step-next]');                   // Werwolf
  assert.equal(await label(), 'Werwolf');
  assert.equal(await howls(), before + 1, 'beim Erwachen der Werwölfe');
  await page.click('[data-action=step-next]');                   // Urwolf
  assert.equal(await label(), 'Urwolf');
  const atUrwolf = await howls();
  assert.ok(atUrwolf >= before + 2, 'beim Erwachen des Urwolfs');
  await page.click('[data-action=step-next]');                   // Großer böser Wolf
  assert.equal(await label(), 'Großer böser Wolf');
  assert.ok((await howls()) >= atUrwolf + 1, 'beim Erwachen des Großen bösen Wolfs');
  await page.click('[data-action=step-prev]'); await page.click('[data-action=step-prev]'); await page.click('[data-action=step-prev]');
  assert.equal(await label(), 'Seherin');
  const quiet = await howls();
  await page.click('[data-action=step-next]');
  assert.equal(await howls(), quiet + 1);
  assert.deepEqual(problems, []);
  await page.context().close();
});

test('Hexe: beide Trankknöpfe sind ohne Scrollen sichtbar', async () => {
  for (const [label, viewport] of [['klein 360×640', { width: 360, height: 640 }], ['Pixel 393×727', { width: 393, height: 727 }], ['quer 727×393', { width: 727, height: 393 }], ['iPad 1180×820', { width: 1180, height: 820 }]]) {
    const ctx = await app.newContext({ viewport, hasTouch: true });
    const { page, problems } = await app.openApp({ context: ctx });
    await startGame(page, { names: NAMES, counts: { wolf: 2, witch: 1, seer: 1, hunter: 1, villager: 3 }, roles: ['wolf', 'wolf', 'witch', 'seer', 'hunter', 'villager', 'villager', 'villager'] });
    await page.evaluate(() => { const w = window.__werwolf, g = w.S.game; g.stepIdx = 2; g.draft.kill = 'p6'; w.render(); });
    assert.match(await page.locator('.rolebox h2').innerText(), /Hexe/);
    await reachable(page, '[data-action=witch-heal]', `${label} Heiltrank`);
    await reachable(page, '[data-action=witch-poison]', `${label} Gifttrank`);
    await reachable(page, '[data-action=step-next]', `${label} Weiter`);
    assert.deepEqual(problems, [], label);
    await ctx.close();
  }
});

test('Seherin sieht nur Werwolf: kommt nach den Wölfen, Antwort lautet Werwolf oder Kein Werwolf', async () => {
  const { page, problems } = await app.openApp();
  await startGame(page, { names: NAMES.slice(0, 6), counts: { wolf: 1, seer: 1, villager: 4 }, rules: { seerSees: 'camp' }, roles: ['wolf', 'seer', 'villager', 'villager', 'villager', 'villager'] });
  const labels = await page.locator('.sdot').allInnerTexts();
  assert.deepEqual(labels.map((l) => l.trim()), ['Werwolf', 'Seherin']);
  await page.click('[data-action=step-next]');
  await tapName(page, 'Anna');
  assert.match(await page.locator('.task .prompt').innerText(), /Anna: Werwolf$/);
  await tapName(page, 'Carla');
  assert.match(await page.locator('.task .prompt').innerText(), /Carla: Kein Werwolf$/);
  assert.deepEqual(problems, []);
  await page.context().close();
});

test('Abstimmung: Stimmen zählen, Hauptmann doppelt, Gleichstand, Hinrichten', async () => {
  const { page, problems } = await app.openApp();
  await startGame(page, { names: NAMES.slice(0, 7), counts: { wolf: 2, villager: 5 }, roles: ['wolf', 'wolf', 'villager', 'villager', 'villager', 'villager', 'villager'], rules: { captain: true } });
  await page.evaluate(() => { const w = window.__werwolf, g = w.S.game; g.phase = 'day'; g.clock = 'day'; g.day = 1; g.dayMode = 'vote'; g.captain = 'p7'; g.lastDeaths = []; w.render(); });
  assert.equal(await page.locator('.scorebar .sc.w b').innerText(), '2');
  assert.equal(await page.locator('.scorebar .sc.v b').innerText(), '5');
  await tapName(page, 'Carla'); await tapName(page, 'Carla'); await tapName(page, 'David'); await tapName(page, 'David');
  assert.equal(await page.locator('.vres').innerText(), 'Gleichstand: Carla und David mit je 2.');
  assert.ok(await page.locator('[data-action=day-execute]').isDisabled(), 'bei Gleichstand nicht hinrichtbar');
  assert.match(await page.locator('[data-action=day-tie]').getAttribute('class'), /\bon\b/);
  await page.click('[data-action=vote-cap-arm]');
  await tapName(page, 'David');                                   // Hauptmann wählt David: zählt doppelt
  assert.equal(await page.locator('.tok:visible[aria-label="David"] .bdg.cnt').first().innerText(), '4');
  assert.match(await page.locator('.vres').innerText(), /Vorn: David mit 4 Stimmen/);
  await page.click('[data-action=vote-undo]');
  assert.equal(await page.evaluate(() => window.__werwolf.S.game.draft.capVote), null);
  await page.click('[data-action=vote-reset]');
  assert.equal(await page.locator('.vrow').count(), 0);
  await tapName(page, 'Ben'); await tapName(page, 'Ben'); await tapName(page, 'Anna');
  await page.click('[data-action=day-execute]');
  assert.equal(await page.evaluate(() => !!window.__werwolf.S.game.dead.p2), true, 'Ben wurde hingerichtet');
  assert.match(await page.locator('.bar h1').innerText(), /Nacht 2/);
  assert.deepEqual(problems, []);
  await page.context().close();
});

test('Hauptmannswahl per Zähler am Handy', async () => {
  const ctx = await app.newContext({ viewport: { width: 360, height: 640 }, hasTouch: true });
  const { page, problems } = await app.openApp({ context: ctx });
  await startGame(page, { names: NAMES.slice(0, 6), counts: { wolf: 1, villager: 5 }, roles: ['wolf', 'villager', 'villager', 'villager', 'villager', 'villager'] });
  await page.evaluate(() => { const w = window.__werwolf, g = w.S.game; g.phase = 'day'; g.clock = 'day'; g.day = 1; g.dayMode = 'captain'; w.render(); });
  await reachable(page, '[data-action=captain-confirm]', 'Hauptmann ernennen');
  assert.ok(await page.locator('[data-action=captain-confirm]').isDisabled());
  await tapName(page, 'Carla'); await tapName(page, 'Carla'); await tapName(page, 'Ben');
  await page.click('[data-action=captain-confirm]');
  assert.equal(await page.evaluate(() => window.__werwolf.S.game.captain), 'p3');
  assert.deepEqual(problems, []);
  await ctx.close();
});

test('Seherin sieht bei einem Infizierten nur die Karte, bei „Werwolf oder nicht“ aber Werwolf', async () => {
  for (const [seerSees, expected] of [['role', /Carla: Dorfbewohner \(Karte; infiziert/], ['camp', /Carla: Werwolf$/]]) {
    const { page, problems } = await app.openApp();
    await startGame(page, { names: NAMES.slice(0, 6), counts: { wolf: 1, seer: 1, villager: 4 }, rules: { seerSees }, roles: ['wolf', 'seer', 'villager', 'villager', 'villager', 'villager'] });
    await page.evaluate(() => { const w = window.__werwolf; w.S.game.turned.p3 = true; w.render(); });
    if (seerSees === 'camp') await page.click('[data-action=step-next]');
    assert.match(await page.locator('.rolebox h2').innerText(), /Seherin/);
    await tapName(page, 'Carla');
    const text = await page.locator('.task .prompt').innerText();
    assert.match(text, expected);
    assert.deepEqual(problems, []);
    await page.context().close();
  }
});

test('Sichtbare Höhe: App nimmt das kleinste Höhenmaß, Optionen ohne Abstandsregler', async () => {
  const ctx = await app.newContext({ viewport: { width: 393, height: 727 }, hasTouch: true });
  const { page, problems } = await app.openApp({ context: ctx });
  const h = () => page.evaluate(() => Math.round(document.getElementById('app').getBoundingClientRect().height));
  assert.equal(await h(), 727);
  // Der Browser meldet 100dvh größer als die wirklich sichtbare Höhe: die App folgt dem kleineren Maß
  await page.evaluate(async () => {
    Object.defineProperty(window, 'innerHeight', { get: () => 650, configurable: true });
    const { fitViewport } = await import('/src/viewport.js');
    fitViewport();
  });
  assert.equal(await h(), 650);
  await page.evaluate(async () => { Object.defineProperty(window, 'innerHeight', { get: () => 727, configurable: true }); const { fitViewport } = await import('/src/viewport.js'); fitViewport(); });
  await page.click('[data-action=go][data-view=settings]');
  await page.waitForTimeout(450);   // Einblend-Animation abwarten
  assert.equal(await page.locator('.ruler, #pad-range').count(), 0, 'kein gelber Streifen, kein Abstandsregler');
  assert.deepEqual(problems, []);
  await ctx.close();
});

test('Handy hochkant: Nachtansicht mit 5, 12 und 20 Spielern ist vollständig sichtbar, Rollenreihe wird nicht gequetscht', async () => {
  const sizes = [['384×777', { width: 384, height: 777 }], ['412×890', { width: 412, height: 890 }], ['360×800', { width: 360, height: 800 }], ['393×727', { width: 393, height: 727 }]];
  for (const [label, viewport] of sizes) {
    const ctx = await app.newContext({ viewport, hasTouch: true, isMobile: true, userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36' });
    const { page, problems } = await app.openApp({ context: ctx });
    for (const n of [5, 12, 20]) {
      const wolves = n >= 12 ? 3 : 1;
      const roles = ['wolf', 'seer', ...(n >= 12 ? ['wolf', 'wolf', 'witch', 'hunter'] : [])];
      const rest = n - roles.length;
      const all = [...roles, ...Array(rest).fill('villager')];
      const counts = {}; for (const r of all) counts[r] = (counts[r] ?? 0) + 1;
      await startGame(page, { names: Array.from({ length: n }, (_, i) => 'Spieler' + (i + 1)), counts, roles: all });
      for (const idx of [0, 1]) {
        await page.evaluate((i) => { const w = window.__werwolf; w.S.game.stepIdx = i; w.render(); }, idx);
        await page.waitForTimeout(350);   // Einblend-Animation abwarten
        const tag = `${label} ${n} Spieler Schritt ${idx} (${wolves} Wölfe)`;
        await reachable(page, '.stepstrip .sdot.cur', tag + ' Rollenreihe');
        await reachable(page, '.rolebox', tag + ' Rollenkarte');
        await reachable(page, '[data-action=step-next]', tag + ' Weiter');
        const hs = await page.evaluate(() => ({ chip: Math.round(document.querySelector('.sdot').getBoundingClientRect().height), strip: Math.round(document.querySelector('.stepstrip').getBoundingClientRect().height) }));
        assert.ok(hs.chip >= 30 && hs.strip >= 30, `${tag}: Rollenreihe gequetscht ${JSON.stringify(hs)}`);
      }
      if (n === 12 && label === '384×777') {
        // Anzeige meldet mehr Höhe als sichtbar: App folgt dem kleineren Maß, alles bleibt im Fenster
        await page.evaluate(async () => { Object.defineProperty(window, 'innerHeight', { get: () => 700, configurable: true }); const { fitViewport } = await import('/src/viewport.js'); fitViewport(); });
        await page.waitForTimeout(100);
        await reachable(page, '[data-action=step-next]', label + ' bei 700 Höhe Weiter');
        await reachable(page, '.stepstrip .sdot.cur', label + ' bei 700 Höhe Rollenreihe');
        await page.evaluate(async () => { Object.defineProperty(window, 'innerHeight', { get: () => 777, configurable: true }); const { fitViewport } = await import('/src/viewport.js'); fitViewport(); });
      }
    }
    assert.deepEqual(problems, [], label);
    await ctx.close();
  }
});

const centerOf = async (loc) => { const b = await loc.boundingBox(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; };
const seatNames = (page) => page.locator('.st .nm').allInnerTexts();

test('Sitzordnung: Plätze per Ziehen und per Antippen tauschen, Kreis-Vorschau', async () => {
  const { page, problems } = await app.openApp();
  await page.click('[data-action=new-game]');
  await page.fill('#add-inp', 'Anna, Ben, Carla, David, Eva, Felix'); await page.press('#add-inp', 'Enter');
  await page.click('[data-action=seat-tab][data-v=order]');
  await page.waitForSelector('.st');
  assert.deepEqual(await seatNames(page), ['Anna', 'Ben', 'Carla', 'David', 'Eva', 'Felix']);
  // Ziehen: Platz 1 auf Platz 3
  const a = await centerOf(page.locator('.st').nth(0)), c = await centerOf(page.locator('.st').nth(2));
  await page.mouse.move(a.x, a.y); await page.mouse.down();
  await page.mouse.move((a.x + c.x) / 2, (a.y + c.y) / 2, { steps: 4 }); await page.mouse.move(c.x, c.y, { steps: 6 });
  assert.ok(await page.locator('.st.over').count() >= 1, 'Ziel wird hervorgehoben');
  assert.equal(await page.locator('.st.ghost').count(), 1, 'Geisterbild folgt dem Zeiger');
  await page.mouse.up();
  assert.deepEqual(await seatNames(page), ['Carla', 'Ben', 'Anna', 'David', 'Eva', 'Felix']);
  assert.equal(await page.locator('.st.ghost').count(), 0);
  // Tippen: Platz 2 und Platz 4 tauschen
  await page.locator('.st').nth(1).click();
  assert.ok(await page.locator('.st.sel').count() === 1);
  await page.locator('.st').nth(3).click();
  assert.deepEqual(await seatNames(page), ['Carla', 'David', 'Anna', 'Ben', 'Eva', 'Felix']);
  // Die Reihenfolge gilt im Spiel
  const order = await page.evaluate(() => window.__werwolf.S.setup.order.map((id) => window.__werwolf.S.groups[0].members.find((m) => m.id === id).name));
  assert.deepEqual(order.slice(0, 4), ['Carla', 'David', 'Anna', 'Ben']);
  assert.deepEqual(problems, []);
  await page.context().close();
});

test('Sperre: PIN festlegen, sperren, falsche PIN, Neuladen bleibt gesperrt, entsperren', async () => {
  const { page, problems } = await app.openApp();
  const pin = async (digits) => { for (const d of digits) await page.click(`.pin-pad [data-d="${d}"]`); };
  await page.click('[data-action=go][data-view=settings]');
  await page.click('[data-action=pin-set]');
  await pin('1234'); await pin('1234');
  assert.equal(await page.evaluate(() => window.__werwolf.S.settings.lockPin), '1234');
  await page.click('[data-action=go]', { force: true }).catch(() => {});
  await startGame(page, { names: NAMES.slice(0, 6), counts: { wolf: 1, seer: 1, villager: 4 }, roles: ['wolf', 'seer', 'villager', 'villager', 'villager', 'villager'] });
  await page.click('[data-action=open-menu]');
  await page.click('[data-action=lock-now]');
  await page.waitForSelector('.lock');
  const shown = await page.locator('#app').innerText();
  assert.ok(!/Anna|Ben|Seherin|Werwolf/.test(shown), 'gesperrt zeigt keine Namen oder Rollen');
  await pin('0000');
  assert.match(await page.locator('.pin-msg').innerText(), /Falsche PIN/);
  assert.equal(await page.locator('.lock').count(), 1);
  await page.reload();
  await page.waitForSelector('.lock');
  await pin('1234');
  await page.waitForSelector('.game, .home');
  assert.equal(await page.locator('.lock').count(), 0);
  assert.equal(await page.evaluate(() => window.__werwolf.S.locked), false);
  // PIN entfernen
  await page.evaluate(() => { window.__werwolf.ui.view = 'settings'; window.__werwolf.render(); });
  await page.click('[data-action=pin-remove]');
  assert.equal(await page.evaluate(() => window.__werwolf.S.settings.lockPin), null);
  assert.deepEqual(problems, []);
  await page.context().close();
});

test('Sperre: zu viele Fehlversuche sperren kurz, PIN vergessen braucht Wartezeit', async () => {
  const { page, problems } = await app.openApp();
  await page.evaluate(() => { const w = window.__werwolf; w.S.settings.lockPin = '4321'; w.S.locked = true; w.render(); });
  const pin = async (digits) => { for (const d of digits) await page.click(`.pin-pad [data-d="${d}"]`); };
  for (let i = 0; i < 5; i++) await pin('0000');
  assert.match(await page.locator('.pin-msg').innerText(), /Zu viele Versuche/);
  await pin('4321');
  assert.equal(await page.evaluate(() => window.__werwolf.S.locked), true, 'während der Sperrzeit wirkt auch die richtige PIN nicht');
  await page.click('[data-action=pin-forgot]');
  assert.ok(await page.locator('[data-action=pin-forgot-do]').isDisabled());
  assert.deepEqual(problems, []);
  await page.context().close();
});

test('Spielstände: pausieren, fortsetzen, löschen, neues Spiel mit laufendem Spiel', async () => {
  const { page, problems } = await app.openApp();
  await startGame(page, { names: NAMES.slice(0, 6), counts: { wolf: 1, seer: 1, villager: 4 }, roles: ['wolf', 'seer', 'villager', 'villager', 'villager', 'villager'] });
  await tapName(page, 'Carla');
  await page.click('[data-action=open-menu]');
  await page.click('[data-action=pause-game]');
  await page.waitForSelector('.save');
  assert.equal(await page.evaluate(() => window.__werwolf.S.game), null);
  assert.equal(await page.locator('.save').count(), 1);
  assert.match(await page.locator('.save').innerText(), /Nacht 1/);
  await page.click('[data-action=save-resume]');
  await page.waitForSelector('.game');
  assert.equal(await page.locator('.save').count(), 0);
  assert.equal(await page.evaluate(() => window.__werwolf.S.game.cfg.players.length), 6);
  // Neues Spiel, während eins läuft: Auswahl, pausieren
  await page.click('[data-action=back-home]');
  await page.click('[data-action=new-game]');
  assert.match(await page.locator('.modal').innerText(), /Es läuft noch ein Spiel/);
  await page.click('[data-action=new-pause]');
  await page.waitForSelector('.steps');
  assert.equal(await page.evaluate(() => window.__werwolf.S.saves.length), 1);
  // Zurück zur Startseite und löschen
  await page.click('[data-action=back-home]');
  await page.click('[data-action=save-delete]');
  await page.click('[data-action=confirm-yes]');
  assert.equal(await page.evaluate(() => window.__werwolf.S.saves.length), 0);
  assert.deepEqual(problems, []);
  await page.context().close();
});

test('Spielerblatt: langes Tippen öffnet es, ohne den Stein zu wählen', async () => {
  const { page, problems } = await app.openApp();
  await startGame(page, { names: NAMES.slice(0, 6), counts: { wolf: 1, seer: 1, villager: 4 }, roles: ['wolf', 'seer', 'villager', 'villager', 'villager', 'villager'] });
  const c = await centerOf(page.locator('.table .tok:visible[aria-label="Carla"]').first());
  await page.mouse.move(c.x, c.y); await page.mouse.down();
  await page.waitForTimeout(800);
  await page.mouse.up();
  await page.waitForSelector('.modal h2');
  assert.equal(await page.locator('.modal h2').first().innerText(), 'Carla');
  assert.equal(await page.evaluate(() => window.__werwolf.S.game.draft.check), null, 'nichts wurde angetippt');
  await page.waitForTimeout(800);
  assert.equal(await page.locator('.modal').count(), 1, 'Blatt bleibt nach dem Loslassen offen');
  assert.deepEqual(problems, []);
  await page.context().close();
});

test('Protokoll: als Datei speichern enthält Spieler, Rollen und Verlauf', async () => {
  const { page, problems } = await app.openApp();
  await startGame(page, { names: NAMES.slice(0, 6), counts: { wolf: 1, seer: 1, villager: 4 }, roles: ['wolf', 'seer', 'villager', 'villager', 'villager', 'villager'] });
  await page.click('[data-action=open-menu]');
  await page.click('[data-action=show-log-menu]');
  const [download] = await Promise.all([page.waitForEvent('download'), page.click('[data-action=log-file]')]);
  assert.match(download.suggestedFilename(), /^Werwolf-Protokoll-\d{4}-\d{2}-\d{2}\.txt$/);
  const { readFile } = await import('node:fs/promises');
  const text = await readFile(await download.path(), 'utf8');
  assert.match(text, /Werwolf-Protokoll/);
  assert.match(text, / 1\. Anna – Werwolf – lebt/);
  assert.match(text, /Spiel läuft noch \(Nacht 1\)/);
  assert.deepEqual(problems, []);
  await page.context().close();
});

test('Android-Fenster: Sperrtastatur, Dialoge und Sitzplan passen ins Fenster', async () => {
  for (const [label, viewport] of [['klein 360×640', { width: 360, height: 640 }], ['quer 727×393', { width: 727, height: 393 }]]) {
    const ctx = await app.newContext({ viewport, hasTouch: true, isMobile: true });
    const { page, problems } = await app.openApp({ context: ctx });
    await page.evaluate(() => { const w = window.__werwolf; w.S.settings.lockPin = '1234'; w.S.locked = true; w.render(); });
    await page.waitForTimeout(450);
    for (const d of ['1', '5', '9', '0']) await reachable(page, `.pin-pad [data-d="${d}"]`, `${label} Taste ${d}`);
    await reachable(page, '[data-action=pin-forgot]', `${label} PIN vergessen`);
    await page.evaluate(() => { const w = window.__werwolf; w.S.locked = false; w.S.settings.lockPin = null; w.ui.view = 'home'; w.render(); });
    await startGame(page, { names: NAMES.slice(0, 6), counts: { wolf: 1, seer: 1, villager: 4 }, roles: ['wolf', 'seer', 'villager', 'villager', 'villager', 'villager'] });
    await page.evaluate(() => { const w = window.__werwolf; w.ui.view = 'home'; w.render(); });
    await page.click('[data-action=new-game]');
    await page.waitForTimeout(300);
    await reachable(page, '[data-action=new-pause]', `${label} Pausieren`);
    await reachable(page, '[data-action=new-replace]', `${label} Verwerfen`);
    await reachable(page, '.modal [data-action=close-modal]', `${label} Abbrechen`);
    await page.click('[data-action=new-replace]');
    await page.fill('#add-inp', 'Anna, Ben, Carla, David, Eva, Felix'); await page.press('#add-inp', 'Enter');
    await page.click('[data-action=seat-tab][data-v=order]');
    await page.waitForTimeout(400);
    await inside(page, '.seatprev, .seatprev *', `${label} Sitzplan`);
    assert.deepEqual(problems, [], label);
    await ctx.close();
  }
});

test('Startseite mit Spielständen: nichts ragt aus dem Fenster, Weiter ist erreichbar', async () => {
  for (const [label, viewport] of [['Handy 393×760', { width: 393, height: 760 }], ['klein 360×640', { width: 360, height: 640 }], ['iPad 1180×820', { width: 1180, height: 820 }]]) {
    const ctx = await app.newContext({ viewport, hasTouch: true });
    const { page, problems } = await app.openApp({ context: ctx });
    await page.evaluate(async () => {
      const { createGame } = await import('/src/engine/game.js'); const w = window.__werwolf;
      const players = ['Anna', 'Ben', 'Carla', 'David', 'Eva', 'Felix', 'Greta', 'Hans'].map((n, i) => ({ id: 'p' + (i + 1), name: n }));
      const g = createGame({ players, counts: { wolf: 2, villager: 6 }, mode: 'digital' }); g.dealIdx = 8;
      w.S.saves = [{ id: 's1', at: Date.now() - 600000, game: g }, { id: 's2', at: Date.now() - 86400000, game: g }];
      w.render();
    });
    await page.waitForTimeout(450);
    await noOverflow(page, `${label} Startseite`);
    await inside(page, '.home-actions, .home-actions *', `${label} Startseite`);
    await reachable(page, '.save [data-action=save-resume]', `${label} Weiter`);
    assert.deepEqual(problems, [], label);
    await ctx.close();
  }
});

/* ---------- Neumond ---------- */

const PHONE_CTX = { viewport: { width: 393, height: 727 }, hasTouch: true, isMobile: true, userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36' };
/** Nacht ohne Oberfläche durchklicken (Weiter bis der Tag beginnt). */
const nightToDay = (page) => page.evaluate(() => { const w = window.__werwolf; for (let i = 0; i < 40 && w.S.game.phase === 'night'; i++) w.dispatch({ t: 'next' }); });
const gotoStep = async (page, key) => {
  const idx = await page.evaluate(async (key) => { const { nightSteps } = await import('/src/engine/game.js'); return nightSteps(window.__werwolf.S.game).findIndex((s) => s.key === key); }, key);
  assert.ok(idx >= 0, `Schritt ${key} fehlt`);
  await page.evaluate((i) => window.__werwolf.dispatch({ t: 'goto', idx: i }), idx);
  await page.waitForTimeout(350);
};

test('Neumond: Karten auswählen und eigene Karte anlegen, Morgen zeigt die Karte, Büttel verkündet', async () => {
  const ctx = await app.newContext(PHONE_CTX);
  const { page, problems } = await app.openApp({ context: ctx });
  // Optionen: Ereigniskarten einschalten, Karten verwalten
  await page.click('[data-action=go][data-view=settings]');
  await page.waitForTimeout(400);
  await page.click('[data-action=rule-toggle][data-key=events]');
  assert.ok(await page.locator('[data-action=cards-open]').isVisible());
  await page.click('[data-action=cards-open]');
  await reachable(page, '.modal .mfoot .btn', 'Karten schließen');
  assert.match(await page.locator('.modal').innerText(), /Nebel über Düsterwald/);
  await page.click('[data-action=card-toggle][data-id=ev-nebel]');
  assert.equal(await page.evaluate(() => !!window.__werwolf.S.settings.eventOff['ev-nebel']), true);
  await page.click('[data-action=card-beadle][data-id=ev-brunnen]');
  await page.click('[data-action=card-new]');
  await page.fill('#card-form input[name=title]', 'Eigener Test');
  await page.fill('#card-form textarea[name=text]', 'Alle klatschen einmal.');
  await page.selectOption('#card-form select[name=kind]', 'dauer');
  await page.click('#card-form button[type=submit]');
  assert.match(await page.locator('.modal').innerText(), /Eigener Test/);
  assert.equal(await page.evaluate(() => window.__werwolf.S.customCards.length), 1);
  await page.click('.modal .mfoot .btn');
  // Spiel mit diesen Karten
  const cards = await page.evaluate(async () => (await import('/src/ui/cards.js')).activeCards());
  assert.ok(!cards.some((c) => c.id === 'ev-nebel') && cards.length === 9);
  await startGame(page, { names: NAMES, counts: COUNTS8, roles: ROLES8, rules: { events: true }, eventCards: cards, beadleIds: ['ev-brunnen'] });
  await nightToDay(page);
  await page.evaluate(() => { const w = window.__werwolf; w.dispatch({ t: 'skip-captain' }); w.dispatch({ t: 'day-none' }); });
  await nightToDay(page);
  await page.waitForTimeout(350);
  assert.equal(await page.locator('.evcard').count(), 1, 'eine Karte am zweiten Morgen');
  assert.match(await page.locator('.evcard').innerText(), /ereigniskarte/i);
  // Büttel: ernennen und verkünden
  await page.click('[data-action=ev-open]');
  await reachable(page, '.modal .mfoot .btn', 'Ereignisse schließen');
  await page.click('[data-action=beadle-set][data-pid=p4]');
  assert.match(await page.locator('.modal').innerText(), /Büttel: David/);
  await page.click('[data-action=beadle-announce][data-id=ev-brunnen]');
  await page.click('.modal .mfoot .btn');
  assert.equal(await page.locator('.evcard').count(), 2, 'Karte des Büttels ist verkündet');
  assert.match(await page.locator('.evcard').nth(1).innerText(), /verfluchte Brunnen/);
  assert.deepEqual(problems, []);
  await ctx.close();
});

test('Neumond: Wahrsagerin wählt Spiritismus-Karte, Frage und Medium', async () => {
  const ctx = await app.newContext(PHONE_CTX);
  const { page, problems } = await app.openApp({ context: ctx });
  await startGame(page, { names: NAMES, counts: { wolf: 1, seer: 1, medium: 1, villager: 5 }, roles: ['wolf', 'seer', 'medium', 'villager', 'villager', 'villager', 'villager', 'villager'] });
  await nightToDay(page);
  await page.evaluate(() => { const w = window.__werwolf; w.dispatch({ t: 'skip-captain' }); w.dispatch({ t: 'day-none' }); });
  await gotoStep(page, 'medium');
  await page.click('[data-action=seance][data-v="1"]');
  assert.match(await page.locator('.task').innerText(), /Welche Spiritismus-Karte/);
  await page.click('[data-action=seance-card][data-id=sp1]');
  assert.match(await page.locator('.task').innerText(), /vier Fragen/);
  await reachable(page, '[data-action=step-next]', 'Wahrsagerin Weiter');
  await page.click('[data-action=seance-q][data-i="0"]');
  assert.match(await page.locator('.task').innerText(), /Wer wird morgen das Medium/);
  await tapName(page, 'Eva');
  assert.match(await page.locator('.task').innerText(), /Medium: Eva/);
  await reachable(page, '[data-action=step-next]', 'Wahrsagerin Weiter nach Wahl');
  assert.deepEqual(problems, []);
  await ctx.close();
});

test('Neumond: Bürgen-Abstimmung am Handy bis zum Opfer', async () => {
  const ctx = await app.newContext(PHONE_CTX);
  const { page, problems } = await app.openApp({ context: ctx });
  await startGame(page, { names: NAMES.slice(0, 5), counts: { wolf: 1, seer: 1, villager: 3 }, roles: ['wolf', 'seer', 'villager', 'villager', 'villager'], rules: { voucher: true } });
  await nightToDay(page);
  await page.evaluate(() => window.__werwolf.dispatch({ t: 'skip-captain' }));
  await page.waitForTimeout(350);
  await page.click('[data-action=vote-mode][data-mode=voucher]');
  for (const n of ['Ben', 'Carla', 'David']) await tapName(page, n);
  assert.match(await page.locator('.vres').innerText(), /3 von 4 sitzen/);
  await tapName(page, 'Eva');
  assert.match(await page.locator('.vres').innerText(), /Als Einziger steht Anna/);
  await reachable(page, '[data-action=day-execute]', 'Hinrichten (Bürgen)');
  await page.click('[data-action=day-execute]');
  assert.equal(await page.evaluate(() => window.__werwolf.S.game.winner), 'Das Dorf');
  assert.deepEqual(problems, []);
  await ctx.close();
});

test('Neumond: Betörte tragen ein Zeichen, der Morgen meldet sie nur dem Spielleiter', async () => {
  const ctx = await app.newContext(PHONE_CTX);
  const { page, problems } = await app.openApp({ context: ctx });
  await startGame(page, { names: NAMES, counts: { wolf: 1, seer: 1, villager: 6 }, roles: ['wolf', 'seer', 'villager', 'villager', 'villager', 'villager', 'villager', 'villager'], rules: { charm: true } });
  await gotoStep(page, 'wolf');
  await tapName(page, 'David');
  await nightToDay(page);
  await page.waitForTimeout(350);
  assert.match(await page.locator('.notes').innerText(), /Berühre unauffällig am Kopf: David/);
  assert.equal(await page.locator('.tok:visible[aria-label="David"] .bdg[title="Betört"]').count(), 1);
  assert.equal(await page.evaluate(() => window.__werwolf.S.game.lastDeaths.length), 0);
  assert.deepEqual(problems, []);
  await ctx.close();
});

/* ---------- Die Gemeinde ---------- */

test('Gemeinde: Regel einschalten, Gebäude wählen, beim Start verteilen, Gemeinde-Dialog am Handy', async () => {
  const ctx = await app.newContext(PHONE_CTX);
  const { page, problems } = await app.openApp({ context: ctx });
  await page.click('[data-action=go][data-view=settings]');
  await page.waitForTimeout(400);
  await page.click('[data-action=rule-toggle][data-key=town]');
  assert.ok(await page.locator('[data-action=town-farm]').first().isVisible());
  await page.click('[data-action=town-key][data-key=barber]');
  assert.equal(await page.evaluate(() => window.__werwolf.S.settings.townSel.barber), 1);
  // Spiel mit Gebäuden anlegen (wie nach dem Start-Knopf) und Zuordnung öffnen
  await startGame(page, { names: NAMES, counts: COUNTS8, roles: ROLES8, rules: { town: true } });
  await page.evaluate(async () => {
    const { townRandomMap } = await import('/src/engine/game.js');
    const w = window.__werwolf, g = w.S.game;
    g.cfg.town = { farm: 2, inn: 1, barber: 1 };
    w.dispatch({ t: 'town-map', map: townRandomMap(g) });
    w.ui.modal = { type: 'town-assign' }; w.render();
  });
  await page.waitForTimeout(350);
  assert.match(await page.locator('.modal').innerText(), /Gebäude verteilen/);
  await reachable(page, '.modal .mfoot .btn', 'Gebäude Fertig');
  await page.click('[data-action=town-clear]');
  assert.equal(await page.evaluate(() => Object.keys(window.__werwolf.S.game.town.b).length), 0);
  await page.locator('[data-action=town-cycle]').first().click();
  assert.equal(await page.evaluate(() => Object.keys(window.__werwolf.S.game.town.b).length), 1);
  await page.click('[data-action=town-random]');
  await page.click('.modal .mfoot .btn');
  assert.ok(await page.locator('.tok:visible .bdg[title]').count() >= 4, 'Gebäude-Kürzel an den Steinen');
  // Gemeinde-Dialog
  await page.evaluate(() => { const w = window.__werwolf; w.ui.modal = { type: 'town' }; w.render(); });
  await reachable(page, '.modal .mfoot .btn', 'Gemeinde schließen');
  assert.match(await page.locator('.modal').innerText(), /Die Gemeinde/);
  assert.deepEqual(problems, []);
  await ctx.close();
});

test('Gemeinde: Lehrerin und Wirt im Abstimmungsfeld, Bäcker in der Nacht', async () => {
  const ctx = await app.newContext(PHONE_CTX);
  const { page, problems } = await app.openApp({ context: ctx });
  await startGame(page, { names: NAMES, counts: { wolf: 1, seer: 1, villager: 6 }, roles: ['wolf', 'seer', 'villager', 'villager', 'villager', 'villager', 'villager', 'villager'], rules: { town: true } });
  await page.evaluate(() => { const w = window.__werwolf, g = w.S.game; g.cfg.town = { school: 1, inn: 1, bakery: 1, farm: 1 }; g.town.b = { p3: 'school', p4: 'inn', p5: 'bakery', p6: 'farm' }; w.render(); });
  await gotoStep(page, 'baker');
  assert.match(await page.locator('.rolebox h2').innerText(), /Bäcker/);
  await nightToDay(page);
  await page.evaluate(() => window.__werwolf.dispatch({ t: 'skip-captain' }));
  await page.waitForTimeout(350);
  await page.click('[data-action=ban-arm]');
  await tapName(page, 'Felix');
  assert.deepEqual(await page.evaluate(() => window.__werwolf.S.game.draft.ban), ['p6']);
  await page.click('[data-action=inn-arm]');
  await tapName(page, 'Greta');
  assert.equal(await page.evaluate(() => window.__werwolf.S.game.draft.innVote), 'p7');
  await reachable(page, '[data-action=day-execute]', 'Hinrichten (Gemeinde)');
  assert.deepEqual(problems, []);
  await ctx.close();
});

test('Mittelkarten von Dieb und Gaukler sind im Menü sichtbar, auch ohne Karten', async () => {
  const ctx = await app.newContext(PHONE_CTX);
  const { page, problems } = await app.openApp({ context: ctx });
  await startGame(page, { names: NAMES, counts: { wolf: 1, thief: 1, actor: 1, seer: 1, villager: 5 }, roles: ['wolf', 'thief', 'actor', 'seer', 'villager', 'villager', 'villager', 'villager'] });
  await page.click('[data-action=open-menu]');
  await page.click('[data-action=middle-open]');
  const txt = await page.locator('.modal').innerText();
  assert.match(txt, /Mittelkarten des Diebs/i);
  assert.match(txt, /Gaukler/i);
  await reachable(page, '.modal .mfoot .btn', 'Mitte schließen');
  assert.deepEqual(problems, []);
  await ctx.close();
});
