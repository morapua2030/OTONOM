import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { test } from 'node:test';
import {
  AC_CHANNELS, CHANNELS_PER_DEVICE, CHANNELS_PER_LINE, clampDevice, clampLines, canAddRoom, DEVK, ENGINEER_REVIEW_ABOVE, isSimDemo, MARKS,
  MAX_LINES, MAX_PER_DEVICE, MAX_ROOMS, needsLockAll, PK, PRESET_META, RORDER, routine, ROUT, SIM_DEMOS, simApply, simAt, simBest, simCh,
  simClk, simDemoState, simMk, simNames, simRec, UPSELL, type SimRoom,
} from '../src/lib/simulator/rules.ts';
import { SIMD } from '../src/lib/simulator/copy.ts';
import { buildPlan, SIM_MESSAGE_MAX } from '../src/lib/simulator/plan.ts';
import { SMART_HOME_PACKAGES } from '../src/lib/smart-home-packages.ts';
import { PRODUCTS } from '../src/lib/products.ts';

const room = (lines: number, dev: SimRoom['dev'] = {}, ac = false, type: SimRoom['type'] = 'reception', id = 1): SimRoom => ({ id, type, lines, ac, dev });
/** Rooms whose channels add up to `n` (16 lines per room at most, as in the room cards). */
const roomsFor = (n: number): SimRoom[] => { const out: SimRoom[] = []; let left = n, id = 1; while (left > 0) { const l = Math.min(16, left); out.push(room(l, {}, false, 'bed', id++)); left -= l; } return out; };
const read = (path: string) => readFileSync(new URL(`../src/${path}`, import.meta.url), 'utf8');

test('owner facts: 1 line = 1 channel, 1 device = 1 channel, AC uses no channel', () => {
  assert.equal(CHANNELS_PER_LINE, 1);
  assert.equal(CHANNELS_PER_DEVICE, 1);
  assert.equal(AC_CHANNELS, 0);
  assert.equal(simCh(room(0)), 0);
  assert.equal(simCh(room(3)), 3);
  assert.equal(simCh(room(3, {}, true)), 3, 'AC adds 0');
  for (const k of DEVK) assert.equal(simCh(room(2, { [k]: 1 })), 3, `${k} adds 1`);
  assert.equal(simCh(room(1, { heater: 2, pump: 1, fan: 1, curtain: 1, garage: 1, other: 4 })), 11);
});

test('packages are derived from the package registry (prices, capacity, 16R count, lock)', () => {
  assert.deepEqual([PK.Essential.price, PK.Essential.cap, PK.Essential.n16, PK.Essential.lock], [24000, 16, 1, false]);
  assert.deepEqual([PK.Plus.price, PK.Plus.cap, PK.Plus.n16, PK.Plus.lock], [32000, 32, 2, false]);
  assert.deepEqual([PK.Premium.price, PK.Premium.cap, PK.Premium.n16, PK.Premium.lock], [44000, 32, 2, true]);
  for (const key of ['Essential', 'Plus', 'Premium'] as const) assert.equal(PK[key].price, SMART_HOME_PACKAGES.find((p) => p.id === PK[key].id)!.priceEgp);
  assert.deepEqual(UPSELL, { toPlus: 8000, toPlusChannels: 16, toPremium: 12000 });
  const channels = Object.fromEntries(PRODUCTS.map((p) => [p.model.toUpperCase(), p.channels]));
  assert.deepEqual(channels, { '4R': 4, '6R': 6, '16R': 16 }, 'controller channels match the product registry');
});

test('recommendation: 0, exactly 16, 17, 32, 33, 40, 60 and 65 channels', () => {
  const r0 = simRec([], false);
  assert.deepEqual([r0.ch, r0.pkg, r0.extras, r0.eng, r0.ctrlTxt], [0, 'Essential', [], false, '1 × 16R']);
  const r16 = simRec(roomsFor(16), false);
  assert.deepEqual([r16.pkg, r16.over, r16.extras], ['Essential', false, []]);
  assert.equal(simRec(roomsFor(17), false).pkg, 'Plus');
  const r32 = simRec(roomsFor(32), false);
  assert.deepEqual([r32.pkg, r32.over, r32.extras, r32.ctrlTxt], ['Plus', false, [], '2 × 16R']);
  const r33 = simRec(roomsFor(33), false);
  assert.deepEqual([r33.pkg, r33.extras, r33.extrasTxt, r33.ctrlTxt, r33.extraCap], ['Plus', ['4R'], '4R', '2 × 16R + 4R', 4]);
  const r40 = simRec(roomsFor(40), false);
  assert.deepEqual([r40.pkg, r40.extras, r40.ctrlTxt], ['Plus', ['16R'], '3 × 16R']);
  const r60 = simRec(roomsFor(60), false);
  assert.deepEqual([r60.pkg, r60.extras, r60.extrasTxt, r60.ctrlTxt], ['Plus', ['16R', '16R'], '2 × 16R', '4 × 16R']);
  const r64 = simRec(roomsFor(64), false);
  assert.equal(r64.eng, false);
  const r65 = simRec(roomsFor(65), false);
  assert.deepEqual([r65.ch > ENGINEER_REVIEW_ABOVE, r65.eng, r65.extras], [true, true, []]);
});

