import { DomainError } from './tx.ts';

export type ServiceNotificationEvent =
  | 'TICKET_RECEIVED'
  | 'TICKET_STATUS_CHANGED'
  | 'EVIDENCE_REQUESTED'
  | 'RMA_APPROVED'
  | 'REPAIR_COMPLETE'
  | 'TICKET_CLOSED';

type Locale = 'ar' | 'en';
type Template = { subject: string; body: (fields: { ref: string; status?: string }) => string };

const templates: Record<Locale, Record<ServiceNotificationEvent, Template>> = {
  en: {
    TICKET_RECEIVED: { subject: 'Service request received', body: ({ ref }) => `Your service request ${ref} was received for review.` },
    TICKET_STATUS_CHANGED: { subject: 'Service request status updated', body: ({ ref, status }) => `Service request ${ref} is now ${status ?? 'under review'}.` },
    EVIDENCE_REQUESTED: { subject: 'More evidence is required', body: ({ ref }) => `Service request ${ref} needs additional evidence before review can continue.` },
    RMA_APPROVED: { subject: 'Return review approved', body: ({ ref }) => `The controlled return review for ${ref} was approved. Operational instructions remain pending staff confirmation.` },
    REPAIR_COMPLETE: { subject: 'Repair record updated', body: ({ ref }) => `The repair record for ${ref} is complete and awaits the next authorized disposition.` },
    TICKET_CLOSED: { subject: 'Service request closed', body: ({ ref }) => `Service request ${ref} was closed. This message does not create a warranty or refund promise.` },
  },
  ar: {
    TICKET_RECEIVED: { subject: 'تم استلام طلب الخدمة', body: ({ ref }) => `تم استلام طلب الخدمة ${ref} للمراجعة.` },
    TICKET_STATUS_CHANGED: { subject: 'تحديث حالة طلب الخدمة', body: ({ ref, status }) => `أصبحت حالة طلب الخدمة ${ref}: ${status ?? 'قيد المراجعة'}.` },
    EVIDENCE_REQUESTED: { subject: 'مطلوب دليل إضافي', body: ({ ref }) => `يحتاج طلب الخدمة ${ref} إلى دليل إضافي قبل متابعة المراجعة.` },
    RMA_APPROVED: { subject: 'اعتماد مراجعة الإرجاع', body: ({ ref }) => `اعتُمدت مراجعة الإرجاع المقيد للطلب ${ref}، وتبقى تعليمات التشغيل بانتظار تأكيد الموظف.` },
    REPAIR_COMPLETE: { subject: 'تحديث سجل الإصلاح', body: ({ ref }) => `اكتمل سجل إصلاح الطلب ${ref} وينتظر الإجراء التالي المخول.` },
    TICKET_CLOSED: { subject: 'إغلاق طلب الخدمة', body: ({ ref }) => `أُغلق طلب الخدمة ${ref}. لا تنشئ هذه الرسالة وعدًا بضمان أو استرداد.` },
  },
};

/** Deterministic local preview only. It has no provider, address, network or send side effect. */
export function renderServiceNotificationPreview(
  event: ServiceNotificationEvent,
  locale: Locale,
  fields: { ref: string; status?: string },
) {
  const ref = String(fields.ref ?? '').trim().toUpperCase();
  const status = fields.status ? String(fields.status).trim().toUpperCase() : undefined;
  if (!/^[A-Z0-9-]{4,40}$/.test(ref)) throw new DomainError('INVALID_NOTIFICATION_REF');
  if (status && !/^[A-Z_]{2,40}$/.test(status)) throw new DomainError('INVALID_NOTIFICATION_STATUS');
  const template = templates[locale]?.[event];
  if (!template) throw new DomainError('UNSUPPORTED_NOTIFICATION_TEMPLATE');
  return {
    mode: 'LOCAL_PREVIEW_ONLY' as const,
    externalSend: false as const,
    locale,
    event,
    subject: template.subject,
    body: template.body({ ref, status }),
  };
}
