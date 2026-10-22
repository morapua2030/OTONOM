import assert from 'node:assert/strict';
import test from 'node:test';
import { renderServiceNotificationPreview } from '../src/service-notifications.ts';

test('service notification previews are bilingual, deterministic and never send externally', () => {
  const en = renderServiceNotificationPreview('TICKET_STATUS_CHANGED', 'en', { ref: 'srv-2026-0001', status: 'in_progress' });
  const ar = renderServiceNotificationPreview('TICKET_STATUS_CHANGED', 'ar', { ref: 'SRV-2026-0001', status: 'IN_PROGRESS' });
  assert.equal(en.mode, 'LOCAL_PREVIEW_ONLY');
  assert.equal(en.externalSend, false);
  assert.match(en.body, /SRV-2026-0001/);
  assert.match(ar.body, /طلب الخدمة/);
  assert.equal(en.body, renderServiceNotificationPreview('TICKET_STATUS_CHANGED', 'en', { ref: 'srv-2026-0001', status: 'in_progress' }).body);
});

test('notification preview rejects unbounded or injectable references and statuses', () => {
  assert.throws(() => renderServiceNotificationPreview('TICKET_RECEIVED', 'en', { ref: '<script>alert(1)</script>' }), /INVALID_NOTIFICATION_REF/);
  assert.throws(() => renderServiceNotificationPreview('TICKET_STATUS_CHANGED', 'en', { ref: 'SRV-1000', status: 'DONE\r\nBcc:x@example.com' }), /INVALID_NOTIFICATION_STATUS/);
  assert.throws(() => renderServiceNotificationPreview('UNKNOWN' as any, 'en', { ref: 'SRV-1000' }), /UNSUPPORTED_NOTIFICATION_TEMPLATE/);
});
