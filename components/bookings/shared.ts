import { BOOKING_STATUS } from '@/lib/constants';
import { clock, durText } from '@/lib/format';
import { minutesOf, ymd } from '@/lib/time';
import type { BookingDTO, MemberDTO } from '@/lib/types';

export const SCALE = 1.2; // px per minute in the day grid

export const dateOf = (b: BookingDTO) => ymd(new Date(b.startsAt));
export const startMinOf = (b: BookingDTO) => minutesOf(new Date(b.startsAt));
export const endMinOf = (b: BookingDTO) => startMinOf(b) + b.durationMin;

export function memberName(members: MemberDTO[], id: string | null) {
  return members.find((m) => m.id === id)?.name ?? '';
}

export function ariaOf(b: BookingDTO) {
  return `${b.customerName}، ${b.serviceName}، ${clock(startMinOf(b))}، ${BOOKING_STATUS[b.status].label}`;
}

export const rangeText = (b: BookingDTO) => `${clock(startMinOf(b))} – ${clock(endMinOf(b))}`;
export { durText };
