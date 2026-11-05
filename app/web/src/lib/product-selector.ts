/**
 * Pure D6 selector logic. Every number is derived from the product registry and the approved
 * package registry; no channel thresholds or package capacities are hard-coded here.
 */
import type { Locale } from './i18n.ts';
import { PRODUCTS, requireProductByModel, type PublicProduct } from './products.ts';
import { SMART_HOME_PACKAGES, type SmartHomePackage } from './smart-home-packages.ts';

const PRODUCTS_BY_CAPACITY: readonly PublicProduct[] = [...PRODUCTS].sort((a, b) => a.channels - b.channels);

/** Largest channel count a single registered controller provides. */
export const MAX_SINGLE_CONTROLLER_CHANNELS: number = PRODUCTS_BY_CAPACITY[PRODUCTS_BY_CAPACITY.length - 1]?.channels ?? 0;

/** Smallest registered controller whose channel count covers `channels`; undefined below 1 or above the largest model. */
export function recommendController(channels: number): PublicProduct | undefined {
  if (!Number.isFinite(channels) || channels < 1) return undefined;
  return PRODUCTS_BY_CAPACITY.find((product) => product.channels >= channels);
}

/** Controllers included in a package, resolved against the product registry. */
export function packageControllers(pkg: SmartHomePackage): Array<{ product: PublicProduct; quantity: number }> {
  return pkg.items.flatMap((item) => (item.model ? [{ product: requireProductByModel(item.model), quantity: item.quantity }] : []));
}

/** Sum of channels × quantity over the package items that reference a registered controller. */
export function packageChannelCapacity(pkg: SmartHomePackage): number {
  return packageControllers(pkg).reduce((total, entry) => total + entry.product.channels * entry.quantity, 0);
}

/** Packages in the smallest capacity tier that still covers `channels`, cheapest first. */
export function packagesCovering(channels: number, packages: readonly SmartHomePackage[] = SMART_HOME_PACKAGES): SmartHomePackage[] {
  if (!Number.isFinite(channels) || channels < 1) return [];
  const covering = packages.map((pkg) => ({ pkg, capacity: packageChannelCapacity(pkg) })).filter((entry) => entry.capacity >= channels);
  if (covering.length === 0) return [];
  const tier = Math.min(...covering.map((entry) => entry.capacity));
  return covering
    .filter((entry) => entry.capacity === tier)
    .map((entry) => entry.pkg)
    .sort((a, b) => a.priceEgp - b.priceEgp);
}

export const ROOM_TYPES = ['living', 'bedroom', 'kitchen', 'bathroom', 'entrance', 'office', 'outdoor', 'other'] as const;
export type RoomType = (typeof ROOM_TYPES)[number];
export type SelectorRoom = { type: RoomType; circuits: number };

const ROOM_LABELS: Record<RoomType, { ar: string; en: string }> = {
  living: { ar: 'صالة', en: 'Living room' },
  bedroom: { ar: 'غرفة نوم', en: 'Bedroom' },
  kitchen: { ar: 'مطبخ', en: 'Kitchen' },
  bathroom: { ar: 'حمام', en: 'Bathroom' },
  entrance: { ar: 'مدخل وممرات', en: 'Entrance & corridors' },
  office: { ar: 'مكتب', en: 'Office' },
  outdoor: { ar: 'مساحة خارجية', en: 'Outdoor area' },
  other: { ar: 'أخرى', en: 'Other' },
};

export const roomTypeLabel = (type: RoomType, locale: Locale): string => ROOM_LABELS[type][locale];

/**
 * Accessible room name: the label alone when its type is unique, otherwise "<label> (<n>)" where n is the
 * 1-based position of this room among rooms of the same type.
 */
export function roomControlName(roomLabel: string, positionInType: number, sameTypeCount: number): string {
  return sameTypeCount > 1 ? `${roomLabel} (${positionInType})` : roomLabel;
}

/** Unique accessible names for every room, in list order. */
export function roomControlNames(rooms: readonly Pick<SelectorRoom, 'type'>[], locale: Locale): string[] {
  const seen = new Map<RoomType, number>();
  return rooms.map((room) => {
    const position = (seen.get(room.type) ?? 0) + 1;
    seen.set(room.type, position);
    const sameTypeCount = rooms.filter((other) => other.type === room.type).length;
    return roomControlName(roomTypeLabel(room.type, locale), position, sameTypeCount);
  });
}

export function isRoomType(value: unknown): value is RoomType {
  return typeof value === 'string' && (ROOM_TYPES as readonly string[]).includes(value);
}

export const MAX_ROOMS = 12;
export const MAX_CIRCUITS_PER_ROOM = 16;

/** Integer circuits per room, truncated toward zero and clamped to 1..MAX_CIRCUITS_PER_ROOM; non-numeric input becomes 1. */
export function sanitizeCircuits(value: unknown): number {
  const parsed = typeof value === 'number' ? value : typeof value === 'string' && value.trim() !== '' ? Number(value) : Number.NaN;
  if (Number.isNaN(parsed)) return 1;
  return Math.min(MAX_CIRCUITS_PER_ROOM, Math.max(1, Math.trunc(parsed)));
}

export function totalCircuits(rooms: readonly SelectorRoom[]): number {
  return rooms.reduce((total, room) => total + sanitizeCircuits(room.circuits), 0);
}
