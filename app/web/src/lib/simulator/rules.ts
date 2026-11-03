/**
 * "Try your smart home" simulator (design v4, screen "12 Simulator"): pure rules.
 *
 * The functions below are ported verbatim from the design's `simCh`, `simBest`, `simRec`, `simApply`, `simAt`,
 * `simMk`, `simNames` and `simDemo` (typed, no behaviour change). The owner facts are constants here; package prices,
 * capacities and controller counts are derived from `lib/smart-home-packages.ts`, never typed in a second time.
 *
 * It is a demonstration only: nothing here talks to a device, the network or storage.
 */
import { SMART_HOME_PACKAGES, type SmartHomePackage, type SmartHomePackageId } from '../smart-home-packages.ts';

// ---- Owner facts (DR-110) -------------------------------------------------------------------------------------------
/** 1 lighting line = 1 channel. */
export const CHANNELS_PER_LINE = 1;
/** 1 device (heater, water pump, extractor fan, curtain, garage door, any other device) = 1 channel. */
export const CHANNELS_PER_DEVICE = 1;
/** AC is controlled by the IR remote and uses no channel. */
export const AC_CHANNELS = 0;
/** Above this total the page shows "your project needs an engineer review". */
export const ENGINEER_REVIEW_ABOVE = 64;
export const MAX_ROOMS = 12;
export const MAX_LINES = 16;
export const MAX_PER_DEVICE = 4;
/** Channels per controller model, used to cover channels beyond the package (fewest controllers, least waste, 16R first). */
export const CONTROLLER_CHANNELS = { '16R': 16, '6R': 6, '4R': 4 } as const;
export type ControllerModel = keyof typeof CONTROLLER_CHANNELS;

export const DEVK = ['heater', 'pump', 'fan', 'curtain', 'garage', 'other'] as const;
export type DevKey = (typeof DEVK)[number];
export const RTYPES = ['reception', 'bed', 'kids', 'kitchen', 'bath', 'corridor', 'stairs', 'office', 'garden', 'balcony', 'garage'] as const;
export type RoomTypeKey = (typeof RTYPES)[number];
export const HOMES = ['apt', 'duplex', 'villa'] as const;
export type HomeKey = (typeof HOMES)[number];

export type SimRoom = { id: number; type: RoomTypeKey; lines: number; ac: boolean; dev: Partial<Record<DevKey, number>> };
export type OnMap = Record<string, boolean>;
export type SimDeviceState = { on: OnMap; door: boolean; night: boolean; gas: boolean };

// ---- Packages, derived from the package registry -------------------------------------------------------------------
export const PKG_KEYS = ['Essential', 'Plus', 'Premium'] as const;
export type PkgKey = (typeof PKG_KEYS)[number];
export type PkgFacts = { id: SmartHomePackageId; price: number; cap: number; n16: number; lock: boolean };

const PKG_ID: Record<PkgKey, SmartHomePackageId> = { Essential: 'essential', Plus: 'plus', Premium: 'premium' };
function facts(key: PkgKey): PkgFacts {
  const pkg = SMART_HOME_PACKAGES.find((entry) => entry.id === PKG_ID[key]) as SmartHomePackage;
  const n16 = pkg.items.filter((item) => item.model === '16r').reduce((total, item) => total + item.quantity, 0);
  return { id: pkg.id, price: pkg.priceEgp, cap: n16 * CONTROLLER_CHANNELS['16R'], n16, lock: pkg.items.some((item) => item.key === 'lock') };
}
/** Design `PK`: Essential 24,000 / 16 ch / 1 × 16R; Plus 32,000 / 32 ch / 2 × 16R; Premium 44,000 / 32 ch / 2 × 16R + lock. */
export const PK: Record<PkgKey, PkgFacts> = { Essential: facts('Essential'), Plus: facts('Plus'), Premium: facts('Premium') };
/** Upsell amounts derived from the prices (+8,000 to Plus, +12,000 to Premium) and the extra channels of Plus. */
export const UPSELL = {
  toPlus: PK.Plus.price - PK.Essential.price,
  toPlusChannels: PK.Plus.cap - PK.Essential.cap,
  toPremium: PK.Premium.price - PK.Plus.price,
} as const;

