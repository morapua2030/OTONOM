'use client';
import { useEffect, useState } from 'react';
import type { AdminLang } from './copy.ts';

/**
 * The staff screens' language (R3): starts from the saved choice (Arabic when there is none), and every change is
 * saved in Payload's UI-language preference cookie (`payload-lng`, not an auth cookie), so the admin opens in the same
 * language after sign-in. The page's <html lang/dir> follows.
 */
export function useStaffLang(initial: AdminLang) {
  const [lang, setLang] = useState<AdminLang>(initial);
  useEffect(() => {
    const secure = window.location.protocol === 'https:' ? '; secure' : '';
    document.cookie = `payload-lng=${lang}; path=/; max-age=31536000; samesite=lax${secure}`;
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }, [lang]);
  return [lang, setLang] as const;
}

/** Logo (official lockup for light surfaces, never mirrored) and «عربي | English» for the staff screens. */
export function StaffHeader({ lang, onLang }: { lang: AdminLang; onLang: (lang: AdminLang) => void }) {
  return (
    <div className="staff-auth-heading">
      {/* eslint-disable-next-line @next/next/no-img-element -- the official logo file is shown byte-for-byte (brand guardian) */}
      <img className="staff-logo" src="/brand/otonom/assets/svg/primary_light.svg" alt="OTONOM IoT Solutions" width={820} height={217} />
      <div className="otn-lang" role="group" aria-label={lang === 'ar' ? 'اللغة' : 'Language'}>
        <button type="button" lang="ar" className="otn-lang__btn staff-language" aria-pressed={lang === 'ar'} onClick={() => onLang('ar')}>عربي</button>
        <button type="button" lang="en" className="otn-lang__btn staff-language" aria-pressed={lang === 'en'} onClick={() => onLang('en')}>English</button>
      </div>
    </div>
  );
}
