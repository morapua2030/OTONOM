/**
 * Simulator icons (`SIMI`) and the three home illustrations (`ART`), static design constants from the v4 export.
 * Rendered as inline, decorative SVG (no data: URLs, no network requests).
 */
import type { DevKey, HomeKey, RoomTypeKey } from '@/lib/simulator/rules.ts';

export const SIMI = {
  bulb: "<path d='M9 18h6M10 21h4M12 3a6 6 0 00-3.5 10.9c.6.5 1 1.2 1 2V17h5v-1.1c0-.8.4-1.5 1-2A6 6 0 0012 3z'/>",
  snow: "<path d='M12 2v20M4 7l16 10M20 7L4 17M9 4l3 2 3-2M9 20l3-2 3 2'/>",
  flame: "<path d='M12 3c1 3 5 5 5 10a5 5 0 01-10 0c0-2 1-3.5 2-4.5 0 2 1 3 2 3 0-3-1-5 1-8.5z'/>",
  drop: "<path d='M12 3s6 6.5 6 11a6 6 0 01-12 0c0-4.5 6-11 6-11z'/>",
  fan: "<circle cx='12' cy='12' r='1.5'/><path d='M12 10.5C12 6 14 3 16.5 4.5S15 10 12 10.5zM13.5 12c4.5 0 7.5 2 6 4.5S14 15 13.5 12zM12 13.5c0 4.5-2 7.5-4.5 6S9 14 12 13.5zM10.5 12C6 12 3 10 4.5 7.5S10 9 10.5 12z'/>",
  curtain: "<path d='M3 4h18M5 4v16M19 4v16M5 4c0 6 3 9 5 16M19 4c0 6-3 9-5 16'/>",
  garage: "<path d='M3 10l9-6 9 6v10H3z'/><path d='M7 20v-7h10v7M7 16h10'/>",
  plug: "<path d='M9 2v5M15 2v5M6 7h12v4a6 6 0 01-12 0zM12 17v5'/>",
  lock: "<rect x='5' y='11' width='14' height='10' rx='2'/><path d='M8 11V7a4 4 0 018 0v4'/>",
  unlock: "<rect x='5' y='11' width='14' height='10' rx='2'/><path d='M8 11V7a4 4 0 017.5-2'/>",
  heart: "<path d='M12 20s-7-4.5-7-10a4 4 0 017-2.6A4 4 0 0119 10c0 5.5-7 10-7 10z'/>",
  sun: "<circle cx='12' cy='12' r='4'/><path d='M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4'/>",
  moon: "<path d='M20 14.5A8 8 0 019.5 4 8 8 0 1020 14.5z'/>",
  play: "<path d='M7 4l13 8-13 8z'/>",
  pause: "<path d='M8 4v16M16 4v16'/>",
  x: "<path d='M6 6l12 12M18 6L6 18'/>",
  bell: "<path d='M6 16V11a6 6 0 0112 0v5l2 2H4zM10 20a2 2 0 004 0'/>",
  check: "<path d='M20 6L9 17l-5-5'/>",
  sofa: "<path d='M4 12V9a2 2 0 012-2h12a2 2 0 012 2v3M3 12h18v5H3zM5 17v2M19 17v2'/>",
  bed: "<path d='M3 18V6M3 13h18v5M21 13v0a3 3 0 00-3-3h-7v3M7 11h.01'/>",
  star: "<path d='M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6-5.3-3-5.3 3 1.2-6L3.4 9.3l6-.7z'/>",
  pot: "<path d='M4 10h16v7a3 3 0 01-3 3H7a3 3 0 01-3-3zM2 10h20M9 6V4M15 6V4'/>",
  bath: "<path d='M4 12h16v3a5 5 0 01-5 5H9a5 5 0 01-5-5zM6 12V6a2 2 0 014 0M7 20l-1 2M17 20l1 2'/>",
  door: "<path d='M4 21V3h16v18M9 21V9h6v12M13 15h.01'/>",
  stairs: "<path d='M3 20h5v-5h5v-5h5V5h3'/>",
  desk: "<path d='M3 10h18M5 10v10M19 10v10M8 6h8v4H8z'/>",
  tree: "<path d='M12 22v-8M8 14a4 4 0 01-1-7.9A5 5 0 0117 6a4 4 0 01-1 8z'/>",
  balcony: "<path d='M3 12h18M5 12v8M9 12v8M13 12v8M17 12v8M3 20h18M7 12V5h10v7'/>",
} as const;
export type SimIconName = keyof typeof SIMI;

