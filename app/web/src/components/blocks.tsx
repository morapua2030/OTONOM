import type { ReactNode } from 'react';
import { Bidi } from './bidi.tsx';

// Presentation blocks for the B2B preview (restrained, text-first; no imagery until rights-cleared assets exist).

export function Cards({ items, locale, badge, columns = 3 }: { items: { title: string; body: string }[]; locale: string; badge?: string; columns?: 2 | 3 }) {
  return (
    <ul className={`cards cols-${columns}`}>
      {items.map((it) => (
        <li className="card" key={it.title}>
          {badge && <span className="tag">{badge}</span>}
          <h3>
            <Bidi text={it.title} locale={locale} />
          </h3>
          <p>
            <Bidi text={it.body} locale={locale} />
          </p>
        </li>
      ))}
    </ul>
  );
}

export function Steps({ steps, locale }: { steps: { title: string; body: string }[]; locale: string }) {
  return (
    <ol className="steps-list">
      {steps.map((s) => (
        <li key={s.title}>
          <h3>
            <Bidi text={s.title} locale={locale} />
          </h3>
          <p>
            <Bidi text={s.body} locale={locale} />
          </p>
        </li>
      ))}
    </ol>
  );
}

export function Faq({ items, locale }: { items: { q: string; a: string }[]; locale: string }) {
  return (
    <div className="faq">
      {items.map((f) => (
        <details key={f.q}>
          <summary>
            <Bidi text={f.q} locale={locale} />
          </summary>
          <p>
            <Bidi text={f.a} locale={locale} />
          </p>
        </details>
      ))}
    </div>
  );
}

export function Checklist({ items, locale }: { items: string[]; locale: string }) {
  return (
    <ul className="checklist">
      {items.map((i) => (
        <li key={i}>
          <Bidi text={i} locale={locale} />
        </li>
      ))}
    </ul>
  );
}

export function CtaBand({ title, body, children, locale }: { title: string; body: string; children: ReactNode; locale: string }) {
  return (
    <section className="cta-band" aria-labelledby="cta-band-title">
      <h2 id="cta-band-title">
        <Bidi text={title} locale={locale} />
      </h2>
      <p>
        <Bidi text={body} locale={locale} />
      </p>
      <div className="actions">{children}</div>
    </section>
  );
}
