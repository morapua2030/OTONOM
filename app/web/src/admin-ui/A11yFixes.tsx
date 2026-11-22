'use client';
import { useEffect } from 'react';
import { useTranslation } from '@payloadcms/ui';
import { A11Y_COPY, langOf, pick } from './copy.ts';

/**
 * Accessible names and roles that Payload 3.90.2 leaves out on a few of its own controls (axe, R3): the pagination
 * arrows, row checkboxes, "more options" buttons, the drag handles of list rows, select inputs, focusable icons inside
 * hidden select parts, and the document tabs list. Only ARIA attributes / tab order of decorative icons change; behaviour and data are untouched.
 * Runs after the page has hydrated and again when Payload renders new parts.
 */
export function A11yFixes() {
  const { i18n } = useTranslation();
  const lang = langOf(i18n.language);
  useEffect(() => {
    const t = (key: keyof typeof A11Y_COPY) => pick(A11Y_COPY[key], lang);
    const named = (el: Element, name: string) => {
      if (el.getAttribute('aria-label') !== name) el.setAttribute('aria-label', name);
    };
    const apply = () => {
      document.querySelectorAll('button.clickable-arrow--left').forEach((b) => named(b, t('prevPage')));
      document.querySelectorAll('button.clickable-arrow--right').forEach((b) => named(b, t('nextPage')));
      document.querySelectorAll('.table input[type="checkbox"]').forEach((i) => {
        if (!i.getAttribute('aria-label')) named(i, i.closest('thead') ? t('selectAll') : t('selectRow'));
      });
      document.querySelectorAll('button.popup-button').forEach((b) => {
        if (!b.textContent?.trim() && !b.getAttribute('aria-label')) named(b, t('moreOptions'));
      });
      // the drag handle of a list row (for example a booking note): a role=button with no text
      document.querySelectorAll('[role="button"][aria-roledescription="sortable"]').forEach((h) => {
        if (!h.textContent?.trim()) named(h, t('dragToReorder'));
      });
      document.querySelectorAll('.react-select input.rs__input').forEach((input) => {
        const label = input.closest('.field-type')?.querySelector('.field-label')?.textContent?.replace(/\*/g, '').trim();
        if (label && !input.getAttribute('aria-label')) named(input, label);
      });
      document.querySelectorAll('.clear-indicator[aria-hidden="true"], .dropdown-indicator[aria-hidden="true"]').forEach((el) => {
        if (el.getAttribute('tabindex') !== '-1') el.setAttribute('tabindex', '-1');
      });
      document.querySelectorAll('ul.doc-tabs__tabs:not([role])').forEach((ul) => ul.setAttribute('role', 'none'));
      document.querySelectorAll('.doc-tab[aria-label]').forEach((tab) => {
        const text = tab.textContent?.replace(/\s+/g, ' ').trim();
        if (text) named(tab, text);
      });
    };
    let frame = 0;
    const schedule = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        apply();
      });
    };
    const start = window.setTimeout(apply, 0);
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { subtree: true, childList: true });
    return () => {
      window.clearTimeout(start);
      if (frame) window.cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [lang]);
  return null;
}