export const RICON: Record<RoomTypeKey, SimIconName> = { reception: 'sofa', bed: 'bed', kids: 'star', kitchen: 'pot', bath: 'bath', corridor: 'door', stairs: 'stairs', office: 'desk', garden: 'tree', balcony: 'balcony', garage: 'garage' };
export const DICON: Record<DevKey, SimIconName> = { heater: 'flame', pump: 'drop', fan: 'fan', curtain: 'curtain', garage: 'garage', other: 'plug' };

/** Decorative stroke icon; `stroke`/`fill` are design colours. */
export function SimIcon({ name, stroke = '#0F2238', fill = 'none', size = 22, className }: { name: SimIconName; stroke?: string; fill?: string; size?: number; className?: string }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={stroke} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" dangerouslySetInnerHTML={{ __html: SIMI[name] }} />
  );
}

const S2 = "stroke='#0F2238' stroke-width='2'";
const ART: Record<HomeKey, string> = {
  apt: `<path d='M10 110h140' ${S2}/><rect x='48' y='12' width='64' height='98' rx='6' fill='#E8F6FD' ${S2}/>` + [24, 46, 68].map((y, i) => [60, 88].map((x, j) => `<rect x='${x}' y='${y}' width='12' height='12' rx='2' fill='${(i + j) % 2 ? '#FFFFFF' : '#18A3E0'}' ${S2}/>`).join('')).join('') + `<rect x='72' y='90' width='16' height='20' rx='2' fill='#FFFFFF' ${S2}/>`,
  duplex: `<path d='M10 110h140' ${S2}/><path d='M36 52L80 20l44 32' ${S2} stroke-linecap='round'/><rect x='44' y='46' width='72' height='64' rx='4' fill='#E8F6FD' ${S2}/><path d='M44 78h72' ${S2}/><rect x='54' y='54' width='14' height='14' rx='2' fill='#18A3E0' ${S2}/><rect x='92' y='54' width='14' height='14' rx='2' fill='#FFFFFF' ${S2}/><rect x='54' y='86' width='14' height='14' rx='2' fill='#FFFFFF' ${S2}/><rect x='88' y='88' width='16' height='22' rx='2' fill='#18A3E0' ${S2}/>`,
  villa: `<path d='M6 110h148' ${S2}/><circle cx='140' cy='72' r='12' fill='#B8DDF3' ${S2}/><path d='M140 84v26' ${S2}/><path d='M12 58L56 28l44 30' ${S2} stroke-linecap='round'/><rect x='18' y='54' width='78' height='56' rx='4' fill='#E8F6FD' ${S2}/><rect x='96' y='72' width='30' height='38' rx='2' fill='#FFFFFF' ${S2}/><path d='M100 82h22M100 92h22M100 102h22' ${S2}/><rect x='28' y='66' width='14' height='14' rx='2' fill='#18A3E0' ${S2}/><rect x='72' y='66' width='14' height='14' rx='2' fill='#FFFFFF' ${S2}/><rect x='48' y='88' width='16' height='22' rx='2' fill='#18A3E0' ${S2}/>`,
};

export function HomeArt({ home }: { home: HomeKey }) {
  return <svg className="sim-home-art" viewBox="0 0 160 120" fill="none" strokeLinejoin="round" aria-hidden="true" focusable="false" dangerouslySetInnerHTML={{ __html: ART[home] }} />;
}
