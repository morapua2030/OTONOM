'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import type { Locale } from '@/lib/i18n.ts';
import { localProductText } from '@/lib/products.ts';
import {
  MAX_CIRCUITS_PER_ROOM,
  MAX_ROOMS,
  MAX_SINGLE_CONTROLLER_CHANNELS,
  ROOM_TYPES,
  isRoomType,
  packageChannelCapacity,
  packageControllers,
  packagesCovering,
  recommendController,
  roomControlNames,
  roomTypeLabel,
  sanitizeCircuits,
  totalCircuits,
  type RoomType,
} from '@/lib/product-selector.ts';
import { packageText } from '@/lib/smart-home-packages.ts';
import { Bidi } from './bidi.tsx';

const tx = (locale: Locale, ar: string, en: string) => (locale === 'ar' ? ar : en);

const CHANNEL_MIN = 1;
const CHANNEL_MAX = 48;
const CHANNEL_PRESETS = [4, 6, 16, 32, 48] as const;

type Mode = 'channels' | 'rooms';
type RoomRow = { id: number; type: RoomType; circuits: number };

/** Package guidance: names, controller quantities and capacities all come from the registries. */
function PackageGuidance({ locale, total }: { locale: Locale; total: number }) {
  const packages = packagesCovering(total);
  if (packages.length === 0) return null;
  return (
    <section className="selector-packages" aria-labelledby="selector-packages-title" data-testid="selector-packages">
      <h4 id="selector-packages-title">{tx(locale, 'إن كنت تفكر في باقة منزل ذكي كاملة', 'If you are considering a complete smart-home package')}</h4>
      <ul>
        {packages.map((pkg) => {
          const controllers = packageControllers(pkg);
          const capacity = packageChannelCapacity(pkg);
          return (
            <li key={pkg.id} data-package={pkg.id}>
              <p>
                <strong><Bidi text={packageText(pkg.name, locale)} locale={locale} /></strong>
                {': '}
                {tx(locale, 'تشمل ', 'includes ')}
                {controllers.map((entry, index) => (
                  <span key={entry.product.model}>
                    {index > 0 ? ' + ' : null}
                    <bdi dir="ltr">{entry.quantity}</bdi>
                    {' × '}
                    {tx(locale, 'وحدة ', '')}
                    <bdi dir="ltr">{`OTONOM ${entry.product.model.toUpperCase()}`}</bdi>
                  </span>
                ))}
                {tx(locale, ' — حتى ', ' — up to ')}
                <bdi dir="ltr">{capacity}</bdi>
                {tx(locale, ' قناة تحكم', ' control channels')}
              </p>
              <div className="selector-package-links">
                <a href={`/${locale}/smart-home/packages#package-${pkg.id}`}>{tx(locale, 'اعرض الباقة', 'View the package')}</a>
                <a href={`/${locale}/start-project?package=${pkg.id}&service=smart-home`}>{tx(locale, 'ابدأ موجزًا بهذه الباقة', 'Start a brief with this package')}</a>
              </div>
            </li>
          );
        })}
      </ul>
      <p className="selector-caveat">
        {tx(
          locale,
          'سعة القنوات محسوبة من وحدات التحكم الموجودة في الباقة فقط، ولا تؤكد ملاءمتها لمشروعك قبل المراجعة الهندسية.',
          'Channel capacity is calculated from the controllers included in the package only and does not confirm fit before engineering review.',
        )}
      </p>
    </section>
  );
}

