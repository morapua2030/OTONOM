import type { NavIcon } from './nav-types.ts';

/** Admin line icons: 24×24, stroke 1.6, round caps — the same outline style as the site's icons (components/v3.tsx). */
const PATHS: Record<NavIcon | 'phoneCall' | 'whatsapp' | 'logout' | 'arrow' | 'clock' | 'check' | 'off' | 'plus' | 'edit', string> = {
  home: "<path d='M3 10.5 12 3l9 7.5'/><path d='M5 9.5V21h14V9.5'/><path d='M9.5 21v-6h5v6'/>",
  inbox: "<path d='M3 13h5l1.5 3h5L16 13h5'/><path d='M5 5h14l2 8v6H3v-6z'/>",
  chart: "<path d='M4 20V10M10 20V4M16 20v-7M22 20H2'/>",
  box: "<path d='M21 8l-9-5-9 5 9 5 9-5zM3 8v8l9 5 9-5V8M12 13v8'/>",
  chip: "<rect x='6' y='6' width='12' height='12' rx='2'/><path d='M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4'/>",
  image: "<rect x='3' y='4' width='18' height='16' rx='2'/><circle cx='9' cy='10' r='2'/><path d='M21 16l-5-5-9 9'/>",
  megaphone: "<path d='M3 10v4h4l7 4V6L7 10z'/><path d='M18 9a4 4 0 010 6'/>",
  help: "<circle cx='12' cy='12' r='9'/><path d='M9.5 9.5a2.5 2.5 0 115 .5c0 1.5-2.5 2-2.5 3.5M12 17h.01'/>",
  phone: "<path d='M5 3h4l2 5-2.5 1.5a11 11 0 006 6L16 13l5 2v4a2 2 0 01-2 2A16 16 0 013 5a2 2 0 012-2z'/>",
  route: "<circle cx='6' cy='19' r='2'/><circle cx='18' cy='5' r='2'/><path d='M8 19h8.5a3.5 3.5 0 000-7h-9a3.5 3.5 0 010-7H16'/>",
  sliders: "<path d='M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6'/>",
  shield: "<path d='M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z'/><path d='M9 12l2 2 4-4'/>",
  form: "<rect x='4' y='3' width='16' height='18' rx='2'/><path d='M8 8h8M8 12h8M8 16h5'/>",
  users: "<circle cx='9' cy='8' r='3.5'/><path d='M2.5 20a6.5 6.5 0 0113 0'/><path d='M16 4.5a3.5 3.5 0 010 7M18 14a6.5 6.5 0 013.5 6'/>",
  lock: "<rect x='4' y='10' width='16' height='11' rx='2'/><path d='M8 10V7a4 4 0 018 0v3'/>",
  report: "<path d='M4 4h16v16H4z'/><path d='M8 16v-4M12 16V8M16 16v-6'/>",
  gear: "<circle cx='12' cy='12' r='3'/><path d='M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1'/>",
  eyeOff: "<path d='M3 3l18 18'/><path d='M10.6 6.1A9.8 9.8 0 0112 6c6 0 10 6 10 6a17 17 0 01-3.2 3.7M6.6 6.6A17 17 0 002 12s4 6 10 6a9.6 9.6 0 004.4-1'/><path d='M9.9 9.9a3 3 0 004.2 4.2'/>",
  phoneCall: "<path d='M5 3h4l2 5-2.5 1.5a11 11 0 006 6L16 13l5 2v4a2 2 0 01-2 2A16 16 0 013 5a2 2 0 012-2z'/>",
  whatsapp: "<path d='M3.5 20.5l1.3-4.2A8.5 8.5 0 1112 20.5a8.4 8.4 0 01-4.2-1.1z'/><path d='M9 8.5c0 3.5 3 6.5 6.5 6.5l1-1.6-2-1-1 .9a5 5 0 01-2.8-2.8l.9-1-1-2z'/>",
  logout: "<path d='M15 4h3a2 2 0 012 2v12a2 2 0 01-2 2h-3'/><path d='M10 8l-4 4 4 4M6 12h10'/>",
  arrow: "<path d='M9 6l6 6-6 6'/>",
  clock: "<circle cx='12' cy='12' r='9'/><path d='M12 7v5l3 2'/>",
  check: "<path d='M20 6L9 17l-5-5'/>",
  off: "<circle cx='12' cy='12' r='9'/><path d='M8 8l8 8'/>",
  plus: "<path d='M12 5v14M5 12h14'/>",
  edit: "<path d='M4 20h4L20 8l-4-4L4 16z'/><path d='M14 6l4 4'/>",
};
export type IconName = keyof typeof PATHS;

/** Decorative icon; the text next to it carries the meaning. */
export function Icon({ name, className }: { name: IconName; className?: string }) {
  return (
    <svg
      className={className ? `otn-icon ${className}` : 'otn-icon'}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      // static design constants defined above (no user input)
      dangerouslySetInnerHTML={{ __html: PATHS[name] }}
    />
  );
}