// ---- Presets and routines (design data) ----------------------------------------------------------------------------
type PresetRow = readonly [RoomTypeKey, number, 0 | 1, Partial<Record<DevKey, number>>];
export const PRESETS: Record<HomeKey, readonly PresetRow[]> = {
  apt: [['reception', 3, 1, {}], ['bed', 2, 1, {}], ['bed', 2, 1, {}], ['kitchen', 2, 0, { fan: 1 }], ['bath', 1, 0, { heater: 1 }], ['corridor', 1, 0, {}]],
  duplex: [['reception', 4, 1, { curtain: 1 }], ['bed', 2, 1, {}], ['bed', 2, 1, {}], ['bed', 2, 1, {}], ['kitchen', 2, 0, { fan: 1 }], ['bath', 1, 0, { heater: 1 }], ['bath', 1, 0, {}], ['stairs', 2, 0, {}]],
  villa: [['reception', 5, 1, { curtain: 2 }], ['bed', 2, 1, {}], ['bed', 2, 1, {}], ['bed', 2, 1, {}], ['bed', 2, 1, {}], ['kitchen', 3, 0, { fan: 1 }], ['bath', 1, 0, { heater: 1 }], ['bath', 1, 0, { heater: 1 }], ['bath', 1, 0, {}], ['garden', 4, 0, { pump: 1 }], ['garage', 1, 0, { garage: 1 }]],
};

export type Op =
  | readonly ['all']
  | readonly ['night' | 'lock' | 'gas', 0 | 1]
  | readonly ['light' | 'ac', RoomTypeKey | 'all', 0 | 1]
  | readonly ['dev', DevKey, 0 | 1];
export type Routine = { lock?: 'all' | 'partial'; lockStep?: number; steps: ReadonlyArray<ReadonlyArray<Op>> };

export const ROUT = {
  morning: { steps: [[['night', 0], ['light', 'bed', 1]], [['dev', 'curtain', 1]], [['dev', 'heater', 1]]] },
  leave: { lock: 'all', steps: [[['lock', 1], ['light', 'all', 0]], [['ac', 'all', 0]], [['dev', 'heater', 0]], [['dev', 'garage', 0]]] },
  arrive: { lock: 'all', steps: [[['lock', 0], ['light', 'corridor', 1], ['light', 'reception', 1]], [['ac', 'reception', 1]]] },
  night: { lock: 'partial', lockStep: 2, steps: [[['night', 1], ['light', 'all', 0], ['light', 'corridor', 1]], [['ac', 'all', 0], ['ac', 'bed', 1]], [['lock', 1]]] },
  guests: { steps: [[['light', 'reception', 1]], [['dev', 'curtain', 0]], [['ac', 'reception', 1]]] },
  suhoor: { steps: [[['night', 1], ['all'], ['light', 'kitchen', 1], ['light', 'corridor', 1]], []] },
  travel: { steps: [[['night', 1], ['all'], ['light', 'reception', 1]], [['light', 'reception', 0], ['light', 'bed', 1]], [['light', 'bed', 0], ['light', 'kitchen', 1]]] },
  pump: { steps: [[['dev', 'pump', 1]], [['dev', 'pump', 0]]] },
  gas: { steps: [[['gas', 1]], [], [['dev', 'fan', 1]], [['light', 'kitchen', 1]]] },
} as const satisfies Record<string, Routine>;
export type RoutineId = keyof typeof ROUT;
export const RORDER: readonly RoutineId[] = ['morning', 'leave', 'arrive', 'night', 'guests', 'suhoor', 'travel', 'pump', 'gas'];
export const MARKS: ReadonlyArray<{ t: number; r: RoutineId }> = [{ t: 7, r: 'morning' }, { t: 8.5, r: 'leave' }, { t: 18, r: 'arrive' }, { t: 21, r: 'guests' }, { t: 23.5, r: 'night' }];
export const routine = (id: RoutineId): Routine => ROUT[id] as Routine;
/** A routine that needs the smart lock for every step (leave, arrive) cannot run without Premium. */
export const needsLockAll = (id: RoutineId) => routine(id).lock === 'all';

// ---- Pure functions (ported verbatim) ------------------------------------------------------------------------------
export const fmtN = (n: number) => n.toLocaleString('en-US');
export const simClk = (t: number) => Math.floor(t) + ':' + String(Math.round((t % 1) * 60)).padStart(2, '0');
/** Channels of one room: lighting lines plus one channel per device. AC adds nothing. */
export const simCh = (r: Pick<SimRoom, 'lines' | 'dev'>) => r.lines * CHANNELS_PER_LINE + DEVK.reduce((a, k) => a + (r.dev[k] || 0) * CHANNELS_PER_DEVICE, 0);