export function SmartProductSelector({ locale }: { locale: Locale }) {
  const [mode, setMode] = useState<Mode>('channels');
  const [channels, setChannels] = useState(4);
  const [rooms, setRooms] = useState<RoomRow[]>([{ id: 1, type: 'living', circuits: 1 }]);
  const nextRoomId = useRef(2);
  const [focusRoomId, setFocusRoomId] = useState<number | null>(null);

  useEffect(() => {
    if (focusRoomId === null) return;
    document.getElementById(`selector-room-type-${focusRoomId}`)?.focus();
    setFocusRoomId(null);
  }, [focusRoomId]);

  const roomTotal = totalCircuits(rooms);
  const roomNames = roomControlNames(rooms, locale);
  const total = mode === 'channels' ? channels : roomTotal;
  const product = recommendController(total);
  const atRoomLimit = rooms.length >= MAX_ROOMS;

  const updateRoom = (id: number, patch: Partial<Omit<RoomRow, 'id'>>) =>
    setRooms((current) => current.map((room) => (room.id === id ? { ...room, ...patch } : room)));
  const addRoom = () => {
    if (atRoomLimit) return;
    const id = nextRoomId.current++;
    setRooms((current) => [...current, { id, type: 'other', circuits: 1 }]);
    setFocusRoomId(id);
  };
  const removeRoom = (id: number) => {
    if (rooms.length <= 1) return;
    const index = rooms.findIndex((room) => room.id === id);
    const remaining = rooms.filter((room) => room.id !== id);
    setRooms(remaining);
    setFocusRoomId(remaining[Math.min(index, remaining.length - 1)]?.id ?? null);
  };

  return (
    <div className="product-selector" data-testid="smart-product-selector" data-mode={mode}>
      <div className="product-selector-control">
        <div className="selector-mode" role="group" aria-label={tx(locale, 'طريقة الاختيار', 'Selection method')}>
          <button type="button" aria-pressed={mode === 'channels'} onClick={() => setMode('channels')}>{tx(locale, 'بعدد القنوات', 'By channel count')}</button>
          <button type="button" aria-pressed={mode === 'rooms'} onClick={() => setMode('rooms')}>{tx(locale, 'بالغرف', 'By room')}</button>
        </div>
        <p className="eyebrow"><Bidi text={tx(locale, 'منتقي منتج OTONOM', 'OTONOM PRODUCT SELECTOR')} locale={locale} /></p>
        <h2>{tx(locale, 'ابدأ بعدد دوائر التحكم', 'Start with the control-circuit count')}</h2>
        <p>
          {mode === 'channels'
            ? tx(locale, 'اختر عدد القنوات المستقلة المتوقع. النتيجة إرشاد مبدئي فقط ولا تستبدل مراجعة التصميم والتركيب.', 'Choose the expected number of independent channels. The result is preliminary guidance and does not replace design and installation review.')
            : tx(locale, 'أضف غرف المكان وعدد الدوائر التي تريد التحكم فيها في كل غرفة. النتيجة إرشاد مبدئي فقط ولا تستبدل مراجعة التصميم والتركيب.', 'Add the rooms in your space and how many circuits you want to control in each. The result is preliminary guidance and does not replace design and installation review.')}
        </p>
        {mode === 'channels' ? (
          <>
            <label htmlFor="selector-channels">{tx(locale, 'عدد القنوات المتوقع', 'Expected channel count')}</label>
            <div className="product-selector-input">
              <input
                id="selector-channels"
                type="range"
                min={CHANNEL_MIN}
                max={CHANNEL_MAX}
                step="1"
                value={channels}
                onChange={(event) => setChannels(Number(event.target.value))}
              />
              <output htmlFor="selector-channels"><bdi dir="ltr">{channels}</bdi></output>
            </div>
            <div className="product-selector-presets" aria-label={tx(locale, 'اختيارات سريعة', 'Quick choices')}>
              {CHANNEL_PRESETS.map((value) => <button type="button" key={value} aria-pressed={channels === value} onClick={() => setChannels(value)}><bdi dir="ltr">{value}</bdi></button>)}
            </div>
          </>
        ) : (
          <div className="selector-rooms">
            <p className="selector-rooms-help">{tx(locale, 'الدائرة = إضاءة أو حمل تتحكم فيه بشكل مستقل (مثلًا مجموعة مصابيح على مفتاح واحد).', 'A circuit is one independently controlled light or load (e.g. a group of lights on one switch).')}</p>
            <ol className="selector-room-list">
              {rooms.map((room, index) => {
                const name = roomNames[index];
                return (
                  <li className="selector-room-row" key={room.id}>
                    <div className="selector-room-field">
                      <label htmlFor={`selector-room-type-${room.id}`}>{tx(locale, 'نوع الغرفة', 'Room type')}</label>
                      <select
                        id={`selector-room-type-${room.id}`}
                        aria-label={tx(locale, `نوع الغرفة: ${name}`, `Room type: ${name}`)}
                        value={room.type}
                        onChange={(event) => { if (isRoomType(event.target.value)) updateRoom(room.id, { type: event.target.value }); }}
                      >
                        {ROOM_TYPES.map((type) => <option key={type} value={type}>{roomTypeLabel(type, locale)}</option>)}
                      </select>
                    </div>
                    <div className="selector-room-field">
                      <label htmlFor={`selector-room-circuits-${room.id}`}>{tx(locale, 'عدد الدوائر', 'Circuits')}</label>
                      <div className="selector-room-actions">
                        <div className="selector-stepper">
                          <button
                            type="button"
                            aria-label={tx(locale, `قلّل الدوائر: ${name}`, `Fewer circuits: ${name}`)}
                            disabled={room.circuits <= 1}
                            onClick={() => updateRoom(room.id, { circuits: sanitizeCircuits(room.circuits - 1) })}
                          >−</button>
                          <input
                            id={`selector-room-circuits-${room.id}`}
                            aria-label={tx(locale, `عدد الدوائر: ${name}`, `Circuits: ${name}`)}
                            type="number"
                            inputMode="numeric"
                            dir="ltr"
                            min={1}
                            max={MAX_CIRCUITS_PER_ROOM}
                            step={1}
                            value={room.circuits}
                            onChange={(event) => { if (event.target.value !== '') updateRoom(room.id, { circuits: sanitizeCircuits(event.target.value) }); }}
                          />
                          <button
                            type="button"
                            aria-label={tx(locale, `زِد الدوائر: ${name}`, `More circuits: ${name}`)}
                            disabled={room.circuits >= MAX_CIRCUITS_PER_ROOM}
                            onClick={() => updateRoom(room.id, { circuits: sanitizeCircuits(room.circuits + 1) })}
                          >+</button>
                        </div>
                        <button
                          type="button"
                          className="selector-room-remove"
                          aria-label={tx(locale, `احذف: ${name}`, `Remove: ${name}`)}
                          disabled={rooms.length <= 1}
                          onClick={() => removeRoom(room.id)}
                        >{tx(locale, 'احذف', 'Remove')}</button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
            <div className="selector-rooms-footer">
              <button type="button" className="selector-room-add" onClick={addRoom} disabled={atRoomLimit} aria-describedby={atRoomLimit ? 'selector-room-limit' : undefined}>
                {tx(locale, 'أضف غرفة', 'Add a room')}
              </button>
              <p className="selector-room-total">
                {tx(locale, 'إجمالي الدوائر: ', 'Total circuits: ')}<bdi dir="ltr">{roomTotal}</bdi>
              </p>
            </div>
            {atRoomLimit ? (
              <p className="selector-room-limit" id="selector-room-limit">
                {tx(locale, 'وصلت إلى الحد الأقصى: ', 'Maximum reached: ')}<bdi dir="ltr">{MAX_ROOMS}</bdi>{tx(locale, ' غرفة.', ' rooms.')}
              </p>
            ) : null}
          </div>
        )}
      </div>
      <div className="product-selector-result" aria-live="polite">
        {product ? (
          <>
            <Image src={product.image} alt={localProductText(product.alt, locale)} width={1254} height={1254} sizes="(max-width: 760px) 80vw, 360px" />
            <div>
              <p className="eyebrow">{tx(locale, 'نقطة بداية مبدئية', 'Preliminary starting point')}</p>
              <h3>{product.name}</h3>
              <p><Bidi text={tx(locale, `يغطي الموديل ${product.channels} قنوات مؤكدة. يلزم تأكيد توزيع الدوائر والحماية والملاءمة قبل الاختيار النهائي.`, `This model has ${product.channels} confirmed channels. Circuit allocation, protection and fit must be reviewed before a final selection.`)} locale={locale} /></p>
              <div className="actions">
                <a className="btn" href={`/${locale}/products/${product.model}`}>{tx(locale, 'راجع المنتج', 'Review product')}</a>
                <a className="btn secondary" href={`/${locale}/start-project?service=smart-home`}>{tx(locale, 'اطلب مراجعة هندسية', 'Request engineering review')}</a>
              </div>
            </div>
          </>
        ) : (
          <div className="product-selector-complex">
            <p className="eyebrow">{tx(locale, 'نطاق متعدد الوحدات', 'MULTI-CONTROLLER SCOPE')}</p>
            <h3>{tx(locale, 'راجع المعمارية قبل اختيار الموديلات', 'Review the architecture before choosing models')}</h3>
            <p>{tx(locale, `الاحتياج يتجاوز ${MAX_SINGLE_CONTROLLER_CHANNELS} قناة. لا يفترض المنتقي عدد الوحدات أو توزيعها؛ يبدأ الفريق بمراجعة الدوائر وحدود النظام.`, `The requirement exceeds ${MAX_SINGLE_CONTROLLER_CHANNELS} channels. The selector does not assume controller quantity or allocation; the team first reviews circuits and system boundaries.`)}</p>
            <a className="btn" href={`/${locale}/start-project?service=smart-home`}>{tx(locale, 'ابدأ موجز المشروع', 'Start a project brief')}</a>
          </div>
        )}
        <PackageGuidance locale={locale} total={total} />
      </div>
    </div>
  );
}
