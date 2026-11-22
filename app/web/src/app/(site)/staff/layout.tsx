import type { ReactNode } from 'react';
import { staffLang } from '@/admin-ui/staff-lang.ts';
import '../site.css';
// R3: the OTONOM admin look for the staff screens only (public pages never load it)
import '../../../admin-ui/staff.css';

export const metadata = { title: 'Staff sign-in — OTONOM', robots: { index: false, follow: false } };

export default async function StaffLayout({ children }: { children: ReactNode }) {
  const lang = await staffLang();
  return (
    <html lang={lang} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <body className="otn-staff">
        <main className="wrap" style={{ maxWidth: 480, paddingBlock: 48 }}>
          {children}
        </main>
      </body>
    </html>
  );
}
