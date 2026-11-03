/** `?demo=` allow-list: the design's `simDemo` preset states. Kept tiny because the language switch uses it on every page. */
export const SIM_DEMOS = ['fresh', 'apartment', 'night', 'routine', 'gas', 'day', 'over', 'plan'] as const;
export type SimDemo = (typeof SIM_DEMOS)[number];
/** Only the design's `simDemo` values are accepted; anything else (or nothing) is ignored. */
export function isSimDemo(value: unknown): value is SimDemo {
  return typeof value === 'string' && (SIM_DEMOS as readonly string[]).includes(value);
}
