/**
 * Plan summary and WhatsApp message of the simulator, derived only from the visitor's choices (design `simVals`:
 * `planRooms`, `likedT`, `p`, `msg`). Nothing is stored or sent; the visitor's own WhatsApp sends the message.
 */
import type { Locale } from '../i18n.ts';
import { bookVisitMessage } from '../contact.ts';
import { SIMD, type PlanInput, type PlanRoom } from './copy.ts';
import { DEVK, fmtN, PK, RORDER, simNames, simRec, type HomeKey, type RoutineId, type SimRecommendation, type SimRoom } from './rules.ts';

/** Design limit for the plan message (`SIMD.msg` falls back to a shorter message without the rooms list). */
export const SIM_MESSAGE_MAX = 900;

export type SimPlan = { p: PlanInput; rc: SimRecommendation; names: string[]; price: string; msg: string; text: string };

export function planRooms(locale: Locale, rooms: readonly SimRoom[], names: readonly string[]): PlanRoom[] {
  const S = SIMD[locale];
  return rooms.map((r, i) => {
    const parts = [S.lines(r.lines), r.ac ? S.ac : null, ...DEVK.filter((k) => r.dev[k]).map((k) => S.devs[k] + ((r.dev[k] || 0) > 1 ? ' ×' + r.dev[k] : ''))].filter(Boolean) as string[];
    return { name: names[i] ?? '', desc: parts.join(' · '), descC: parts.join(S.sep) };
  });
}

export function buildPlan(locale: Locale, input: { home: HomeKey | null; rooms: readonly SimRoom[]; lock: boolean; liked: readonly RoutineId[] }): SimPlan {
  const S = SIMD[locale];
  const names = simNames(input.rooms, S.rooms);
  const rc = simRec(input.rooms, input.lock);
  const price = fmtN(PK[rc.pkg].price) + ' ' + S.unit;
  const liked = RORDER.filter((id) => input.liked.includes(id)).map((id) => S.routines[id].t);
  const p: PlanInput = {
    home: input.home ? S.homes[input.home] : '', homeL: input.home ? S.homeL[input.home] : '', n: input.rooms.length, ch: rc.ch, pkg: rc.pkg, price,
    ctrl: rc.ctrlTxt, extras: rc.extrasTxt, rooms: planRooms(locale, input.rooms, names), liked, eng: rc.eng,
  };
  const msg = input.home ? S.msg(p) : bookVisitMessage(locale);
  return { p, rc, names, price, msg, text: S.planText(p) };
}
