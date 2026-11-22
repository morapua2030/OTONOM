import { cookies } from 'next/headers';

/** The admin language the person chose (Payload's `payload-lng` cookie); Arabic when there is no saved choice (R3). */
export async function staffLang(): Promise<'ar' | 'en'> {
  return (await cookies()).get('payload-lng')?.value === 'en' ? 'en' : 'ar';
}
