import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  MAX_CIRCUITS_PER_ROOM,
  MAX_ROOMS,
  MAX_SINGLE_CONTROLLER_CHANNELS,
  ROOM_TYPES,
  packageChannelCapacity,
  packagesCovering,
  recommendController,
  roomControlName,
  roomControlNames,
  roomTypeLabel,
  sanitizeCircuits,
  totalCircuits,
} from '../src/lib/product-selector.ts';
import { SMART_HOME_PACKAGES, smartHomePackage, type SmartHomePackage } from '../src/lib/smart-home-packages.ts';

const pkg = (id: string) => {
  const found = smartHomePackage(id);
  assert.ok(found, `package ${id}`);
  return found;
};

test('recommendController picks the smallest registered controller that covers the channel count', () => {
  const cases: Array<[number, string | undefined]> = [[0, undefined], [1, '4r'], [4, '4r'], [5, '6r'], [6, '6r'], [7, '16r'], [16, '16r'], [17, undefined], [48, undefined]];
  for (const [channels, model] of cases) assert.equal(recommendController(channels)?.model, model, `${channels} channels`);
  assert.equal(recommendController(Number.NaN), undefined);
  assert.equal(MAX_SINGLE_CONTROLLER_CHANNELS, 16);
});

test('packageChannelCapacity is derived from the controllers and quantities in each package', () => {
  assert.equal(packageChannelCapacity(pkg('essential')), 16);
  assert.equal(packageChannelCapacity(pkg('plus')), 32);
  assert.equal(packageChannelCapacity(pkg('premium')), 32);

  const essential = pkg('essential');
  const tripled: SmartHomePackage = { ...essential, items: essential.items.map((item) => (item.model ? { ...item, quantity: 3 } : item)) };
  assert.equal(packageChannelCapacity(tripled), 48, 'capacity must follow the item quantity');
  const withoutController: SmartHomePackage = { ...essential, items: essential.items.filter((item) => !item.model) };
  assert.equal(packageChannelCapacity(withoutController), 0, 'items without a model contribute no channels');
  assert.equal(packageChannelCapacity(essential), 16, 'the registry package itself is not mutated');
});

test('packagesCovering returns the smallest covering tier, cheapest first', () => {
  const ids = (channels: number) => packagesCovering(channels).map((entry) => entry.id);
  assert.deepEqual(ids(0), []);
  assert.deepEqual(ids(1), ['essential']);
  assert.deepEqual(ids(16), ['essential']);
  assert.deepEqual(ids(17), ['plus', 'premium']);
  assert.deepEqual(ids(32), ['plus', 'premium']);
  assert.deepEqual(ids(33), []);
  const prices = packagesCovering(20).map((entry) => entry.priceEgp);
  assert.deepEqual(prices, [...prices].sort((a, b) => a - b));
  assert.equal(SMART_HOME_PACKAGES.length, 3, 'the registry order is untouched');
});

test('sanitizeCircuits truncates toward zero and clamps to 1..16', () => {
  assert.equal(MAX_CIRCUITS_PER_ROOM, 16);
  assert.equal(sanitizeCircuits('3'), 3);
  assert.equal(sanitizeCircuits(0), 1);
  assert.equal(sanitizeCircuits(99), 16);
  assert.equal(sanitizeCircuits('x'), 1);
  assert.equal(sanitizeCircuits(2.7), 2);
  assert.equal(sanitizeCircuits(''), 1);
  assert.equal(sanitizeCircuits(undefined), 1);
  assert.equal(sanitizeCircuits(-5), 1);
});

test('room model totals circuits and stays within the documented limits', () => {
  assert.equal(MAX_ROOMS, 12);
  assert.equal(totalCircuits([{ type: 'living', circuits: 6 }, { type: 'bedroom', circuits: 4 }, { type: 'kitchen', circuits: 10 }]), 20);
  assert.equal(totalCircuits([{ type: 'other', circuits: 99 }]), 16, 'each room is clamped before summing');
  assert.deepEqual([...ROOM_TYPES], ['living', 'bedroom', 'kitchen', 'bathroom', 'entrance', 'office', 'outdoor', 'other']);
  assert.equal(roomTypeLabel('living', 'ar'), 'صالة');
  assert.equal(roomTypeLabel('entrance', 'en'), 'Entrance & corridors');
  for (const type of ROOM_TYPES) assert.ok(roomTypeLabel(type, 'ar') && roomTypeLabel(type, 'en'), type);
});

test('roomControlName gives every room a unique accessible name', () => {
  assert.equal(roomControlName('صالة', 1, 1), 'صالة');
  assert.equal(roomControlName('أخرى', 1, 2), 'أخرى (1)');
  assert.equal(roomControlName('أخرى', 2, 2), 'أخرى (2)');
  assert.deepEqual(roomControlNames([{ type: 'living' }, { type: 'other' }, { type: 'kitchen' }, { type: 'other' }], 'ar'), ['صالة', 'أخرى (1)', 'مطبخ', 'أخرى (2)']);
  assert.deepEqual(roomControlNames([{ type: 'other' }, { type: 'other' }], 'en'), ['Other (1)', 'Other (2)']);
  const names = roomControlNames([{ type: 'bedroom' }, { type: 'bedroom' }, { type: 'bedroom' }, { type: 'office' }], 'en');
  assert.equal(new Set(names).size, names.length);
});
