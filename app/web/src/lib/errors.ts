import { APIError, type CollectionAfterErrorHook } from 'payload';

const PUBLIC_CODES = /^(PUBLISH_BLOCKED|ILLEGAL_TRANSITION|PUBLISH_REQUIRES_STATUS|UPLOAD_REJECTED|CLAIM_)/;

/**
 * Payload's production build minifies error class names, and its error formatter then replaces our
 * domain error messages with "An unknown error occurred." — this hook restores the stable public code.
 * (Framework friction recorded in the spike evidence.)
 */
export const exposeDomainErrorCodes: CollectionAfterErrorHook = ({ error }) => {
  const e = error as { message?: string; status?: number };
  if (e?.message && PUBLIC_CODES.test(e.message)) {
    return { response: { errors: [{ message: e.message }] }, status: e.status ?? 400 };
  }
  return undefined;
};

/**
 * Expected business-rule refusal (illegal transition, publish gate, missing evidence…). The explicit `name` survives
 * production minification so `loggingLevels` can log these at `info` instead of `error` (they are not faults).
 */
export class BusinessRuleError extends APIError {
  constructor(message: string, status = 409) {
    super(message, status, null, true);
    this.name = 'BusinessRuleError';
  }
}