/** Rooms of a home preset; `nextId` numbers them (the design's `self._nid`), or every id is 0 without it. */
export function simMk(nextId: (() => number) | null, h: HomeKey): SimRoom[] {
  return PRESETS[h].map(([type, lines, ac, dev]) => ({ id: nextId ? nextId() : 0, type, lines, ac: !!ac, dev: { ...dev } }));
}
export const PRESET_META: Record<HomeKey, [number, number]> = Object.fromEntries(
  HOMES.map((h) => { const rs = simMk(null, h); return [h, [rs.length, rs.reduce((a, r) => a + simCh(r), 0)]]; }),
) as Record<HomeKey, [number, number]>;

/** Fewest extra controllers covering `left` channels, then the least waste, then the most 16R. */
export function simBest(left: number): ControllerModel[] {
  let best: { k: [number, number, number]; l: ControllerModel[] } | null = null;
  for (let a = 0; a <= 4; a++) for (let b = 0; b <= 9; b++) for (let c = 0; c <= 13; c++) {
    const tot = 16 * a + 6 * b + 4 * c; if (tot < left) continue;
    const k: [number, number, number] = [a + b + c, tot - left, -a];
    if (!best || k[0] < best.k[0] || (k[0] === best.k[0] && (k[1] < best.k[1] || (k[1] === best.k[1] && k[2] < best.k[2])))) best = { k, l: [...Array<ControllerModel>(a).fill('16R'), ...Array<ControllerModel>(b).fill('6R'), ...Array<ControllerModel>(c).fill('4R')] };
  }
  return best ? best.l : [];
}

export type SimRecommendation = { ch: number; pkg: PkgKey; cap: number; extras: ControllerModel[]; extraCap: number; ctrlTxt: string; extrasTxt: string; over: boolean; eng: boolean };

/** Smallest package that covers the need (Essential, then Plus); the smart lock means Premium; extras beyond it. */
export function simRec(rooms: readonly Pick<SimRoom, 'lines' | 'dev'>[], lock: boolean): SimRecommendation {
  const ch = rooms.reduce((a, r) => a + simCh(r), 0);
  const pkg: PkgKey = lock ? 'Premium' : ch <= PK.Essential.cap ? 'Essential' : 'Plus';
  const cap = PK[pkg].cap, left = Math.max(0, ch - cap), eng = ch > ENGINEER_REVIEW_ABOVE;
  const extras = left && !eng ? simBest(left) : [];
  const extraCap = extras.reduce((a, m) => a + CONTROLLER_CHANNELS[m], 0);
  const cnt = (m: ControllerModel) => extras.filter((x) => x === m).length;
  const n16 = PK[pkg].n16 + cnt('16R');
  const ctrlTxt = [n16 + ' × 16R', ...(['6R', '4R'] as const).filter((m) => cnt(m)).map((m) => (cnt(m) > 1 ? cnt(m) + ' × ' + m : m))].join(' + ');
  const extrasTxt = (['16R', '6R', '4R'] as const).filter((m) => cnt(m)).map((m) => (cnt(m) > 1 ? cnt(m) + ' × ' + m : m)).join(' + ');
  return { ch, pkg, cap, extras, extraCap, ctrlTxt, extrasTxt, over: left > 0, eng };
}

/** Applies routine/command operations to the demo house (lights, AC, devices, door, night, gas). */
export function simApply(base: SimDeviceState, rooms: readonly SimRoom[], ops: ReadonlyArray<Op>): SimDeviceState {
  let on: OnMap = { ...base.on }, door = base.door, night = base.night, gas = base.gas;
  ops.forEach((op) => {
    const [name, a, b] = op as readonly [string, unknown?, unknown?];
    if (name === 'all') on = {};
    if (name === 'night') night = !!a;
    if (name === 'lock') door = !!a;
    if (name === 'gas') gas = !!a;
    if (name === 'light' || name === 'ac') rooms.forEach((r) => { if ((a === 'all' || r.type === a) && (name === 'light' ? r.lines > 0 : r.ac)) on[r.id + (name === 'light' ? ':l' : ':a')] = !!b; });
    if (name === 'dev') rooms.forEach((r) => { for (let i = 0; i < (r.dev[a as DevKey] || 0); i++) on[r.id + ':' + a + i] = !!b; });
  });
  return { on, door, night, gas };
}