test('simBest: fewest extra controllers, then least waste, then most 16R', () => {
  assert.deepEqual(simBest(1), ['4R']);
  assert.deepEqual(simBest(5), ['6R']);
  assert.deepEqual(simBest(10), ['16R']);
  assert.deepEqual(simBest(22), ['16R', '6R']);
  assert.deepEqual(simBest(12), ['16R']);
  assert.deepEqual(simBest(16), ['16R']);
  assert.deepEqual(simBest(20), ['16R', '4R']);
  assert.deepEqual(simBest(32), ['16R', '16R']);
  for (let left = 1; left <= 32; left++) {
    const best = simBest(left);
    const cap = best.reduce((a, m) => a + ({ '16R': 16, '6R': 6, '4R': 4 })[m], 0);
    assert.ok(cap >= left, `covers ${left}`);
  }
});

test('the smart lock means Premium, also at 16 channels or fewer', () => {
  assert.equal(simRec(roomsFor(4), true).pkg, 'Premium');
  assert.equal(simRec(roomsFor(16), true).pkg, 'Premium');
  assert.equal(simRec([], true).pkg, 'Premium');
  const r40 = simRec(roomsFor(40), true);
  assert.deepEqual([r40.pkg, r40.extras], ['Premium', ['16R']]);
  assert.ok(needsLockAll('leave') && needsLockAll('arrive'));
  assert.ok(!needsLockAll('night') && routine('night').lockStep === 2);
  assert.ok(!needsLockAll('gas') && !needsLockAll('morning'));
});

test('limits: 12 rooms, 4 per device type, lighting lines 0–16', () => {
  assert.equal(MAX_ROOMS, 12);
  assert.equal(MAX_PER_DEVICE, 4);
  assert.equal(MAX_LINES, 16);
  assert.ok(canAddRoom(new Array(11).fill(0)));
  assert.ok(!canAddRoom(new Array(12).fill(0)));
  assert.deepEqual([clampLines(-1), clampLines(0), clampLines(16), clampLines(17)], [0, 0, 16, 16]);
  assert.deepEqual([clampDevice(-1), clampDevice(4), clampDevice(5)], [0, 4, 4]);
});

