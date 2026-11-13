import { SetMetadata } from '@nestjs/common';

export const SKIP_AUDIT_KEY = 'skipAudit';

// the route writes its own audit rows (CANCEL, REFUND, CHECK_IN),
// so the AuditInterceptor does not add a second UPDATE row
export const SkipAudit = () => SetMetadata(SKIP_AUDIT_KEY, true);
