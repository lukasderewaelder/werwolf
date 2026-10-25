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
  await page.fill('#custom-form input[name=say]', 'Der Nachtwächter erwacht.');
  await page.click('#custom-form button[type=submit]');
  await page.click('[data-action=role-inc]');
  assert.equal(await page.locator('.sumbar .s b').first().innerText(), '6/6');
  await page.click('[data-action=wiz-next]');
  await page.click('[data-action=start-game]');
  await page.waitForSelector('.game');
  assert.ok((await page.locator('.sdot').allInnerTexts()).some((t) => /Nachtwächter/.test(t)));
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
