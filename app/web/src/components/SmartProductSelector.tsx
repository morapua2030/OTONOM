'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import type { Locale } from '@/lib/i18n.ts';
import { localProductText } from '@/lib/products.ts';
import {
  MAX_CIRCUITS_PER_ROOM,
  MAX_ROOMS,
  ROOM_TYPES,
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
import { packageText, SMART_HOME_PACKAGES } from '@/lib/smart-home-packages.ts';
import { EXTERNAL_LINK, whatsappHref } from '@/lib/contact.ts';
import { selectorMessage, selectorModel } from '@/lib/selector-message.ts';
import { Bidi } from './bidi.tsx';

const tx = (locale: Locale, ar: string, en: string) => (locale === 'ar' ? ar : en);

const CHANNEL_MIN = 1;
const CHANNEL_MAX = 48;
const CHANNEL_PRESETS = [4, 6, 16, 32, 48] as const;
/** Largest package capacity (2 × 16R = 32): above it no single package covers the need. */
const MAX_PACKAGE_CHANNELS = Math.max(...SMART_HOME_PACKAGES.map(packageChannelCapacity));

type Mode = 'channels' | 'rooms';
type RoomRow = { id: number; type: RoomType; circuits: number };

/** Covering packages: names, controller quantities and capacities all come from the registries (no prices here). */
function PackageGuidance({ locale, total }: { locale: Locale; total: number }) {
  const packages = packagesCovering(total);
  if (packages.length === 0) return null;
  return (
    <section className="selector-packages" aria-labelledby="selector-packages-title" data-testid="selector-packages">
      <h4 id="selector-packages-title" className="v2-entry-label">{tx(locale, 'الباقة اللي تغطيها', 'The package that covers it')}</h4>
      <ul>
        {packages.map((pkg) => (
          <li key={pkg.id} data-package={pkg.id}>
            <span className="selector-package-name"><Bidi text={packageText(pkg.name, locale)} locale={locale} /></span>
            <span className="selector-package-meta">
              {packageControllers(pkg).map((entry) => <bdi dir="ltr" key={entry.product.model}>{`${entry.quantity} × ${entry.product.model.toUpperCase()}`}</bdi>)}
              {' · '}
              {tx(locale, 'حتى ', 'up to ')}<bdi dir="ltr">{packageChannelCapacity(pkg)}</bdi>{tx(locale, ' قناة', ' channels')}
            </span>
            <span className="selector-package-links"><a href={`/${locale}/smart-home/packages#package-${pkg.id}`}>{tx(locale, 'شوف الباقة', 'See the package')}</a></span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Design v3 restyle of the D6 Smart Product Selector (DR-112): chips, white cards with navy borders, pills. Logic unchanged. */
export function SmartProductSelector({ locale }: { locale: Locale }) {
  const [mode, setMode] = useState<Mode>('channels');
  const [channels, setChannels] = useState(4);
  const [rooms, setRooms] = useState<RoomRow[]>([{ id: 1, type: 'living', circuits: 1 }]);
  const nextRoomId = useRef(2);
  const [focusRoomId, setFocusRoomId] = useState<number | null>(null);

  useEffect(() => {
    if (focusRoomId === null) return;
    document.getElementById(`selector-room-${focusRoomId}`)?.focus();
    setFocusRoomId(null);
  }, [focusRoomId]);

  const roomTotal = totalCircuits(rooms);
  const roomNames = roomControlNames(rooms, locale);
  const total = mode === 'channels' ? channels : roomTotal;
  const product = recommendController(total);
  const packages = packagesCovering(total);
  const atRoomLimit = rooms.length >= MAX_ROOMS;
  const message = selectorMessage(locale, { channels: total, rooms: mode === 'rooms' ? rooms.length : null, model: selectorModel(locale, total) });

  const updateRoom = (id: number, patch: Partial<Omit<RoomRow, 'id'>>) =>
    setRooms((current) => current.map((room) => (room.id === id ? { ...room, ...patch } : room)));
  const addRoom = (type: RoomType) => {
    if (atRoomLimit) return;
    const id = nextRoomId.current++;
    setRooms((current) => [...current, { id, type, circuits: 1 }]);
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
    <div className="product-selector v3-selector" data-testid="smart-product-selector" data-mode={mode}>
      <div className="product-selector-control v2-card">
        <div className="selector-mode v2-chip-row" role="group" aria-label={tx(locale, 'طريقة الاختيار', 'Selection method')}>
          <button type="button" className="v2-chip" aria-pressed={mode === 'channels'} onClick={() => setMode('channels')}>{tx(locale, 'بعدد القنوات', 'By channel count')}</button>
          <button type="button" className="v2-chip" aria-pressed={mode === 'rooms'} onClick={() => setMode('rooms')}>{tx(locale, 'بالغرف', 'By room')}</button>
        </div>
        <p className="selector-intro">
          <Bidi
            text={mode === 'channels'
              ? tx(locale, 'اختار عدد القنوات اللي محتاجها، وهنقولك الكنترولر والباقة اللي تغطيها.', 'Pick how many channels you need, and we’ll show the controller and package that cover them.')
              : tx(locale, 'ضيف الأوض وعدد القنوات في كل أوضة: كل خط نور أو جهاز = قناة.', 'Add your rooms and the channels in each one: every lighting line or device = 1 channel.')}
            locale={locale}
          />
        </p>
        {mode === 'channels' ? (
          <>
            <label className="selector-label" htmlFor="selector-channels">{tx(locale, 'عدد القنوات', 'Channels')}</label>
            <div className="product-selector-input">
              <input id="selector-channels" type="range" min={CHANNEL_MIN} max={CHANNEL_MAX} step="1" value={channels} onChange={(event) => setChannels(Number(event.target.value))} />
              <output htmlFor="selector-channels"><bdi dir="ltr">{channels}</bdi></output>
            </div>
            <div className="product-selector-presets v2-chip-row" role="group" aria-label={tx(locale, 'اختيارات سريعة', 'Quick choices')}>
              {CHANNEL_PRESETS.map((value) => <button type="button" className="v2-chip" key={value} aria-pressed={channels === value} onClick={() => setChannels(value)}><bdi dir="ltr">{value}</bdi></button>)}
            </div>
          </>
        ) : (
          <div className="selector-rooms">
            <ol className="selector-room-list">
              {rooms.map((room, index) => {
                const name = roomNames[index] ?? '';
                return (
                  <li className="selector-room-row" key={room.id}>
                    <h3 className="selector-room-name" id={`selector-room-${room.id}`} tabIndex={-1}>{name}</h3>
                    <div className="selector-room-actions">
                      <div className="selector-stepper">
                        <button type="button" aria-label={tx(locale, `قلّل القنوات: ${name}`, `Fewer channels: ${name}`)} disabled={room.circuits <= 1} onClick={() => updateRoom(room.id, { circuits: sanitizeCircuits(room.circuits - 1) })}>−</button>
                        <output className="selector-stepper-value" aria-label={tx(locale, `القنوات: ${name}`, `Channels: ${name}`)}><bdi dir="ltr">{room.circuits}</bdi></output>
                        <button type="button" aria-label={tx(locale, `زوّد القنوات: ${name}`, `More channels: ${name}`)} disabled={room.circuits >= MAX_CIRCUITS_PER_ROOM} onClick={() => updateRoom(room.id, { circuits: sanitizeCircuits(room.circuits + 1) })}>+</button>
                      </div>
                      <button type="button" className="selector-room-remove" aria-label={tx(locale, `شيل: ${name}`, `Remove: ${name}`)} disabled={rooms.length <= 1} onClick={() => removeRoom(room.id)}>{tx(locale, 'شيل', 'Remove')}</button>
                    </div>
                  </li>
                );
              })}
            </ol>
            <p className="selector-room-total">{tx(locale, 'الإجمالي: ', 'Total: ')}<bdi dir="ltr">{roomTotal}</bdi>{tx(locale, ' قناة', ' channels')}</p>
            {atRoomLimit ? (
              <p className="selector-room-limit" id="selector-room-limit">{tx(locale, 'وصلت لأقصى عدد أوض (', 'You’ve reached the maximum of ')}<bdi dir="ltr">{MAX_ROOMS}</bdi>{tx(locale, ').', ' rooms.')}</p>
            ) : (
              <div className="selector-room-add-row" role="group" aria-label={tx(locale, 'ضيف أوضة', 'Add a room')}>
                {ROOM_TYPES.map((type) => (
                  <button type="button" className="v2-chip selector-room-add" key={type} onClick={() => addRoom(type)}>{`+ ${roomTypeLabel(type, locale)}`}</button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      <div className="product-selector-result v2-card" aria-live="polite">
        <span className="v2-eyebrow">{tx(locale, 'المقترح', 'Suggested')}</span>
        {product ? (
          <div className="selector-result-product">
            <span className="selector-result-photo"><Image src={product.image} alt={localProductText(product.alt, locale)} width={1254} height={1254} sizes="120px" /></span>
            <div>
              <h3><a href={`/${locale}/products/${product.model}`}><bdi dir="ltr">{product.model.toUpperCase()}</bdi></a></h3>
              <span className="v2-pill"><Bidi text={tx(locale, `${product.channels} قنوات تحكم`, `${product.channels} control channels`)} locale={locale} /></span>
            </div>
          </div>
        ) : packages.length ? (
          <div className="selector-result-product product-selector-multi">
            <div>
              <h3><bdi dir="ltr">{selectorModel(locale, total)}</bdi></h3>
              <span className="v2-pill"><Bidi text={tx(locale, `حتى ${packageChannelCapacity(packages[0]!)} قناة`, `up to ${packageChannelCapacity(packages[0]!)} channels`)} locale={locale} /></span>
            </div>
          </div>
        ) : (
          <div className="product-selector-complex">
            <h3>{tx(locale, 'مشروعك محتاج مراجعة مهندس', 'Your project needs an engineer review')}</h3>
            <p><Bidi text={tx(locale, `الاحتياج أكتر من ${MAX_PACKAGE_CHANNELS} قناة، فالمهندس بيراجع توزيع الكنترولرات معاك.`, `That’s more than ${MAX_PACKAGE_CHANNELS} channels, so an engineer reviews the controller layout with you.`)} locale={locale} /></p>
            <p className="product-selector-business">{tx(locale, 'للمشروعات متعددة الوحدات:', 'For multi-unit projects:')}</p>
            <div className="v2-actions">
              <a className="btn secondary" href={`/${locale}/business/developers`}>{tx(locale, 'للمطوّرين', 'Developers')}</a>
              <a className="btn secondary" href={`/${locale}/business/contractors`}>{tx(locale, 'للمقاولين', 'Contractors')}</a>
            </div>
          </div>
        )}
        <PackageGuidance locale={locale} total={total} />
        <a className="btn selector-whatsapp" href={whatsappHref(message)} {...EXTERNAL_LINK} data-testid="selector-whatsapp">{tx(locale, 'ابعت على واتساب', 'Send on WhatsApp')}</a>
        <p className="selector-caveat">{tx(locale, 'ده تقدير مبدئي، والمهندس بيأكد في الزيارة.', 'This is an initial estimate; the engineer confirms it at the visit.')}</p>
        <a className="selector-sim-link" href={`/${locale}/try`} data-testid="selector-sim-link">{tx(locale, 'جرّب بيتك الذكي ←', 'Try your smart home →')}</a>
      </div>
    </div>
  );
}
