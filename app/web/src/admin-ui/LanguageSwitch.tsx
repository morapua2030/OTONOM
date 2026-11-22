'use client';
import { useEffect } from 'react';
import { useTranslation } from '@payloadcms/ui';
import { langOf, pick, UI, type AdminLang } from './copy.ts';

export const LANG_COOKIE = 'payload-lng';
const hasLangCookie = () => new RegExp(`(?:^|;\\s*)${LANG_COOKIE}=`).test(document.cookie);
/** The UI-language preference only (not an auth cookie); Payload's own account-page selector writes the same cookie. */
export function writeLangCookie(lang: AdminLang) {
  const secure = window.location.protocol === 'https:' ? '; secure' : '';
  document.cookie = `${LANG_COOKIE}=${lang}; path=/; max-age=31536000; samesite=lax${secure}`;
}

/**
 * «عربي | English» in the admin menu (R3, M1). It uses Payload's own switch (server action + refresh), so every
 * Payload screen, the labels and the page direction follow. With no saved choice the admin opens in Arabic: a first
 * visit without the cookie saves Arabic (and switches to it when the browser asked for English).
 */
export function AdminLanguageSwitch() {
  const { i18n, switchLanguage } = useTranslation();
  const current = langOf(i18n.language);
  useEffect(() => {
    if (hasLangCookie()) return;
    if (current === 'ar') writeLangCookie('ar');
    else void switchLanguage?.('ar');
    // first render only: a later change is the user's own choice
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const choose = (lang: AdminLang) => {
    if (lang === current) return;
    void switchLanguage?.(lang);
  };
  return (
    <div className="otn-lang" role="group" aria-label={pick(UI.language, current)}>
      <button type="button" lang="ar" className="otn-lang__btn" aria-pressed={current === 'ar'} onClick={() => choose('ar')}>
        عربي
      </button>
      <button type="button" lang="en" className="otn-lang__btn" aria-pressed={current === 'en'} onClick={() => choose('en')}>
        English
      </button>
    </div>
  );
}
