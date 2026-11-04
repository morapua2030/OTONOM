'use client';

/**
 * Design v4 "12 Simulator" (`/try`): four stages (your home · your rooms · try it · your plan) on one page.
 * A demonstration only: it is not connected to any device, makes no network request, uses no storage or cookies and
 * has no form or text input. The only thing that leaves the page is the visitor's own tap on a wa.me link.
 */
import './simulator.css';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import type { Locale } from '@/lib/i18n.ts';
import { Bidi, isolateText } from '@/components/bidi.tsx';
import { Swash } from '@/components/v2.tsx';
import { ItemVisual } from '@/components/package-items.tsx';
import { BUILTIN_CONTACT, EXTERNAL_LINK, telHref, whatsappHref } from '@/lib/contact.ts';
import { BookingForm } from '@/components/BookingForm.tsx';
import type { PackageItemKey } from '@/lib/smart-home-packages.ts';
import { SIMD } from '@/lib/simulator/copy.ts';
import { buildPlan } from '@/lib/simulator/plan.ts';
import {
  applySimContent, canAddRoom, clampDevice, clampLines, DEVK, FRESH_STATE, HOMES, MARKS, MAX_ROOMS, PK, PKG_KEYS, PRESET_META, RORDER, routine, RTYPES,
  simApply, simAt, simClk, simDemoState, simMk, simRec, fmtN,
  type DevKey, type HomeKey, type Op, type RoutineId, type SimContentInput, type SimCoreState, type SimDemo, type SimRoom,
} from '@/lib/simulator/rules.ts';
import { DICON, HomeArt, RICON, SimIcon } from './icons.tsx';

type UiState = { dayOn: boolean; cmp: boolean; add: boolean; sheet: boolean; copied: boolean; stageA: number };
type State = SimCoreState & UiState;
type Patch = Partial<State> | ((prev: State) => Partial<State> | null);

const UI0: UiState = { dayOn: false, cmp: false, add: false, sheet: false, copied: false, stageA: 1 };
/** Device "on" colours (design `DCOL`), lights and AC. Simulator-only colours (DR-111). */
const DCOL: Record<DevKey, string> = { heater: '#FFC08A', pump: '#91CEF0', fan: '#B8DDF3', curtain: '#B8DDF3', garage: '#B8DDF3', other: '#18A3E0' };
const DANIM: Partial<Record<DevKey, string>> = { fan: 'sim-spin', heater: 'sim-glow', pump: 'sim-glow' };
const TILE_ITEMS: Array<[PackageItemKey, 'alexa' | 'lock' | 'ir' | 'gas' | 'ctrl' | 'panel']> = [['alexa', 'alexa'], ['lock', 'lock'], ['ir', 'ir'], ['gas', 'gas'], ['controller', 'ctrl'], ['panel', 'panel']];

const reduceMotion = () => typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
function scrollToStage(id: string, instant = false) {
  const el = document.getElementById(id);
  if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 90, behavior: instant || reduceMotion() ? 'auto' : 'smooth' });
}
const isPrem = (x: Pick<SimCoreState, 'rooms' | 'lock'>) => simRec(x.rooms, x.lock).pkg === 'Premium';
const applyOps = (x: SimCoreState, ops: ReadonlyArray<Op>) => {
  const r = simApply({ on: x.on, door: x.door, night: x.night, gas: x.gas }, x.rooms, ops);
  return { on: r.on, door: r.door, night: r.night, gas: r.gas };
};

function initialState(demo: SimDemo | null): { state: State; nextId: number; target: string | null } {
  let n = 0;
  const preset = demo ? simDemoState(demo, () => ++n) : null;
  return { state: { ...(preset ? preset.state : FRESH_STATE), ...UI0 }, nextId: n, target: preset ? `sim-${preset.target}` : null };
}

/** Admin-managed simulator content (lib/site-content.ts); without it the simulator uses its built-in values. */
export type SimulatorContent = SimContentInput & {
  routines?: ReadonlyArray<{ id: RoutineId; title: { ar: string; en: string }; trigger: { ar: string; en: string }; actions: { ar: string[]; en: string[] }; premium: boolean }>;
  contact?: { phoneE164: string; whatsappE164: string };
  /** Present only when the OWNER approved the privacy text AND enabled intake: stage 4 then offers «ابعت خطتك للفريق». */
  booking?: { token: string; privacyHref: string; packages: Array<{ id: string; label: string }> } | null;
};

