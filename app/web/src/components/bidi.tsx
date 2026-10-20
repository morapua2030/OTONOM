import { Fragment, type ReactNode } from 'react';

/**
 * Bidirectional-text helpers (spike V-6 defects D1–D3).
 * - <Ltr>: always-LTR technical tokens (SKU, serial, phone, e-mail, file name, unit, reference, percentage, ISO date).
 *   NEVER put Arabic words inside <Ltr> (e.g. a localized "14 أكتوبر 2026"): use <Bidi> for those.
 * - <Bidi>: for free text in an RTL page, isolates every Latin/number run (including adjacent brackets, units and
 *   percent signs) in its own <bdi dir="ltr"> so punctuation and parentheses are not mirrored or reordered.
 */
export function Ltr({ children, className, wrap }: { children: ReactNode; className?: string; wrap?: boolean }) {
  return (
    <bdi dir="ltr" className={['ltr', wrap ? '' : 'nowrap', className ?? ''].filter(Boolean).join(' ')}>
      {children}
    </bdi>
  );
}

// A run starts with an optional opening bracket/plus sign and a Latin letter or digit, may contain Latin letters, digits,
// spaces and technical punctuation, and ends with a Latin letter, digit, closing bracket, % or a unit symbol.
const LTR_RUN = /[([+]?[A-Za-z0-9][A-Za-z0-9 .,:/_\-+×°²³@#&'’]*[A-Za-z0-9)\]%°²³]|[([+]?[A-Za-z0-9][)\]%]?/g;
/** Short technical runs (phone, SKU, reference, file name) must not break across lines. */
const NOWRAP_MAX = 40;
const ARABIC = /[؀-ۿݐ-ݿࢠ-ࣿ]/;

export function isolateRuns(text: string): Array<{ ltr: boolean; s: string }> {
  const out: Array<{ ltr: boolean; s: string }> = [];
  let last = 0;
  for (const m of text.matchAll(LTR_RUN)) {
    const i = m.index ?? 0;
    if (i > last) out.push({ ltr: false, s: text.slice(last, i) });
    out.push({ ltr: true, s: m[0] });
    last = i + m[0].length;
  }
  if (last < text.length) out.push({ ltr: false, s: text.slice(last) });
  return out;
}

export function Bidi({ text, locale }: { text: string | null | undefined; locale: string }) {
  if (!text) return null;
  // LTR pages and pure-Latin strings need no isolation
  if (locale !== 'ar' || !ARABIC.test(text)) return <>{text}</>;
  return (
    <>
      {isolateRuns(text).map((r, k) =>
        r.ltr ? (
          <bdi dir="ltr" key={k} className={r.s.length <= NOWRAP_MAX ? 'ltr nowrap' : 'ltr'}>
            {r.s}
          </bdi>
        ) : (
          <Fragment key={k}>{r.s}</Fragment>
        ),
      )}
    </>
  );
}

const LRI = String.fromCharCode(0x2066); // LEFT-TO-RIGHT ISOLATE
const PDI = String.fromCharCode(0x2069); // POP DIRECTIONAL ISOLATE
/**
 * Plain-text variant for places that cannot contain markup (<option>, <title>, aria-label, meta description):
 * wraps each Latin/number run of an Arabic string in Unicode LEFT-TO-RIGHT ISOLATE … POP DIRECTIONAL ISOLATE.
 */
export function isolateText(text: string, locale: string): string {
  if (locale !== 'ar' || !text || !ARABIC.test(text)) return text;
  return isolateRuns(text)
    .map((r) => (r.ltr ? `${LRI}${r.s}${PDI}` : r.s))
    .join('');
}

/** Wraps a whole plain-text token in LRI … PDI (for titles/attributes in RTL pages). */
export const ltrIsolate = (s: string) => `${LRI}${s}${PDI}`;

/**
 * Money: the digits are an LTR isolate, the currency label stays in the page direction, so Arabic reads
 * "<amount> ج.م." in RTL order and English reads "EGP <amount>".
 */
export function Money({ minor, locale, format }: { minor: number; locale: 'ar' | 'en'; format: (minor: number, l: 'ar' | 'en') => string }) {
  const amount = <Ltr>{format(minor, locale)}</Ltr>;
  return locale === 'ar' ? (
    <span className="money">
      {amount} ج.م.
    </span>
  ) : (
    <span className="money">EGP {amount}</span>
  );
}
