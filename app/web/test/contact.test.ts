import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import {
  bookVisitMessage,
  contractorMessage,
  developerMessage,
  disciplineMessage,
  ENTRY_STAGES,
  entryStageMessage,
  PHONE_DISPLAY,
  PHONE_E164,
  telHref,
  WHATSAPP_MESSAGE_MAX,
  whatsappHref,
} from '../src/lib/contact.ts';

const decoded = (href: string) => decodeURIComponent(new URL(href).searchParams.get('text') ?? '');

test('contact channel is the owner-approved number (DR-101)', () => {
  assert.equal(PHONE_E164, '+201090721847');
  assert.equal(PHONE_DISPLAY, '+20 109 072 1847');
  assert.equal(telHref(), 'tel:+201090721847');
  assert.match(whatsappHref('x'), /^https:\/\/wa\.me\/201090721847\?text=x$/);
});

test('WhatsApp messages are encoded and decode to the exact reference text', () => {
  const href = whatsappHref(bookVisitMessage('ar', 'plus'));
  assert.ok(!/[\s،أ]/.test(href.split('?')[1]), 'text parameter is percent-encoded');
  assert.equal(new URL(href).searchParams.get('text'), 'أهلًا OTONOM، عايز أحجز زيارة لباقة Plus.');
  assert.equal(decoded(whatsappHref(bookVisitMessage('en', 'premium'))), "Hi OTONOM, I'd like to book a visit for the Premium package.");
  assert.equal(new URL(whatsappHref(bookVisitMessage('en'))).searchParams.get('text'), "Hi OTONOM, I'd like to book a visit.");
  assert.equal(bookVisitMessage('ar', null), 'أهلًا OTONOM، عايز أحجز زيارة.');
  assert.equal(bookVisitMessage('en', 'essential'), "Hi OTONOM, I'd like to book a visit for the Essential package.");
});

test('discipline, entry-stage and business messages match the reference', () => {
  assert.equal(disciplineMessage('en', 'Software Engineering'), "Hi OTONOM, I'd like to know more about Software Engineering.");
  assert.equal(disciplineMessage('ar', 'هندسة البرمجيات'), 'أهلًا OTONOM، عايز أعرف أكتر عن هندسة البرمجيات.');
  assert.deepEqual([...ENTRY_STAGES], ['idea', 'prototype', 'existing', 'unsure']);
  assert.equal(entryStageMessage('en', 'idea'), 'Hi OTONOM, I have an idea and I’d like to start a project.');
  assert.equal(entryStageMessage('ar', 'unsure'), 'أهلًا OTONOM، لسه مش متأكد وعايز أتكلم عن مشروع.');
  assert.equal(developerMessage('en'), 'Hi OTONOM, I’m a developer and I’d like to discuss a multi-unit project.');
  assert.equal(contractorMessage('ar'), 'أهلًا OTONOM، أنا مقاول وعايز أتكلم عن مشروع متعدد الوحدات.');
});

test('long messages are capped and the link carries no other parameters', () => {
  const url = new URL(whatsappHref('a'.repeat(WHATSAPP_MESSAGE_MAX * 2)));
  assert.equal([...url.searchParams.keys()].join(','), 'text');
  assert.equal(url.searchParams.get('text')!.length, WHATSAPP_MESSAGE_MAX);
});

test('contact module stores nothing and sends nothing', () => {
  const source = readFileSync(new URL('../src/lib/contact.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /fetch\(|localStorage|sessionStorage|document\.cookie|sendBeacon|XMLHttpRequest/);
});
