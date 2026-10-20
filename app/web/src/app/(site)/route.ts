// "/" → locale negotiation: explicit cookie, then Accept-Language, default Arabic (Egypt-first, DR-046 proposal).
export function GET(req: Request) {
  const cookie = req.headers.get('cookie') ?? '';
  const pref = /(?:^|;\s*)otonom_locale=(ar|en)/.exec(cookie)?.[1];
  const accept = (req.headers.get('accept-language') ?? '').toLowerCase();
  const locale = pref ?? (accept.startsWith('en') ? 'en' : 'ar');
  return new Response(null, { status: 307, headers: { location: `/${locale}`, vary: 'accept-language, cookie' } });
}
