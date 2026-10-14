import 'server-only';

/**
 * Stub for anything that would be sent to a customer (WhatsApp). Nothing is sent this round.
 * It only logs the kind and the business, never any text.
 */
export function stubSend(kind: string, businessId: string) {
  console.log(`[stub-send] kind=${kind} business=${businessId}`);
}
