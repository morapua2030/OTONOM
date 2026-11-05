import type { ReactNode } from 'react';
import type { Locale } from '@/lib/i18n.ts';
import { ICON_PATHS } from '@/lib/site-copy.ts';
import { INNER } from '@/lib/site-copy-inner.ts';
import { EXTERNAL_LINK, telHref, whatsappHref } from '@/lib/contact.ts';
import { Bidi } from './bidi.tsx';
import { Swash } from './v2.tsx';

/** Design icon (24×24 stroke paths from the v3.1 export), decorative. The paths are static design constants. */
export function Icon({ name }: { name: string }) {
  const paths = ICON_PATHS[name] ?? '';
  return (
    <svg className="v3-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" dangerouslySetInnerHTML={{ __html: paths }} />
  );
}

/** Abstract circuit illustration (service and business heroes), decorative, from the design. */
export function Circuit() {
  return (
    <div className="v3-circuit" aria-hidden="true">
      <svg viewBox="0 0 400 320" focusable="false">
        <g fill="none" stroke="#0F2238" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M40 60H120V120H150" /><path d="M40 260H110V200H150" /><path d="M360 60H290V120H250" /><path d="M360 260H290V200H250" />
          <path d="M200 20V100" /><path d="M200 220V300" /><path d="M60 160H150" /><path d="M250 160H340" />
        </g>
        <rect x="150" y="100" width="100" height="120" rx="14" fill="#FFFFFF" stroke="#0F2238" strokeWidth="2" />
        <rect x="172" y="124" width="56" height="72" rx="8" fill="#18A3E0" stroke="#0F2238" strokeWidth="2" />
        <g stroke="#0F2238" strokeWidth="2">
          <circle cx="40" cy="60" r="9" fill="#18A3E0" /><circle cx="40" cy="260" r="9" fill="#FFFFFF" /><circle cx="360" cy="60" r="9" fill="#FFFFFF" /><circle cx="360" cy="260" r="9" fill="#18A3E0" />
          <circle cx="200" cy="20" r="9" fill="#B8DDF3" /><circle cx="200" cy="300" r="9" fill="#B8DDF3" /><circle cx="60" cy="160" r="9" fill="#FFFFFF" /><circle cx="340" cy="160" r="9" fill="#FFFFFF" />
        </g>
      </svg>
    </div>
  );
}

/** Heading split into before / swash word / after, every part through <Bidi>. */
export function SplitTitle({ parts, locale }: { parts: readonly [string, string, string] | readonly string[]; locale: Locale }) {
  const [before, word, after] = parts as readonly string[];
  return (
    <>
      {before ? <Bidi text={before} locale={locale} /> : null}
      {word ? <Swash><Bidi text={word} locale={locale} /></Swash> : null}
      {after ? <Bidi text={after} locale={locale} /> : null}
    </>
  );
}

/** Inner page hero: eyebrow, H1, lead, actions, optional visual (design v3.1). */
export function InnerHero({ eyebrow, title, lead, actions, visual, locale }: { eyebrow: string; title: ReactNode; lead?: string; actions?: ReactNode; visual?: ReactNode; locale: Locale }) {
  return (
    <section className={`v3-hero${visual ? ' has-visual' : ''}`}>
      <div className="v3-hero-copy">
        <span className="v2-eyebrow"><Bidi text={eyebrow} locale={locale} /></span>
        <h1>{title}</h1>
        {lead ? <p className="v2-lead"><Bidi text={lead} locale={locale} /></p> : null}
        {actions ? <div className="v2-actions">{actions}</div> : null}
      </div>
      {visual}
    </section>
  );
}

/** Navy CTA band at the end of every inner page: "Book a visit" (page-specific WhatsApp message) and "Call us". */
export function CtaBand({ locale, message }: { locale: Locale; message: string }) {
  const t = INNER[locale];
  return (
    <section className="v2-section" aria-labelledby="cta-band-title">
      <div className="v2-band-dark v3-cta">
        <h2 id="cta-band-title">{t.ready}</h2>
        <div className="v2-actions">
          <a className="btn btn-on-dark is-primary" href={whatsappHref(message)} {...EXTERNAL_LINK} data-testid="cta-book">{t.bookVisit}</a>
          <a className="btn btn-on-dark" href={telHref()}>{t.callUs}</a>
        </div>
      </div>
    </section>
  );
}

/** Icon card grid (What we do / How we operate / What we offer). */
export function IconCards({ cards, locale }: { cards: ReadonlyArray<readonly [string, string, string]>; locale: Locale }) {
  return (
    <ul className={`v3-cards${cards.length === 3 ? ' is-three' : ''}`}>
      {cards.map(([icon, title, line]) => (
        <li className="v2-card" key={title}>
          <span className="v3-icon-box"><Icon name={icon} /></span>
          <h3 className="v2-card-title"><Bidi text={title} locale={locale} /></h3>
          <p><Bidi text={line} locale={locale} /></p>
        </li>
      ))}
    </ul>
  );
}

/** Numbered step cards (How we work / How it goes). */
export function StepCards({ steps, locale }: { steps: ReadonlyArray<readonly [string, string?]>; locale: Locale }) {
  return (
    <ol className="v2-steps">
      {steps.map(([title, body], index) => (
        <li className="v2-card" key={title}>
          <span className="v2-step-num" dir="ltr">{index + 1}</span>
          <h3 className="v2-card-title"><Bidi text={title} locale={locale} /></h3>
          {body ? <p><Bidi text={body} locale={locale} /></p> : null}
        </li>
      ))}
    </ol>
  );
}
