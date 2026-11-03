import type { ReactNode } from 'react';
import type { Locale } from '@/lib/i18n.ts';
import { Bidi } from './bidi.tsx';

/**
 * Design v2 (DR-099) highlight swash: one key word sits on a decorative light-blue blob.
 * The blob is an empty, aria-hidden span, so assistive technology reads the heading text unchanged.
 */
export function Swash({ children }: { children: ReactNode }) {
  return (
    <span className="v2-swash">
      <span className="v2-swash-blob" aria-hidden="true" />
      <span className="v2-swash-text">{children}</span>
    </span>
  );
}

/**
 * Heading text with the swash on `word` (when it occurs in `text`) or on the last word.
 * Every part still goes through <Bidi>, so Latin/number runs stay isolated in Arabic.
 */
export function SwashText({ text, locale, word }: { text: string; locale: Locale; word?: string }) {
  const trimmed = text.trim();
  let at = word ? trimmed.lastIndexOf(word) : -1;
  let target = word ?? '';
  if (at < 0) {
    at = trimmed.lastIndexOf(' ') + 1;
    target = trimmed.slice(at);
  }
  const before = trimmed.slice(0, at);
  const after = trimmed.slice(at + target.length);
  return (
    <>
      {before ? <Bidi text={before} locale={locale} /> : null}
      <Swash><Bidi text={target} locale={locale} /></Swash>
      {after ? <Bidi text={after} locale={locale} /> : null}
    </>
  );
}
