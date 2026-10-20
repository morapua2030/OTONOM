-- 007: safety escalation for service tickets (planning doc 09 W-08): gas/alarm/safety-related problems are flagged
-- URGENT, receive safety guidance and need a human callback. The website is NOT an emergency service.
ALTER TABLE domain.service_tickets DROP CONSTRAINT service_tickets_category_check;
ALTER TABLE domain.service_tickets ADD CONSTRAINT service_tickets_category_check CHECK (category IN ('FAULT','CONFIGURATION','INSTALLATION','SAFETY','OTHER'));
ALTER TABLE domain.service_tickets
  ADD COLUMN priority text NOT NULL DEFAULT 'NORMAL' CHECK (priority IN ('NORMAL','URGENT')),
  ADD COLUMN callback_done_at timestamptz,
  ADD COLUMN callback_by text;
ALTER TABLE domain.service_tickets ADD CONSTRAINT safety_is_urgent CHECK (category <> 'SAFETY' OR priority = 'URGENT');
-- a SAFETY ticket cannot be resolved or closed before a human callback is recorded
ALTER TABLE domain.service_tickets ADD CONSTRAINT safety_needs_callback CHECK (category <> 'SAFETY' OR status NOT IN ('RESOLVED','CLOSED') OR callback_done_at IS NOT NULL);
