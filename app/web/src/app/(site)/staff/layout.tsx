import type { ReactNode } from 'react';
import '../site.css';

export const metadata = { title: 'Staff sign-in — OTONOM', robots: { index: false, follow: false } };

export default function StaffLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" dir="ltr">
      <body>
        <main className="wrap" style={{ maxWidth: 480, paddingBlock: 48 }}>
          {children}
        </main>
      </body>
    </html>
  );
}