test('presets, names and the 24-hour day are ported from the design', () => {
  assert.deepEqual(PRESET_META, { apt: [6, 13], duplex: [8, 19], villa: [11, 31] });
  let n = 0;
  const villa = simMk(() => ++n, 'villa');
  assert.deepEqual(villa.map((r) => r.id), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  assert.deepEqual(simNames(simMk(null, 'apt'), SIMD.ar.rooms), ['ريسبشن', 'أوضة نوم 1', 'أوضة نوم 2', 'مطبخ', 'حمام', 'طرقة']);
  assert.deepEqual(simNames(simMk(null, 'apt'), SIMD.en.rooms), ['Reception', 'Bedroom 1', 'Bedroom 2', 'Kitchen', 'Bathroom', 'Corridor']);
  assert.deepEqual(MARKS.map((m) => simClk(m.t)), ['7:00', '8:30', '18:00', '21:00', '23:30']);
  assert.equal(RORDER.length, 9);
  let k = 0;
  const rooms = simMk(() => ++k, 'apt');
  const at19 = simAt(19, rooms, false);
  assert.equal(at19.night, true);
  assert.equal(at19.door, false, 'leave/arrive need Premium');
  assert.equal(simAt(19, rooms, true).on['1:l'], true, 'arrive lights the reception with Premium');
  const gas = ROUT.gas.steps.reduce((st, ops) => simApply(st, rooms, ops), { on: {}, door: false, night: false, gas: false });
  assert.equal(gas.gas, true);
  assert.equal(gas.on['4:fan0'], true, 'extractor fan on');
  assert.equal(gas.on['4:l'], true, 'kitchen light on');
});

test('?demo= accepts only the design values; unknown values are ignored', () => {
  assert.deepEqual([...SIM_DEMOS], ['fresh', 'apartment', 'night', 'routine', 'gas', 'day', 'over', 'plan']);
  for (const d of SIM_DEMOS) assert.ok(isSimDemo(d));
  for (const bad of ['', 'NIGHT', 'night ', '<script>', 'plan;', '__proto__', 'constructor', null, undefined, 1, ['night']]) assert.equal(isSimDemo(bad), false, String(bad));
  let n = 0;
  assert.equal(simDemoState('fresh', () => ++n), null);
  const night = simDemoState('night', () => ++n)!;
  assert.deepEqual([night.state.home, night.state.night, night.state.bubble, night.target], ['apt', true, 0, 's3']);
  const over = simDemoState('over', () => ++n)!;
  assert.deepEqual([over.state.home, over.state.rooms.length, over.target, simRec(over.state.rooms, false).extrasTxt], ['villa', 12, 's2', '6R']);
  const gas = simDemoState('gas', () => ++n)!;
  assert.deepEqual([gas.state.gas, gas.state.play, gas.state.step], [true, 'gas', 4]);
  const day = simDemoState('day', () => ++n)!;
  assert.deepEqual([day.state.t, day.state.dayMode, day.state.night], [19, true, true]);
  assert.deepEqual(simDemoState('plan', () => ++n)!.state.liked, ['morning', 'gas']);
  assert.equal(simDemoState('plan', () => ++n)!.target, 's4');
});

test('copy: upsell and lock lines derive from the prices and match the design wording', () => {
  assert.equal(SIMD.ar.up.Essential, 'بـ8,000 ج.م زيادة تاخد Plus: 16 قناة زيادة.');
  assert.equal(SIMD.ar.up.Plus, 'بـ12,000 ج.م زيادة تاخد Premium: القفل الذكي وروتينات الدخول والخروج.');
  assert.equal(SIMD.en.up.Essential, '8,000 EGP more gets you Plus: 16 more channels.');
  assert.equal(SIMD.en.up.Plus, '12,000 EGP more gets you Premium: the smart lock and arrive/leave routines.');
  assert.equal(SIMD.ar.lockUp, 'الروتين ده محتاج القفل الذكي، وهو موجود في باقة Premium (44,000 ج.م).');
  assert.equal(SIMD.en.lockUp, 'This routine needs the smart lock, which comes with the Premium package (44,000 EGP).');
  assert.equal(SIMD.ar.ui.demoOnly, 'ده عرض توضيحي، مش متوصل بأجهزة حقيقية.');
  assert.equal(SIMD.ar.ui.routinesSub, 'أمثلة لروتينات بيظبطها فريقنا معاك');
  assert.equal(SIMD.ar.eng, 'مشروعك محتاج مراجعة مهندس');
  assert.equal(SIMD.ar.routines.gas.a.slice(0, 2).join(' + '), 'إنذار عالي + إشعار على الموبايل');
  for (const locale of ['ar', 'en'] as const) for (const id of RORDER) assert.equal(SIMD[locale].routines[id].a.length, ROUT[id].steps.length, `${locale} ${id} steps`);
});

test('plan message: AR and EN, at most 900 characters, rooms list dropped when too long, engineer-review variant', () => {
  let n = 0;
  const apt = simMk(() => ++n, 'apt');
  const ar = buildPlan('ar', { home: 'apt', rooms: apt, lock: false, liked: ['gas', 'morning'] });
  assert.equal(ar.msg, 'أهلًا OTONOM، عملت خطة لشقة: 6 أوض، 13 قناة، الباقة المقترحة Essential. الأوض: ريسبشن (3 خطوط نور، تكييف)، أوضة نوم 1 (خطين نور، تكييف)، أوضة نوم 2 (خطين نور، تكييف)، مطبخ (خطين نور، شفاط)، حمام (خط نور، سخان)، طرقة (خط نور). الروتينات اللي عجبتني: صباح الخير، أمان الغاز. عايز أحجز زيارة.');
  const en = buildPlan('en', { home: 'apt', rooms: apt, lock: false, liked: [] });
  assert.equal(en.msg, 'Hi OTONOM, I made a plan for an apartment: 6 rooms, 13 channels, recommended package Essential. Rooms: Reception (3 lights, AC), Bedroom 1 (2 lights, AC), Bedroom 2 (2 lights, AC), Kitchen (2 lights, Extractor fan), Bathroom (1 light, Heater), Corridor (1 light). I’d like to book a visit.');
  // 12 rooms × 5 channels = 60 (no engineer review), but the full message with every room passes 900 characters.
  const twelve: SimRoom[] = Array.from({ length: 12 }, (_, i) => ({ id: i + 1, type: 'kids', lines: 1, ac: true, dev: { heater: 1, pump: 1, fan: 1, curtain: 1 } }));
  // 13+ rooms are not possible in the UI; 11 kids' rooms with 6 channels each are 66 > 64 → engineer review.
  const over: SimRoom[] = Array.from({ length: 11 }, (_, i) => ({ id: i + 1, type: 'kids', lines: 2, ac: false, dev: { heater: 1, pump: 1, fan: 1, curtain: 1 } }));
  for (const locale of ['ar', 'en'] as const) {
    const roomsMarker = locale === 'ar' ? ' الأوض: ' : ' Rooms: ';
    const long = buildPlan(locale, { home: 'villa', rooms: twelve, lock: false, liked: [...RORDER] });
    assert.deepEqual([long.rc.ch, long.rc.eng, long.rc.extrasTxt], [60, false, '2 × 16R']);
    assert.ok(long.msg.length <= SIM_MESSAGE_MAX, `${locale} ${long.msg.length}`);
    assert.ok(!long.msg.includes(roomsMarker), 'fallback drops the rooms list');
    assert.ok(long.msg.includes(SIMD[locale].routines.gas.t) && long.msg.includes('Plus'), 'fallback keeps the package and the liked routines');
    const withRooms = buildPlan(locale, { home: 'villa', rooms: twelve.slice(0, 4), lock: false, liked: [] });
    assert.ok(withRooms.msg.includes(roomsMarker) && withRooms.msg.length <= SIM_MESSAGE_MAX);
    const eng = buildPlan(locale, { home: 'villa', rooms: over, lock: false, liked: ['gas'] });
    assert.deepEqual([eng.rc.ch, eng.rc.eng], [66, true]);
    assert.equal(eng.msg, locale === 'ar'
      ? 'أهلًا OTONOM، عملت خطة لفيلا: 11 أوضة، 66 قناة، ومشروعي محتاج مراجعة مهندس. عايز أحجز زيارة.'
      : 'Hi OTONOM, I made a plan for a villa: 11 rooms, 66 channels, and my project needs an engineer review. I’d like to book a visit.');
  }
  const none = buildPlan('ar', { home: null, rooms: [], lock: false, liked: [] });
  assert.equal(none.msg, 'أهلًا OTONOM، عايز أحجز زيارة.');
});

test('plan text for "Copy plan" lists the rooms and the estimate line', () => {
  let n = 0;
  const plan = buildPlan('en', { home: 'villa', rooms: simMk(() => ++n, 'villa'), lock: false, liked: ['night'] });
  assert.match(plan.text, /^My OTONOM smart home plan\nHome type: Villa\nRooms \(11\):\n- Reception: 5 lights, AC, Curtain ×2/);
  assert.match(plan.text, /Controllers: 2 × 16R\nRecommended package: Plus \(32,000 EGP\)\nRoutines I liked: Good night\nThis is an initial estimate\./);
});

test('simulator code has no form, text input, network, storage, cookies or analytics, and loads only on /try', () => {
  const files = ['components/simulator/Simulator.tsx', 'components/simulator/icons.tsx', 'lib/simulator/rules.ts', 'lib/simulator/copy.ts', 'lib/simulator/plan.ts', 'app/(site)/[locale]/try/page.tsx'];
  for (const file of files) {
    const src = read(file);
    assert.doesNotMatch(src, /<form|<textarea|<select|type="(text|number|email|tel|search)"/, `${file}: form or text input`);
    assert.doesNotMatch(src, /\bfetch\(|XMLHttpRequest|WebSocket|EventSource|sendBeacon|localStorage|sessionStorage|indexedDB|document\.cookie|gtag|dataLayer|analytics/i, `${file}: network, storage or analytics`);
  }
  const ui = read('components/simulator/Simulator.tsx');
  assert.equal((ui.match(/<input /g) ?? []).length, 1, 'only the time-of-day range');
  assert.match(ui, /<input type="range"/);
  assert.match(ui, /\{\.\.\.EXTERNAL_LINK\}/);
  const importers = (dir: string): string[] => readdirSync(new URL(`../src/${dir}`, import.meta.url), { recursive: true, withFileTypes: true })
    .filter((e) => e.isFile() && /\.tsx?$/.test(e.name))
    .map((e) => `${(e.parentPath ?? (e as unknown as { path: string }).path).replace(/\\/g, '/').replace(/^.*\/src\//, '')}/${e.name}`)
    .filter((path) => read(path).includes('simulator/Simulator'));
  assert.deepEqual([...importers('app'), ...importers('components')], ['app/(site)/[locale]/try/page.tsx']);
  const css = read('components/simulator/simulator.css');
  assert.match(css, /prefers-reduced-motion: reduce\)\s*\{\s*\.sim, \.sim \*, \.sim \*::before, \.sim \*::after \{ animation: none !important; transition: none !important;/);
  for (const colour of ['#fff1cf', '#ffe3a3', '#ffd98a', '#ffc08a', '#1b3350', '#c62828', '#fde2e2']) assert.ok(css.includes(colour), colour);
});
