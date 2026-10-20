import { notFound } from 'next/navigation';
import { isLocale, type Locale } from '@/lib/i18n.ts';
import { Bidi, Ltr, Money } from '@/components/bidi.tsx';
import { formatAmountMinor, formatDate, formatNumber, formatPercent } from '@/lib/format.ts';

// TEST-ONLY conformance page for automated + human RTL review. 404 unless OTONOM_TEST_PAGES=1 (never in a public build).
// Every value below is SYNTHETIC and labelled as such; none is a price, specification or claim.
export const dynamic = 'force-dynamic';
export const metadata = { robots: { index: false, follow: false }, title: 'Bidi samples (test only)' };

const TOKENS: Array<[string, string, string]> = [
  ['sku', 'SYN-RC04-A-STD', 'رمز منتج اصطناعي'],
  ['serial', 'SYN-0001-2026', 'رقم تسلسلي اصطناعي'],
  ['phone', '+20 100 000 0000', 'هاتف'],
  ['email', 'synthetic.buyer@example.com', 'بريد إلكتروني'],
  ['cad', 'Villa-A_Ground-Floor_rev3.dwg', 'ملف CAD'],
  ['unit', '10 A / 230 V AC', 'وحدة كهربائية (مثال)'],
  ['cable', '2.5 mm²', 'مقطع كابل (مثال)'],
  ['ref', 'RFQ-2026-ABC234', 'رقم مرجعي'],
];

const SENTENCES_AR = [
  'تم تجهيز وحدة التحكم (RC04) بأربع قنوات للاختبار فقط.',
  'المرجع RFQ-2026-ABC234 بانتظار المراجعة الهندسية (V-6).',
  'نسبة التغطية 80% من العقود الموقّعة — بيانات اصطناعية.',
  'يمكن التواصل عبر synthetic.buyer@example.com أو +20 100 000 0000.',
  'الملف Villa-A_Ground-Floor_rev3.dwg يُطلب عبر قناة آمنة.',
  'التكامل مع Home Assistant وGoogle Home يُحدد لكل مشروع.',
];

const ROWS: Array<[string, number, number]> = [
  ['WEBSITE_SOURCED', 320000000, 64.6],
  ['WEBSITE_ASSISTED', 80000000, 16.2],
  ['NON_WEBSITE', 95000000, 19.2],
];

export default async function BidiSamples({ params }: { params: Promise<{ locale: string }> }) {
  if (process.env.OTONOM_TEST_PAGES !== '1') notFound();
  const { locale: l } = await params;
  if (!isLocale(l)) notFound();
  const locale = l as Locale;
  const ar = locale === 'ar';
  return (
    <article data-test-page="bidi-samples">
      <section className="hero">
        <span className="placeholder">{ar ? 'صفحة اختبار — بيانات اصطناعية' : 'Test page — synthetic data'}</span>
        <h1>
          <Bidi text={ar ? 'عينات الاتجاه المختلط (V-6)' : 'Mixed-direction samples (V-6)'} locale={locale} />
        </h1>
      </section>
      <section className="section">
        <h2>{ar ? 'رموز تقنية' : 'Technical tokens'}</h2>
        <ul data-samples="tokens">
          {TOKENS.map(([k, v, label]) => (
            <li key={k} data-kind={k}>
              <Bidi text={ar ? label : k} locale={locale} />: <Ltr>{v}</Ltr>
            </li>
          ))}
        </ul>
      </section>
      <section className="section">
        <h2>{ar ? 'جمل مختلطة' : 'Mixed sentences'}</h2>
        {SENTENCES_AR.map((s) => (
          <p key={s} data-samples="sentence">
            <Bidi text={ar ? s : s.replace(/[؀-ۿ]+/g, '…')} locale={locale} />
          </p>
        ))}
      </section>
      <section className="section">
        <h2>{ar ? 'جدول أرقام (اصطناعي)' : 'Numeric table (synthetic)'}</h2>
        <div className="table-scroll">
          <table className="data" data-samples="table">
            <thead>
              <tr>
                <th scope="col">{ar ? 'التصنيف' : 'Class'}</th>
                <th scope="col" className="num">{ar ? 'القيمة' : 'Value'}</th>
                <th scope="col" className="num">{ar ? 'النسبة' : 'Share'}</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map(([k, v, p]) => (
                <tr key={k}>
                  <td>
                    <Ltr wrap>{k}</Ltr>
                  </td>
                  <td className="num">
                    <Money minor={v} locale={locale} format={formatAmountMinor} />
                  </td>
                  <td className="num">
                    <Ltr>{formatPercent(p, locale)}</Ltr>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          {ar ? 'تاريخ' : 'Date'}: <Bidi text={formatDate('2026-10-14T00:00:00Z', locale)} locale={locale} /> · {ar ? 'كمية' : 'Qty'}: <Ltr>{formatNumber(1250, locale)}</Ltr>
        </p>
      </section>
      <section className="section">
        <h2>{ar ? 'حقول بحالة خطأ' : 'Fields in error state'}</h2>
        <form className="rfq" aria-label={ar ? 'نموذج عينة' : 'Sample form'} data-samples="form">
          <label>
            {ar ? 'رقم الهاتف' : 'Phone'}
            <input id="s-phone" type="tel" dir="ltr" defaultValue="+20 100 000 0000" aria-invalid aria-describedby="s-phone-err" readOnly />
            <span className="err" id="s-phone-err">
              {ar ? 'القيمة غير صحيحة' : 'Invalid value'}
            </span>
          </label>
          <label>
            {ar ? 'البريد الإلكتروني' : 'Email'}
            <input id="s-email" type="email" dir="ltr" defaultValue="synthetic.buyer@example.com" readOnly />
          </label>
          <label>
            {ar ? 'تاريخ التركيب' : 'Installation date'}
            <input id="s-date" type="date" dir="ltr" defaultValue="2026-10-14" readOnly />
          </label>
        </form>
      </section>
    </article>
  );
}