export function Simulator({ locale, demo, content }: { locale: Locale; demo: SimDemo | null; content?: SimulatorContent }) {
  // Same input on the server and in the browser, so the rendered numbers always match (no hydration difference).
  applySimContent(content ?? {});
  const S = SIMD[locale];
  const ORDER: readonly RoutineId[] = content?.routines?.length ? content.routines.map((r) => r.id) : RORDER;
  const adminRoutine = (id: RoutineId) => content?.routines?.find((r) => r.id === id);
  const RT = (id: RoutineId) => { const r = adminRoutine(id); return r ? { t: r.title[locale], tr: r.trigger[locale], a: r.actions[locale] } : S.routines[id]; };
  const premiumOnly = (id: RoutineId) => adminRoutine(id)?.premium ?? routine(id).lock === 'all';
  const U = S.ui;
  const B = (text: string | null | undefined) => <Bidi text={text} locale={locale} />;
  const A = (text: string) => isolateText(text, locale);

  const boot = useRef<ReturnType<typeof initialState> | null>(null);
  if (!boot.current) boot.current = initialState(demo);
  const [s, setS] = useState<State>(boot.current.state);
  const live = useRef(s);
  live.current = s;
  const nid = useRef(boot.current.nextId);
  const nextId = () => ++nid.current;
  const routineTimer = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const dayTimer = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const set = useCallback((patch: Patch) => setS((prev) => {
    const next = typeof patch === 'function' ? patch(prev) : patch;
    return next ? { ...prev, ...next } : prev;
  }), []);

  const stopTimers = useCallback(() => {
    clearInterval(routineTimer.current); clearInterval(dayTimer.current);
    routineTimer.current = undefined; dayTimer.current = undefined;
  }, []);
  const stopAll = () => { stopTimers(); set({ dayOn: false }); };

  // Stage pills follow the scroll position; timers stop when the page unmounts.
  useEffect(() => {
    const onScroll = () => {
      let a = 1;
      for (let i = 1; i <= 4; i++) { const el = document.getElementById('sim-s' + i); if (el && el.getBoundingClientRect().top < 220) a = i; }
      if (a !== live.current.stageA) set({ stageA: a });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    const target = boot.current?.target;
    const demoScroll = target ? setTimeout(() => scrollToStage(target, true), 400) : undefined;
    return () => { window.removeEventListener('scroll', onScroll); clearTimeout(demoScroll); clearTimeout(copyTimer.current); stopTimers(); };
  }, [set, stopTimers]);

  // ---- behaviour (design simSetT / simDayStart / simPlayR / simSay) ----
  const setT = (t: number) => set((x) => { const st = simAt(t, x.rooms, isPrem(x)); return { t, dayMode: true, on: st.on, door: st.door, night: st.night, gas: false, play: null }; });
  const dayStart = () => {
    stopTimers();
    let t = live.current.t >= 24 ? 0 : live.current.t;
    set({ dayOn: true, bubble: null, up: null });
    setT(t);
    dayTimer.current = setInterval(() => {
      t = Math.min(24, t + 0.12); setT(t);
      if (t >= 24) { clearInterval(dayTimer.current); dayTimer.current = undefined; set({ dayOn: false }); }
    }, 100);
  };
  const playRoutine = (id: RoutineId, keepBubble = false, lockAdded = false) => {
    const prem = lockAdded || isPrem(live.current);
    const R = routine(id);
    if (premiumOnly(id) && !prem) { set({ up: id }); return; }
    stopAll();
    set({ play: id, step: 0, up: null, dayMode: false, ...(keepBubble ? {} : { bubble: null }), ...(id === 'gas' ? {} : { gas: false }) });
    const run = (k: number) => set((y) => (R.lockStep === k && !prem ? { step: k } : { step: k, ...applyOps(y, R.steps[k] ?? []) }));
    run(0);
    let k = 0;
    routineTimer.current = setInterval(() => {
      k++;
      if (k >= R.steps.length) { clearInterval(routineTimer.current); routineTimer.current = undefined; set({ step: R.steps.length }); return; }
      run(k);
    }, 1100);
  };
  const say = (i: number) => {
    set({ bubble: i });
    if (i === 3) { playRoutine('night', true); return; }
    stopAll();
    const ops: ReadonlyArray<Op>[] = [[['light', 'reception', 1]], [['ac', 'bed', 1]], [['light', 'all', 0]]];
    set((x) => ({ dayMode: false, play: null, ...applyOps(x, ops[i] ?? []) }));
  };
  const toggleKey = (key: string) => { stopTimers(); set((x) => ({ dayOn: false, on: { ...x.on, [key]: !x.on[key] } })); };
  const updRooms = (fn: (rooms: SimRoom[]) => SimRoom[]) => set((x) => ({ rooms: fn(x.rooms) }));
  const mapRoom = (id: number, fn: (r: SimRoom) => SimRoom) => updRooms((rs) => rs.map((r) => (r.id === id ? fn({ ...r, dev: { ...r.dev } }) : r)));
  const pickHome = (h: HomeKey) => {
    stopAll();
    set({ home: h, rooms: simMk(nextId, h), on: {}, gas: false, bubble: null, play: null, up: null, dayMode: false, door: false });
    setTimeout(() => scrollToStage('sim-s2'), 80);
  };
  const addRoom = (type: SimRoom['type']) => set((x) => (canAddRoom(x.rooms) ? { rooms: [...x.rooms, { id: nextId(), type, lines: 1, ac: false, dev: {} }], add: false } : null));

  // ---- derived values (design simVals) ----
  const rooms = s.rooms, has = !!s.home, on = s.on, night = s.night;
  const plan = buildPlan(locale, { home: s.home, rooms, lock: s.lock, liked: s.liked, order: ORDER, titles: Object.fromEntries(ORDER.map((id) => [id, RT(id).t])) });
  const { rc, names, price } = plan;
  const prem = rc.pkg === 'Premium';
  const wa = whatsappHref(plan.msg, content?.contact?.whatsappE164);
  const gasIdx = Math.max(0, rooms.findIndex((r) => r.type === 'kitchen'));
  const pct = rc.over ? '100%' : Math.min(100, (rc.ch / rc.cap) * 100) + '%';
  let nowLabel = '';
  if (s.dayMode) MARKS.forEach((m) => { if (m.t <= s.t && !(premiumOnly(m.r) && !prem)) nowLabel = RT(m.r).t; });

  const copyPlan = () => {
    const txt = plan.text;
    const done = () => { set({ copied: true }); clearTimeout(copyTimer.current); copyTimer.current = setTimeout(() => set({ copied: false }), 2000); };
    // Fallback without a text field: select an off-screen copy of the plan and use the legacy copy command.
    const fallback = () => {
      const holder = document.createElement('pre');
      holder.className = 'sim-copy-holder'; holder.textContent = txt; holder.setAttribute('aria-hidden', 'true');
      document.body.appendChild(holder);
      const range = document.createRange(); range.selectNodeContents(holder);
      const sel = window.getSelection(); sel?.removeAllRanges(); sel?.addRange(range);
      try { document.execCommand('copy'); } catch { /* the plan stays visible on the page */ }
      sel?.removeAllRanges(); holder.remove(); done();
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(done, fallback); else fallback();
  };

  const sw = (checked: boolean) => (
    <span className="sim-switch" aria-hidden="true" data-on={checked ? 'true' : 'false'}><span className="sim-switch-knob" /></span>
  );
  const stageHead = (n: number, title: string, extra?: ReactNode) => (
    <div className="sim-stage-head">
      <div className="sim-stage-title"><span className="sim-stage-num" dir="ltr">{n}</span><h2 id={`sim-s${n}-title`}>{B(title)}</h2></div>
      {extra}
    </div>
  );
  const pickFirst = (
    <div className="sim-empty">
      <span>{B(U.pickFirst)}</span>
      <button type="button" className="btn secondary" onClick={() => scrollToStage('sim-s1')}>{B(U.pickHome)}</button>
    </div>
  );

  const panel = (where: 'aside' | 'sheet') => (
    <>
      <div className="sim-need" aria-live="polite" data-testid={where === 'aside' ? 'sim-total' : undefined}>
        <span className="sim-small">{B(U.need)}</span>
        <div className="sim-need-row"><span className="sim-need-num" dir="ltr">{rc.ch}</span><span className="sim-need-unit">{B(S.chW(rc.ch))}</span></div>
        <div className="sim-bar" aria-hidden="true"><div className="sim-bar-fill" style={{ width: pct }} /></div>
        <span className="sim-small">{B(S.used(rc.ch, rc.cap + rc.extraCap))}</span>
      </div>
      {rc.eng ? (
        <div className="sim-eng" data-testid={where === 'aside' ? 'sim-eng' : undefined}>
          <span className="sim-card-title">{B(S.eng)}</span>
          <span className="sim-body">{B(U.engLine)}</span>
          <a className="btn" href={wa} {...EXTERNAL_LINK}>{B(U.engWa)}</a>
        </div>
      ) : (
        <>
          <div className="sim-row sim-rule"><span className="sim-label">{B(U.controllers)}</span><bdi dir="ltr" className="sim-ctrl" data-testid={where === 'aside' ? 'sim-ctrl' : undefined}>{rc.ctrlTxt}</bdi></div>
          {rc.extras.length ? <div className="sim-extra" data-testid={where === 'aside' ? 'sim-extra' : undefined}>{B(S.extra(rc.extrasTxt))}</div> : null}
          <button type="button" role="switch" aria-checked={s.lock} className="sim-switch-row" onClick={() => set((x) => ({ lock: !x.lock }))} data-testid={where === 'aside' ? 'sim-lock' : undefined}>
            <span className="sim-switch-text"><span className="sim-label">{B(U.wantLock)}</span><span className="sim-small">{B(U.lockInPremium)}</span></span>
            {sw(s.lock)}
          </button>
          <div className="sim-pkg">
            <span className="sim-small">{B(U.recommended)}</span>
            <div className="sim-pkg-row"><span className="sim-card-title" data-testid={where === 'aside' ? 'sim-pkg' : undefined}>{rc.pkg}</span><span className="sim-price">{B(price)}</span></div>
            <ul className="sim-tiles">
              {TILE_ITEMS.filter(([, k]) => k !== 'lock' || PK[rc.pkg].lock).map(([item, k]) => (
                <li className="sim-tile" key={k} title={S.items[k]}>
                  <ItemVisual item={item} locale={locale} sizes="38px" />
                  {k === 'ctrl' && PK[rc.pkg].n16 > 1 ? <span className="sim-qty" dir="ltr">{'×' + PK[rc.pkg].n16}</span> : null}
                </li>
              ))}
            </ul>
            <span className="sim-small">{B(U.installIncluded)}</span>
          </div>
          <div className="sim-up">
            <p data-testid={where === 'aside' ? 'sim-up' : undefined}>{B(S.up[rc.pkg])}</p>
            <button type="button" className="btn secondary sim-btn-sm" aria-expanded={s.cmp} onClick={() => set((x) => ({ cmp: !x.cmp }))}>{B(U.compare)}<span aria-hidden="true" className="sim-caret">▾</span></button>
          </div>
          {s.cmp ? (
            <div className="sim-cmp">
              {PKG_KEYS.map((k) => (
                <div className="sim-cmp-col" key={k} data-current={k === rc.pkg ? 'true' : 'false'}>
                  <span className="sim-cmp-name">{k}</span>
                  <span className="sim-cmp-price">{B(fmtN(PK[k].price) + ' ' + S.unit)}</span>
                  <span className="sim-small">{B(PK[k].cap + ' ' + S.chW(PK[k].cap))}</span>
                  <span className="sim-cmp-adds">{B(S.adds[k])}</span>
                </div>
              ))}
            </div>
          ) : null}
        </>
      )}
    </>
  );

  return (
    <div className="sim" data-testid="simulator" data-demo={demo ?? 'fresh'}>
      <section className="sim-section sim-intro">
        <span className="v2-eyebrow">{B(U.eyebrow)}</span>
        <h1>{B(U.h1[0])}<Swash>{B(U.h1[1])}</Swash></h1>
        <p className="v2-lead">{B(U.lead)}</p>
        <nav className="sim-stages" aria-label={A(U.stagesLabel)}>
          {S.stages.map((label, i) => {
            const n = i + 1, cur = s.stageA === n;
            return (
              <button type="button" key={label} className="sim-stage-pill" aria-current={cur ? 'step' : undefined} onClick={() => scrollToStage('sim-s' + n)}>
                <span className="sim-stage-pill-num" dir="ltr">{n}</span>{B(label)}
              </button>
            );
          })}
        </nav>
      </section>

      <section id="sim-s1" className="sim-section" aria-labelledby="sim-s1-title">
        <div className="sim-stage-head"><div className="sim-stage-title"><span className="sim-stage-num" dir="ltr">1</span><h2 id="sim-s1-title">{B(S.stages[0])}</h2></div></div>
        <p className="sim-body">{B(U.s1Lead)}</p>
        <div className="sim-homes">
          {HOMES.map((h) => {
            const [n, ch] = PRESET_META[h], sel = s.home === h;
            return (
              <button type="button" key={h} className="sim-home" aria-pressed={sel} onClick={() => pickHome(h)} data-home={h}>
                <span className="sim-home-art-box"><HomeArt home={h} /></span>
                <span className="sim-home-name"><span>{B(S.homes[h])}</span>{sel ? <span className="sim-home-check" aria-hidden="true"><SimIcon name="check" size={18} /></span> : null}</span>
                <span className="sim-small">{B(n + ' ' + S.roomsW(n) + ' · ' + ch + ' ' + S.chW(ch))}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section id="sim-s2" className="sim-section" aria-labelledby="sim-s2-title">
        <div className="sim-stage-head"><div className="sim-stage-title"><span className="sim-stage-num" dir="ltr">2</span><h2 id="sim-s2-title">{B(S.stages[1])}</h2></div></div>
        {!has ? pickFirst : (
          <div className="sim-s2-grid">
            <div className="sim-rooms-col">
              <div className="sim-row"><span className="sim-small">{B(U.suggestion)}</span><span className="sim-small" dir="ltr" data-testid="sim-room-count">{rooms.length + ' / ' + MAX_ROOMS}</span></div>
              <ul className="sim-room-cards">
                {rooms.map((r, i) => {
                  const nm = names[i] ?? '';
                  return (
                    <li className="sim-room-card" key={r.id} data-testid="sim-room">
                      <div className="sim-room-head">
                        <span className="sim-room-icon"><SimIcon name={RICON[r.type]} /></span>
                        <h3 className="sim-room-name">{B(nm)}</h3>
                        <button type="button" className="sim-icon-btn" aria-label={A(S.remove(nm))} onClick={() => updRooms((rs) => rs.filter((x) => x.id !== r.id))}><SimIcon name="x" size={18} /></button>
                      </div>
                      <div className="sim-row">
                        <span className="sim-label">{B(U.linesLabel)}</span>
                        <div className="sim-stepper">
                          <button type="button" aria-label={A(S.dec(nm))} disabled={r.lines <= 0} onClick={() => mapRoom(r.id, (x) => ({ ...x, lines: clampLines(x.lines - 1) }))}>−</button>
                          <span dir="ltr" className="sim-stepper-val" data-testid="sim-lines">{r.lines}</span>
                          <button type="button" aria-label={A(S.inc(nm))} disabled={r.lines >= 16} onClick={() => mapRoom(r.id, (x) => ({ ...x, lines: clampLines(x.lines + 1) }))}>+</button>
                        </div>
                      </div>
                      <button type="button" role="switch" aria-checked={r.ac} aria-label={A(U.acLabel + ': ' + nm)} className="sim-switch-row" onClick={() => mapRoom(r.id, (x) => ({ ...x, ac: !x.ac }))}>
                        <span className="sim-label" aria-hidden="true">{B(U.acLabel)}</span>{sw(r.ac)}
                      </button>
                      <div className="sim-devs">
                        <span className="sim-small sim-small-13">{B(U.devicesLabel)}</span>
                        <div className="sim-dev-row">
                          {DEVK.map((k) => {
                            const n = r.dev[k] || 0;
                            const ch = (d: number) => mapRoom(r.id, (x) => { x.dev[k] = clampDevice((x.dev[k] || 0) + d); return x; });
                            return n === 0 ? (
                              <button type="button" key={k} className="sim-dev-add" aria-label={A(S.devInc(S.devs[k], nm))} onClick={() => ch(1)}>+ {B(S.devs[k])}</button>
                            ) : (
                              <span key={k} className="sim-dev-on">
                                <button type="button" aria-label={A(S.devDec(S.devs[k], nm))} onClick={() => ch(-1)}>−</button>
                                <span className="sim-dev-label">{B(S.devs[k])}{n > 1 ? <> <span dir="ltr">{'×' + n}</span></> : null}</span>
                                <button type="button" aria-label={A(S.devInc(S.devs[k], nm))} disabled={n >= 4} onClick={() => ch(1)}>+</button>
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
              <div className="sim-add">
                {rooms.length < MAX_ROOMS ? <button type="button" className="btn secondary sim-add-btn" aria-expanded={s.add} onClick={() => set((x) => ({ add: !x.add }))} data-testid="sim-add-room">{B(U.addRoom)}</button> : null}
                {rooms.length >= MAX_ROOMS ? <span className="sim-small" data-testid="sim-rooms-full">{B(U.maxRooms)}</span> : null}
                {s.add && rooms.length < MAX_ROOMS ? (
                  <div className="sim-add-types">
                    {RTYPES.map((t) => <button type="button" key={t} className="sim-add-type" onClick={() => addRoom(t)} data-type={t}><SimIcon name={RICON[t]} size={20} />{B(S.rooms[t])}</button>)}
                  </div>
                ) : null}
              </div>
            </div>
            <aside className="sim-aside" aria-label={A(U.need)}>{panel('aside')}</aside>
          </div>
        )}
      </section>

      <section id="sim-s3" className="sim-section" aria-labelledby="sim-s3-title">
        <div className="sim-stage-head">
          <div className="sim-stage-title"><span className="sim-stage-num" dir="ltr">3</span><h2 id="sim-s3-title">{B(S.stages[2])}</h2></div>
          {has ? (
            <div className="sim-daynight" role="group" aria-label={A(U.dayNight)}>
              <button type="button" aria-pressed={!night} onClick={() => { stopAll(); set({ night: false, dayMode: false }); }}><SimIcon name="sun" size={20} />{B(U.day)}</button>
              <button type="button" aria-pressed={night} onClick={() => { stopAll(); set({ night: true, dayMode: false }); }}><SimIcon name="moon" size={20} />{B(U.night)}</button>
            </div>
          ) : null}
        </div>
        {!has ? pickFirst : (
          <>
            <span className="sim-small">{B(U.tapIcons)}</span>
            <div className="sim-house" data-night={night ? 'true' : 'false'} data-testid="sim-house">
              <div className="sim-sky">
                <div className="sim-sky-row">
                  <span className="sim-orb" aria-hidden="true">{night ? <SimIcon name="moon" stroke="#FFFFFF" fill="#B8DDF3" /> : <SimIcon name="sun" />}</span>
                  <span className="sim-sky-title">{B(U.dayInHome)}</span>
                  <span className="sim-clock" dir="ltr" data-testid="sim-clock">{simClk(s.t)}</span>
                  <span className="sim-now" aria-live="polite">{B(nowLabel)}</span>
                  <button type="button" className="sim-day-btn" onClick={() => (s.dayOn ? stopAll() : dayStart())} data-testid="sim-day-play">
                    {s.dayOn ? <SimIcon name="pause" size={16} /> : <SimIcon name="play" size={16} fill="#0F2238" />}{B(s.dayOn ? S.dayPause : s.t >= 24 ? S.dayAgain : S.dayPlay)}
                  </button>
                </div>
                <div className="sim-marks" aria-hidden="true">
                  {MARKS.map((m, i) => {
                    const locked = premiumOnly(m.r) && !prem, pos = (m.t / 24) * 100;
                    return (
                      <span key={m.r} className="sim-mark" data-locked={locked ? 'true' : 'false'} data-row={i % 2 ? '2' : '1'} style={{ insetInlineStart: pos + '%', transform: `translateX(${(pos > 85 ? 100 : 50) * S.dir}%)` }}>
                        <span dir="ltr" className="sim-mark-time">{simClk(m.t)}</span><span>{B(RT(m.r).t)}</span>{locked ? <span className="sim-mark-badge">{B(S.inPremium)}</span> : null}
                      </span>
                    );
                  })}
                </div>
                <input type="range" className="sim-range" min={0} max={24} step={0.25} value={s.t} aria-label={A(U.timeOfDay)} aria-valuetext={simClk(s.t)}
                  onChange={(e) => { stopTimers(); set({ dayOn: false }); setT(Number(e.target.value)); }} data-testid="sim-scrub" />
              </div>
              <div className="sim-plan-area">
                {s.gas ? (
                  <div className="sim-gas" role="alert" data-testid="sim-gas">
                    <div className="sim-gas-head"><span className="sim-gas-icon"><SimIcon name="bell" stroke="#C62828" /></span><span className="sim-gas-title">{B(U.gasTitle)}</span></div>
                    <div className="sim-gas-tags"><span className="sim-tag-red">{B(U.gasAlarm)}</span><span className="sim-tag">{B(U.gasPhone)}</span></div>
                    <button type="button" className="btn sim-full" onClick={() => set({ gas: false })} data-testid="sim-gas-ack">{B(U.gasAck)}</button>
                  </div>
                ) : null}
                {prem ? <span className="sim-door" data-testid="sim-door"><SimIcon name={s.door ? 'lock' : 'unlock'} size={18} stroke={night ? '#FFFFFF' : '#0F2238'} />{B(S.door(s.door))}</span> : null}
                <ul className="sim-floor">
                  {rooms.map((r, i) => {
                    const nm = names[i] ?? '', lit = !!on[r.id + ':l'], gasHere = s.gas && i === gasIdx, dark = night && !lit && !gasHere;
                    const bg = gasHere ? '#FDE2E2' : night ? (lit ? '#FFE3A3' : '#1B3350') : lit ? '#FFF1CF' : '#FFFFFF';
                    const ink = dark ? '#FFFFFF' : '#0F2238';
                    const bd = gasHere ? '#C62828' : night ? '#2C4560' : '#0F2238';
                    const span = r.type === 'garden' ? '1 / -1' : r.type === 'reception' || r.type === 'garage' ? 'span 2' : 'auto';
                    const order = r.type === 'garden' ? 99 : r.type === 'garage' ? 98 : i;
                    const ctrl = (key: string, icon: Parameters<typeof SimIcon>[0]['name'], onC: string, label: string, qty?: string, anim?: string) => {
                      const v = !!on[key];
                      return (
                        <button type="button" key={key} className="sim-ctl" aria-pressed={v} aria-label={A(label)} onClick={() => toggleKey(key)}
                          style={{ background: v ? onC : dark ? 'transparent' : '#FFFFFF', borderColor: dark ? '#4A6480' : '#0F2238' }}>
                          <SimIcon name={icon} stroke={dark && !v ? '#FFFFFF' : '#0F2238'} className={v && anim ? anim : undefined} />
                          {qty ? <span className="sim-ctl-qty" dir="ltr">{qty}</span> : null}
                        </button>
                      );
                    };
                    return (
                      <li key={r.id} className={`sim-room${gasHere ? ' is-gas' : ''}`} data-lit={lit ? 'true' : 'false'} style={{ gridColumn: span, order, background: bg, color: ink, borderColor: bd }}>
                        <span className="sim-room-gap" aria-hidden="true" />
                        {(r.dev.curtain || 0) > 0 ? <span className="sim-curtain" aria-hidden="true" style={{ width: on[r.id + ':curtain0'] ? '22%' : '100%' }} /> : null}
                        {(r.dev.garage || 0) > 0 ? <span className="sim-garage" aria-hidden="true" style={{ width: on[r.id + ':garage0'] ? '4px' : '26px' }} /> : null}
                        {on[r.id + ':a'] ? <span className="sim-ac-pulse" aria-hidden="true" /> : null}
                        <span className="sim-room-label"><SimIcon name={RICON[r.type]} size={20} stroke={dark ? '#FFFFFF' : '#0F2238'} />{B(nm)}</span>
                        <div className="sim-ctls">
                          {r.lines > 0 ? ctrl(r.id + ':l', 'bulb', '#FFD98A', S.tLight(nm), r.lines > 1 ? '×' + r.lines : '') : null}
                          {r.ac ? ctrl(r.id + ':a', 'snow', '#B8DDF3', S.tAc(nm)) : null}
                          {DEVK.flatMap((k) => Array.from({ length: r.dev[k] || 0 }, (_, j) => ctrl(r.id + ':' + k + j, DICON[k], DCOL[k], S.tDev(S.devs[k], nm), '', DANIM[k])))}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
            <span className="sim-small" data-testid="sim-demo-note">{B(U.demoOnly)}</span>
            <div className="sim-alexa">
              <div className="sim-alexa-row">
                <span className="sim-alexa-label"><span className="sim-alexa-img"><ItemVisual item="alexa" locale={locale} sizes="42px" /></span><span>{B(U.alexaTry)}</span></span>
                <div className="sim-chip-row">
                  {S.cmds.map((text, i) => <button type="button" key={text} className="sim-cmd" aria-pressed={s.bubble === i} onClick={() => say(i)}>{B(text)}</button>)}
                </div>
              </div>
              {s.bubble !== null ? <div className="sim-bubble" aria-live="polite" data-testid="sim-bubble">«{B(S.cmds[s.bubble])}»</div> : null}
            </div>
            <div className="sim-routines-wrap">
              <div className="sim-routines-head"><h3>{B(U.routinesH)}</h3><span className="sim-small sim-small-15">{B(U.routinesSub)}</span></div>
              <ul className="sim-routines">
                {ORDER.map((id) => {
                  const R = routine(id), T = RT(id), liked = s.liked.includes(id), isP = s.play === id, running = isP && s.step < R.steps.length;
                  return (
                    <li className="sim-routine" key={id} data-routine={id}>
                      <div className="sim-routine-head">
                        <h4>{B(T.t)}</h4>
                        <button type="button" className="sim-heart" aria-pressed={liked} aria-label={A(S.like(T.t))} onClick={() => set((x) => ({ liked: x.liked.includes(id) ? x.liked.filter((z) => z !== id) : [...x.liked, id] }))}>
                          <SimIcon name="heart" size={20} fill={liked ? '#0F2238' : 'none'} />
                        </button>
                      </div>
                      {id === 'gas' || R.lock || premiumOnly(id) ? <span className="sim-badge">{B(id === 'gas' ? S.everyPkg : S.inPremium)}</span> : null}
                      <span className="sim-small sim-trig">{B(T.tr)}</span>
                      <ul className="sim-acts">
                        {T.a.map((text, j) => {
                          const lk = R.lockStep === j && !prem;
                          return (
                            <li key={text} className="sim-act" data-locked={lk ? 'true' : 'false'} data-done={isP && j <= s.step && !lk ? 'true' : 'false'}>
                              <span className="sim-dot" aria-hidden="true" /><span className="sim-act-text">{B(text)}</span>{lk ? <span className="sim-act-badge">{B(S.inPremium)}</span> : null}
                            </li>
                          );
                        })}
                      </ul>
                      {s.up === id ? (
                        <div className="sim-upsell" data-testid="sim-upsell">
                          <span>{B(S.lockUp)}</span>
                          <button type="button" className="btn sim-btn-sm" onClick={() => { set({ lock: true, up: null }); setTimeout(() => playRoutine(id, false, true), 60); }} data-testid="sim-add-lock">{B(U.addLock)}</button>
                        </div>
                      ) : null}
                      <button type="button" className="btn secondary sim-play" onClick={() => playRoutine(id)}><SimIcon name="play" size={14} fill="#0F2238" />{B(running ? S.playing : isP ? S.again : S.try)}</button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </>
        )}
      </section>

      <section id="sim-s4" className="sim-section" aria-labelledby="sim-s4-title">
        {stageHead(4, S.stages[3])}
        {!has ? pickFirst : (
          <div className="sim-plan" data-testid="sim-plan">
            <dl className="sim-plan-list">
              <div className="sim-plan-row"><dt className="sim-small">{B(U.homeType)}</dt><dd>{B(plan.p.home)}</dd></div>
              <div className="sim-plan-row is-col"><dt className="sim-small">{B(U.roomsH)}</dt><dd><ul className="sim-plan-rooms">{plan.p.rooms.map((r) => <li key={r.name}><span className="sim-plan-room-name">{B(r.name)}</span><span className="sim-plan-room-desc">{B(r.desc)}</span></li>)}</ul></dd></div>
              <div className="sim-plan-row"><dt className="sim-small">{B(U.totalCh)}</dt><dd>{B(rc.ch + ' ' + S.chW(rc.ch))}</dd></div>
              <div className="sim-plan-row"><dt className="sim-small">{B(U.controllers)}</dt><dd><bdi dir="ltr">{rc.ctrlTxt}</bdi></dd></div>
              {rc.extras.length ? <div className="sim-plan-row"><dt className="sim-small">{B(U.extraCtrl)}</dt><dd>{B(rc.extrasTxt + ' (' + S.extrasVal + ')')}</dd></div> : null}
              <div className="sim-plan-row is-col is-last"><dt className="sim-small">{B(U.likedH)}</dt><dd>{plan.p.liked.length ? <ul className="sim-chip-row">{plan.p.liked.map((l) => <li className="sim-tag" key={l}>{B(l)}</li>)}</ul> : <span className="sim-body">{B(U.noLiked)}</span>}</dd></div>
            </dl>
            <div className="sim-plan-side">
              {rc.eng ? (
                <div className="sim-eng"><span className="sim-card-title">{B(S.eng)}</span><span className="sim-body">{B(U.engLine)}</span></div>
              ) : (
                <div className="sim-plan-pkg"><span className="sim-plan-pkg-label">{B(U.recommended)}</span><span className="sim-plan-pkg-name">{rc.pkg}</span><span className="sim-plan-pkg-price">{B(price)}</span><span className="sim-plan-pkg-note">{B(U.installIncluded)}</span></div>
              )}
              <a className="btn sim-full sim-send" href={wa} {...EXTERNAL_LINK} data-testid="sim-whatsapp">{B(U.sendWa)}</a>
              <button type="button" className="btn secondary sim-full" onClick={copyPlan} data-testid="sim-copy"><span aria-live="polite">{B(s.copied ? S.copied : S.copy)}</span></button>
              <p className="sim-small sim-estimate">{B(U.estimate)}</p>
            </div>
          </div>
        )}
        {content?.booking && s.home ? (
          <div className="sim-booking">
            <BookingForm locale={locale} token={content.booking.token} packages={content.booking.packages} initialPackage={rc.eng ? 'unsure' : rc.pkg.toLowerCase()} source="simulator" plan={plan.text.slice(0, 900)} contact={content.contact ?? BUILTIN_CONTACT} privacyHref={content.booking.privacyHref} />
          </div>
        ) : null}
      </section>

      <section className="v2-section sim-cta-section" aria-labelledby="cta-band-title">
        <div className="v2-band-dark v3-cta">
          <h2 id="cta-band-title">{B(U.ready)}</h2>
          <div className="v2-actions">
            <a className="btn btn-on-dark is-primary" href={wa} {...EXTERNAL_LINK} data-testid="cta-book">{B(U.bookVisit)}</a>
            <a className="btn btn-on-dark" href={telHref(content?.contact?.phoneE164)}>{B(U.callUs)}</a>
          </div>
        </div>
      </section>

      {has ? (
        <>
          <div className="sim-bar-spacer" aria-hidden="true" />
          <div className="sim-mobile-bar" data-testid="sim-mobile-bar">
            {s.sheet ? <div className="sim-sheet">{panel('sheet')}</div> : null}
            <div className="sim-mobile-row">
              <div className="sim-mobile-sum" aria-live="polite">
                <span className="sim-mobile-main"><span dir="ltr">{rc.ch}</span> {B(S.chW(rc.ch))} · <bdi dir="ltr">{rc.ctrlTxt}</bdi></span>
                <span className="sim-small sim-small-13">{B(rc.eng ? S.eng : rc.pkg + ' · ' + price + (rc.extras.length ? ' · ' + S.extra(rc.extrasTxt) : ''))}</span>
              </div>
              <button type="button" className="btn sim-btn-sm" aria-expanded={s.sheet} onClick={() => set((x) => ({ sheet: !x.sheet }))}>{B(s.sheet ? S.sheetClose : S.sheetOpen)}</button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
