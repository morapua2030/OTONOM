'use client';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import s from './staff.module.css';

/**
 * Generic staff action: calls an EXISTING server endpoint (the server remains the only authority — this component
 * never decides permissions or business rules), shows the stable response code, refreshes the server view on success.
 */
export type Field =
  | { name: string; label: string; type: 'text' | 'date' | 'datetime' | 'number' | 'checkbox'; required?: boolean; placeholder?: string }
  | { name: string; label: string; type: 'money'; required?: boolean } // entered in EGP, sent in minor units
  | { name: string; label: string; type: 'select'; options: string[]; required?: boolean }
  | { name: string; label: string; type: 'list'; required?: boolean; placeholder?: string }; // comma-separated → string[]

export function ActionForm(props: {
  endpoint: string;
  method?: 'POST' | 'PATCH' | 'GET';
  label: string;
  fields?: Field[];
  fixed?: Record<string, unknown>;
  confirm?: string;
  testId?: string;
  secondary?: boolean;
  /** GET endpoints that return text/plain (handoff summary) are shown verbatim */
  showBody?: boolean;
  /** build a nested object, e.g. serialsByLine: {lineId: [..]} */
  nestUnder?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit(ev: FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    if (props.confirm && !window.confirm(props.confirm)) return;
    setBusy(true);
    setRes(null);
    const f = new FormData(ev.currentTarget);
    const body: Record<string, unknown> = { ...(props.fixed ?? {}) };
    const nested: Record<string, unknown> = {};
    for (const fd of props.fields ?? []) {
      const raw = f.get(fd.name);
      const target = props.nestUnder ? nested : body;
      if (fd.type === 'checkbox') target[fd.name] = raw === 'on';
      else if (raw === null || raw === '') continue;
      else if (fd.type === 'number') target[fd.name] = Number(raw);
      else if (fd.type === 'money') target[fd.name] = Math.round(Number(String(raw).replace(/,/g, '')) * 100);
      else if (fd.type === 'datetime' || fd.type === 'date') target[fd.name] = new Date(String(raw)).toISOString();
      else if (fd.type === 'list')
        target[fd.name] = String(raw)
          .split(/[\s,]+/)
          .map((x) => x.trim())
          .filter(Boolean);
      else target[fd.name] = String(raw);
    }
    if (props.nestUnder) body[props.nestUnder] = nested;
    // path tokens like __serial__ are filled from the form field of the same name (and removed from the body)
    const endpoint = props.endpoint.replace(/__([a-zA-Z]+)__/g, (_m, name: string) => {
      const key = Object.keys(body).find((k) => k.toLowerCase() === name.toLowerCase());
      const v = key ? String(body[key]) : '';
      if (key) delete body[key];
      return encodeURIComponent(v.trim().toUpperCase());
    });
    try {
      const r = await fetch(endpoint, {
        method: props.method ?? 'POST',
        credentials: 'include',
        headers: props.method === 'GET' ? {} : { 'content-type': 'application/json', 'x-correlation-id': crypto.randomUUID() },
        body: props.method === 'GET' ? undefined : JSON.stringify(body),
      });
      const text = await r.text();
      let shown = text;
      try {
        const j = JSON.parse(text);
        shown = j.code ? `${j.code}${j.candidates ? `\n${JSON.stringify(j.candidates)}` : ''}${j.fieldErrors ? `\n${JSON.stringify(j.fieldErrors)}` : ''}` : j.errors ? j.errors.map((e: any) => e.message).join('; ') : props.showBody ? JSON.stringify(j, null, 1) : 'OK';
        if (r.ok && j.claimCode) shown = `Claim code (shown once — hand to the resident): ${j.claimCode}`;
        if (r.ok && j.ref && !j.code) shown = `OK — ${j.ref}`;
      } catch {
        /* text body (e.g. handoff summary) */
      }
      setRes({ ok: r.ok, text: `${r.status} ${shown}`.slice(0, 1200) });
      // keep the outcome readable before the server view re-renders (the form may disappear after a state change)
      if (r.ok && props.method !== 'GET') setTimeout(() => router.refresh(), 1500);
    } catch {
      setRes({ ok: false, text: 'Network error — nothing was changed by this client.' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className={s.form} onSubmit={submit} data-testid={props.testId} aria-busy={busy}>
      {(props.fields ?? []).map((fd) => (
        <label key={fd.name}>
          {fd.label}
          {fd.type === 'select' ? (
            <select name={fd.name} required={fd.required} defaultValue="">
              <option value="" disabled>
                —
              </option>
              {fd.options.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          ) : fd.type === 'checkbox' ? (
            <input name={fd.name} type="checkbox" />
          ) : (
            <input
              name={fd.name}
              required={fd.required}
              dir="ltr"
              type={fd.type === 'money' || fd.type === 'number' ? 'number' : fd.type === 'datetime' ? 'datetime-local' : fd.type === 'date' ? 'date' : 'text'}
              step={fd.type === 'money' ? '0.01' : undefined}
              placeholder={'placeholder' in fd ? fd.placeholder : undefined}
            />
          )}
        </label>
      ))}
      <button className={props.secondary ? `${s.btn} ${s.btnSecondary}` : s.btn} disabled={busy} type="submit">
        {busy ? 'Working…' : props.label}
      </button>
      {res && (
        <div className={`${s.result} ${res.ok ? s.ok : s.err}`} role="status" aria-live="polite" data-testid={props.testId ? `${props.testId}-result` : undefined}>
          {res.text}
        </div>
      )}
    </form>
  );
}