/** House state at time `t` (0–24) of "A day in your home": every marker up to `t`; lock steps only with Premium. */
export function simAt(t: number, rooms: readonly SimRoom[], prem: boolean): SimDeviceState {
  let st: SimDeviceState = { on: {}, door: false, night: false, gas: false };
  MARKS.forEach((m) => { if (m.t > t) return; const R = routine(m.r); if (R.lock === 'all' && !prem) return; R.steps.forEach((ops, k) => { if (R.lockStep === k && !prem) return; st = simApply(st, rooms, ops); }); });
  st.night = t < 6 || t >= 18.5;
  return st;
}

/** Display names: the type label, numbered when the same type occurs more than once ("Bedroom 1", "Bedroom 2"). */
export function simNames(rooms: readonly Pick<SimRoom, 'type'>[], labels: Record<RoomTypeKey, string>): string[] {
  const tot: Partial<Record<RoomTypeKey, number>> = {}, seen: Partial<Record<RoomTypeKey, number>> = {};
  rooms.forEach((r) => { tot[r.type] = (tot[r.type] || 0) + 1; });
  return rooms.map((r) => { seen[r.type] = (seen[r.type] || 0) + 1; return labels[r.type] + ((tot[r.type] || 0) > 1 ? ' ' + seen[r.type] : ''); });
}

// ---- Clamps used by the room cards (design limits) -----------------------------------------------------------------
export const clampLines = (n: number) => Math.max(0, Math.min(MAX_LINES, n));
export const clampDevice = (n: number) => Math.max(0, Math.min(MAX_PER_DEVICE, n));
export const canAddRoom = (rooms: readonly unknown[]) => rooms.length < MAX_ROOMS;

// ---- Demo presets (`simDemo`), allow-listed --------------------------------------------------------------------------
export const SIM_DEMOS = ['fresh', 'apartment', 'night', 'routine', 'gas', 'day', 'over', 'plan'] as const;
export type SimDemo = (typeof SIM_DEMOS)[number];
/** Only the design's `simDemo` values are accepted; anything else (or nothing) is ignored. */
export function isSimDemo(value: unknown): value is SimDemo {
  return typeof value === 'string' && (SIM_DEMOS as readonly string[]).includes(value);
}

export type SimCoreState = {
  home: HomeKey | null; rooms: SimRoom[]; on: OnMap; night: boolean; gas: boolean; door: boolean; lock: boolean;
  bubble: number | null; play: RoutineId | null; step: number; up: RoutineId | null; dayMode: boolean; liked: RoutineId[]; t: number;
};
export const FRESH_STATE: SimCoreState = { home: null, rooms: [], on: {}, night: false, gas: false, door: false, lock: false, bubble: null, play: null, step: 0, up: null, dayMode: false, liked: [], t: 7 };

/**
 * Port of the design's `simDemo`: the preset state for one allow-listed demo value, and the stage it scrolls to.
 * The Alexa bubble is kept as the command index (0–3) so the copy stays per locale.
 */
export function simDemoState(d: SimDemo, nextId: () => number): { state: SimCoreState; target: 's2' | 's3' | 's4' } | null {
  if (d === 'fresh') return null;
  const villa = d === 'day' || d === 'over';
  const rooms = simMk(nextId, villa ? 'villa' : 'apt');
  if (d === 'over') { rooms[0]!.lines = 8; rooms.push({ id: nextId(), type: 'office', lines: 3, ac: true, dev: {} }); }
  const x: SimCoreState = { ...FRESH_STATE, home: villa ? 'villa' : 'apt', rooms, on: {}, liked: [] };
  const ap = (ops: ReadonlyArray<Op>) => { const r = simApply({ on: x.on, door: x.door, night: x.night, gas: x.gas }, x.rooms, ops); Object.assign(x, r); };
  if (d === 'night') { ap([['night', 1], ['light', 'reception', 1], ['light', 'corridor', 1], ['ac', 'bed', 1]]); x.bubble = 0; }
  if (d === 'routine') { x.play = 'morning'; x.step = 1; ROUT.morning.steps.slice(0, 2).forEach(ap); }
  if (d === 'gas') { ROUT.gas.steps.forEach(ap); x.play = 'gas'; x.step = 4; }
  if (d === 'day') { const st = simAt(19, rooms, false); Object.assign(x, { t: 19, dayMode: true, on: st.on, door: st.door, night: st.night }); }
  if (d === 'plan') { x.liked = ['morning', 'gas']; }
  const target = ({ apartment: 's2', over: 's2', plan: 's4' } as const)[d as 'apartment' | 'over' | 'plan'] ?? 's3';
  return { state: x, target };
}
